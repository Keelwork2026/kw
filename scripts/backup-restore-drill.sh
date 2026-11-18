#!/usr/bin/env bash
# Backup and restore drill.
#
#   1. Builds a throwaway PostgreSQL 16 cluster, applies every migration and
#      runs every database check, so every table holds realistic rows.
#   2. Dumps the database (pg_dump -Fc) and restores it into a fresh database.
#   3. Verifies the restore: identical row counts for every table, the same
#      credit-ledger total and audit log, and that RLS, append-only
#      immutability and triggers are still enforced.
#
# Exits non-zero and prints FAILED: <what> on any difference.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${KW_PG_PORT:-54331}"
PGBIN="/usr/lib/postgresql/16/bin"; [ -x "$PGBIN/initdb" ] || PGBIN="$(dirname "$(command -v initdb)")"
TMP="$(mktemp -d /tmp/kw-drill.XXXXXX)"; chmod 755 "$TMP"
as_pg() { if [ "$(id -u)" = "0" ]; then chown -R postgres:postgres "$TMP"; runuser -u postgres -- "$@"; else "$@"; fi; }
cleanup() { as_pg "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
fail() { echo "FAILED: $*"; exit 1; }

as_pg "$PGBIN/initdb" -D "$TMP/data" -A trust -U postgres --no-sync >/dev/null || fail initdb
as_pg "$PGBIN/pg_ctl" -D "$TMP/data" -l "$TMP/pg.log" -w -o "-k $TMP -p $PORT -c listen_addresses='' -c fsync=off" start >/dev/null || fail start
q() { local db="$1"; shift; psql -h "$TMP" -p "$PORT" -U postgres -d "$db" -X -q -v ON_ERROR_STOP=1 "$@"; }
qa() { local db="$1"; shift; psql -h "$TMP" -p "$PORT" -U postgres -d "$db" -X -q -At -v ON_ERROR_STOP=1 "$@"; }

# 1. Source database with data
q postgres -f "$ROOT/supabase/tests/_shim.sql" >/dev/null || fail shim
for m in "$ROOT"/supabase/migrations/*.sql; do q postgres -f "$m" >/dev/null || fail "migration $(basename "$m")"; done
for t in "$ROOT"/supabase/tests/[0-9]*.sql; do
  psql -h "$TMP" -p "$PORT" -U postgres -d postgres -X -q -v ON_ERROR_STOP=0 -v kwfile="$(basename "$t" .sql)" -f "$t" >/dev/null 2>&1
done

TABLES_SQL="select n.nspname || '.' || c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'r' and n.nspname in ('public', 'keelwork', 'auth') order by 1"
snapshot() {
  local db="$1"
  for t in $(qa "$db" -c "$TABLES_SQL"); do echo "$t $(qa "$db" -c "select count(*) from $t")"; done
  echo "ledger_total $(qa "$db" -c "select coalesce(sum(amount_micros), 0) from public.credit_ledger")"
  echo "audit_digest $(qa "$db" -c "select md5(coalesce(string_agg(id || ':' || action || ':' || coalesce(org_id::text, '') || ':' || metadata::text, ',' order by id), '')) from public.audit_events")"
  echo "rls_tables $(qa "$db" -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity")"
  echo "triggers $(qa "$db" -c "select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where not t.tgisinternal and n.nspname in ('public', 'auth')")"
  echo "policies $(qa "$db" -c "select count(*) from pg_policies where schemaname = 'public'")"
}
snapshot postgres > "$TMP/before.txt"
PUBLIC_TABLES="$(qa postgres -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'")"

# 2. Dump and restore into a fresh database
as_pg "$PGBIN/pg_dump" -h "$TMP" -p "$PORT" -U postgres -d postgres -Fc -f "$TMP/backup.pgc" || fail pg_dump
q postgres -c "create database restored" >/dev/null || fail "create database"
as_pg "$PGBIN/pg_restore" -h "$TMP" -p "$PORT" -U postgres -d restored --exit-on-error "$TMP/backup.pgc" || fail pg_restore
snapshot restored > "$TMP/after.txt"

# 3. Verify
if ! diff -u "$TMP/before.txt" "$TMP/after.txt"; then fail "the restored database differs from the source"; fi
echo "Restored $PUBLIC_TABLES public tables (+ keelwork and auth) with identical row counts, ledger total and audit log."

check_raises() {
  local name="$1" sql="$2" pattern="$3"
  local out; out="$(psql -h "$TMP" -p "$PORT" -U postgres -d restored -X -q -v ON_ERROR_STOP=1 -c "$sql" 2>&1)"
  if echo "$out" | grep -qi "$pattern"; then echo "ok   $name"; else echo "$out"; fail "$name"; fi
}
check_raises "audit log still append-only" "update public.audit_events set action = 'x'" "append-only"
check_raises "credit ledger still append-only" "delete from public.credit_ledger" "append-only"
check_raises "tool-call log still append-only" "delete from public.tool_calls" "append-only"
check_raises "deployment lifecycle still enforced" "insert into public.deployments(project_id, org_id, environment, status) select id, org_id, 'preview', 'live' from public.projects limit 1" "start queued"
check_raises "anon still can't read organizations" "set role anon; select * from public.organizations" "permission denied"
check_raises "clients still can't read ciphertext" "set role authenticated; select ciphertext from public.project_secrets" "permission denied"

ORG="$(qa restored -c "select id from public.organizations order by created_at limit 1")"
BEFORE="$(qa restored -c "select coalesce(sum(amount_micros), 0) from public.credit_ledger where org_id = '$ORG'")"
qa restored -c "insert into public.usage_events(org_id, kind, cost_micros) values ('$ORG', 'ai', 1234)" >/dev/null || fail "usage insert"
AFTER="$(qa restored -c "select coalesce(sum(amount_micros), 0) from public.credit_ledger where org_id = '$ORG'")"
[ "$((BEFORE - AFTER))" = "1234" ] || fail "the usage → ledger trigger didn't fire after restore"
echo "ok   usage still debits the ledger after restore"

RLS_OFF="$(qa restored -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity")"
[ "$RLS_OFF" = "0" ] || fail "$RLS_OFF tables lost RLS"
echo "ok   RLS on every table after restore"
echo "Backup and restore drill passed."
