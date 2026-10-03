# Sellio sur UGREEN DXP2800

GitHub construit une image Linux AMD64 à chaque push sur `master`. Le NAS récupère `ghcr.io/enzoblain/sellio:latest` et déploie son empreinte exacte. Les migrations et l’application utilisent donc toujours la même version.

## Première installation

1. Envoyer ces fichiers sur la branche `master` de `enzoblain/Sellio`. Attendre que **Actions → Publish Sellio for NAS** réussisse.
2. Sur GitHub, ouvrir le package `sellio` du compte `enzoblain`, puis **Package settings → Change visibility → Public**. Un dépôt public ne rend pas automatiquement son image publique. Si le package existe déjà, vérifier que le dépôt possède le droit d’écriture dans **Manage Actions access**.
3. Installer/activer Docker et SSH sur le NAS. Se connecter en SSH avec un compte autorisé à exécuter Docker. Vérifier `docker compose version`, `bash --version` et `flock --version`. Compose doit prendre en charge `up --wait`.
4. Copier le contenu du dossier `deploy/nas` dans un dossier permanent du NAS, par exemple `/volume1/docker/sellio`. Adapter ce chemin à celui de ton NAS.
5. Dans ce dossier :

```bash
cp .env.example .env
openssl rand -hex 32
```

Mettre la valeur générée dans `POSTGRES_PASSWORD` du fichier `.env`. Mettre dans `ORIGIN` l’adresse exacte utilisée dans le navigateur, par exemple `http://192.168.1.50:2509`, sans slash final. Pour un domaine HTTPS, utiliser `https://sellio.exemple.fr`. Garder ce fichier uniquement sur le NAS.

```bash
chmod 600 .env
bash update.sh
```

L’application écoute sur le port 2509 du NAS. Cette installation n’ajoute pas d’authentification : utiliser le réseau local ou un VPN, ou une protection d’accès adaptée avant de l’exposer sur Internet.

## Mises à jour automatiques

Créer une tâche planifiée qui exécute toutes les cinq minutes, avec le même compte Docker :

```bash
bash /volume1/docker/sellio/update.sh >> /volume1/docker/sellio/update.log 2>&1
```

Si ta version d’UGOS ne propose pas de planificateur, utiliser `crontab -e` via SSH et ajouter, en adaptant le chemin et le PATH à ton installation :

```text
*/5 * * * * /bin/bash /volume1/docker/sellio/update.sh >> /volume1/docker/sellio/update.log 2>&1
```

Ne pas créer les deux tâches. Le script verrouille les exécutions simultanées et ne redéploie pas une image déjà installée et saine. Il doit pouvoir appeler `docker` depuis le PATH de la tâche planifiée.

À chaque nouvelle image, le script :

1. Télécharge la version avant de toucher à l’application.
2. Arrête brièvement Sellio pour éviter des écritures pendant la sauvegarde.
3. Sauvegarde PostgreSQL, les photos et la configuration dans `backups/<date>/`.
4. Applique les migrations puis les données de référence.
5. Démarre Sellio et vérifie son état de santé.

La base et les images sont conservées dans les volumes externes `sellio_nas_postgres_data` et `sellio_nas_images_data`. Le script ne les supprime jamais. Il ne met pas automatiquement PostgreSQL à jour et ne lance pas `db:push`.

Les changements du Compose, du script et de `.env` ne sont pas récupérés automatiquement : recopier ces fichiers lorsqu’ils changent. Les changements du code et les nouvelles migrations sont intégrés à l’image Docker automatiquement.

## En cas d’échec

Consulter `update.log` et `.state/last-error.log`. Si une migration échoue, l’application reste arrêtée. Une version déjà marquée en échec ne sera pas réessayée automatiquement ; corriger la cause puis lancer :

```bash
bash update.sh --retry
```

Une nouvelle image peut aussi être déployée après correction du code. Les sauvegardes ne sont pas purgées automatiquement : contrôler l’espace disponible et copier les sauvegardes vers un autre support. Elles contiennent les données et le mot de passe de la base ; conserver leurs permissions privées.

Revenir à une ancienne image ne restaure pas le schéma de la base. En cas de restauration, arrêter l’application, restaurer le dump avec `pg_restore` et les photos de la même sauvegarde, puis relancer l’image indiquée dans `previous-image`. Ne pas restaurer automatiquement une sauvegarde : cela peut perdre les données ajoutées depuis.

## Données présentes sur l’ordinateur

La première installation sur le NAS crée une base vide. Pour transférer les articles existants, exporter PostgreSQL et les photos depuis l’ordinateur, puis les importer dans les volumes du NAS avant le premier démarrage de l’application. Copier le code ne copie pas ces données.

## Changer la structure de la base

Générer une nouvelle migration avec un nom descriptif :

```bash
npm run db:generate -- --name=add_listing_field
```

Relire et tester le SQL sur une copie de la base existante, puis envoyer le code, le SQL et les fichiers `drizzle/meta` ensemble. Le workflow teste aussi l’installation des migrations sur une base vide. Ce test ne garantit pas à lui seul qu’une migration préserve toutes les données existantes.
