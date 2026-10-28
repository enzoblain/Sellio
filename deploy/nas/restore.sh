#!/usr/bin/env bash
# Restaure la base du NAS depuis backups/<date>/ (remplace tout son contenu), via le conteneur db.
# Usage : bash restore.sh [--yes] backups/<date>
set -Eeuo pipefail
umask 077

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
yes=0
[[ "${1:-}" == --yes ]] && { yes=1; shift; }
[[ $# -eq 1 ]] || { echo 'Usage: bash restore.sh [--yes] backups/<date>' >&2; exit 1; }
dump="${1%/}/database.dump"
[[ -s "$dump" ]] || { echo "Missing or empty dump: $dump" >&2; exit 1; }
[[ -f .env ]] || { echo 'Create .env from .env.example first.' >&2; exit 1; }
compose() { docker compose --env-file .env -f compose.yml "$@"; }

if (( yes == 0 )); then
  [[ -t 0 ]] || { echo 'No terminal to confirm: use --yes.' >&2; exit 1; }
  printf 'The database will be REPLACED by %s. Data added since is lost.\nType "oui" to continue: ' "$dump"
  read -r answer
  [[ "$answer" == oui ]] || { echo 'Cancelled.' >&2; exit 1; }
fi

sql_file=$(mktemp "${TMPDIR:-/tmp}/sellio-restore.XXXXXX")
trap 'rm -f "$sql_file"' EXIT
compose up -d --wait db
# Le dump est converti en SQL avant de toucher à la base : si pg_restore échoue, rien n'est supprimé.
printf 'DROP SCHEMA IF EXISTS drizzle CASCADE;\nDROP SCHEMA IF EXISTS public CASCADE;\nCREATE SCHEMA public;\n' > "$sql_file"
compose exec -T db pg_restore --no-owner -f - < "$dump" >> "$sql_file" ||
  { echo 'pg_restore failed: the database was not modified.' >&2; exit 1; }
compose stop app
compose exec -T db psql -U sellio -d sellio -X -q -v ON_ERROR_STOP=1 --single-transaction < "$sql_file" > /dev/null
echo 'Restore done. The application is stopped: deploy the image listed in previous-image (or run update.sh --retry).'
