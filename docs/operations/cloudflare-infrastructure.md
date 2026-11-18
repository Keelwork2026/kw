# Cloudflare in front of Keelwork and customer apps

## Keelwork itself

- **DNS**: `app.keelwork.example` (web app), `*.preview.keelwork.example` (preview proxy, wildcard), `broker.internal…` is **not** public — reach it over a private network or Cloudflare Tunnel with Access.
- **TLS**: Full (strict). An edge certificate covering `*.preview.keelwork.example` (Advanced Certificate Manager) is required for previews.
- **WAF**: managed rules on; rate-limiting rules mirroring the app's buckets as an outer layer (sign-in 10/min per IP, `/api/collect/*` 120 per 2 s, `/api/hooks/*` 60/s per path); block non-POST to `/api/stripe/webhook`.
- **Headers**: the app sets its own CSP/HSTS; don't let Cloudflare transforms override them.
- **Caching**: bypass cache for `/api/*`, `/auth/*` and all authenticated routes; cache `/_next/static/*`.
- `CF-Connecting-IP` is used for rate limiting and analytics hashing (never stored raw).

## Customer apps (Cloudflare Workers)

- Each project deploys to the **customer's own** account with their `CLOUDFLARE_API_TOKEN` (scope: *Workers Scripts: Edit*, *Account: Read*) and `CLOUDFLARE_ACCOUNT_ID`.
- Worker names: `kw-<name>-<id8>` (production) and `kw-<name>-<id8>-preview`.
- Deploys use Workers **Versions**: upload a version, check its preview URL, move 100% of traffic, check the live URL, and switch back to the previous version if the live check fails. `workers.dev` and preview URLs are enabled on the script.
- Custom domains are added by the customer in their Cloudflare dashboard (Workers → Settings → Domains & Routes).
