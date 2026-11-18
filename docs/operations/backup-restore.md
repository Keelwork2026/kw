# Backup and restore runbook

## What protects the data

1. **Supabase Point-in-Time Recovery** (enable on the production project) — the primary recovery path.
2. **Daily logical dumps** (`pg_dump -Fc`) stored outside Supabase, encrypted, kept 30 days.
3. **The drill** (`scripts/backup-restore-drill.sh`, also a CI job) proves a dump restores: every table with identical row counts, the same ledger total and audit log, and RLS, immutability and triggers still enforced.

Master keys (`SECRETS_MASTER_KEYS`) are **not** in the database. Back them up separately (two people, offline). A database restore without them cannot decrypt any secret.

## Restore procedure (logical dump)

1. Freeze writes: scale the web app, worker and runner to zero; show the maintenance page.
2. Create a fresh Supabase project (or database) in the same region.
3. `pg_restore --exit-on-error --no-owner -d "$TARGET_URL" backup.pgc`
4. Verify with the same checks the drill makes:
   - row counts per table match the source manifest saved with the dump;
   - `select sum(amount_micros) from credit_ledger` matches;
   - `select count(*), max(id) from audit_events` matches;
   - `select relname from pg_class … where not relrowsecurity` returns nothing in `public`;
   - an `update audit_events` fails with "append-only".
5. Point the processes at the new database, start the runner and worker, then the web app.
6. Check `/api/ready` returns 200, then lift the maintenance page.
7. Record the restore (time, dump id, verification output) in the incident log.

## Restore procedure (PITR)

Use the Supabase dashboard to restore to a timestamp before the incident, then run step 4's verification queries before reopening.

## Drill schedule

- On every push (CI `restore-drill` job).
- Quarterly: a real PITR restore into a scratch project, verified as above. The go-live checklist requires one before opening sign-ups.
