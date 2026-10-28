# Mise en prod : sauvegarde, migration, retour arrière

Ce runbook couvre le passage en prod de la partie Colis (migration `0007_add_parcels`). Les scripts sont dans `scripts/` et ne touchent pas au code de l'appli.

## Déploiement automatique (NAS)

Fusionner `dev` dans `master` suffit. Rien d'autre à lancer :

1. GitHub Actions (`Publish Sellio for NAS`) vérifie le code, teste `update.sh` (`deploy/nas/test-update.sh`), construit l'image et la publie sur GHCR.
2. Sur le NAS, la tâche planifiée lance `update.sh` toutes les 5 minutes. Pour une nouvelle image : sauvegarde (base via `pg_dump` 17 dans le conteneur `db`, photos, config) dans `backups/<date>/`, puis migrations en attente, puis démarrage de la nouvelle version. L'ancienne reste en ligne pendant les deux premières étapes.
3. Échec de sauvegarde : rien n'est modifié, nouvelle tentative au passage suivant. Échec de migration : la nouvelle version ne démarre pas, l'ancienne continue, l'image est marquée en échec et n'est plus rejouée sans `bash update.sh --retry`. Version non saine après démarrage : l'image précédente est relancée.
4. Seules les 10 dernières sauvegardes sont gardées (`KEEP_BACKUPS`).

