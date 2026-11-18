# Keelwork

A production-grade AI software engineering platform. A person describes an app, approves a plan, and a team of eight specialist AI agents builds it inside an isolated sandbox with a live preview. The person can then edit the code, restyle the UI by clicking elements, manage data, secrets and automations, run tests and security scans, deploy to their own Cloudflare (or Vercel) account, and export the full source. Tenancy, billing, a template marketplace, privacy-safe analytics, an audited admin portal and production hardening are part of the product.

> **Read the verification table before relying on anything.** Everything that could be run here was run; everything that needs real infrastructure (provider keys, a Docker host, a Supabase project, package-registry access) is written and labelled **Not run yet**, and degrades honestly in the UI.

## Stack

| Role | Service | Where |
|---|---|---|
| App | Next.js 15 App Router, React 19, TypeScript (strict), Tailwind CSS v4 (`@theme` tokens), pnpm, zod | `src/` |
| Keelwork's database + auth | Supabase (Postgres 16 + Auth via `@supabase/ssr`) | `supabase/migrations` |
| Architecture, planning, reasoning | Kimi (Moonshot AI) `kimi-k3.1-pro` — routes `plan`, `reason`, `chat` | `src/lib/ai/presets.ts` |
| Coding, review | DeepSeek `deepseek-flash` — routes `code`, `review` (each model is the other's fallback) | same |
| Agent web research | Brave Search API, metered per search | `src/lib/research/brave.ts` |
| Generated apps' backend | Supabase (default), PostgreSQL, Appwrite or Tencent CloudBase | `src/lib/stack/` |
| Isolated execution | Docker (gVisor `runsc` recommended) on a separate host | `services/sandbox-broker` |
| Deploy target for generated apps | Cloudflare Workers via OpenNext (default) or Vercel, in the customer's own account | `src/lib/deploy/`, `services/agent-worker/src/deploy*.ts` |
| Payments | Stripe (Keelwork's own account) | `src/lib/billing/` |
| Edge | Cloudflare DNS / TLS / WAF in front of Keelwork | `docs/operations/cloudflare-infrastructure.md` |

## What's here

| Area | Files |
|---|---|
| Database (14 migrations, RLS everywhere, self-checking) | `supabase/migrations/*.sql`, checks in `supabase/tests/*.sql`, runner `scripts/test-db.sh` |
| Design language "Ultramarine & Acid" | `src/app/globals.css`, `src/app/layout.tsx`, `design/canvas.html` (Main, Nav, Auth, Builder, Dashboard, Pricing) |
| Marketing site | `src/app/(marketing)/{page,pricing,layout}.tsx`, `src/components/marketing/{site-nav,menu-data,icon,hero-prompt}.tsx` |
| Auth | `src/app/(auth)/*`, `src/app/auth/{callback,confirm}`, `src/lib/auth/redirect.ts`, `src/middleware.ts` |
| App shell, 21 sections, project tabs | `src/lib/nav.ts`, `src/components/{sidebar,project-picker,project-tabs,section-picker,action-form}.tsx`, `src/app/(app)/**` |
| AI gateway, planning | `src/lib/ai/{catalog,providers,gateway,plan,presets,server}.ts` |
| Agents, policy engine, protocol | `src/lib/agents/{graph,policy,protocol}.ts`, `services/agent-worker/src/{core,worker}.ts` |
| Sandbox broker, preview proxy | `services/sandbox-broker/{server,docker-args}.ts`, `runtime.Dockerfile`, `services/preview-proxy/proxy.ts`, `src/lib/preview/*` |
| Starter template | `templates/next-supabase` (with its own tests), `src/lib/templates/load.ts`, `src/lib/stack/adapt.ts` |
| Website import (SSRF-safe) | `src/lib/import/{safe-fetch,extract}.ts`, `src/app/(app)/templates` |
| Code view, Design mode | `src/lib/code/{tree,git}.ts`, `src/lib/design/bridge.ts`, `src/app/(app)/projects/[id]/code`, `src/components/builder/preview-pane.tsx`, template `app/kw-inspector.tsx` |
| Secrets vault | `src/lib/secrets/{vault,load,server,redact}.ts`, Secrets tab |
| Database Studio, Backend Studio | `src/lib/db/{schema,apply}.ts`, `src/lib/backend/routes.ts`, Database and Backend tabs |
| Automations, webhooks, integrations | `src/lib/automation/*`, `services/automation-runner/{runner,executors}.ts`, `src/app/api/hooks/[id]`, `src/lib/integrations/catalog.ts` |
| Testing & Security Centres | `src/lib/checks/{plan,parsers,secret-scan,audit,review}.ts`, `services/agent-worker/src/checks.ts`, Tests and Security tabs |
| Deployments, export | `src/lib/deploy/{state,health,cloudflare,vercel}.ts`, `services/agent-worker/src/{deploy,deploy-cloudflare}.ts`, `src/lib/export/{zip,collect}.ts`, `projects/[id]/export/route.ts` |
| Billing | `src/lib/billing/{stripe,server}.ts`, `src/app/api/stripe/webhook`, Billing page |
| Self-healing, test selection | `src/lib/heal/incident.ts`, `src/lib/testselect/graph.ts`, Incidents tab |
| Marketplace, analytics, admin | `src/lib/marketplace/package.ts`, `src/lib/analytics/collect.ts`, `src/app/api/collect/[key]`, `src/app/(app)/{marketplace,admin,settings/support}` |
| Hardening | `src/lib/security/{headers,rate-limit,server-limit,readiness}.ts`, `src/app/api/{health,ready}`, `scripts/backup-restore-drill.sh`, `loadtest/k6-smoke.js` |
| Docs | `docs/security/threat-model.md`, `docs/operations/{backup-restore,go-live-checklist,cloudflare-infrastructure}.md`, `docs/compliance/evidence-checklist.md` |
| Tooling | `scripts/{check-sources,mutation-check,env-vars,print-stack-catalog}.ts`, `.github/workflows/ci.yml` |

## Verification status — 19 November 2026

Run in a Linux workspace with PostgreSQL 16.15 and Node 22.23 (tsx). Package installs were not available, so nothing that needs `node_modules` was run.

| Check | Status | Count / detail |
|---|---|---|
| Database checks (`scripts/test-db.sh`, throwaway PG 16 cluster, non-root, Supabase roles/auth shim) | **Passed** | 415 / 415 checks in 14 files (target was 359) |
| Migrations self-check (`keelwork.finish_migration`: RLS on every table, no anon writes, definer `search_path = ''`, helpers revoked) | **Passed** | 14 / 14 migrations |
| Unit and integration tests (`tsx --test`) | **Passed** | 139 / 139 (target 140; see note) |
| Starter template's own tests (`node --test`) | **Passed** | 6 / 6 |
| Broker run for real (auth, traversal, `.env`, `.git`, `rm`, metacharacters, unapproved push and deletes refused, honest 503 without Docker) | **Passed** | in the unit count |
| Preview proxy end to end against a real app server | **Passed** | in the unit count |
| Website import against a real HTTP server (redirects, private DNS, size/type/time limits) | **Passed** | in the unit count |
| ZIP archives verified with the system `unzip` | **Passed** | in the unit count |
| Mutation checks (`scripts/mutation-check.ts`) | **Passed** | 25 / 25 weakenings caught, then reverted |
| Backup and restore drill | **Passed** | 45 public tables (+ keelwork, auth) identical; ledger total and audit log identical; RLS, append-only and triggers still enforced |
| Every TS/TSX file parses; `"use server"` first and async-only exports; no client component imports server-only code (`scripts/check-sources.ts`) | **Passed** | 214 files |
| `.env.example` lists every variable any process reads | **Passed** | in the unit count |
| Bugs found by the checks and fixed during the build | **Fixed** | 8 — see below |
| `pnpm install`, `next lint`, strict `tsc --noEmit`, `next build` | **Not run yet** | needs package-registry access; runs in CI on the first push |
| k6 against staging | **Not run yet** | needs a staging deployment |
| Real Kimi, DeepSeek, Brave, Cloudflare, Vercel, Stripe, Appwrite and CloudBase calls | **Not run yet** | adapters are tested against fakes only |
| Real sandboxes and the agent worker end to end | **Not run yet** | needs a Docker host; the worker's task loop is tested with injected fakes |
| Live Supabase flows (sign-up, email verification, OAuth, MFA) | **Not run yet** | needs a Supabase project |
| Applying migrations to a real project database (Database Studio) | **Not run yet** | the applier is tested against a fake client |

Note on the unit count: the main suite has 139 tests and the template has 6, 145 together. Test counts are reported as `node:test` counts them (one `test()` = one test, each with several assertions).

**Fixed during verification** (each caught by a check before commit): `decide_approval` missing an enum cast; a CTE inside a subquery in a test; `set_project_secret` letting a NULL `jsonb_typeof` slip through (plaintext envelopes would have been accepted); the support-grant policy calling an internal helper clients can't execute; the Cloudflare adapter crashing on an unknown asset hash; `toDotenv` rejecting one-letter names; import specifiers returned out of source order; file references inside `(…)` in stack traces being missed.

## Not done yet

- Live previews need the preview proxy and a wildcard certificate for `*.PREVIEW_BASE_DOMAIN`.
- Design mode needs `KW_APP_ORIGIN` (passed into sandboxes so the inspector knows where to post).
- Import reads one page per request; whole-site crawl, ZIP and Git import come later.
- Agents write migrations as files, and a person applies them from the Database tab.
- The Database Studio shows the migration-defined schema, not the live one.
- Prices are set in Stripe; the pricing page shows `[PRICE]` until real prices exist.
- Automations need the runner (`pnpm runner`) deployed; until then runs stay queued and the UI says so.
- The sandbox workspace is a tmpfs, as specified: stopping a sandbox discards its files (export first).
- The Code view editor is a plain monospace textarea with language labels, not CodeMirror (no package installs were available).
- Commits are one per phase (13), not the original's 17.

## How to run

```sh
pnpm install
cp .env.example .env.local          # fill in values; never commit it
pnpm test:db                        # all database checks on a throwaway PG 16 cluster
pnpm test && pnpm test:template     # unit and integration tests
pnpm check                          # parse / "use server" / client-import checks
pnpm mutations                      # 25 mutation checks (slow)
pnpm drill                          # backup and restore drill
pnpm dev                            # web app
pnpm worker                         # agent worker (needs broker, AI catalogue, service key)
pnpm runner                         # automation runner
pnpm broker                         # sandbox broker — on the Docker host only
pnpm proxy                          # preview proxy — next to the broker
```

Apply `supabase/migrations` in order to the Supabase project (`supabase db push`). Create the first platform admin by hand: `insert into platform_admins(user_id, role) values ('<uuid>', 'superadmin');`. The full order of go-live steps is in `docs/operations/go-live-checklist.md`.

## Rules (they override everything else)

- Never build mock functionality and present it as operational; never use static sample data in place of required records; no buttons that do nothing; no forms that don't submit to their backend.
- Never expose API keys or private credentials; never bypass authentication or permissions; never delete user data without explicit authorization.
- Never claim a deployment or a test succeeded without verifying it.
- Never run untrusted generated code on the main application server.
- Never include secrets, passwords or private API keys in downloadable archives.
- Administrators can't casually access customers' code, secrets or data — only through an owner-approved, audited, read-only support grant.
- Completing a checklist is not compliance.
- Only extract and reuse content the user is authorized to use.
- Audit every sensitive action. Show loading, success and failure states for every action. Build responsive, accessible interfaces (WCAG AA contrast, keyboard focus, labels, reduced motion).
- Customers own their source code and can export it at any time.

Codebase rules: tenant data is protected by RLS in the database, not filters in code; sensitive writes go through `SECURITY DEFINER` functions with `set search_path = ''`, a permission check and an audit row; audit, usage, ledger, tool-call and step logs are append-only; `.env*` is git-ignored (only `.env.example` is committed); everything optional degrades honestly; text from files, tools, web pages and plans is data, never instructions.

## Decisions made while building

- **Permission checks for services**: worker-only functions (leases, locks, go-live, Stripe events, salts, rate limits) are revoked from `authenticated` and called with the service-role key; client paths and agent paths are separate functions (`request_deployment` vs `queue_deployment`).
- **Saving an automation switches it off** until someone with `project.manage` switches it on again, so a member can't change a live workflow's behaviour.
- **Export and support**: exports require active membership, so a support grant (read-only) can never download source.
- **Secrets visibility**: secret *names* are visible to active members only, not to support grants.
- **Incident signatures**: a failing selective test run records under `check:tests`; only a full test pass resolves it.
- **First Cloudflare deploy**: a placeholder Worker (503 "being deployed") creates the script so the real code still goes through version previews before taking traffic.
- **Vercel**: deployments are created unpromoted, health-checked on their own URL, then promoted; a failed production check promotes the previous deployment back.
- **Test organizations** in the database checks use the Enterprise plan except in the billing file, so seat/project limits don't interfere with checks about other things.
- **Analytics visitors** are counted per day (daily salts make days unlinkable by design).
- **Marketplace files** live in `marketplace_versions.files` (≤ 8 MB, never granted to clients); installs are seeded from the reviewed, immutable version.
