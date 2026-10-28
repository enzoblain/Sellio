#!/usr/bin/env bash
# Teste update.sh avec un faux `docker` (aucun conteneur lancé) : ordre des étapes, échecs, rétention.
# Usage : bash deploy/nas/test-update.sh
set -Eeuo pipefail

src="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d "${TMPDIR:-/tmp}/test-update.XXXXXX")"
trap 'rm -rf "$work"' EXIT
mkdir "$work/bin" "$work/site"
digest=ghcr.io/example/sellio@sha256:0000000000000000000000000000000000000000000000000000000000000001

# Faux docker : consigne chaque appel dans $STUB_LOG ; STUB_FAIL choisit l'étape qui échoue.
cat >"$work/bin/docker" <<'STUB'
#!/usr/bin/env bash
echo "docker $*" >>"$STUB_LOG"
case "$*" in
*"config --images"*) printf 'ghcr.io/example/sellio:latest\npostgres:17-alpine\n' ;;
"image inspect"*) echo "$STUB_DIGEST" ;;
*"ps -q app"*) ;;
*"exec -T db pg_dump"*) [[ "$STUB_FAIL" == backup ]] && exit 1; [[ "$STUB_FAIL" == empty ]] || echo DUMP ;;
*"run --rm --no-deps -T migrate"*) [[ "$STUB_FAIL" == migrate ]] && { echo 'migration boom'; exit 1; } ;;
*"up -d --no-deps --wait app"*) [[ "$STUB_FAIL" == health && "$(grep -c 'wait app' "$STUB_LOG")" == 1 ]] && exit 1 ;;
"run --rm --network none"*) echo IMAGES ;;
esac
exit 0
STUB
cat >"$work/bin/flock" <<'STUB'
#!/usr/bin/env bash
[[ -z "${REAL_FLOCK:-}" ]] || exec "$REAL_FLOCK" "$@"
exit 0
STUB
cp "$work/bin/docker" "$work/docker.full"
chmod +x "$work/bin/docker" "$work/bin/flock"

cp "$src/update.sh" "$src/compose.yml" "$work/site/"
echo 'POSTGRES_PASSWORD=test' >"$work/site/.env"
export PATH="$work/bin:$PATH" STUB_LOG="$work/calls.log" STUB_DIGEST="$digest"

fail() { echo "ÉCHEC : $*" >&2; cat "$STUB_LOG" "$work/out.log" >&2; ls -R "$work/site" >&2; exit 1; }
run() { # run MODE [args] : lance update.sh, renvoie son code de sortie
  STUB_FAIL="$1" bash "$work/site/update.sh" "${@:2}" >"$work/out.log" 2>&1 && return 0 || return 1
}
line() { grep -n -m1 -- "$1" "$STUB_LOG" | cut -d: -f1; }
reset() { : >"$STUB_LOG"; rm -rf "$work/site/.state" "$work/site/backups"; }

echo '##### 1. Succès : sauvegarde, migration, démarrage, dans cet ordre'
reset
run none || fail "update.sh devrait réussir"
b=$(line 'pg_dump') m=$(line 'migrate') u=$(line 'wait app')
(( b < m && m < u )) || fail "ordre inattendu ($b $m $u)"
grep -q 'compose.*stop app' "$STUB_LOG" && fail "l'ancienne version ne doit pas être arrêtée avant la bascule"
[[ "$(cat "$work/site/.state/deployed-image")" == "$digest" ]] || fail "image déployée non enregistrée"
[[ -n "$(find "$work/site/backups" -name database.dump -size +0)" ]] || fail "dump absent"
echo OK

echo '##### 2. Déjà à jour : rien n'"'"'est refait'
: >"$STUB_LOG"
# Simule une appli saine sur la bonne image.
cat >"$work/bin/docker" <<'STUB'
#!/usr/bin/env bash
echo "docker $*" >>"$STUB_LOG"
case "$*" in
*"config --images"*) printf 'ghcr.io/example/sellio:latest\n' ;;
"image inspect --format {{index .RepoDigests 0}}"*) echo "$STUB_DIGEST" ;;
*"ps -q app"*) echo abc ;;
"inspect --format {{.State.Health.Status}}"*) echo healthy ;;
"inspect --format {{.Config.Image}}"*) echo "$STUB_DIGEST" ;;
esac
STUB
run none || fail "update.sh devrait sortir proprement"
grep -q pg_dump "$STUB_LOG" && fail "aucune sauvegarde attendue quand tout est à jour"
grep -q 'already up to date' "$work/out.log" || fail "message attendu"
echo OK

# Remet le faux docker complet pour les cas d'échec.
cp "$work/docker.full" "$work/bin/docker"

