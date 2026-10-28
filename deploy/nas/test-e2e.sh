#!/usr/bin/env bash
# Test de bout en bout de update.sh avec la vraie pile : docker compose, postgres:17-alpine, image construite
# depuis le Dockerfile, registre local. Rejoue : installation, migration 0007 automatique, déjà à jour,
# échec de migration (l'ancienne version reste en ligne), reprise avec --retry.
# Nécessite docker, docker compose, flock. Utilise le port 2509, les volumes sellio_nas_* et le port 5000 : à ne PAS lancer sur le NAS.
# Usage : bash deploy/nas/test-e2e.sh
set -Eeuo pipefail

repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/sellio-e2e.XXXXXX")"
registry=localhost:5000
export SELLIO_IMAGE="$registry/sellio:latest" SELLIO_IMAGE_PREFIX="$registry/"

step() { printf '\n##### %s\n' "$*"; }
fail() { echo "ÉCHEC : $*" >&2; exit 1; }
compose() { (cd "$work" && docker compose --env-file .env -f compose.yml "$@"); }
sql() { compose exec -T db psql -U sellio -d sellio -X -v ON_ERROR_STOP=1 -tA "$@"; }
update() { (cd "$work" && bash update.sh "$@"); }
backups() { find "$work/backups" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l; }
app_image() { docker inspect --format '{{.Config.Image}}' "$(compose ps -q app)"; }
app_health() { docker inspect --format '{{.State.Health.Status}}' "$(compose ps -q app)"; }
publish() { # publish N : construit une image distincte (étiquette) et la pousse sur le registre local
  docker build -q --label "e2e=$1" -t "$SELLIO_IMAGE" "$repo" >/dev/null
  docker push -q "$SELLIO_IMAGE" >/dev/null
}
cleanup() {
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  docker volume rm -f sellio_nas_postgres_data sellio_nas_images_data >/dev/null 2>&1 || true
  docker rm -f sellio-e2e-registry >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

cp "$repo"/deploy/nas/{update.sh,compose.yml} "$work/"
printf 'SELLIO_IMAGE=%s\nPOSTGRES_PASSWORD=%s\nORIGIN=http://localhost:2509\n' "$SELLIO_IMAGE" "$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')" >"$work/.env"
docker run -d --name sellio-e2e-registry -p 5000:5000 registry:2 >/dev/null

step "0. Installation : image 1 sur une base vide (toutes les migrations)"
publish 1
update
[[ "$(app_health)" == healthy ]] || fail "app non saine"
[[ "$(sql -c "SELECT to_regclass('public.parcels') IS NOT NULL")" == t ]] || fail "0007 non appliquée à l'installation"
echo "OK : installée, $(sql -c 'SELECT count(*) FROM drizzle.__drizzle_migrations') migrations"

step "1. Retour au schéma 0006 (état de la prod avant la livraison), puis image 2 : 0007 doit s'appliquer seule"
sql <"$repo/drizzle/rollback/0007_add_parcels.down.sql" >/dev/null
[[ "$(sql -c "SELECT to_regclass('public.parcels') IS NOT NULL")" == f ]] || fail "retour à 0006 impossible"
sql -c "INSERT INTO brands (name) VALUES ('AvantMigration') RETURNING 1" >/dev/null
before=$(backups)
publish 2
update
image2=$(cat "$work/.state/deployed-image")
[[ "$(sql -c "SELECT to_regclass('public.parcels') IS NOT NULL")" == t ]] || fail "0007 non appliquée"
[[ "$(sql -c 'SELECT count(*) FROM carriers')" == 4 ]] || fail "transporteurs absents"
[[ "$(sql -c "SELECT count(*) FROM brands WHERE name='AvantMigration'")" == 1 ]] || fail "donnée perdue"
[[ "$(app_image)" == "$image2" && "$(app_health)" == healthy ]] || fail "nouvelle version non démarrée ou non saine"
(( $(backups) == before + 1 )) || fail "une sauvegarde aurait dû être créée"
dump=$(find "$work/backups" -name database.dump -newer "$work/.env" | sort | tail -n 1)
[[ -s "$dump" ]] || fail "dump vide"
echo "OK : 0007 appliquée, app saine sur $image2, sauvegarde $dump ($(wc -c <"$dump") octets)"

step "2. Rien de nouveau : déjà à jour, pas de nouvelle sauvegarde"
before=$(backups)
update | tee "$work/out.log"
grep -q 'already up to date' "$work/out.log" || fail "message « déjà à jour » absent"
(( $(backups) == before )) || fail "sauvegarde inutile créée"
echo OK

step "3. Échec de migration : image 3, mais une table carriers préexistante fait échouer 0007"
sql <"$repo/drizzle/rollback/0007_add_parcels.down.sql" >/dev/null
sql -c 'CREATE TABLE carriers (id int)' >/dev/null
old_container=$(compose ps -q app)
before=$(backups)
publish 3
if update >"$work/out.log" 2>&1; then cat "$work/out.log"; fail "update.sh aurait dû échouer"; fi
cat "$work/out.log"
[[ "$(compose ps -q app)" == "$old_container" && "$(app_image)" == "$image2" && "$(app_health)" == healthy ]] || fail "l'ancienne version n'est plus en ligne"
[[ "$(cat "$work/.state/deployed-image")" == "$image2" ]] || fail "deployed-image modifié"
[[ "$(cat "$work/.state/failed-image")" != "$image2" ]] || fail "image en échec non marquée"
grep -qi 'already exists' "$work/.state/last-error.log" || fail "erreur de migration absente de last-error.log"
(( $(backups) == before + 1 )) || fail "la sauvegarde d'avant migration aurait dû être conservée"
echo "OK : ancienne version toujours en ligne ($(app_image)), échec visible"

step "4. Réexécution sans --retry : refusée ; après correction, --retry réussit"
if update >"$work/out.log" 2>&1; then fail "une image en échec ne doit pas être rejouée sans --retry"; fi
sql -c 'DROP TABLE carriers' >/dev/null
update --retry
[[ "$(sql -c "SELECT to_regclass('public.parcels') IS NOT NULL")" == t && "$(app_health)" == healthy ]] || fail "reprise incomplète"
[[ "$(cat "$work/.state/deployed-image")" != "$image2" ]] || fail "image 3 non déployée"
[[ ! -e "$work/.state/failed-image" ]] || fail "failed-image aurait dû être effacé"
echo OK

printf '\n##### TOUT EST OK\n'
