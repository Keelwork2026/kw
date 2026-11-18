/**
 * Integrations use the PROJECT's own accounts. An integration is
 * "connected" when the project holds the secrets it needs.
 */
export type Integration = {
  id: string; name: string; category: string; description: string; usedBy: string; docs: string;
  secrets: { name: string; hint: string }[];
  deployOnly?: boolean;
};

export const INTEGRATIONS: Integration[] = [
  { id: "resend", name: "Resend", category: "Email", description: "Transactional email.", usedBy: "Email steps in automations, and your app", docs: "https://resend.com/docs", secrets: [{ name: "RESEND_API_KEY", hint: "Starts with re_" }] },
  { id: "slack", name: "Slack", category: "Messaging", description: "Post messages to a channel.", usedBy: "Slack steps in automations", docs: "https://api.slack.com/messaging/webhooks", secrets: [{ name: "SLACK_WEBHOOK_URL", hint: "https://hooks.slack.com/services/…" }] },
  { id: "stripe", name: "Stripe", category: "Payments", description: "Card payments and subscriptions in your app.", usedBy: "Your app's checkout and webhooks", docs: "https://docs.stripe.com", secrets: [{ name: "STRIPE_SECRET_KEY", hint: "sk_test_… or sk_live_…" }, { name: "STRIPE_WEBHOOK_SECRET", hint: "whsec_…" }] },
  { id: "openai", name: "OpenAI", category: "AI", description: "AI features inside your app.", usedBy: "Your app", docs: "https://platform.openai.com/docs", secrets: [{ name: "OPENAI_API_KEY", hint: "sk-…" }] },
  { id: "anthropic", name: "Anthropic", category: "AI", description: "Claude inside your app.", usedBy: "Your app", docs: "https://docs.claude.com", secrets: [{ name: "ANTHROPIC_API_KEY", hint: "sk-ant-…" }] },
  { id: "twilio", name: "Twilio", category: "Messaging", description: "SMS and voice.", usedBy: "Your app", docs: "https://www.twilio.com/docs", secrets: [{ name: "TWILIO_ACCOUNT_SID", hint: "AC…" }, { name: "TWILIO_AUTH_TOKEN", hint: "32 characters" }] },
  { id: "database", name: "Postgres / Supabase database", category: "Data", description: "Your app's own database.", usedBy: "Database Studio (applying migrations) and your app", docs: "https://supabase.com/docs/guides/database/connecting-to-postgres", secrets: [{ name: "DATABASE_URL", hint: "postgres://user:password@host:5432/db" }] },
  { id: "cloudflare", name: "Cloudflare", category: "Hosting", description: "Deploy to Workers in your own account.", usedBy: "Deployments only — never passed to your app", docs: "https://developers.cloudflare.com/workers/", secrets: [{ name: "CLOUDFLARE_API_TOKEN", hint: "A token with Workers Scripts: Edit" }, { name: "CLOUDFLARE_ACCOUNT_ID", hint: "32 hex characters" }], deployOnly: true },
  { id: "appwrite", name: "Appwrite", category: "Backend", description: "Self-hostable backend.", usedBy: "Apps on the Appwrite backend", docs: "https://appwrite.io/docs", secrets: [{ name: "NEXT_PUBLIC_APPWRITE_ENDPOINT", hint: "https://cloud.appwrite.io/v1" }, { name: "NEXT_PUBLIC_APPWRITE_PROJECT_ID", hint: "Project id" }, { name: "APPWRITE_API_KEY", hint: "Server key; never public" }] },
  { id: "cloudbase", name: "Tencent CloudBase", category: "Backend", description: "Backend for users in China.", usedBy: "Apps on the CloudBase backend", docs: "https://docs.cloudbase.net", secrets: [{ name: "NEXT_PUBLIC_TCB_ENV_ID", hint: "Environment id" }, { name: "TCB_SECRET_ID", hint: "Server only" }, { name: "TCB_SECRET_KEY", hint: "Server only" }] },
  { id: "kimi", name: "Kimi (Moonshot AI)", category: "AI", description: "Kimi models inside your app.", usedBy: "Your app", docs: "https://platform.kimi.ai/docs", secrets: [{ name: "MOONSHOT_API_KEY", hint: "sk-…" }] },
  { id: "deepseek", name: "DeepSeek", category: "AI", description: "DeepSeek models inside your app.", usedBy: "Your app", docs: "https://api-docs.deepseek.com", secrets: [{ name: "DEEPSEEK_API_KEY", hint: "sk-…" }] },
  { id: "brave", name: "Brave Search", category: "Search", description: "Web search inside your app.", usedBy: "Your app", docs: "https://api-dashboard.search.brave.com/app/documentation", secrets: [{ name: "BRAVE_SEARCH_API_KEY", hint: "BSA…" }] },
];

export function connectionStatus(integration: Integration, connected: Set<string>): { connected: boolean; missing: string[] } {
  const missing = integration.secrets.map((s) => s.name).filter((n) => !connected.has(n));
  return { connected: missing.length === 0, missing };
}
