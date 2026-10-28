#!/usr/bin/env bash
# Applique les migrations drizzle en attente (dont 0007). Refuse sans sauvegarde récente.
# Usage : DATABASE_URL=postgres://... scripts/migrate.sh
set -euo pipefail
# shellcheck source=scripts/lib.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

require_cmd psql npm
require_database_url
require_recent_backup

count_applied() {
	if [[ "$(sql_value "SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL")" == t ]]; then
		sql_value 'SELECT count(*) FROM drizzle.__drizzle_migrations'
	else
		echo 0
	fi
}

before="$(count_applied)"
log "Migrations déjà appliquées sur $(database_label) : $before"

cd "$ROOT_DIR"
log "Application des migrations (npm run db:migrate)"
npm run db:migrate

after="$(count_applied)"
log "Migrations appliquées : $after (nouvelles : $((after - before)))"
if ((after > before)); then
	log "Dernières migrations enregistrées (id, created_at) :"
	psql "$DATABASE_URL" --no-psqlrc -X -v ON_ERROR_STOP=1 -tA -F ' | ' \
		-c "SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT $((after - before))"
fi
