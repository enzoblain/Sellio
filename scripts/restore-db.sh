#!/usr/bin/env bash
# Restaure un dump créé par backup-db.sh. Remplace tout le contenu de la base ciblée.
# Usage : DATABASE_URL=postgres://... scripts/restore-db.sh [--yes] <fichier.dump>
set -euo pipefail
# shellcheck source=scripts/lib.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

parse_args "$@"
[[ ${#POSITIONAL[@]} -eq 1 ]] || die "usage : scripts/restore-db.sh [--yes] <fichier.dump>"
file="${POSITIONAL[0]}"

require_cmd pg_restore
require_database_url
[[ -s "$file" ]] || die "fichier introuvable ou vide : $file"
pg_restore --list "$file" >/dev/null || die "ce fichier n'est pas un dump valide : $file"

confirm "ATTENTION : la base $(database_label) va être REMPLACÉE par $file.
Les données ajoutées depuis cette sauvegarde seront perdues. Arrêter l'application avant."

log "Restauration de $file"
pg_restore --clean --if-exists --no-owner --exit-on-error --single-transaction \
	-d "$DATABASE_URL" "$file"
log "Restauration terminée."
