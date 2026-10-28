#!/usr/bin/env bash
# Retour arrière de la migration 0007 (colis, PR #17) via drizzle/rollback/0007_add_parcels.down.sql.
# Supprime les tables parcels et carriers et les photos de code-barres. Exige une sauvegarde récente.
# Usage : DATABASE_URL=postgres://... scripts/rollback-0007.sh [--yes]
set -euo pipefail
# shellcheck source=scripts/lib.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

parse_args "$@"
[[ ${#POSITIONAL[@]} -eq 0 ]] || die "usage : scripts/rollback-0007.sh [--yes]"

require_cmd psql
require_database_url
down_sql="$ROOT_DIR/drizzle/rollback/0007_add_parcels.down.sql"
[[ -s "$down_sql" ]] || die "script de retour arrière introuvable : $down_sql"
require_recent_backup

[[ "$(sql_value "SELECT to_regclass('public.parcels') IS NOT NULL")" == t ]] ||
	die "la table parcels n'existe pas : 0007 n'est pas appliquée, rien à annuler."

# Le .down.sql oublie la dernière migration enregistrée : elle doit être 0007.
journal_when="$(grep -A3 '"idx": 7' "$ROOT_DIR/drizzle/meta/_journal.json" | sed -n 's/.*"when": *\([0-9]*\).*/\1/p')"
last_when="$(sql_value "SELECT max(created_at) FROM drizzle.__drizzle_migrations")"
[[ -n "$journal_when" && "$last_when" == "$journal_when" ]] ||
	die "la dernière migration appliquée n'est pas 0007 (base : $last_when, journal : $journal_when). Retour arrière refusé."

parcels="$(sql_value 'SELECT count(*) FROM parcels')"
barcodes="$(sql_value 'SELECT count(*) FROM images WHERE listing_id IS NULL')"
confirm "ATTENTION : retour arrière de 0007 sur $(database_label).
Seront supprimés : $parcels colis, $barcodes photo(s) de code-barres, les tables parcels et carriers.
Redéployer ensuite la version précédente du code."

log "Exécution de $down_sql"
psql "$DATABASE_URL" --no-psqlrc -X -v ON_ERROR_STOP=1 -f "$down_sql"
log "Retour arrière terminé. Redéployer la version précédente du code."
