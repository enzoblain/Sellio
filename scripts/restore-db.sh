#!/usr/bin/env bash
# Restaure un dump créé par backup-db.sh. Remplace tout le contenu de la base ciblée.
# Usage : DATABASE_URL=postgres://... scripts/restore-db.sh [--yes] <fichier.dump>
set -euo pipefail
# shellcheck source=scripts/lib.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

parse_args "$@"
[[ ${#POSITIONAL[@]} -eq 1 ]] || die "usage : scripts/restore-db.sh [--yes] <fichier.dump>"
file="${POSITIONAL[0]}"

require_cmd pg_restore psql
require_database_url
require_matching_pg_clients pg_restore psql
[[ -s "$file" ]] || die "fichier introuvable ou vide : $file"
pg_restore --list "$file" >/dev/null || die "ce fichier n'est pas un dump valide : $file"

confirm "ATTENTION : la base $(database_label) va être REMPLACÉE par $file.
Les données ajoutées depuis cette sauvegarde seront perdues. Arrêter l'application avant."

log "Restauration de $file (schémas public et drizzle recréés à vide, en une seule transaction)"
# Le dump est d'abord converti en SQL dans un fichier temporaire : si pg_restore échoue, psql ne
# tourne pas et la base n'est pas touchée (un flux direct validerait un SQL tronqué après le DROP).
# pg_restore --clean ne supprime que les objets du dump et laisserait parcels/carriers après une 0007.
sql_file="$(umask 077 && mktemp "${TMPDIR:-/tmp}/restore-db.XXXXXX")"
trap 'rm -f "$sql_file"' EXIT
trap 'exit 130' INT TERM
printf 'DROP SCHEMA IF EXISTS drizzle CASCADE;\nDROP SCHEMA IF EXISTS public CASCADE;\nCREATE SCHEMA public;\n' >"$sql_file"
pg_restore --no-owner -f - "$file" >>"$sql_file" ||
	die "pg_restore a échoué : la base n'a pas été modifiée."
PGOPTIONS="-c client_min_messages=warning" psql "$DATABASE_URL" --no-psqlrc -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$sql_file" >/dev/null
log "Restauration terminée."