for mode in backup empty; do
  echo "##### 3. Sauvegarde en échec ($mode) : rien ne démarre, dossier partiel supprimé"
  reset
  run "$mode" && fail "update.sh aurait dû échouer"
  grep -q 'migrate' "$STUB_LOG" && fail "migration lancée malgré l'échec de sauvegarde"
  grep -q 'wait app' "$STUB_LOG" && fail "app démarrée malgré l'échec de sauvegarde"
  [[ -z "$(ls -A "$work/site/backups")" ]] || fail "sauvegarde partielle conservée"
  [[ ! -e "$work/site/.state/failed-image" ]] || fail "un échec de sauvegarde ne doit pas bloquer l'image"
  echo OK
done

echo '##### 4. Migration en échec : app non touchée, échec visible'
reset
run migrate && fail "update.sh aurait dû échouer"
grep -q 'wait app' "$STUB_LOG" && fail "app démarrée malgré l'échec de migration"
grep -q 'stop app' "$STUB_LOG" && fail "l'ancienne version a été arrêtée"
grep -q 'migration boom' "$work/out.log" || fail "erreur de migration absente de la sortie"
[[ -n "$(find "$work/site/backups" -name database.dump -size +0)" ]] || fail "sauvegarde non conservée"
[[ "$(cat "$work/site/.state/failed-image")" == "$digest" ]] || fail "image non marquée en échec"
run none && fail "une image en échec ne doit pas être rejouée sans --retry"
echo OK

echo '##### 5. Healthcheck en échec : retour à l'"'"'image précédente'
reset
mkdir -p "$work/site/.state"
echo 'ghcr.io/example/sellio@sha256:previous' >"$work/site/.state/deployed-image"
run health && fail "update.sh aurait dû échouer"
[[ "$(grep -c 'wait app' "$STUB_LOG")" == 2 ]] || fail "l'ancienne image aurait dû être relancée"
grep -q previous "$work/site/.state/image.yml" || fail "l'image précédente n'est pas celle relancée"
[[ "$(cat "$work/site/.state/deployed-image")" == ghcr.io/example/sellio@sha256:previous ]] || fail "deployed-image modifié"
echo OK

echo '##### 5b. Restauration : pg_restore en échec, la base n'"'"'est pas touchée'
reset
cp "$src/restore.sh" "$work/site/"
mkdir -p "$work/site/backups/x"
echo DUMP >"$work/site/backups/x/database.dump"
cat >"$work/bin/docker" <<'STUB'
#!/usr/bin/env bash
echo "docker $*" >>"$STUB_LOG"
[[ "$*" == *pg_restore* ]] && exit 1
exit 0
STUB
bash "$work/site/restore.sh" --yes "$work/site/backups/x" >/dev/null 2>&1 && fail "restore.sh aurait dû échouer"
grep -q psql "$STUB_LOG" && fail "psql lancé malgré l'échec de pg_restore"
grep -q 'stop app' "$STUB_LOG" && fail "app arrêtée malgré l'échec de pg_restore"
cp "$work/docker.full" "$work/bin/docker"
echo OK

echo '##### 5c. Restauration refusée si update.sh tient le verrou'
reset
cp "$src/restore.sh" "$work/site/"
mkdir -p "$work/site/backups/x" "$work/site/.state"
echo DUMP >"$work/site/backups/x/database.dump"
: >"$STUB_LOG"
(
  export REAL_FLOCK=/usr/bin/flock
  exec 8>"$work/site/.state/update.lock"
  /usr/bin/flock -n 8
  bash "$work/site/restore.sh" --yes "$work/site/backups/x" >/dev/null 2>&1 && exit 1
  exit 0
) || fail "restore.sh aurait dû être refusé pendant une mise à jour"
[[ ! -s "$STUB_LOG" ]] || fail "docker appelé malgré le verrou"
echo OK

echo '##### 6. Rétention : seules les 10 plus récentes sont gardées'
reset
mkdir -p "$work/site/backups"
for i in $(seq -w 1 14); do mkdir "$work/site/backups/202001${i}T000000Z"; done
mkdir "$work/site/backups/autre-dossier"
run none || fail "update.sh devrait réussir"
count=$(find "$work/site/backups" -mindepth 1 -maxdepth 1 -type d -name '[0-9]*Z' | wc -l)
[[ "$count" == 10 ]] || fail "10 sauvegardes attendues, $count trouvées"
[[ -d "$work/site/backups/20200114T000000Z" && ! -d "$work/site/backups/20200101T000000Z" ]] || fail "mauvaises sauvegardes purgées"
[[ -d "$work/site/backups/autre-dossier" ]] || fail "un dossier étranger a été supprimé"
echo OK

printf '\n##### TOUT EST OK\n'
