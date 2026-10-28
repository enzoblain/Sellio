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
[[ -s "$file" ]] || die "fichier introuvable ou vide : $file"
pg_restore --list "$file" >/dev/null || die "ce fichier n'est pas un dump valide : $file"

confirm "ATTENTION : la base $(database_label) va être REMPLACÉE par $file.
Les données ajoutées depuis cette sauvegarde seront perdues. Arrêter l'application avant."

log "Restauration de $file (schémas public et drizzle recréés à vide, en une seule transaction)"
# Le dump est rejoué en SQL après avoir vidé les schémas : pg_restore --clean ne supprime que
# les objets présents dans le dump, et laisserait par exemple parcels/carriers après une migration 0007.
{
	printf 'DROP SCHEMA IF EXISTS drizzle CASCADE;\nDROP SCHEMA IF EXISTS public CASCADE;\nCREATE SCHEMA public;\n'
	pg_restore --no-owner -f - "$file"
} | PGOPTIONS="-c client_min_messages=warning" psql "$DATABASE_URL" --no-psqlrc -X -q -v ON_ERROR_STOP=1 --single-transaction -f - >/dev/null
log "Restauration terminée."
