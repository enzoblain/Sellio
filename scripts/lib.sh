#!/usr/bin/env bash
# Fonctions communes aux scripts de mise en prod. À sourcer, pas à exécuter.

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
# Âge maximal (en minutes) d'une sauvegarde acceptée par migrate.sh et rollback-0007.sh.
BACKUP_MAX_AGE_MIN="${BACKUP_MAX_AGE_MIN:-60}"

log() { printf '==> %s\n' "$*"; }
die() {
	printf 'ERREUR : %s\n' "$*" >&2
	exit 1
}

require_cmd() {
	local cmd
	for cmd in "$@"; do
		command -v "$cmd" >/dev/null 2>&1 || die "commande introuvable : $cmd"
	done
}

require_database_url() {
	[[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL n'est pas définie (ex. postgres://utilisateur:motdepasse@hote:5432/base)."
}

# Affiche la cible sans le mot de passe.
database_label() {
	local rest="${DATABASE_URL#*://}"
	printf '%s' "${rest##*@}"
}

# Identité de la base (hôte, port, nom, sans identifiants) utilisable dans un nom de fichier.
database_key() {
	database_label | sed 's/[^A-Za-z0-9]/_/g'
}

# Requête SQL qui renvoie une seule valeur, sans décoration.
sql_value() {
	psql "$DATABASE_URL" --no-psqlrc -X -v ON_ERROR_STOP=1 -tA -c "$1"
}

# confirm "message" : demande de taper « oui ». --yes (ASSUME_YES=1) passe la question.
confirm() {
	printf '%s\n' "$1"
	if [[ "${ASSUME_YES:-0}" == 1 ]]; then
		log "Confirmation automatique (--yes)."
		return 0
	fi
	[[ -t 0 ]] || die "pas de terminal pour confirmer : relancer avec --yes pour confirmer explicitement."
	local answer
	read -r -p 'Taper « oui » pour continuer : ' answer
	[[ "$answer" == oui ]] || die "annulé."
}

# Chemin de la sauvegarde de CETTE base la plus récente (moins de BACKUP_MAX_AGE_MIN minutes), vide sinon.
recent_backup() {
	[[ -d "$BACKUP_DIR" ]] || return 0
	find "$BACKUP_DIR" -maxdepth 1 -type f -name "sellio-$(database_key)-*.dump" -size +0 -mmin "-$BACKUP_MAX_AGE_MIN" -print | sort | tail -n 1
}

require_recent_backup() {
	local backup
	backup="$(recent_backup)"
	[[ -n "$backup" ]] || die "aucune sauvegarde de moins de ${BACKUP_MAX_AGE_MIN} min pour $(database_label) dans $BACKUP_DIR. Lancer scripts/backup-db.sh d'abord."
	log "Sauvegarde récente trouvée : $backup"
}

# Analyse les options communes (--yes) ; les arguments restants sont dans POSITIONAL.
parse_args() {
	POSITIONAL=()
	local arg
	for arg in "$@"; do
		case "$arg" in
		--yes | -y) ASSUME_YES=1 ;;
		-*) die "option inconnue : $arg" ;;
		*) POSITIONAL+=("$arg") ;;
		esac
	done
}
