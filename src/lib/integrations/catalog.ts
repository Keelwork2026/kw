import { CATEGORIES, DIRECTORY, EXTRA, type Category, type DirectoryRow } from "./directory";

/**
 * Connectors use the PROJECT's own accounts. A connector is "connected" when
 * the project holds every secret it needs, and "needs setup" when it holds
 * some of them. Keelwork never holds an account of its own on your behalf.
 *
 * `usedBy` says honestly what uses it: a built-in Keelwork feature
 * (automation steps, Database Studio, deployments) or your app's own code,
 * which the agents write when you ask for the feature.
 */
export type Integration = {
  id: string; name: string; category: Category;
  /** The service's own website. */
  site: string;
  /** A page whose icon is the product's logo; served through /api/connectors/logo/[id]. None means the monogram is shown. */
  logo?: string; description: string; usedBy: string; docs: string;
  secrets: { name: string; hint: string }[];
  deployOnly?: boolean;
  /** Brand-neutral tile colour for the monogram icon. */
  color: string;
  /** What the key lets anyone holding it do, so people can choose a narrow one. */
  access: string;
  /** Where to create the key. */
  setup: string;
  /** Used by a built-in Keelwork feature, not only by your app's code. */
  native?: boolean;
  /** No fixed keys: the project names its own secrets. Never shows as connected. */
  custom?: boolean;
};

/** Hand-written detail for the connectors Keelwork has documented closely. Name, category, site and logo come from the directory. */
type Detail = Omit<Integration, "name" | "category" | "site" | "logo"> & { name?: string; category?: string };

