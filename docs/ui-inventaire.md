# Inventaire des écrans et parcours (référence de non-régression)

Source : code de `master` (SvelteKit + remote functions, Postgres/Drizzle). Tout est en français, montants en euros (format `fr-FR`), stockés en centimes. Pas d'authentification dans l'appli.

## 1. Cycle de vie d'un article

Statuts (`listing_status_history`, le dernier fait foi) :

| Code                    | Nom technique | Libellé            | Écran                                                                            |
| ----------------------- | ------------- | ------------------ | -------------------------------------------------------------------------------- |
| 0 (ou aucun historique) | purchased     | À récupérer        | `/to-collect`                                                                    |
| 6                       | stocked       | En stock           | `/stock`                                                                         |
| 1                       | listed        | En vente           | `/listed`                                                                        |
| 2                       | to_ship       | À expédier         | `/to-ship`                                                                       |
| 3                       | shipped       | Expédié            | `/shipped`                                                                       |
| 4 / 5                   | —             | Terminé / Retourné | aucun écran dédié (éditable via le statut, exclus ou comptés selon le dashboard) |

Parcours nominal : création (`/to-collect/insert`) → Valider (lieu de stockage) → Valider (prix de mise en vente) → Valider (prix vendu, code de référence) → Expédié.

## 2. Routes

| Route                            | Type | Rôle                                                                                                                                                                                   |
| -------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                              | page | Dashboard                                                                                                                                                                              |
| `/to-collect`                    | page | Articles à récupérer                                                                                                                                                                   |
| `/to-collect/insert`             | page | Formulaire d'ajout d'un article                                                                                                                                                        |
| `/stock`                         | page | Articles en stock                                                                                                                                                                      |
| `/listed`                        | page | Articles en vente                                                                                                                                                                      |
| `/to-ship`                       | page | Articles vendus à expédier                                                                                                                                                             |
| `/shipped`                       | page | Articles expédiés                                                                                                                                                                      |
| `/expenses`                      | page | Dépenses                                                                                                                                                                               |
| `PUT /api/listings/[id]`         | API  | Enregistrement de l'édition d'un article (multipart : `article` JSON + `manifest` + `photos`). Refuse si l'`Origin` ≠ origine (403) ; 409 si version périmée ; 400 si photos invalides |
| `POST /api/listings/[id]/images` | API  | Ajout de photos après création                                                                                                                                                         |
| `GET /images/[file]`             | API  | Sert une photo `.webp` (404 si inconnue, cache 1 h)                                                                                                                                    |

Layout commun (`+layout.svelte`) : navigation `Navbar`.

## 3. Éléments transverses

### Navbar

- 3 entrées : Tableau de bord, Articles, Dépenses. « Articles » est active sur les 5 routes de statut (`/to-collect`, `/stock`, `/listed`, `/to-ship`, `/shipped`) et leurs sous-routes ; `/` est strict.
- Desktop : barre latérale repliable (icônes seules, état en `localStorage`, appliqué avant le premier rendu), « + Nouvel article » en haut, thème en bas. Mobile : tab bar Dashboard, Articles, +, Dépenses.

### Cartes article et piles (`ListingStacks`)

- Les articles ayant même modèle + taille + couleur sont regroupés en pile (effet visuel décalé). Un bouton `▱ N ↓/↑` déplie/replie ; déplié, le groupe occupe toute la largeur.
- Grille : 1 colonne mobile, 2 (sm), 3 (xl), 4 (2xl).
- Les 5 listes sont triées par `id` décroissant.
- Chaque carte : galerie photo, boutons Modifier / Supprimer en haut à gauche, action principale « ✓ » en haut à droite, marque · modèle, taille · couleur.
- États communs : « Chargement des commandes… », erreur `role=alert` + bouton « Réessayer », message vide spécifique.

### Galerie (`ListingGallery`)

- Affiche la photo (la couverture en premier), flèches ‹ › et compteur « i / n » si plusieurs photos, retour à la 1re photo quand les photos changent.
- Sans photo ou en erreur : placeholder (icône + marque + modèle).

### Édition / suppression (`ListingEditor`, depuis #19 dans le panneau latéral `ArticleDetail`)

