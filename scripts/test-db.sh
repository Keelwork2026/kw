#!/usr/bin/env bash
# Runs every database check against a throwaway PostgreSQL 16 cluster.
#
#   bash scripts/test-db.sh            # all files
#   bash scripts/test-db.sh 30_agents  # only files whose name contains 30_agents
#
# The cluster runs as a non-root user. Migrations are applied in order with
# ON_ERROR_STOP; each test file then runs statement by statement (one error
# can't hide another). Exits non-zero and prints "FAILED: <file>" when any
# check fails or any statement errors. Failures are never swallowed.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILTER="${1:-}"
PORT="${KW_PG_PORT:-54329}"

find_bin() {
  for d in /usr/lib/postgresql/16/bin /usr/local/pgsql/bin /opt/homebrew/opt/postgresql@16/bin; do
    [ -x "$d/initdb" ] && { echo "$d"; return; }
  done
  dirname "$(command -v initdb)"
}
PGBIN="$(find_bin)"

TMP="$(mktemp -d /tmp/kw-db.XXXXXX)"
chmod 755 "$TMP"

as_pg() {
  if [ "$(id -u)" = "0" ]; then
    chown -R postgres:postgres "$TMP"
    runuser -u postgres -- "$@"
  else
    "$@"
  fi
}

cleanup() {
  as_pg "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

as_pg "$PGBIN/initdb" -D "$TMP/data" -A trust -U postgres --no-sync >/dev/null || { echo "FAILED: initdb"; exit 1; }
as_pg "$PGBIN/pg_ctl" -D "$TMP/data" -l "$TMP/pg.log" -w \
  -o "-k $TMP -p $PORT -c listen_addresses='' -c fsync=off" start >/dev/null || { cat "$TMP/pg.log"; echo "FAILED: start"; exit 1; }

PSQL=(psql -h "$TMP" -p "$PORT" -U postgres -d postgres -X -q)

run_strict() {
  local f="$1"
  if ! "${PSQL[@]}" -v ON_ERROR_STOP=1 -f "$f" >"$TMP/out.log" 2>&1; then
    cat "$TMP/out.log"
    echo "FAILED: $(basename "$f")"
    exit 1
  fi
}

run_strict "$ROOT/supabase/tests/_shim.sql"
for m in "$ROOT"/supabase/migrations/*.sql; do
  run_strict "$m"
done
echo "Applied $(ls "$ROOT"/supabase/migrations/*.sql | wc -l) migrations."

FAILED=0
for t in "$ROOT"/supabase/tests/[0-9]*.sql; do
  name="$(basename "$t" .sql)"
  if [ -n "$FILTER" ] && [[ "$name" != *"$FILTER"* ]]; then continue; fi
  "${PSQL[@]}" -v ON_ERROR_STOP=0 -v kwfile="$name" -f "$t" >"$TMP/$name.log" 2>&1
  errors="$(grep -E 'ERROR:' "$TMP/$name.log" || true)"
  fails="$("${PSQL[@]}" -At -c "select count(*) from kwtest.results where file = '$name' and not ok")"
  total="$("${PSQL[@]}" -At -c "select count(*) from kwtest.results where file = '$name'")"
  if [ -n "$errors" ] || [ "$fails" != "0" ] || [ "$total" = "0" ]; then
    echo "FAILED: $name ($total checks, $fails failed)"
    [ -n "$errors" ] && echo "$errors" | sed 's/^/    /'
    "${PSQL[@]}" -At -c "select '    ' || name || ' -- ' || coalesce(detail,'') from kwtest.results where file = '$name' and not ok order by id"
    FAILED=1
  else
    echo "ok   $name ($total checks)"
  fi
done

TOTAL="$("${PSQL[@]}" -At -c "select count(*) from kwtest.results")"
PASSED="$("${PSQL[@]}" -At -c "select count(*) from kwtest.results where ok")"
echo "Database checks: $PASSED/$TOTAL passed."

if [ -n "${KW_DUMP_TO:-}" ]; then
  as_pg "$PGBIN/pg_dump" -h "$TMP" -p "$PORT" -U postgres -d postgres -Fc -f "$TMP/dump.pgc"
  cp "$TMP/dump.pgc" "$KW_DUMP_TO"
fi

exit $FAILED