Où voir ce qui s'est passé : onglet Actions de GitHub pour le build, `update.log` (sortie de la tâche planifiée, code de sortie non nul en cas d'échec) et `.state/last-error.log` (erreur de migration ou logs de l'appli) dans le dossier du NAS.

Retour arrière à la main, depuis le dossier du NAS :

```bash
bash restore.sh backups/<date>
```

Le script convertit le dump en SQL (si `pg_restore` échoue, la base n'est pas touchée), arrête l'appli, vide les schémas `public` et `drizzle` puis rejoue le dump en une transaction, via le conteneur `db`. Il demande de taper `oui` (`--yes` hors terminal). Ne pas utiliser `pg_restore --clean` seul : il ne supprime que les objets du dump, et une migration appliquée depuis (ex. `parcels`/`carriers` pour 0007) resterait alors que `__drizzle_migrations` reviendrait en arrière. Les photos se restaurent à part depuis `images.tar.gz` de la même sauvegarde. Ensuite, redéployer l'image notée dans `previous-image` (`bash update.sh --retry` si la dernière est marquée en échec). Les données ajoutées depuis la sauvegarde sont perdues : ne jamais restaurer automatiquement. Pour retirer seulement 0007 en gardant les données, voir `scripts/rollback-0007.sh` plus bas.

Règles à connaître :

- Les migrations tournent pendant que l'ancienne version est en ligne, et l'image précédente peut être relancée après une migration réussie. Toute migration doit donc rester compatible avec la version précédente du code : ajouts uniquement, pas de suppression ni de renommage de colonne ou de table dans la même livraison (à faire en deux livraisons).
- La sauvegarde se fait application en ligne. Le dump de la base est cohérent, mais l'archive des photos peut contenir une photo en cours d'écriture ou manquer une photo référencée par le dump.

Tests : `deploy/nas/test-update.sh` simule docker (rapide) ; `deploy/nas/test-e2e.sh` rejoue update.sh avec la vraie pile (docker compose, postgres:17-alpine, image construite, registre local) : installation, 0007 appliquée automatiquement, déjà à jour, échec de migration avec l'ancienne version toujours en ligne, `--retry`. Il tourne en CI (`Deployment end-to-end`) sur les PR qui touchent le déploiement, avec shellcheck. À ne pas lancer sur le NAS (ports 2509 et 5000, volumes `sellio_nas_*`).

Les sections suivantes décrivent les scripts `scripts/` pour une mise en prod pilotée à la main.

## Prérequis

- `psql`, `pg_dump` et `pg_restore` (client PostgreSQL dont la version majeure est la même que celle du serveur : 17 en prod) et `npm` (dépendances installées avec `npm ci`).
- `DATABASE_URL` pointant vers la base à traiter. Aucun identifiant n'est écrit dans les scripts.

```bash
export DATABASE_URL='postgres://utilisateur:motdepasse@hote:5432/sellio'
```

Le `docker-compose.yml` ne publie pas le port de PostgreSQL : pour utiliser les scripts depuis l'hôte, passer par un tunnel SSH ou un port temporairement publié. Sur le NAS (`deploy/nas`), `update.sh` fait déjà sauvegarde et migration à chaque nouvelle image : voir `deploy/nas/README.md`. Les scripts ci-dessous servent pour une mise en prod pilotée à la main.

Les sauvegardes sont écrites dans `backups/` (ignoré par git, permissions privées). `BACKUP_DIR` change le dossier. Une sauvegarde est « récente » si elle a moins de 60 minutes (`BACKUP_MAX_AGE_MIN`) et si elle vient de la même base (hôte, port et nom, inclus dans le nom du fichier) : un dump de la copie de test ne débloque pas la prod. Le mot de passe de `DATABASE_URL` apparaît dans la ligne de commande de `psql`/`pg_dump` le temps de l’exécution : à lancer sur une machine de confiance.

Les scripts qui demandent confirmation (`restore-db.sh`, `rollback-0007.sh`) attendent qu'on tape `oui`. Hors terminal, il faut passer `--yes`.

## Procédure normale

1. Arrêter l'application, ou au moins éviter toute écriture pendant l'opération.
2. Lancer :

   ```bash
   scripts/deploy-colis.sh
   ```

   Il enchaîne `backup-db.sh`, `migrate.sh`, puis vérifie que les tables `carriers` et `parcels` existent, que les colonnes `parcel_id` sont là et que les 4 transporteurs sont présents (Mondial Relay, Vinted Go, Chronopost, Colissimo).

3. Démarrer la nouvelle version du code, ouvrir la section Colis et ajouter un colis de test.

Pour faire les étapes une par une : `scripts/backup-db.sh`, puis `scripts/migrate.sh` (qui refuse de tourner sans sauvegarde récente).

## En cas d'échec

Dans tous les cas, noter le nom du dump affiché par `backup-db.sh` : c'est le point de retour.

- La sauvegarde échoue : rien n'a été modifié, aucun fichier vide n'est conservé. Corriger `DATABASE_URL` ou l'accès réseau et relancer.
- `migrate.sh` refuse : pas de sauvegarde récente, lancer `scripts/backup-db.sh`.
- La migration échoue : drizzle l'applique dans une transaction, la base reste en l'état d'avant. Lire l'erreur, corriger, relancer `scripts/migrate.sh`. Si le doute persiste, restaurer (ci-dessous).
- La vérification échoue après migration : ne pas démarrer l'appli, faire le retour arrière.

### Retour arrière de 0007 (garde les données ajoutées depuis)

```bash
scripts/rollback-0007.sh
```

Il exige une sauvegarde récente, vérifie que 0007 est bien la dernière migration appliquée, affiche ce qui sera supprimé (colis, photos de code-barres, tables `parcels` et `carriers`) et demande confirmation. Il exécute `drizzle/rollback/0007_add_parcels.down.sql` puis oublie la migration pour qu'elle puisse être rejouée. Les fichiers `/images/<uuid>.webp` des code-barres restent sur le disque, sans effet. Redéployer ensuite la version précédente du code.

### Restauration complète (revient à l'état de la sauvegarde)

```bash
scripts/restore-db.sh backups/sellio-<date>.dump
```

Vide les schémas `public` et `drizzle` puis rejoue le dump en une transaction (une migration appliquée depuis la sauvegarde disparaît donc aussi, et peut être rejouée). Remplace tout le contenu de la base : les données ajoutées depuis la sauvegarde sont perdues. Arrêter l'appli avant, puis redéployer la version précédente du code.

## Tester avant la prod

Sur une copie de la base (restaurer un dump récent dans une base de test, `DATABASE_URL` pointant dessus), jouer : `scripts/deploy-colis.sh`, `scripts/rollback-0007.sh`, `scripts/restore-db.sh`.

`scripts/test-restore-chain.sh` rejoue tout l'enchaînement (sauvegarde, 0007, restauration, re-migration, rollback, dump tronqué) et vérifie chaque étape. Il réécrit entièrement la base ciblée, qui doit être vide et jetable.