const DETAILED: Detail[] = [
  // Used by Keelwork features
  { id: "resend", name: "Resend", category: "Email", description: "Transactional email.", usedBy: "Email steps in automations, and your app", docs: "https://resend.com/docs", secrets: [{ name: "RESEND_API_KEY", hint: "Starts with re_" }], color: "#111111", access: "Sends email from your verified domains. It can't read your inbox.", setup: "Resend → API Keys → Create (choose \"Sending access\").", native: true },
  { id: "slack", name: "Slack", category: "Messaging", description: "Post messages to a channel.", usedBy: "Slack steps in automations", docs: "https://api.slack.com/messaging/webhooks", secrets: [{ name: "SLACK_WEBHOOK_URL", hint: "https://hooks.slack.com/services/…" }], color: "#4a154b", access: "Posts to the one channel the webhook was made for. It can't read messages.", setup: "Slack → Apps → Incoming Webhooks → Add to a channel.", native: true },
  { id: "database", name: "Postgres / Supabase database", category: "Data", description: "Your app's own database.", usedBy: "Database Studio (applying migrations) and your app", docs: "https://supabase.com/docs/guides/database/connecting-to-postgres", secrets: [{ name: "DATABASE_URL", hint: "postgres://user:password@host:5432/db" }], color: "#3ecf8e", access: "Full read and write access to your app's database. Keelwork uses it only when you apply a migration.", setup: "Supabase → Project Settings → Database → Connection string.", native: true },
  { id: "cloudflare", name: "Cloudflare", category: "Hosting", description: "Deploy to Workers in your own account.", usedBy: "Deployments only — never passed to your app", docs: "https://developers.cloudflare.com/workers/", secrets: [{ name: "CLOUDFLARE_API_TOKEN", hint: "A token with Workers Scripts: Edit" }, { name: "CLOUDFLARE_ACCOUNT_ID", hint: "32 hex characters" }], deployOnly: true, color: "#f38020", access: "Deploys and edits Workers in your account. Make a token limited to Workers Scripts: Edit.", setup: "Cloudflare → My Profile → API Tokens → Create Token.", native: true },
  { id: "vercel", name: "Vercel", category: "Hosting", description: "Deploy to your own Vercel account.", usedBy: "Deployments only — never passed to your app", docs: "https://vercel.com/docs/rest-api", secrets: [{ name: "VERCEL_TOKEN", hint: "An account token scoped to one team" }], deployOnly: true, color: "#000000", access: "Can deploy and change projects in the scope you choose. Scope it to one team and set an expiry.", setup: "Vercel → Account Settings → Tokens.", native: true },
  // Payments
  { id: "stripe", name: "Stripe", category: "Payments", description: "Card payments and subscriptions in your app.", usedBy: "Your app's checkout and webhooks", docs: "https://docs.stripe.com", secrets: [{ name: "STRIPE_SECRET_KEY", hint: "sk_test_… or sk_live_…" }, { name: "STRIPE_WEBHOOK_SECRET", hint: "whsec_…" }], color: "#635bff", access: "A secret key can create charges, refunds and customers. Prefer a restricted key, and test keys until launch.", setup: "Stripe Dashboard → Developers → API keys (and Webhooks for the signing secret)." },
  { id: "paystack", name: "Paystack", category: "Payments", description: "Card, bank and USSD payments in Nigeria, Ghana, Kenya and South Africa.", usedBy: "Your app's checkout and webhooks", docs: "https://paystack.com/docs", secrets: [{ name: "PAYSTACK_SECRET_KEY", hint: "sk_test_… or sk_live_…" }, { name: "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", hint: "pk_test_… or pk_live_…" }], color: "#0ba4db", access: "The secret key can start and verify transactions and issue refunds. It stays on the server.", setup: "Paystack Dashboard → Settings → API Keys & Webhooks." },
  { id: "flutterwave", name: "Flutterwave", category: "Payments", description: "Cards, mobile money and bank transfers across Africa.", usedBy: "Your app's checkout and webhooks", docs: "https://developer.flutterwave.com", secrets: [{ name: "FLW_SECRET_KEY", hint: "FLWSECK_TEST-…" }, { name: "FLW_SECRET_HASH", hint: "Webhook hash you choose" }], color: "#f5a623", access: "The secret key can create payments and refunds.", setup: "Flutterwave Dashboard → Settings → API Keys." },
  { id: "paypal", name: "PayPal", category: "Payments", description: "PayPal and card checkout.", usedBy: "Your app's checkout", docs: "https://developer.paypal.com/docs", secrets: [{ name: "PAYPAL_CLIENT_ID", hint: "From your REST app" }, { name: "PAYPAL_CLIENT_SECRET", hint: "Server only" }], color: "#003087", access: "Creates and captures orders for your merchant account.", setup: "developer.paypal.com → Apps & Credentials (start in Sandbox)." },
  // Email & messaging
  { id: "sendgrid", name: "SendGrid", category: "Email", description: "Transactional and marketing email.", usedBy: "Your app", docs: "https://www.twilio.com/docs/sendgrid", secrets: [{ name: "SENDGRID_API_KEY", hint: "Starts with SG." }], color: "#1a82e2", access: "Choose Restricted access with Mail Send only.", setup: "SendGrid → Settings → API Keys." },
  { id: "postmark", name: "Postmark", category: "Email", description: "Fast transactional email.", usedBy: "Your app", docs: "https://postmarkapp.com/developer", secrets: [{ name: "POSTMARK_SERVER_TOKEN", hint: "Server API token" }], color: "#b38f00", access: "Sends email from one Postmark server.", setup: "Postmark → Servers → API Tokens." },
  { id: "twilio", name: "Twilio", category: "Messaging", description: "SMS and voice.", usedBy: "Your app", docs: "https://www.twilio.com/docs", secrets: [{ name: "TWILIO_ACCOUNT_SID", hint: "AC…" }, { name: "TWILIO_AUTH_TOKEN", hint: "32 characters" }], color: "#f22f46", access: "Sends SMS and places calls billed to your account.", setup: "Twilio Console → Account Info." },
  { id: "whatsapp", name: "WhatsApp Cloud API", category: "Messaging", description: "Send WhatsApp template messages and replies.", usedBy: "Your app", docs: "https://developers.facebook.com/docs/whatsapp/cloud-api", secrets: [{ name: "WHATSAPP_TOKEN", hint: "System user access token" }, { name: "WHATSAPP_PHONE_NUMBER_ID", hint: "From WhatsApp → API Setup" }], color: "#1da851", access: "Sends messages from your business number.", setup: "Meta for Developers → your app → WhatsApp → API Setup." },
  { id: "telegram", name: "Telegram bot", category: "Messaging", description: "Message users or a group through your bot.", usedBy: "Your app", docs: "https://core.telegram.org/bots/api", secrets: [{ name: "TELEGRAM_BOT_TOKEN", hint: "123456:ABC-…" }], color: "#229ed9", access: "Full control of that one bot.", setup: "Message @BotFather → /newbot." },
  { id: "discord", name: "Discord", category: "Messaging", description: "Post messages to a Discord channel.", usedBy: "Your app", docs: "https://discord.com/developers/docs/resources/webhook", secrets: [{ name: "DISCORD_WEBHOOK_URL", hint: "https://discord.com/api/webhooks/…" }], color: "#5865f2", access: "Posts to one channel only.", setup: "Channel settings → Integrations → Webhooks." },
  // AI & search
  { id: "openai", name: "OpenAI", category: "AI", description: "AI features inside your app.", usedBy: "Your app", docs: "https://platform.openai.com/docs", secrets: [{ name: "OPENAI_API_KEY", hint: "sk-…" }], color: "#10a37f", access: "Makes model calls billed to your account. Set a monthly limit.", setup: "platform.openai.com → API keys." },
  { id: "anthropic", name: "Anthropic", category: "AI", description: "Claude inside your app.", usedBy: "Your app", docs: "https://docs.claude.com", secrets: [{ name: "ANTHROPIC_API_KEY", hint: "sk-ant-…" }], color: "#c15f3c", access: "Makes model calls billed to your account. Set a spend limit.", setup: "console.anthropic.com → API Keys." },
  { id: "kimi", name: "Kimi (Moonshot AI)", category: "AI", description: "Kimi models inside your app.", usedBy: "Your app", docs: "https://platform.kimi.ai/docs", secrets: [{ name: "MOONSHOT_API_KEY", hint: "sk-…" }], color: "#1b1b1b", access: "Makes model calls billed to your account.", setup: "platform.kimi.ai → API Keys." },
  { id: "deepseek", name: "DeepSeek", category: "AI", description: "DeepSeek models inside your app.", usedBy: "Your app", docs: "https://api-docs.deepseek.com", secrets: [{ name: "DEEPSEEK_API_KEY", hint: "sk-…" }], color: "#4d6bfe", access: "Makes model calls billed to your account.", setup: "platform.deepseek.com → API keys." },
  { id: "brave", name: "Brave Search", category: "Search", description: "Web search inside your app.", usedBy: "Your app", docs: "https://api-dashboard.search.brave.com/app/documentation", secrets: [{ name: "BRAVE_SEARCH_API_KEY", hint: "BSA…" }], color: "#e8431b", access: "Runs searches billed to your plan.", setup: "api-dashboard.search.brave.com → API Keys." },
  { id: "algolia", name: "Algolia", category: "Search", description: "Instant search over your app's content.", usedBy: "Your app", docs: "https://www.algolia.com/doc", secrets: [{ name: "ALGOLIA_APP_ID", hint: "Application ID" }, { name: "ALGOLIA_ADMIN_KEY", hint: "Server only — for indexing" }, { name: "NEXT_PUBLIC_ALGOLIA_SEARCH_KEY", hint: "Search-only key" }], color: "#003dff", access: "The admin key can change indexes; the search key can only search.", setup: "Algolia Dashboard → Settings → API Keys." },
  // Backends
  { id: "appwrite", name: "Appwrite", category: "Backend", description: "Self-hostable backend.", usedBy: "Apps on the Appwrite backend", docs: "https://appwrite.io/docs", secrets: [{ name: "NEXT_PUBLIC_APPWRITE_ENDPOINT", hint: "https://cloud.appwrite.io/v1" }, { name: "NEXT_PUBLIC_APPWRITE_PROJECT_ID", hint: "Project id" }, { name: "APPWRITE_API_KEY", hint: "Server key; never public" }], color: "#fd366e", access: "The server key has the scopes you grant it.", setup: "Appwrite Console → Project → API Keys." },
  { id: "cloudbase", name: "Tencent CloudBase", category: "Backend", description: "Backend for users in China.", usedBy: "Apps on the CloudBase backend", docs: "https://docs.cloudbase.net", secrets: [{ name: "NEXT_PUBLIC_TCB_ENV_ID", hint: "Environment id" }, { name: "TCB_SECRET_ID", hint: "Server only" }, { name: "TCB_SECRET_KEY", hint: "Server only" }], color: "#0052d9", access: "Access to your CloudBase environment.", setup: "Tencent Cloud → CAM → API keys." },
  // Maps & media
  { id: "google-maps", name: "Google Maps", category: "Maps", description: "Maps, places and directions.", usedBy: "Your app", docs: "https://developers.google.com/maps/documentation", secrets: [{ name: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", hint: "Restrict it to your domain" }], color: "#1e8e3e", access: "A browser key anyone can see — restrict it to your domain and the APIs you use.", setup: "Google Cloud Console → APIs & Services → Credentials." },
  { id: "mapbox", name: "Mapbox", category: "Maps", description: "Custom maps and geocoding.", usedBy: "Your app", docs: "https://docs.mapbox.com", secrets: [{ name: "NEXT_PUBLIC_MAPBOX_TOKEN", hint: "pk.…" }], color: "#4264fb", access: "A public token — restrict it to your URLs.", setup: "Mapbox account → Tokens." },
  { id: "cloudinary", name: "Cloudinary", category: "Media", description: "Image and video uploads, resizing and delivery.", usedBy: "Your app", docs: "https://cloudinary.com/documentation", secrets: [{ name: "CLOUDINARY_URL", hint: "cloudinary://key:secret@cloud" }], color: "#3448c5", access: "Uploads and manages media in your account.", setup: "Cloudinary Console → Dashboard → API environment variable." },
  // Analytics & monitoring
  { id: "sentry", name: "Sentry", category: "Monitoring", description: "Error tracking for your app.", usedBy: "Your app", docs: "https://docs.sentry.io/platforms/javascript/guides/nextjs/", secrets: [{ name: "NEXT_PUBLIC_SENTRY_DSN", hint: "https://…@….ingest.sentry.io/…" }], color: "#362d59", access: "The DSN only lets your app send error events.", setup: "Sentry → Project Settings → Client Keys (DSN)." },
  { id: "posthog", name: "PostHog", category: "Analytics", description: "Product analytics and feature flags.", usedBy: "Your app", docs: "https://posthog.com/docs", secrets: [{ name: "NEXT_PUBLIC_POSTHOG_KEY", hint: "phc_…" }], color: "#c03c00", access: "A project key that can only send events.", setup: "PostHog → Project Settings → Project API key." },
  // Productivity & CRM
  { id: "github", name: "GitHub", category: "Developer", description: "Issues, repositories and Actions from your app.", usedBy: "Your app", docs: "https://docs.github.com/rest", secrets: [{ name: "GITHUB_TOKEN", hint: "Fine-grained token" }], color: "#24292f", access: "Use a fine-grained token limited to the repositories and permissions you need.", setup: "GitHub → Settings → Developer settings → Fine-grained tokens." },
  { id: "notion", name: "Notion", category: "Productivity", description: "Read and write pages and databases.", usedBy: "Your app", docs: "https://developers.notion.com", secrets: [{ name: "NOTION_TOKEN", hint: "ntn_…" }], color: "#000000", access: "Only the pages you share with the integration.", setup: "notion.so/my-integrations → New integration, then share pages with it." },
  { id: "airtable", name: "Airtable", category: "Productivity", description: "Use an Airtable base as a data source.", usedBy: "Your app", docs: "https://airtable.com/developers/web/api", secrets: [{ name: "AIRTABLE_TOKEN", hint: "pat…" }], color: "#0b8fc9", access: "The scopes and bases you pick when creating the token.", setup: "airtable.com/create/tokens." },
  { id: "google-sheets", name: "Google Sheets", category: "Productivity", description: "Read and append rows with a service account.", usedBy: "Your app", docs: "https://developers.google.com/sheets/api", secrets: [{ name: "GOOGLE_SERVICE_ACCOUNT_JSON", hint: "The service account key file's contents" }], color: "#0f9d58", access: "Only sheets shared with the service account's email.", setup: "Google Cloud → IAM → Service Accounts → Keys, then share the sheet with it." },
  { id: "hubspot", name: "HubSpot", category: "CRM", description: "Contacts, companies and deals.", usedBy: "Your app", docs: "https://developers.hubspot.com/docs/api", secrets: [{ name: "HUBSPOT_ACCESS_TOKEN", hint: "Private app token pat-…" }], color: "#e8613f", access: "The scopes you grant the private app.", setup: "HubSpot → Settings → Integrations → Private Apps." },
  { id: "calendly", name: "Calendly", category: "Scheduling", description: "Show booking links and receive booking events.", usedBy: "Your app", docs: "https://developer.calendly.com", secrets: [{ name: "CALENDLY_TOKEN", hint: "Personal access token" }], color: "#006bff", access: "Reads your event types and scheduled events.", setup: "Calendly → Integrations → API & Webhooks." },
];

const PALETTE = ["#2f5bea", "#0f766e", "#b4235a", "#7c3aed", "#c2410c", "#0e7490", "#4d7c0f", "#9f1239", "#1d4ed8", "#a16207"];
function tint(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

const SETUP: Record<DirectoryRow["kind"], string> = {
  key: "In the service's dashboard, open its API or developer settings and create a key for this app.",
  token: "In the service's dashboard, open its API or developer settings and create an access token for this app.",
  oauth: "Register an OAuth app in the service's developer console, set its redirect URL to your app, and copy the client ID and secret.",
  google: "Google Cloud Console → APIs & Services: enable the API, then Credentials → Create OAuth client ID (Web application).",
  "google-sa": "Google Cloud Console → IAM → Service Accounts → Keys, enable the API, then share the data with the service account's email.",
  microsoft: "Microsoft Entra admin center → App registrations → New registration, add the Graph permissions it needs, then Certificates & secrets.",
  aws: "AWS IAM → create a user or role with only the permissions the app needs, then create an access key.",
  azure: "Azure portal → Microsoft Entra ID → App registrations, then assign the app a role on your subscription.",
  url: "Copy the connection string from the service's console. Use a user with only the access the app needs.",
  webhook: "Create an incoming webhook for the channel in the service's settings and copy its URL.",
  custom: "Add the service's keys on a project's Secrets tab under names you choose, then tell the agents what the service is and which keys to use.",
  explicit: "Create the keys in the service's dashboard under its API or developer settings.",
};
const ACCESS = "What the key can do depends on the scopes or permissions you choose when you create it. Pick the narrowest that covers your feature, and use test or sandbox keys until launch.";

function fromRow(r: DirectoryRow): Integration {
  const d = DETAILED.find((x) => x.id === r.id);
  if (d) return { ...d, name: r.name, category: r.category, site: r.site, logo: r.logo };
  return {
    id: r.id, name: r.name, category: r.category, site: r.site, logo: r.logo, description: r.description, secrets: r.secrets,
    usedBy: r.kind === "custom" ? "Your app, under the names you choose" : "Your app",
    docs: r.site, color: tint(r.id), access: r.kind === "custom" ? "Whatever the keys you add allow. Keelwork's agents don't connect to MCP servers directly yet; they write API calls in your app instead." : ACCESS,
    setup: SETUP[r.kind], ...(r.kind === "custom" ? { custom: true } : {}),
  };
}

export const INTEGRATIONS: Integration[] = [...DIRECTORY, ...EXTRA].map(fromRow)
  .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.name.localeCompare(b.name));

export const CONNECTOR_CATEGORIES: string[] = [...CATEGORIES];

/** Every detailed connector must appear in the directory, so none silently disappears. */
export const UNLISTED_DETAILS = DETAILED.filter((d) => !INTEGRATIONS.some((i) => i.id === d.id)).map((d) => d.id);

export function connectionStatus(integration: Integration, connected: Set<string>): { connected: boolean; missing: string[] } {
  if (integration.custom || !integration.secrets.length) return { connected: false, missing: [] };
  const missing = integration.secrets.map((s) => s.name).filter((n) => !connected.has(n));
  return { connected: missing.length === 0, missing };
}
