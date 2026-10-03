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

updating=0
failure() {
  result=$?
  if (( result != 0 && updating == 1 )); then
    printf '%s\n' "$target" > .state/failed-image
    echo 'Deployment stopped. Backups are preserved. Do not restore automatically after a schema change.' >&2
    pinned logs --no-color --tail=80 app >> .state/last-error.log 2>&1 || true
  fi
}
trap failure EXIT

docker volume create sellio_nas_postgres_data >/dev/null
docker volume create sellio_nas_images_data >/dev/null
compose up -d --wait db
updating=1
compose stop app
backup="backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir "$backup"
compose exec -T db pg_dump -U sellio -d sellio -Fc > "$backup/database.dump"
docker run --rm --network none --user root --entrypoint tar \
  -v sellio_nas_images_data:/data:ro "$target" -C /data -czf - . > "$backup/images.tar.gz"
if [[ -f .state/deployed-image ]]; then cp .state/deployed-image "$backup/previous-image"; fi
cp .env "$backup/config.env"

printf 'services:\n  migrate:\n    image: "%s"\n    pull_policy: never\n  app:\n    image: "%s"\n    pull_policy: never\n' "$target" "$target" > .state/image.yml
if ! pinned run --rm --no-deps -T migrate > .state/last-error.log 2>&1; then
  echo 'Migration failed. The application remains stopped; see .state/last-error.log.' >&2
  exit 1
fi
if ! pinned up -d --no-deps --wait app; then
  pinned stop app
  echo 'Health check failed. The application is stopped; see .state/last-error.log.' >&2
  exit 1
fi
printf '%s\n' "$target" > .state/deployed-image
rm -f .state/failed-image
updating=0
echo "Sellio updated successfully. Backup: $backup"