- Ouverture : chargement de l'article (« Chargement… », ou erreur « Impossible de charger cet article »).
- Champs : marque, modèle (désactivé sans marque, remis à zéro si la marque change), taille, couleur, stockage, statut (7 valeurs), prix acheté, frais de port d'achat, prix de mise en vente, prix vendu, photos.
- Validation (message ambre, bouton désactivé) :
  - marque/modèle/taille/couleur obligatoires ;
  - prix d'achat et port renseignés et ≥ 0 ;
  - statut 1 à 5 : prix de mise en vente ≥ 0,01 ; statut ≥ 1 : lieu de stockage ; statut 2 à 5 : prix vendu ≥ 0,01 ;
  - photos en cours de vérification → bloqué.
- Référence : affichée si existante ; message « Une référence sera générée à l'enregistrement » pour statut 2-4 sans référence.
- Concurrence : contrôle de version, message d'erreur si l'article a changé.
- Suppression : confirmation « Supprimer {marque} · {modèle} ? … définitive », contrôle de version, supprime l'article, son historique, sa référence et les photos devenues inutiles.
- Après enregistrement/suppression : rafraîchissement de toutes les listes et du dashboard.
- Fermeture (Échap) bloquée pendant l'enregistrement.

### Photos (`PhotoPicker`, `ModelPhotos`)

- Formats JPG, PNG, WebP uniquement ; max 12 photos par article ; max 10 Mo par photo ; max 30 Mo par envoi ; vérification que le contenu correspond au type.
- Photo de couverture choisissable (bouton « Couverture », badge sur la couverture) ; retrait d'une photo ; si la couverture est retirée, la 1re photo devient couverture.
- Côté serveur : conversion en WebP, redimensionnement 1600 px max (sans agrandissement).
- Réutilisation des photos du modèle : quand un modèle est choisi, ses photos existantes sont pré-chargées (« Chargement des photos du modèle… ») ; erreur non bloquante si échec ; les photos réutilisées sont remplacées si le modèle change, mais les photos ajoutées à la main sont conservées.

### Autocomplete

- Champs marque, modèle, taille, couleur, lieu de stockage, catégorie de dépense : recherche par préfixe (insensible à la casse), pagination `offset/limit` (limite 50 max), possibilité de saisir une valeur nouvelle (créée à la validation si `uuid` nul).

## 4. Écrans, par priorité de refonte

<!-- prettier-ignore-start -->

Ordre proposé : du plus transverse (briques réutilisées) au plus isolé, en gardant le dashboard pour la fin car il dépend des données de tous les autres.

| Priorité | Écran / brique                                                                                     | Justification                                                                      |
| -------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| P0       | Layout + Navbar, composants communs (Autocomplete, cartes/piles, galerie, photos, `ListingEditor`) | Utilisés par tous les écrans                                                       |
| P1       | `/to-collect/insert` (ajout)                                                                       | Point d'entrée de toutes les données                                               |
| P1       | `/to-collect`, `/stock`, `/listed`                                                                 | Même structure de carte, transitions modales                                       |
| P2       | `/to-ship`, `/shipped`                                                                             | Même structure + bénéfice/multiplicateur                                           |
| P2       | `/expenses`                                                                                        | Isolé, simple                                                                      |
| P3       | `/` Dashboard                                                                                      | Le plus complexe (calculs, graphe SVG) ; dépend des autres écrans pour ses données |

### 4.1 Layout + Navbar (P0)

Voir §3. À conserver : 3 entrées, ordre, actif (Articles sur les 5 routes de statut), version mobile.

### 4.2 `/to-collect/insert` — Ajouter un article (P1)

Données saisies : marque, modèle, taille, couleur (autocomplete, 5 suggestions), prix de l'article (€), frais de port (€), photos.
À conserver :

