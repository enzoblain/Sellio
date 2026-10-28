#!/usr/bin/env bash
# Sauvegarde complète de la base (pg_dump -Fc) dans backups/, horodatée.
# Usage : DATABASE_URL=postgres://... scripts/backup-db.sh
set -euo pipefail
# shellcheck source=scripts/lib.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

require_cmd pg_dump psql
require_database_url
if command -v pg_restore >/dev/null 2>&1; then require_matching_pg_clients pg_dump psql pg_restore; else require_matching_pg_clients pg_dump psql; fi

mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/sellio-$(database_key)-$(date -u +%Y%m%dT%H%M%SZ).dump"

log "Sauvegarde de $(database_label) vers $file"
if ! (umask 077 && pg_dump "$DATABASE_URL" -Fc --no-owner -f "$file"); then
	rm -f "$file"
	die "pg_dump a échoué, aucun fichier conservé."
fi

[[ -s "$file" ]] || {
	rm -f "$file"
	die "le dump est vide, fichier supprimé."
}

if command -v pg_restore >/dev/null 2>&1; then
	pg_restore --list "$file" >/dev/null || die "le dump est illisible par pg_restore : $file"
fi

log "Sauvegarde terminée : $file ($(wc -c <"$file") octets)"
