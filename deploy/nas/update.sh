#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
[[ -f .env ]] || { echo 'Create .env from .env.example first.' >&2; exit 1; }
mkdir -p .state backups
command -v flock >/dev/null || { echo 'flock is required.' >&2; exit 1; }
exec 9>.state/update.lock
flock -n 9 || exit 0

compose() { docker compose --env-file .env -f compose.yml "$@"; }
pinned() { docker compose --env-file .env -f compose.yml -f .state/image.yml "$@"; }

image=$(compose config --images | sort -u | sed '/^postgres:/d')
[[ "$image" == ghcr.io/* && "$image" != *$'\n'* ]] || { echo 'SELLIO_IMAGE must point to one GHCR image.' >&2; exit 1; }
docker pull "$image"
target=$(docker image inspect --format '{{index .RepoDigests 0}}' "$image")
[[ "$target" == ghcr.io/*@sha256:* ]] || { echo 'Cannot resolve the image digest.' >&2; exit 1; }
if [[ -f .state/deployed-image && "$(cat .state/deployed-image)" == "$target" ]]; then
  app_id=$(compose ps -q app)
  if [[ -n "$app_id" && "$(docker inspect --format '{{.State.Health.Status}}' "$app_id")" == healthy && "$(docker inspect --format '{{.Config.Image}}' "$app_id")" == "$target" ]]; then
    echo 'Sellio is already up to date.'
    exit 0
  fi
fi
if [[ -f .state/failed-image && "$(cat .state/failed-image)" == "$target" && "${1:-}" != --retry ]]; then
  echo 'This image failed previously. Review .state/last-error.log, then run update.sh --retry.' >&2
  exit 1
fi

# Nombre de sauvegardes conservées (les plus récentes).
keep_backups=${KEEP_BACKUPS:-10}
[[ "$keep_backups" =~ ^[1-9][0-9]*$ ]] || { echo 'KEEP_BACKUPS must be a positive integer.' >&2; exit 1; }

# Dossier de sauvegarde en cours d'écriture : supprimé s'il est incomplet.
partial=
# Passe à 1 une fois la sauvegarde complète : un échec ensuite est imputé à l'image.
updating=0
failure() {
  result=$?
  if (( result != 0 )); then
    [[ -z "$partial" ]] || rm -rf -- "$partial"
    if (( updating == 1 )); then
      printf '%s\n' "$target" > .state/failed-image
      echo 'Deployment stopped. The previous version was left running (or restarted) when there is one. Backups are preserved. Do not restore automatically after a schema change.' >&2
      pinned logs --no-color --tail=80 app >> .state/last-error.log 2>&1 || true
    else
      echo 'Backup failed: nothing was changed, the running version is untouched. The next run retries.' >&2
    fi
  fi
}
trap failure EXIT

docker volume create sellio_nas_postgres_data >/dev/null
docker volume create sellio_nas_images_data >/dev/null
compose up -d --wait db

# 1. Sauvegarde, l'ancienne version reste en ligne. pg_dump 17 tourne dans le conteneur db.
backup="backups/$(date -u +%Y%m%dT%H%M%SZ)"
partial="$backup"
mkdir "$backup"
compose exec -T db pg_dump -U sellio -d sellio -Fc --no-owner > "$backup/database.dump"
[[ -s "$backup/database.dump" ]] || { echo 'The database dump is empty.' >&2; exit 1; }
docker run --rm --network none --user root --entrypoint tar \
  -v sellio_nas_images_data:/data:ro "$target" -C /data -czf - . > "$backup/images.tar.gz"
if [[ -f .state/deployed-image ]]; then cp .state/deployed-image "$backup/previous-image"; fi
cp .env "$backup/config.env"
partial=
updating=1
echo "Backup done: $backup"

# 2. Migrations en attente. En cas d'échec, l'ancienne version n'a pas bougé.
printf 'services:\n  migrate:\n    image: "%s"\n    pull_policy: never\n  app:\n    image: "%s"\n    pull_policy: never\n' "$target" "$target" > .state/image.yml
if ! pinned run --rm --no-deps -T migrate > .state/last-error.log 2>&1; then
  cat .state/last-error.log >&2
  echo 'Migration failed. The new version is not started; the previous one keeps running. See .state/last-error.log.' >&2
  exit 1
fi

# 3. Démarrage de la nouvelle version ; retour à l'ancienne image si elle n'est pas saine.
if ! pinned up -d --no-deps --wait app; then
  pinned logs --no-color --tail=80 app > .state/last-error.log 2>&1 || true
  if [[ -f .state/deployed-image ]]; then
    previous=$(cat .state/deployed-image)
    printf 'services:\n  app:\n    image: "%s"\n    pull_policy: never\n' "$previous" > .state/image.yml
    pinned up -d --no-deps --wait app || true
  else
    pinned stop app
  fi
  echo 'Health check failed. The previous version was restarted when there is one; see .state/last-error.log.' >&2
  exit 1
fi
printf '%s\n' "$target" > .state/deployed-image
rm -f .state/failed-image
updating=0

# 4. Rétention : on ne garde que les KEEP_BACKUPS dernières sauvegardes datées.
find backups -mindepth 1 -maxdepth 1 -type d -name '[0-9]*T[0-9]*Z' | sort -r | tail -n +"$((keep_backups + 1))" |
  while IFS= read -r old; do rm -rf -- "$old"; done
echo "Sellio updated successfully. Backup: $backup"