- Bouton « Confirmer » désactivé tant que : un champ texte est vide, prix ou port vide/négatif (0 accepté), photos en cours de vérification.
- Le modèle est désactivé sans marque et réinitialisé si la marque change ; ses suggestions sont filtrées par marque.
- Les photos du modèle choisi sont proposées automatiquement (cf. §3).
- Au clic : création de l'article en statut « À récupérer » (marque/modèle/taille/couleur inconnus créés à la volée), puis envoi des photos, puis rafraîchissement des vues et redirection vers `/to-collect`.
- Si l'envoi des photos échoue, l'article est déjà créé : message « L'article est enregistré, mais les photos n'ont pas été ajoutées », le formulaire est verrouillé (fieldset désactivé) et un nouveau clic ne crée pas de doublon (réessai des photos seulement).
- Libellé du bouton « Ajout en cours… » pendant l'envoi.

### 4.3 `/to-collect` — À récupérer (P1)

- En-tête (commun aux 5 statuts, #16) : titre « Articles », onglets de statut, bouton « + Ajouter » → `/to-collect/insert`. Le détail d'un article s'ouvre dans le panneau latéral (§ Panneau latéral d'article).
- Carte : galerie, marque · modèle, taille · couleur, « Prix acheté », « Port : X ».
- Inclut les articles sans historique de statut.
- Action « Récupéré » → modale « Récupérer l'article » : champ « Lieu de stockage » (autocomplete, obligatoire, création possible). Valider → statut En stock, lieu enregistré, toast « {article} récupéré, placé en stock. ». Erreur si l'article n'est plus à récupérer. Vide : « Aucune commande à récupérer. »

### 4.4 `/stock` — Stock (P1)

- Carte : + « Stockage : X » (ou « Non renseigné »), « Achat total » (achat + port).
- Action « Mettre en vente » → modale « Mettre l'article en vente » : « Prix de mise en vente (€) » ≥ 0,01. Valider → statut En vente. Erreur si l'article n'est plus en stock ou sans lieu. Vide : « Aucun article en stock. »

### 4.5 `/listed` — En vente (P1)

- Carte : stockage, « Achat total », « Prix de vente » (— si absent).
- Action « Vendu » → modale « Enregistrer la vente » : « Prix vendu (€) » ≥ 0,01. Valider → statut À expédier, génération (ou réutilisation) d'un code de référence unique, affiché en grand dans la modale « Vente enregistrée » avec bouton « Fermer ».
- Garde-fous serveur : article encore en vente, prix de mise en vente et stockage renseignés. Vide : « Aucun article en vente. »

### 4.6 `/to-ship` — À expédier (P2)

- Carte : « Réf. {code} » (ou « Non renseignée »), stockage, « Achat total », « Prix vendu », « Bénéfice » (vendu − achat total, rouge si négatif, vert sinon), « Multiplicateur » (×N, 2 décimales max, — si achat total nul avec infobulle explicative).
- Action « Expédié » directe (sans modale) : désactivée et « Validation… » pendant l'appel ; toast « {article} expédié. » ; erreur affichée en haut de page. Garde-fous serveur : statut À expédier, prix vendu, prix de mise en vente et stockage. Vide : « Aucun article à expédier. »

### 4.7 `/shipped` — Expédié (P2)

- Mêmes données que `/to-ship` sans la référence ni l'action (seul le bouton de pile est présent). Vide : « Aucun article expédié. » (Recherche sans résultat : « Aucun article ne correspond à ta recherche. »)

### 4.8 `/expenses` — Dépenses (P2)

- (UX v2, #18) Tableau dense Date / Catégorie / Nom / Montant, recherche (nom ou catégorie), filtre par catégories en chips et total de la sélection en haut ; barre d'outils collante avec « + Ajouter » toujours visible ; Toast « Dépense ajoutée » après ajout. Date absente = « — » (infobulle « Date non renseignée »). Autres règles ci-dessous inchangées.
- Liste triée par date de création décroissante : badge catégorie, nom, prix, date (`fr-FR`, fuseau Europe/Paris) ou « Date non renseignée ».
- Bouton « + Ajouter » → modale « Ajouter une dépense » : catégorie (autocomplete, création possible), nom, prix (€, ≥ 0,01). Bouton désactivé tant que invalide ; « Ajout… » pendant l'envoi ; erreur « Impossible d'ajouter la dépense… ». Le formulaire est réinitialisé à chaque ouverture.
- Un même nom peut exister dans des catégories différentes. Après ajout : liste et dashboard rafraîchis.
- Vide : « Aucune dépense enregistrée. » Erreur de chargement + « Réessayer ».
- Pas de modification ni suppression de dépense.

### 4.9 `/` — Dashboard (P3)

Sélecteur d'année (années présentes dans les données + année courante, ordre décroissant, défaut = année courante Europe/Paris).

Règles de calcul à conserver (voir `src/lib/dashboard/metrics.ts`) :

- Une vente est comptée si statut ∈ {2, 3, 4}, prix vendu renseigné et date de passage en « À expédier » dans l'année ; les articles retournés (5) sont exclus.
- Date d'achat = premier passage au statut 0 ; date de vente = premier passage au statut 2 (mois en Europe/Paris).
- Bénéfice article = prix vendu − achat − port d'achat.
- Multiplicateur = moyenne de prix vendu ÷ (achat + port) ; ventes à coût nul exclues de la moyenne (et comptées dans la note de bas de page).

Blocs :

1. Quatre cartes : Revenus (+ nombre d'articles vendus, accord singulier/pluriel), Bénéfice des articles, Bénéfice moyen / article (— si aucune vente), Multiplicateur moyen (×N, — si aucune donnée).
2. « Potentiel des articles en vente » : total des prix de mise en vente, bénéfice potentiel (prix affichés − achats − ports), nombre d'articles en vente (toutes années).
3. Graphe SVG « Revenus et dépenses par mois » : 12 mois, par mois une barre verte de revenus et une barre empilée (Achats d'articles, Frais de port d'achat, Autres dépenses) ; échelle auto sur 5 graduations (min 100 €) en format compact ; infobulles par barre ; légende ; défilement horizontal en mobile ; message « Aucune activité datée pour cette année. » si tout est à zéro ; titre/description accessibles.
4. « Répartition des dépenses » : toujours 3 lignes fixes (pas les catégories saisies dans `/expenses`) : Achats d'articles, Frais de port d'achat, Autres dépenses (= somme des dépenses de `/expenses`). Pour chacune : montant de l'année + barre proportionnelle. « Total dépenses » = achats + ports + autres dépenses de l'année.
5. Deux blocs distincts (ex-« Vue d'ensemble », scindée en #17) :
   - « Pipeline » : barre segmentée proportionnelle aux compteurs par statut (À récupérer, En stock, En vente, À expédier, Expédié), un segment par statut non vide, et au-dessous une tuile cliquable par statut (vers l'onglet Articles correspondant) avec le compteur et une pastille de la couleur de son segment (#19) pour lire la barre. Les compteurs portent sur toutes les années.
   - « Résultat » : « Bénéfice après dépenses » (bénéfice articles − autres dépenses de l'année) et « Solde revenus − dépenses » = revenus de l'année − total dépenses, où le total inclut les achats et ports de tous les articles achetés dans l'année, quel que soit leur statut (à récupérer, en stock, vendus, retournés…). Le libellé de l'UI (« inclut aussi les achats des articles encore en stock ») est approximatif : c'est la règle réelle qui fait foi.
6. Détail repliable « Détail des montants mensuels » : tableau Mois / Revenus / Dépenses / Solde.
7. Note de bas de page : règles de comptage + avertissements conditionnels (ventes sans coût d'achat exclues, dépenses sans date et montant exclus, achats sans date). Note : la date d'une dépense vient de `created_at`, donc « dépenses sans date » n'arrive en pratique jamais (inutile de chercher à le reproduire) ; un achat sans date correspond à un article sans historique de statut 0.
   États : chargement (« Chargement des statistiques… »), erreur + « Réessayer ».

<!-- prettier-ignore-end -->

## 5. Modèle de données affiché (pour mémoire)

Article : marque, modèle, taille, couleur, lieu de stockage, prix d'achat, frais de port d'achat, prix de mise en vente, prix vendu, référence (code d'étiquette), photos (couverture, ordre), historique de statuts. Dépense : catégorie, nom, prix, date.

## 6. Checklist de non-régression (QA)

Cocher chaque ligne sur l'ancienne et la nouvelle version, en desktop et mobile.

### Navigation

- [ ] 3 entrées dans l'ordre (Tableau de bord, Articles, Dépenses) ; clic → bonne page ; « Articles » actif sur `/to-collect`, `/stock`, `/listed`, `/to-ship`, `/shipped` et `/to-collect/insert`.
- [ ] Desktop : barre latérale avec « + Nouvel article » en haut (→ `/to-collect/insert`) et le thème en bas ; bouton de repli → icônes seules (libellés en infobulle), état conservé après rechargement sans saut de mise en page.
- [ ] Mobile : tab bar en bas (Dashboard, Articles, +, Dépenses), cibles tactiles ≥ 44 px, « + » → `/to-collect/insert`.
- [ ] Toutes les URL existantes répondent toujours (aucune redirection).

### Création d'un article

- [ ] Bouton Confirmer désactivé avec champ vide / prix vide / prix négatif ; activé avec prix = 0.
- [ ] Modèle désactivé sans marque ; changer de marque vide le modèle.
- [ ] Marque, modèle, taille, couleur nouveaux : créés et proposés ensuite dans l'autocomplete.
- [ ] Choisir un modèle ayant déjà des photos : elles sont proposées ; en ajouter à la main puis changer de modèle conserve les photos manuelles.
- [ ] Ajout de photos : JPG/PNG/WebP OK ; autre format refusé ; > 12 photos, > 10 Mo / photo, > 30 Mo total refusés avec le bon message ; fichier au type falsifié refusé.
- [ ] Choix de la couverture, retrait d'une photo (la couverture se reporte sur la 1re).
- [ ] Après confirmation : redirection `/to-collect`, article visible avec ses photos et ses prix.
- [ ] Échec simulé de l'envoi des photos : message, formulaire verrouillé, pas de doublon au réessai.

### Transitions

- [ ] À récupérer → Récupéré sans lieu : bouton désactivé ; avec lieu existant ou nouveau : l'article passe en Stock avec le lieu.
- [ ] Stock → Mettre en vente : prix < 0,01 impossible ; ensuite l'article apparaît dans En vente avec le bon prix.
- [ ] En vente → Vendu : prix vendu requis ; code de référence affiché ; l'article apparaît dans À expédier avec la même référence.
- [ ] À expédier → Expédié : passe dans Expédié, bouton désactivé pendant l'appel.
- [ ] Un article déjà transitionné (autre onglet) : message d'erreur, pas de double transition.
- [ ] Compteurs du dashboard mis à jour après chaque transition.

### Affichage des listes

- [ ] Pour chaque écran : champs de la carte conformes au §4 ; « Non renseigné » / « — » si donnée absente.
- [ ] Bénéfice rouge si négatif, vert sinon ; multiplicateur « — » si achat total = 0 ; arrondi 2 décimales.
- [ ] Piles : articles de même modèle/taille/couleur regroupés, dépliage/repliage, nombre correct, grille responsive.
- [ ] Tri : plus récent d'abord.
- [ ] Galerie : flèches et compteur seulement si > 1 photo ; placeholder sans photo.
- [ ] Messages de chargement, d'erreur + Réessayer, et de liste vide pour chaque écran.

### Panneau latéral d'article (#19)

- [ ] Clic sur une ligne (liste) ou une carte (grille) ouvre un panneau à droite (480 px, plein écran en mobile) ; l'URL reçoit `?id=<uuid>` en conservant recherche, tri et filtres.
- [ ] Une URL avec `?id=` collée dans un nouvel onglet ouvre directement le panneau ; un `id` inconnu est retiré sans erreur.
- [ ] Bouton retour du navigateur : ferme le panneau (et rouvrir par « suivant » le rouvre). La croix et Échap ferment aussi.
- [ ] Le panneau montre galerie, marque · modèle, taille · couleur, stockage, achat total, prix de mise en vente / vendu, bénéfice, multiplicateur, référence, et l'action de l'étape (Récupéré, Mettre en vente, Vendu, Expédié) quand il y en a une.
- [ ] « Modifier » passe le panneau en formulaire (mêmes règles que l'ancienne modale : validations, version, photos) ; Annuler revient au détail ; Enregistrer met listes et dashboard à jour.
- [ ] Pendant l'enregistrement ou la suppression : Échap et croix sans effet, champs verrouillés.
- [ ] « Supprimer » demande confirmation (modale) ; version périmée refusée ; après suppression le panneau se ferme.
- [ ] Mobile : panneau plein écran, contenu défilable jusqu'en bas.

### Édition / suppression

- [ ] Formulaire d'édition (dans le panneau) pré-rempli ; modifier chaque champ et vérifier la persistance et le déplacement dans la bonne liste quand le statut change.
- [ ] Messages de validation selon le statut (prix de mise en vente, lieu, prix vendu).
- [ ] Référence existante affichée ; message de génération pour statut 2-4 sans référence.
- [ ] Modification concurrente (2 onglets) : refus avec message.
- [ ] Gestion des photos dans l'éditeur (ajout, retrait, couverture, ordre).
- [ ] Suppression : confirmation, article et photos disparus, listes et dashboard à jour ; version périmée refusée.
- [ ] `PUT /api/listings/[id]` avec un `Origin` externe → 403.

### Dépenses

- [ ] Liste triée récent → ancien ; badge catégorie, nom, prix, date ou « Date non renseignée ».
- [ ] Ajout : bouton désactivé si catégorie/nom vides ou prix < 0,01 ; nouvelle catégorie créée ; même nom dans deux catégories OK ; formulaire vide à chaque ouverture.
- [ ] Après ajout : la dépense apparaît, le dashboard est mis à jour.

### Dashboard

- [ ] Changer d'année met à jour toutes les valeurs ; années listées correctes.
- [ ] Jeu de données de test avec résultats attendus calculés à la main : revenus, bénéfice, bénéfice moyen, multiplicateur (avec une vente à coût nul), potentiel, répartition en 3 lignes fixes (achats, ports, autres dépenses) et total, bénéfice après dépenses, solde (achats + ports de tous les articles achetés dans l'année, tous statuts).
- [ ] Une vente d'un autre mois/année est comptée dans le bon mois/la bonne année ; un article retourné est exclu.
- [ ] Graphe : 12 barres de revenus, empilement des 3 catégories, graduations compactes, infobulles, scroll horizontal mobile, message d'absence d'activité.
- [ ] Pipeline : barre segmentée (pas de segment pour un statut à 0), pastille de couleur devant chaque statut identique à son segment, tuiles cliquables vers les bons écrans.
- [ ] Bloc « Résultat » : bénéfice après dépenses et solde conformes au jeu de données.
- [ ] Tableau mensuel repliable cohérent avec le graphe.
- [ ] Notes conditionnelles (achats sans date, ventes sans coût ; « dépenses sans date » non reproductible, la date vient de `created_at`).
- [ ] Erreur de chargement → message + Réessayer.

### Images

- [ ] `/images/<uuid>.webp` connu → 200 `image/webp` ; nom invalide ou inconnu → 404.

## Espace Articles unifié (#16)

Les écrans §4.3 à 4.7 (À récupérer, Stock, En vente, À expédier, Expédié) partagent désormais le layout `src/routes/(articles)/+layout.svelte`, titre unique « Articles ». Les règles métier des transitions sont inchangées ; seuls les libellés d'action changent (« ✓ Valider » / « ✓ Expédié » deviennent des actions nommées, avec Toast au succès).

- Onglets : 5 statuts avec compteurs, URL inchangées (`/to-collect`, `/stock`, `/listed`, `/to-ship`, `/shipped`).
- Recherche (`?q=`) sur marque, modèle, taille, couleur, stockage, référence ; insensible à la casse et aux accents, tous les mots doivent correspondre.
- Filtres en chips : marque (`?brand=`) et stockage (`?place=`, absent sur À récupérer). Un filtre actif reste affiché même si plus aucun article ne correspond, et « Réinitialiser les filtres » apparaît quand rien ne correspond.
- Tri (`?sort=`) : plus récents (défaut), prix croissant/décroissant, bénéfice (À expédier et Expédié seulement).
- Recherche, filtres et tri sont perdus au changement d'onglet.
- Vue liste (défaut, piles en lignes « ×N » dépliables) ou grille (cartes et piles), choix mémorisé en localStorage (`articles-view`). La vue liste n'a pas de photo.
- Actions : À récupérer → « Récupéré », Stock → « Mettre en vente », En vente → « Vendu », À expédier → « Expédié ».
