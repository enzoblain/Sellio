#!/usr/bin/env bash
# Mise en prod de la partie Colis : sauvegarde, migration, vérification.
# Usage : DATABASE_URL=postgres://... scripts/deploy-colis.sh
set -euo pipefail
# shellcheck source=scripts/lib.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

require_cmd psql pg_dump npm
require_database_url
here="$(dirname -- "${BASH_SOURCE[0]}")"

log "Étape 1/3 : sauvegarde"
"$here/backup-db.sh"

log "Étape 2/3 : migration"
"$here/migrate.sh"

log "Étape 3/3 : vérification"
for table in carriers parcels; do
	[[ "$(sql_value "SELECT to_regclass('public.$table') IS NOT NULL")" == t ]] ||
		die "la table $table n'existe pas après migration. Voir docs/deploy.md (retour arrière)."
done
for column in images.parcel_id listings.parcel_id; do
	[[ "$(sql_value "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${column%.*}' AND column_name = '${column#*.}')")" == t ]] ||
		die "la colonne $column est absente."
done

expected='Chronopost,Colissimo,Mondial Relay,Vinted Go'
actual="$(sql_value "SELECT string_agg(name, ',' ORDER BY name) FROM carriers")"
[[ "$actual" == "$expected" ]] || die "transporteurs inattendus : « $actual » (attendu : « $expected »)."

log "Tables carriers et parcels présentes, transporteurs : $actual"
log "Mise en prod de Colis terminée."
