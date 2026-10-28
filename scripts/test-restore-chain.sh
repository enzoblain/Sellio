#!/usr/bin/env bash
# Rejoue l'enchaînement de mise en prod sur une base Postgres JETABLE et vérifie chaque étape :
# sauvegarde, migration 0007, restauration, re-migration, rollback-0007, et dump tronqué.
# La base ciblée doit être vide : elle est entièrement réécrite. Ne jamais viser la production.
# Usage : DATABASE_URL=postgres://...base_de_test scripts/test-restore-chain.sh
set -euo pipefail
# shellcheck source=scripts/lib.sh
source "$(dirname -- "${BASH_SOURCE[0]}")/lib.sh"

require_cmd psql pg_dump pg_restore npm
require_database_url
here="$ROOT_DIR/scripts"
BACKUP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/restore-chain.XXXXXX")"
export BACKUP_DIR
trap 'rm -rf "$BACKUP_DIR"' EXIT

[[ "$(sql_value "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('public','drizzle')")" == 0 ]] ||
	die "la base de test doit être vide : $(database_label)"

step() { printf '\n##### %s\n' "$*"; }
check() { # check "description" "requête renvoyant la valeur attendue" valeur
	local got
	got="$(sql_value "$2")"
	[[ "$got" == "$3" ]] || die "ÉCHEC : $1 (obtenu « $got », attendu « $3 »)"
	log "OK : $1 ($got)"
}
has_table() { printf "SELECT to_regclass('public.%s') IS NOT NULL" "$1"; }
latest_backup() { find "$BACKUP_DIR" -maxdepth 1 -name '*.dump' | sort | tail -n 1; }

step "0. État initial : schéma 0000-0006 (migrations complètes puis rollback-0007) avec des données"
(cd "$ROOT_DIR" && npm run db:migrate >/dev/null)
"$here/backup-db.sh" >/dev/null
"$here/rollback-0007.sh" --yes >/dev/null
sql_value "INSERT INTO brands (name) VALUES ('Nike'), ('Adidas') RETURNING 1" >/dev/null
rm -f "$BACKUP_DIR"/*.dump
check "0007 absente" "$(has_table parcels)" f
check "2 marques" "SELECT count(*) FROM brands" 2
check "7 migrations enregistrées (0000-0006)" "SELECT count(*) FROM drizzle.__drizzle_migrations" 7

step "1. Sauvegarde avant migration"
sleep 1
"$here/backup-db.sh"
pre="$(latest_backup)"
[[ -s "$pre" ]] || die "pas de sauvegarde"

step "2. Migration 0007 puis vérification"
"$here/migrate.sh"
check "parcels existe" "$(has_table parcels)" t
check "4 transporteurs" "SELECT count(*) FROM carriers" 4
sql_value "INSERT INTO parcels (carrier_id) VALUES (1) RETURNING 1" >/dev/null
sql_value "INSERT INTO brands (name) VALUES ('Zara') RETURNING 1" >/dev/null
check "1 colis, 3 marques" "SELECT (SELECT count(*) FROM parcels) || '/' || (SELECT count(*) FROM brands)" 1/3

step "3. Dump tronqué : la restauration échoue sans toucher à la base"
sleep 1
"$here/backup-db.sh" >/dev/null
full="$(latest_backup)"
trunc="$BACKUP_DIR/tronque.dump"
head -c "$(($(wc -c <"$full") * 2 / 3))" "$full" >"$trunc"
if "$here/restore-db.sh" --yes "$trunc"; then
	die "ÉCHEC : la restauration d'un dump tronqué aurait dû échouer"
fi
check "base intacte (1 colis, 3 marques)" "SELECT (SELECT count(*) FROM parcels) || '/' || (SELECT count(*) FROM brands)" 1/3
rm -f "$trunc"

step "3b. pg_restore qui échoue en cours de route (--list passe, SQL tronqué) : psql ne doit pas tourner"
# Faux pg_restore : délègue le --list au vrai, mais meurt après avoir écrit un début de SQL.
real_pg_restore="$(command -v pg_restore)"
fakebin="$BACKUP_DIR/fakebin"
mkdir -p "$fakebin"
cat >"$fakebin/pg_restore" <<FAKE
#!/usr/bin/env bash
for a in "\$@"; do [[ "\$a" == --list ]] && exec "$real_pg_restore" "\$@"; done
echo 'DROP TABLE brands CASCADE;'
echo 'pg_restore: error: simulated failure mid-way' >&2
exit 1
FAKE
chmod +x "$fakebin/pg_restore"
mkdir "$BACKUP_DIR/tmp"
if PATH="$fakebin:$PATH" TMPDIR="$BACKUP_DIR/tmp" "$here/restore-db.sh" --yes "$full"; then
	die "ÉCHEC : la restauration aurait dû échouer"
fi
check "base intacte (1 colis, 3 marques)" "SELECT (SELECT count(*) FROM parcels) || '/' || (SELECT count(*) FROM brands)" 1/3
[[ -z "$(ls -A "$BACKUP_DIR/tmp")" ]] || die "ÉCHEC : fichier temporaire non supprimé : $(ls "$BACKUP_DIR/tmp")"
log "OK : aucun fichier temporaire restant"
rm -f "$trunc" "$full"

step "4. Restauration de la sauvegarde d'avant 0007"
"$here/restore-db.sh" --yes "$pre"
check "parcels disparue" "$(has_table parcels)" f
check "carriers disparue" "$(has_table carriers)" f
check "2 marques (Zara perdue)" "SELECT count(*) FROM brands" 2
check "7 migrations enregistrées" "SELECT count(*) FROM drizzle.__drizzle_migrations" 7

step "5. Re-migration"
sleep 1
"$here/backup-db.sh" >/dev/null
"$here/migrate.sh"
check "parcels recréée" "$(has_table parcels)" t
check "4 transporteurs" "SELECT count(*) FROM carriers" 4
check "8 migrations enregistrées" "SELECT count(*) FROM drizzle.__drizzle_migrations" 8

step "6. Rollback 0007"
"$here/rollback-0007.sh" --yes
check "parcels supprimée" "$(has_table parcels)" f
check "carriers supprimée" "$(has_table carriers)" f
check "2 marques conservées" "SELECT count(*) FROM brands" 2
check "7 migrations enregistrées" "SELECT count(*) FROM drizzle.__drizzle_migrations" 7

printf '\n##### TOUT EST OK\n'
