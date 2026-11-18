# Keelwork threat model

Keelwork runs code that AI agents write, for many customers at once. This is what we protect, from whom, and how.

## Assets

| Asset | Where it lives | Protection |
|---|---|---|
| Customers' source code | Sandboxes (broker host), exports, marketplace versions | Tenant RLS on every table; sandboxes on a separate host; exports and deploys scanned for credentials |
| Customers' secrets | `project_secrets` (envelope-encrypted) | AES-256-GCM per value, wrapped by master keys outside the database; ciphertext never granted to clients; AAD binds each envelope to project + name + environment |
| Keelwork's own keys | Environment of each process | Never passed to sandboxes or customer apps; broker refuses platform names in `PUT /env` |
| Credit balance and billing | `credit_ledger`, `org_billing` | Append-only ledger, idempotent references, writes only through definer functions and the Stripe webhook |
| Audit trails | `audit_events`, `platform_audit_events`, `tool_calls` | Append-only (trigger) even for the database owner |

## Adversaries and mitigations

**A malicious or confused agent (prompt injection in a page, file or plan).**
All text from files, tools and the web is framed as data. Every tool call goes through the policy engine (`src/lib/agents/policy.ts`): argv-only commands, no shell metacharacters, path rules (no `..`, `.git`, `.env*`), migration rules (no RLS disabling, no grants to anon/public, no platform schemas), HTTPS-only fetches with an allowlist and SSRF checks. Risky actions (new packages, deletes, pushes, destructive migrations, production deploys, secrets, messages) become approvals a person decides. The broker re-checks the same rules. Secret values are scrubbed from model input and logs; an approval request containing a secret is refused.

**Generated code trying to escape.**
Sandboxes run on a dedicated Docker host (gVisor recommended): read-only root, uid 1000, all capabilities dropped, `no-new-privileges`, pids/memory/CPU limits, no network by default. The web app never executes generated code.

**Another tenant.**
Row Level Security on every table, policies through `has_permission`, writes through `SECURITY DEFINER` functions that pin `search_path = ''` and check permissions; `org_id` is always inherited by triggers, never trusted from clients. `keelwork.finish_migration` refuses to record a migration that leaves a table without RLS, gives anon a write privilege, or leaves a definer function without a pinned search path.

**Keelwork staff.**
Staff see organization metadata only. Looking inside needs an owner-approved, time-boxed (1–72 h), read-only grant; secrets remain unreadable and exports are refused; every step is audited in both trails.

**SSRF via imports, automations, fetches and database URLs.**
`safeRequest` resolves DNS at connect time, checks every address (private, loopback, link-local/metadata, CGNAT, ULA, IPv4-mapped, NAT64, 6to4), connects to the checked address, follows at most 3 redirects with re-checks (automations: none), and caps size, type and time. `DATABASE_URL` hosts must resolve to public addresses.

**Credential leaks in output.**
The secret scanner (pattern rules, Supabase service-role JWTs, exact vault values, committed env files) runs on exports, deploys (source and built bundle), marketplace packages and the Security Centre. Any credential blocks exports and deploys; committed credentials can never be accepted as a risk.

**Account takeover.**
Supabase Auth with email verification, TOTP MFA (AAL2 enforced in middleware when enrolled), rate-limited sign-in (hashed keys, no raw IPs), same-site redirect validation, hashed single-use invitations bound to the invited email.

**Web attacks on Keelwork.**
Per-request nonce CSP with `strict-dynamic`, `frame-ancestors 'none'`, HSTS preload, COOP/CORP, `X-Frame-Options: DENY`. Previews live on a separate site (`p-<id>.<preview domain>`) with signed, expiring tokens and `frame-ancestors` limited to Keelwork.

**Billing abuse.**
`assert_can_spend` before every AI call and search (balance and monthly limit); prices come from the catalogue and unpriced models/searches are refused; Stripe events verified (signature + 300 s window), applied once per event and once per reference, with credits and organization taken only from server-set metadata.

## Residual risks (tracked)

- Pattern-based scanners miss novel secret formats; exact vault-value matching covers known values only.
- Backend Studio's route analysis is heuristic.
- The tmpfs workspace loses work when a sandbox stops; export regularly.
- An independent penetration test is required before taking payment (go-live checklist).
