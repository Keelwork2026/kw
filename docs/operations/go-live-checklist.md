# Go-live checklist

## Accounts

- Supabase project (Pro or above, PITR enabled), region close to users.
- Cloudflare account for DNS/TLS/WAF in front of Keelwork (see `cloudflare-infrastructure.md`).
- A dedicated Linux host with Docker (gVisor recommended) for the sandbox broker and preview proxy.
- A small always-on host for the agent worker and automation runner.
- Moonshot AI (Kimi) and DeepSeek API accounts; Brave Search API.
- Stripe account (Keelwork's own); Resend for invitation email.

## Secrets to generate

```sh
echo "1:$(openssl rand -base64 32)"   # SECRETS_MASTER_KEYS (store a copy offline, two people)
openssl rand -hex 32                  # BROKER_TOKEN = SANDBOX_BROKER_TOKEN
openssl rand -hex 32                  # PREVIEW_SECRET
pnpm tsx scripts/print-stack-catalog.ts   # AI_MODEL_CATALOG (append "china" for the China Kimi endpoint)
```

Check the model and search prices in `src/lib/ai/presets.ts` and `BRAVE_SEARCH_COST_MICROS` against the providers' current price lists — customers are billed exactly these numbers.

## Variables per process

Generated from every `process.env` read in the code (`pnpm tsx scripts/env-vars.ts`); `scripts/env-vars.test.ts` fails if `.env.example` misses any.

**Web app**

- `AI_MODEL_CATALOG`
- `AUTH_PROVIDERS`
- `CREDIT_PACKS`
- `DEEPSEEK_API_KEY`
- `INVITE_FROM_EMAIL`
- `KW_APP_ORIGIN`
- `MOONSHOT_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `PREVIEW_BASE_DOMAIN`
- `PREVIEW_SECRET`
- `RESEND_API_KEY`
- `SANDBOX_BROKER_TOKEN`
- `SANDBOX_BROKER_URL`
- `SECRETS_MASTER_KEYS`
- `STRIPE_PRICE_BUSINESS`
- `STRIPE_PRICE_PRO`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

**Agent worker**

- `AI_MODEL_CATALOG`
- `BRAVE_SEARCH_API_KEY`
- `BRAVE_SEARCH_COST_MICROS`
- `DEEPSEEK_API_KEY`
- `KW_TEMPLATES_DIR`
- `MOONSHOT_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SANDBOX_BROKER_TOKEN`
- `SANDBOX_BROKER_URL`
- `SECRETS_MASTER_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WORKER_CONCURRENCY`

**Automation runner**

- `NEXT_PUBLIC_SUPABASE_URL`
- `SECRETS_MASTER_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY`

**Sandbox broker**

- `BROKER_TOKEN`
- `HOST`
- `KW_APP_ORIGIN`
- `PORT`
- `SANDBOX_IMAGE` (use `keelwork/runtime-browser` for browser QA and Media screenshots)
- `SANDBOX_MEMORY_MB`
- `SANDBOX_NETWORK`
- `SANDBOX_RUNTIME` (`runsc`)

**Preview proxy**

- `APP_ORIGIN`
- `BROKER_TOKEN`
- `BROKER_URL`
- `HOST`
- `PORT`
- `PREVIEW_BASE_DOMAIN`
- `PREVIEW_SECRET`

OAuth client ids and secrets (`SUPABASE_AUTH_EXTERNAL_*`) are set in Supabase, not in Keelwork's processes.

## Check the configuration

```sh
pnpm preflight /path/to/production.env              # every process
pnpm preflight /path/to/worker.env --process "Agent worker"
```

It exits non-zero on anything that blocks a deployment (missing or placeholder values, http or localhost URLs, short tokens, malformed `SECRETS_MASTER_KEYS`, the service-role key used as the anon key, `SANDBOX_BROKER_TOKEN` ≠ `BROKER_TOKEN`) and warns about weaker set-ups (no gVisor, services bound beyond 127.0.0.1, Stripe test keys). It never prints values.

## Before opening sign-ups (in this order)

1. CI is green on the first push, and `pnpm preflight` passes for every process.
2. `/api/ready` returns 200 and is wired to monitoring.
3. Sign-up, email verification and MFA work against live Supabase.
4. One full build per backend: idea → plan → approve → agents → preview → Code view edit → tests → deploy to a test Cloudflare account → preview check → live check → rollback.
5. One signed webhook automation and one Stripe test purchase and subscription work.
6. k6 thresholds are green (`loadtest/k6-smoke.js` against staging).
7. The restore drill and a real PITR restore succeed.
8. Real prices replace `[PRICE]` on the pricing page and in Stripe.
9. The first platform admin is inserted by hand: `insert into platform_admins(user_id, role) values ('<uuid>', 'superadmin');`
10. A CDN / WAF is in front of the app.
11. A privacy policy, terms, a vulnerability disclosure policy and an incident response plan are published (then link them from the footer).
12. An independent penetration test is done before taking payment.
