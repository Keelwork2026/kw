# Compliance evidence checklist

**This is not a certification.** Completing this list does not make Keelwork compliant with SOC 2, ISO 27001, GDPR or anything else. It collects evidence an auditor or a customer's security review will ask for, and points to where each control lives.

| Area | Control | Evidence | Status |
|---|---|---|---|
| Access control | Tenant isolation by RLS on every table | `supabase/tests/*`, final sweep in `99_hardening.sql` | Automated checks pass |
| Access control | Least privilege for staff; owner-approved, time-boxed, read-only support access | `98_platform.sql`; Settings → Support access | Automated checks pass |
| Access control | MFA available to all users; enforced at AAL2 once enrolled | `src/middleware.ts`, Settings → Security | Not run against live Supabase yet |
| Logging | Append-only audit log, staff trail and tool-call log | Immutability checks in `10_core`, `30_agents`, `98_platform` | Automated checks pass |
| Encryption | Secrets envelope-encrypted, keys outside the database, rotation supported | `src/lib/secrets/vault.test.ts` | Automated checks pass |
| Encryption | TLS everywhere, HSTS preload | `src/lib/security/headers.ts`, Cloudflare config | Configure at go-live |
| Change management | CI on every push; migrations self-check RLS/grants/search_path | `.github/workflows/ci.yml`, `keelwork.finish_migration` | CI not run yet |
| Backup & recovery | Restore drill on every push; quarterly PITR restore | `scripts/backup-restore-drill.sh`, `docs/operations/backup-restore.md` | Drill passes locally; PITR not done |
| Vulnerability management | Dependency audit, secret scanning, security review in-product | Security Centre | Implemented |
| Vulnerability management | Independent penetration test | Report | Not done |
| Incident response | Plan and contacts published | — | Not written |
| Privacy | Analytics without cookies, IPs or user ids; DNT/GPC honoured | `src/lib/analytics/*` tests | Automated checks pass |
| Privacy | Privacy policy and terms | — | Not written |
| Data ownership | Full source export at any time, no secrets in archives | `src/lib/export/*` tests | Automated checks pass |
