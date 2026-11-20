/**
 * The connector directory: every service in the Connectors hub, grouped into
 * eight categories. Each row is: id, name, category, website, logo source
 * (a page whose icon identifies the product; fetched through /api/connectors/logo
 * so browsers never call a third party), the keys a project stores, and a
 * one-line description.
 *
 * Key names follow one convention so the agents know where to look. Services
 * that a built-in Keelwork feature uses are described in catalog.ts with more
 * detail; everything else is used by the app's own code, which the agents
 * write when someone asks for the feature.
 */
export const CATEGORIES = [
  "Personal Productivity", "Business & CRM", "Commerce & Payments", "AI & Automation",
  "Data & Analytics", "Communications", "Maps & Media", "Security & Infrastructure",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Secret = { name: string; hint: string };
export type KeyKind = "key" | "token" | "oauth" | "google" | "google-sa" | "microsoft" | "aws" | "azure" | "url" | "webhook" | "custom" | "explicit";
export type DirectoryRow = { id: string; name: string; category: Category; site: string; logo?: string; kind: KeyKind; secrets: Secret[]; description: string };

const P = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
const key = (id: string, hint = "API key"): Secret[] => [{ name: `${P(id)}_API_KEY`, hint }];
const token = (id: string, hint = "Access token"): Secret[] => [{ name: `${P(id)}_ACCESS_TOKEN`, hint }];
const oauth = (id: string): Secret[] => [{ name: `${P(id)}_CLIENT_ID`, hint: "OAuth client ID from your developer app" }, { name: `${P(id)}_CLIENT_SECRET`, hint: "OAuth client secret — server only" }];
const GOOGLE: Secret[] = [{ name: "GOOGLE_CLIENT_ID", hint: "OAuth client ID (Google Cloud → Credentials)" }, { name: "GOOGLE_CLIENT_SECRET", hint: "OAuth client secret — server only" }];
const GOOGLE_SA: Secret[] = [{ name: "GOOGLE_SERVICE_ACCOUNT_JSON", hint: "The service account key file's contents" }];
const MICROSOFT: Secret[] = [{ name: "MICROSOFT_TENANT_ID", hint: "Directory (tenant) ID" }, { name: "MICROSOFT_CLIENT_ID", hint: "Application (client) ID of your Entra app" }, { name: "MICROSOFT_CLIENT_SECRET", hint: "Client secret — server only" }];
const AWS: Secret[] = [{ name: "AWS_ACCESS_KEY_ID", hint: "Access key of an IAM user or role with only what the app needs" }, { name: "AWS_SECRET_ACCESS_KEY", hint: "Server only" }, { name: "AWS_REGION", hint: "e.g. eu-west-1" }];
const url = (id: string, hint = "Connection string"): Secret[] => [{ name: `${P(id)}_URL`, hint }];
const webhook = (id: string): Secret[] => [{ name: `${P(id)}_WEBHOOK_URL`, hint: "Webhook URL" }];

type Spec = [id: string, name: string, site: string, logo: string | null, kind: KeyKind, description: string, secrets?: Secret[]];

function rows(category: Category, specs: Spec[]): DirectoryRow[] {
  return specs.map(([id, name, site, logo, kind, description, explicit]) => ({
    id, name, category, site: `https://${site}`, ...(logo !== null ? { logo: logo || `https://${site}` } : {}), kind, description,
    secrets: explicit ?? (kind === "key" ? key(id) : kind === "token" ? token(id) : kind === "oauth" ? oauth(id) : kind === "google" ? GOOGLE : kind === "google-sa" ? GOOGLE_SA
      : kind === "microsoft" ? MICROSOFT : kind === "aws" ? AWS : kind === "url" ? url(id) : kind === "webhook" ? webhook(id) : []),
  }));
}

export const DIRECTORY: DirectoryRow[] = [
  ...rows("Personal Productivity", [
    ["microsoft-graph", "Azure Graph & Entra API", "entra.microsoft.com", "", "microsoft", "Users, groups and Microsoft 365 data through Microsoft Graph."],
    ["calendly", "Calendly", "calendly.com", "", "token", "Booking links and booking events."],
    ["canva", "Canva", "canva.com", "", "oauth", "Create and export designs from your app (Canva Connect API)."],
    ["contentful", "Contentful", "contentful.com", "", "explicit", "Headless CMS content for your pages.", [{ name: "CONTENTFUL_SPACE_ID", hint: "Space ID" }, { name: "CONTENTFUL_ACCESS_TOKEN", hint: "Content Delivery API token" }]],
    ["excalidraw", "Excalidraw+", "excalidraw.com", "", "key", "Whiteboard scenes and diagrams."],
    ["figma", "Figma", "figma.com", "", "token", "Read files, components and images (REST API, personal access token)."],
    ["fireflies", "Fireflies", "fireflies.ai", "", "key", "Meeting transcripts and summaries."],
    ["gmail", "Gmail", "mail.google.com", "https://mail.google.com/mail/", "google", "Send and read email on behalf of signed-in users (needs Google OAuth)."],
    ["google-calendar", "Google Calendar", "calendar.google.com", "https://calendar.google.com/calendar/", "google", "Read and create calendar events."],
    ["google-docs", "Google Docs", "docs.google.com", "https://docs.google.com/document/", "google", "Create and read documents."],
    ["google-drive", "Google Drive", "drive.google.com", "https://drive.google.com/drive/", "google", "Pick, upload and read files."],
    ["google-sheets", "Google Sheets", "sheets.google.com", "https://docs.google.com/spreadsheets/", "google-sa", "Read and append rows with a service account."],
    ["google-slides", "Google Slides", "slides.google.com", "https://docs.google.com/presentation/", "google", "Create and update presentations."],
    ["granola", "Granola", "granola.ai", "", "key", "Meeting notes."],
    ["loom", "Loom", "loom.com", "", "explicit", "Embed and record videos.", [{ name: "LOOM_PUBLIC_APP_ID", hint: "Record SDK app ID" }]],
    ["lovable", "Lovable API", "lovable.dev", "", "key", "Lovable's API."],
    ["microsoft-excel", "Microsoft Excel", "office.com", "https://www.office.com/launch/excel", "microsoft", "Workbooks through Microsoft Graph."],
    ["microsoft-onedrive", "Microsoft OneDrive", "onedrive.live.com", "https://onedrive.live.com/", "microsoft", "Files through Microsoft Graph."],
    ["microsoft-onenote", "Microsoft OneNote", "onenote.com", "https://www.onenote.com/", "microsoft", "Notebooks and pages through Microsoft Graph."],
    ["microsoft-outlook", "Microsoft Outlook", "outlook.com", "https://outlook.com/", "microsoft", "Mail and calendars through Microsoft Graph."],
    ["microsoft-powerpoint", "Microsoft PowerPoint", "office.com", "https://www.office.com/launch/powerpoint", "microsoft", "Presentations through Microsoft Graph."],
    ["microsoft-sharepoint", "Microsoft SharePoint", "sharepoint.com", "", "microsoft", "Sites, lists and documents through Microsoft Graph."],
    ["microsoft-teams", "Microsoft Teams", "teams.microsoft.com", "", "microsoft", "Post to channels and read messages through Microsoft Graph."],
    ["microsoft-word", "Microsoft Word", "office.com", "https://www.office.com/launch/word", "microsoft", "Documents through Microsoft Graph."],
    ["miro", "Miro", "miro.com", "", "token", "Boards, sticky notes and shapes."],
    ["notion", "Notion", "notion.so", "", "explicit", "Read and write pages and databases.", [{ name: "NOTION_TOKEN", hint: "ntn_…" }]],
    ["paper", "Paper", "paper.design", "", "key", "Design files from Paper."],
    ["sanity", "Sanity", "sanity.io", "", "explicit", "Structured content for your pages.", [{ name: "SANITY_PROJECT_ID", hint: "Project ID" }, { name: "SANITY_API_TOKEN", hint: "Read or write token — server only" }]],
    ["storyblok", "Storyblok", "storyblok.com", "", "token", "Visual headless CMS content."],
    ["tally", "Tally", "tally.so", "", "key", "Forms and their responses."],
    ["wispr-flow", "Wispr Flow", "wisprflow.ai", "", "key", "Voice dictation."],
    ["wordpress-selfhosted", "WordPress (Self-hosted)", "wordpress.org", "", "explicit", "Posts and pages through the REST API of your own WordPress.", [{ name: "WORDPRESS_URL", hint: "https://your-site.com" }, { name: "WORDPRESS_USERNAME", hint: "User the app acts as" }, { name: "WORDPRESS_APP_PASSWORD", hint: "Application password (Users → Profile)" }]],
    ["wordpress-com", "WordPress.com", "wordpress.com", "", "oauth", "Posts and sites hosted on WordPress.com."],
  ]),
  ...rows("Business & CRM", [
    ["airtable", "Airtable", "airtable.com", "", "explicit", "Use an Airtable base as a data source.", [{ name: "AIRTABLE_TOKEN", hint: "pat…" }]],
    ["apollo", "Apollo.io", "apollo.io", "", "key", "Contacts, companies and sequences."],
    ["asana", "Asana", "asana.com", "", "token", "Projects and tasks."],
    ["ashby", "Ashby", "ashbyhq.com", "", "key", "Jobs, candidates and applications."],
    ["atlassian", "Atlassian", "atlassian.com", "", "explicit", "Confluence and other Atlassian Cloud products.", [{ name: "ATLASSIAN_SITE", hint: "your-team.atlassian.net" }, { name: "ATLASSIAN_EMAIL", hint: "Account email" }, { name: "ATLASSIAN_API_TOKEN", hint: "id.atlassian.com → Security → API tokens" }]],
    ["attention", "Attention", "attention.com", "", "key", "Sales call recordings and insights."],
    ["bamboohr", "BambooHR", "bamboohr.com", "", "explicit", "Employees and time off.", [{ name: "BAMBOOHR_SUBDOMAIN", hint: "your-company" }, { name: "BAMBOOHR_API_KEY", hint: "API key" }]],
    ["clay", "Clay", "clay.com", "", "key", "Enriched lead and company data."],
    ["gong", "Gong", "gong.io", "", "explicit", "Calls, transcripts and deals.", [{ name: "GONG_ACCESS_KEY", hint: "Access key" }, { name: "GONG_ACCESS_KEY_SECRET", hint: "Server only" }]],
    ["google-ads", "Google Ads", "ads.google.com", "https://ads.google.com/home/", "explicit", "Campaign reports and conversions.", [...GOOGLE, { name: "GOOGLE_ADS_DEVELOPER_TOKEN", hint: "From the Google Ads API Center" }]],
    ["hubspot", "HubSpot", "hubspot.com", "", "explicit", "Contacts, companies and deals.", [{ name: "HUBSPOT_ACCESS_TOKEN", hint: "Private app token pat-…" }]],
    ["intercom", "Intercom", "intercom.com", "", "token", "Conversations, contacts and the Messenger."],
    ["jira", "Jira", "jira.com", "https://jira.com/", "explicit", "Issues and projects.", [{ name: "ATLASSIAN_SITE", hint: "your-team.atlassian.net" }, { name: "ATLASSIAN_EMAIL", hint: "Account email" }, { name: "ATLASSIAN_API_TOKEN", hint: "id.atlassian.com → Security → API tokens" }]],
    ["linear", "Linear", "linear.app", "", "key", "Issues, projects and cycles."],
    ["pipedrive", "Pipedrive", "pipedrive.com", "", "token", "Deals, persons and pipelines."],
    ["salesforce", "Salesforce", "salesforce.com", "", "explicit", "Leads, accounts and opportunities.", [{ name: "SALESFORCE_INSTANCE_URL", hint: "https://your-org.my.salesforce.com" }, ...oauth("salesforce")]],
    ["scrive", "Scrive", "scrive.com", "", "token", "Send documents for e-signature."],
    ["zendesk", "Zendesk", "zendesk.com", "", "explicit", "Tickets and help center articles.", [{ name: "ZENDESK_SUBDOMAIN", hint: "your-company" }, { name: "ZENDESK_EMAIL", hint: "Agent email" }, { name: "ZENDESK_API_TOKEN", hint: "Admin Center → Apps and integrations → APIs" }]],
    ["zoho-crm", "Zoho CRM", "zoho.com", "https://www.zoho.com/crm/", "oauth", "Leads, contacts and deals."],
  ]),
  ...rows("Commerce & Payments", [
    ["airwallex", "Airwallex", "airwallex.com", "", "explicit", "Global accounts, payments and FX.", [{ name: "AIRWALLEX_CLIENT_ID", hint: "Client ID" }, { name: "AIRWALLEX_API_KEY", hint: "API key — server only" }]],
    ["chargebee", "Chargebee", "chargebee.com", "", "explicit", "Subscriptions and invoices.", [{ name: "CHARGEBEE_SITE", hint: "your-site" }, { name: "CHARGEBEE_API_KEY", hint: "Full or restricted key" }]],
    ["fortnox", "Fortnox", "fortnox.se", "", "oauth", "Swedish accounting: invoices, customers and bookkeeping."],
    ["lexware", "Lexware", "lexware.de", "", "key", "German accounting (Lexware Office API)."],
    ["lightspeed", "Lightspeed", "lightspeedhq.com", "", "oauth", "Point of sale and retail data."],
    ["mollie", "Mollie", "mollie.com", "https://www.mollie.com/", "explicit", "Payments in Europe: cards, iDEAL, Bancontact and more.", [{ name: "MOLLIE_API_KEY", hint: "test_… or live_…" }]],
    ["paypal", "PayPal", "paypal.com", "", "explicit", "PayPal and card checkout.", [{ name: "PAYPAL_CLIENT_ID", hint: "From your REST app" }, { name: "PAYPAL_CLIENT_SECRET", hint: "Server only" }]],
    ["pledge", "Pledge", "pledge.to", "", "key", "Donations to nonprofits."],
    ["polar", "Polar.sh", "polar.sh", "", "token", "Sell digital products and subscriptions."],
    ["prestashop", "PrestaShop", "prestashop.com", "", "explicit", "Products and orders from your PrestaShop store.", [{ name: "PRESTASHOP_URL", hint: "https://your-shop.com" }, { name: "PRESTASHOP_API_KEY", hint: "Webservice key" }]],
    ["ramp", "Ramp", "ramp.com", "", "oauth", "Cards, spend and bills."],
    ["sevdesk", "Sevdesk", "sevdesk.de", "", "token", "German invoicing and bookkeeping."],
    ["shopify", "Shopify", "shopify.com", "", "explicit", "Products, orders and customers.", [{ name: "SHOPIFY_STORE_DOMAIN", hint: "your-store.myshopify.com" }, { name: "SHOPIFY_ADMIN_ACCESS_TOKEN", hint: "shpat_… from a custom app" }]],
    ["stripe", "Stripe", "stripe.com", "", "explicit", "Card payments and subscriptions.", [{ name: "STRIPE_SECRET_KEY", hint: "sk_test_… or sk_live_…" }, { name: "STRIPE_WEBHOOK_SECRET", hint: "whsec_…" }]],
    ["wave", "Wave", "waveapps.com", "", "token", "Invoicing and accounting for small businesses."],
    ["wix", "Wix", "wix.com", "", "key", "Sites, stores and bookings on Wix."],
    ["woocommerce", "WooCommerce", "woocommerce.com", "", "explicit", "Products and orders from your WooCommerce store.", [{ name: "WOOCOMMERCE_URL", hint: "https://your-shop.com" }, { name: "WOOCOMMERCE_CONSUMER_KEY", hint: "ck_…" }, { name: "WOOCOMMERCE_CONSUMER_SECRET", hint: "cs_…" }]],
    ["xero", "Xero", "xero.com", "", "oauth", "Invoices, contacts and accounting."],
    ["zoho-books", "Zoho Books", "zoho.com", "https://www.zoho.com/books/", "oauth", "Invoices, expenses and accounting."],
  ]),
  ...rows("AI & Automation", [
    ["apify", "Apify", "apify.com", "", "token", "Run web scrapers and automation actors."],
    ["custom", "Custom (connect your own)", "keelwork.dev", null, "custom", "Any service with an API. Add its keys on the Secrets tab under names you choose, then tell the agents what it's for."],
    ["elevenlabs", "ElevenLabs", "elevenlabs.io", "", "key", "Text to speech and voices."],
    ["firecrawl", "Firecrawl", "firecrawl.dev", "", "key", "Crawl and extract web pages as clean data."],
    ["fireworks", "Fireworks AI", "fireworks.ai", "", "key", "Fast open-model inference."],
    ["gemini-enterprise-search", "Gemini Enterprise Search", "cloud.google.com", "", "google-sa", "Enterprise search over your data in Google Cloud."],
    ["heygen", "HeyGen", "heygen.com", "", "key", "AI avatar videos."],
    ["inngest", "Inngest", "inngest.com", "", "explicit", "Durable background jobs and workflows.", [{ name: "INNGEST_EVENT_KEY", hint: "Event key" }, { name: "INNGEST_SIGNING_KEY", hint: "Signing key — server only" }]],
    ["llamaparse", "LlamaParse", "llamaindex.ai", "", "key", "Parse PDFs and documents for AI."],
    ["n8n", "n8n", "n8n.io", "", "explicit", "Trigger and manage n8n workflows.", [{ name: "N8N_URL", hint: "https://your-n8n-instance" }, { name: "N8N_API_KEY", hint: "Settings → n8n API" }]],
    ["parallel", "Parallel", "parallel.ai", "", "key", "Web research and search APIs for AI."],
    ["perplexity", "Perplexity", "perplexity.ai", "", "key", "Answers with web citations (Sonar API)."],
    ["replicate", "Replicate", "replicate.com", "", "explicit", "Run open-source models.", [{ name: "REPLICATE_API_TOKEN", hint: "r8_…" }]],
    ["retool", "Retool", "retool.com", "", "key", "Internal tools and workflows on Retool."],
  ]),
  ...rows("Data & Analytics", [
    ["algolia", "Algolia", "algolia.com", "", "explicit", "Instant search over your app's content.", [{ name: "ALGOLIA_APP_ID", hint: "Application ID" }, { name: "ALGOLIA_ADMIN_KEY", hint: "Server only — for indexing" }, { name: "NEXT_PUBLIC_ALGOLIA_SEARCH_KEY", hint: "Search-only key" }]],
    ["redshift", "Amazon Redshift", "aws.amazon.com", "https://aws.amazon.com/redshift/", "url", "Data warehouse queries.", url("redshift", "postgres://user:password@cluster:5439/db")],
    ["amplitude", "Amplitude", "amplitude.com", "", "explicit", "Product analytics.", [{ name: "NEXT_PUBLIC_AMPLITUDE_API_KEY", hint: "Project API key" }, { name: "AMPLITUDE_SECRET_KEY", hint: "For exports — server only" }]],
    ["athena", "AWS Athena", "aws.amazon.com", "https://aws.amazon.com/athena/", "aws", "SQL over data in S3."],
    ["bigquery", "BigQuery", "cloud.google.com", "https://cloud.google.com/bigquery", "google-sa", "Data warehouse queries."],
    ["bing-webmaster", "Bing Webmaster Tools", "bing.com", "https://www.bing.com/webmasters", "key", "Search performance and URL submission for Bing."],
    ["clickhouse", "ClickHouse", "clickhouse.com", "", "url", "Fast analytical database.", url("clickhouse", "https://user:password@host:8443")],
    ["confidence", "Confidence", "confidence.spotify.com", "", "explicit", "Feature flags and experiments.", [{ name: "CONFIDENCE_CLIENT_SECRET", hint: "Client secret" }]],
    ["cube", "Cube", "cube.dev", "", "explicit", "Semantic layer and metrics API.", [{ name: "CUBE_API_URL", hint: "https://…/cubejs-api/v1" }, { name: "CUBE_API_TOKEN", hint: "JWT for the API" }]],
    ["databricks", "Databricks", "databricks.com", "", "explicit", "SQL warehouses and data.", [{ name: "DATABRICKS_HOST", hint: "https://….cloud.databricks.com" }, { name: "DATABRICKS_TOKEN", hint: "Personal access or service principal token" }]],
    ["dbt", "dbt Semantic Layer", "getdbt.com", "", "explicit", "Governed metrics from dbt Cloud.", [{ name: "DBT_ENVIRONMENT_ID", hint: "Environment ID" }, { name: "DBT_SERVICE_TOKEN", hint: "Service token" }]],
    ["fullstory", "Fullstory", "fullstory.com", "", "key", "Session replay and digital experience analytics."],
    ["gooddata", "GoodData", "gooddata.com", "", "explicit", "Embedded analytics.", [{ name: "GOODDATA_HOST", hint: "https://your-org.cloud.gooddata.com" }, { name: "GOODDATA_API_TOKEN", hint: "API token" }]],
    ["google-analytics", "Google Analytics", "analytics.google.com", "https://analytics.google.com/analytics/web/", "explicit", "Website traffic reports (GA4).", [...GOOGLE_SA, { name: "GA4_PROPERTY_ID", hint: "Numeric property ID" }]],
    ["google-search-console", "Google Search Console", "search.google.com", "https://search.google.com/search-console/", "google-sa", "Search clicks, impressions and indexing."],
    ["hex", "Hex", "hex.tech", "", "token", "Run Hex projects and read results."],
    ["ibm-db2", "IBM Db2", "ibm.com", "https://www.ibm.com/products/db2", "url", "Db2 databases.", url("db2", "DATABASE=…;HOSTNAME=…;PORT=…;UID=…;PWD=…")],
    ["looker", "Looker", "looker.com", "https://cloud.google.com/looker", "explicit", "Dashboards and governed queries.", [{ name: "LOOKER_BASE_URL", hint: "https://your-org.looker.com" }, { name: "LOOKER_CLIENT_ID", hint: "API3 client ID" }, { name: "LOOKER_CLIENT_SECRET", hint: "Server only" }]],
    ["metabase", "Metabase", "metabase.com", "", "explicit", "Questions and dashboards.", [{ name: "METABASE_URL", hint: "https://your-metabase" }, { name: "METABASE_API_KEY", hint: "Admin → API keys" }]],
    ["microsoft-fabric", "Microsoft Fabric", "fabric.microsoft.com", "", "microsoft", "Lakehouses and warehouses in Fabric."],
    ["motherduck", "MotherDuck", "motherduck.com", "", "token", "Serverless DuckDB."],
    ["neon", "Neon", "neon.tech", "", "url", "Serverless Postgres.", [{ name: "NEON_DATABASE_URL", hint: "postgres://…neon.tech/db?sslmode=require" }]],
    ["omni", "Omni", "omni.co", "", "explicit", "BI and embedded dashboards.", [{ name: "OMNI_BASE_URL", hint: "https://your-org.omniapp.co" }, { name: "OMNI_API_KEY", hint: "API key" }]],
    ["oracle-adb", "Oracle Autonomous AI Database", "oracle.com", "https://www.oracle.com/autonomous-database/", "explicit", "Oracle Autonomous Database.", [{ name: "ORACLE_CONNECT_STRING", hint: "TNS name or connect descriptor" }, { name: "ORACLE_USER", hint: "Database user" }, { name: "ORACLE_PASSWORD", hint: "Server only" }]],
    ["posthog", "PostHog", "posthog.com", "", "explicit", "Product analytics and feature flags.", [{ name: "NEXT_PUBLIC_POSTHOG_KEY", hint: "phc_…" }]],
    ["power-bi", "Power BI", "powerbi.microsoft.com", "https://app.powerbi.com/", "microsoft", "Embed reports and dashboards."],
    ["qlik", "Qlik Cloud", "qlik.com", "", "explicit", "Apps and analytics in Qlik Cloud.", [{ name: "QLIK_TENANT_URL", hint: "https://your-tenant.qlikcloud.com" }, { name: "QLIK_API_KEY", hint: "API key" }]],
    ["semrush", "Semrush", "semrush.com", "", "key", "SEO keywords, rankings and backlinks."],
    ["snowflake", "Snowflake", "snowflake.com", "", "explicit", "Data warehouse queries.", [{ name: "SNOWFLAKE_ACCOUNT", hint: "org-account" }, { name: "SNOWFLAKE_USER", hint: "Service user" }, { name: "SNOWFLAKE_PRIVATE_KEY", hint: "Key-pair auth private key — server only" }]],
    ["supermetrics", "Supermetrics", "supermetrics.com", "", "key", "Marketing data from ad and analytics platforms."],
  ]),
  ...rows("Communications", [
    ["activecampaign", "ActiveCampaign", "activecampaign.com", "", "explicit", "Email marketing and automations.", [{ name: "ACTIVECAMPAIGN_URL", hint: "https://your-account.api-us1.com" }, { name: "ACTIVECAMPAIGN_API_KEY", hint: "Settings → Developer" }]],
    ["beehiiv", "beehiiv", "beehiiv.com", "", "explicit", "Newsletter subscribers and posts.", [{ name: "BEEHIIV_API_KEY", hint: "API key" }, { name: "BEEHIIV_PUBLICATION_ID", hint: "pub_…" }]],
    ["brevo", "Brevo", "brevo.com", "", "key", "Email, SMS and contacts."],
    ["discord", "Discord", "discord.com", "", "webhook", "Post messages to a Discord channel."],
    ["fcm", "Firebase Cloud Messaging", "firebase.google.com", "https://firebase.google.com/", "google-sa", "Push notifications to apps and browsers."],
    ["gatewayapi", "GatewayAPI", "gatewayapi.com", "", "token", "SMS sending."],
    ["klaviyo", "Klaviyo", "klaviyo.com", "", "key", "Email and SMS marketing for shops."],
    ["linkedin", "LinkedIn", "linkedin.com", "", "oauth", "Sign in with LinkedIn and post on members' behalf."],
    ["loops", "Loops", "loops.so", "", "key", "Email for SaaS: transactional and campaigns."],
    ["mailchimp", "Mailchimp", "mailchimp.com", "", "key", "Audiences and campaigns."],
    ["mailchimp-transactional", "Mailchimp Transactional", "mandrill.com", "", "explicit", "Transactional email (formerly Mandrill).", [{ name: "MANDRILL_API_KEY", hint: "API key" }]],
    ["mailgun", "Mailgun", "mailgun.com", "", "explicit", "Transactional email.", [{ name: "MAILGUN_API_KEY", hint: "Sending key" }, { name: "MAILGUN_DOMAIN", hint: "mg.your-domain.com" }]],
    ["mailjet", "Mailjet", "mailjet.com", "", "explicit", "Email sending and contacts.", [{ name: "MAILJET_API_KEY", hint: "API key" }, { name: "MAILJET_SECRET_KEY", hint: "Server only" }]],
    ["resend", "Resend", "resend.com", "", "key", "Transactional email."],
    ["slack", "Slack", "slack.com", "", "webhook", "Post messages to a channel."],
    ["telegram", "Telegram", "telegram.org", "", "explicit", "Message users or a group through your bot.", [{ name: "TELEGRAM_BOT_TOKEN", hint: "123456:ABC-…" }]],
    ["tiktok", "TikTok", "tiktok.com", "", "oauth", "Login Kit and content posting."],
    ["twilio", "Twilio", "twilio.com", "", "explicit", "SMS and voice.", [{ name: "TWILIO_ACCOUNT_SID", hint: "AC…" }, { name: "TWILIO_AUTH_TOKEN", hint: "32 characters" }]],
    ["twitch", "Twitch", "twitch.tv", "", "oauth", "Streams, chat and sign in with Twitch."],
    ["whatsapp", "WhatsApp Business", "whatsapp.com", "", "explicit", "Send template messages and replies (Cloud API).", [{ name: "WHATSAPP_TOKEN", hint: "System user access token" }, { name: "WHATSAPP_PHONE_NUMBER_ID", hint: "From WhatsApp → API Setup" }]],
    ["x", "X (Twitter)", "x.com", "", "oauth", "Post and read with the X API."],
  ]),
  ...rows("Maps & Media", [
    ["google-business-profile", "Google Business Profile", "business.google.com", "", "google", "Locations, reviews and posts for your business listing."],
    ["google-maps", "Google Maps", "maps.google.com", "https://www.google.com/maps/", "explicit", "Maps, places and directions.", [{ name: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", hint: "Restrict it to your domain" }]],
    ["klipy", "KLIPY", "klipy.com", "", "key", "GIFs, stickers and clips."],
    ["logo-dev", "Logo.dev", "logo.dev", "", "explicit", "Company logos by domain.", [{ name: "NEXT_PUBLIC_LOGO_DEV_TOKEN", hint: "Publishable token pk_…" }]],
    ["mapbox", "Mapbox", "mapbox.com", "", "explicit", "Custom maps and geocoding.", [{ name: "NEXT_PUBLIC_MAPBOX_TOKEN", hint: "pk.…" }]],
  ]),
  ...rows("Security & Infrastructure", [
    ["aikido", "Aikido", "aikido.dev", "", "oauth", "Code and cloud security findings."],
    ["s3", "Amazon S3", "aws.amazon.com", "https://aws.amazon.com/s3/", "explicit", "File storage in your own bucket.", [...AWS, { name: "S3_BUCKET", hint: "Bucket name" }]],
    ["aws", "AWS", "aws.amazon.com", "", "aws", "Any AWS service your app needs."],
    ["azure", "Azure Cloud", "azure.microsoft.com", "", "explicit", "Any Azure service your app needs.", [{ name: "AZURE_TENANT_ID", hint: "Tenant ID" }, { name: "AZURE_CLIENT_ID", hint: "Service principal app ID" }, { name: "AZURE_CLIENT_SECRET", hint: "Server only" }, { name: "AZURE_SUBSCRIPTION_ID", hint: "Subscription ID" }]],
    ["cloudflare", "Cloudflare", "cloudflare.com", "", "explicit", "Deploy to Workers in your own account.", [{ name: "CLOUDFLARE_API_TOKEN", hint: "A token with Workers Scripts: Edit" }, { name: "CLOUDFLARE_ACCOUNT_ID", hint: "32 hex characters" }]],
    ["github", "GitHub", "github.com", "", "explicit", "Issues, repositories and Actions from your app.", [{ name: "GITHUB_TOKEN", hint: "Fine-grained token" }]],
    ["gitlab", "GitLab", "gitlab.com", "", "token", "Projects, issues and pipelines."],
    ["google-cloud", "Google Cloud API", "cloud.google.com", "", "google-sa", "Any Google Cloud API your app needs."],
    ["incident-io", "incident.io", "incident.io", "", "key", "Declare and update incidents."],
    ["sentry", "Sentry", "sentry.io", "", "explicit", "Error tracking for your app.", [{ name: "NEXT_PUBLIC_SENTRY_DSN", hint: "https://…@….ingest.sentry.io/…" }]],
    ["siteimprove", "Siteimprove", "siteimprove.com", "", "key", "Accessibility, quality and SEO monitoring."],
    ["supabase", "Supabase", "supabase.com", "", "explicit", "A Supabase project of your own.", [{ name: "NEXT_PUBLIC_SUPABASE_URL", hint: "https://….supabase.co" }, { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", hint: "Publishable (anon) key" }, { name: "SUPABASE_SERVICE_ROLE_KEY", hint: "Server only — never in the browser" }]],
    ["wiz", "Wiz", "wiz.io", "", "explicit", "Cloud security issues and inventory.", [{ name: "WIZ_CLIENT_ID", hint: "Service account client ID" }, { name: "WIZ_CLIENT_SECRET", hint: "Server only" }]],
  ]),
];

/** Connectors Keelwork already supported that aren't in the list above. */
export const EXTRA: DirectoryRow[] = [
  ...rows("AI & Automation", [
    ["openai", "OpenAI", "openai.com", "", "explicit", "AI features inside your app.", [{ name: "OPENAI_API_KEY", hint: "sk-…" }]],
    ["anthropic", "Anthropic", "anthropic.com", "", "explicit", "Claude inside your app.", [{ name: "ANTHROPIC_API_KEY", hint: "sk-ant-…" }]],
    ["kimi", "Kimi (Moonshot AI)", "kimi.ai", "", "explicit", "Kimi models inside your app.", [{ name: "MOONSHOT_API_KEY", hint: "sk-…" }]],
    ["deepseek", "DeepSeek", "deepseek.com", "", "explicit", "DeepSeek models inside your app.", [{ name: "DEEPSEEK_API_KEY", hint: "sk-…" }]],
    ["brave", "Brave Search", "search.brave.com", "", "explicit", "Web search inside your app.", [{ name: "BRAVE_SEARCH_API_KEY", hint: "BSA…" }]],
  ]),
  ...rows("Commerce & Payments", [
    ["paystack", "Paystack", "paystack.com", "", "explicit", "Card, bank and USSD payments in Nigeria, Ghana, Kenya and South Africa.", [{ name: "PAYSTACK_SECRET_KEY", hint: "sk_test_… or sk_live_…" }, { name: "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", hint: "pk_test_… or pk_live_…" }]],
    ["flutterwave", "Flutterwave", "flutterwave.com", "", "explicit", "Cards, mobile money and bank transfers across Africa.", [{ name: "FLW_SECRET_KEY", hint: "FLWSECK_TEST-…" }, { name: "FLW_SECRET_HASH", hint: "Webhook hash you choose" }]],
  ]),
  ...rows("Communications", [
    ["sendgrid", "SendGrid", "sendgrid.com", "", "explicit", "Transactional and marketing email.", [{ name: "SENDGRID_API_KEY", hint: "Starts with SG." }]],
    ["postmark", "Postmark", "postmarkapp.com", "", "explicit", "Fast transactional email.", [{ name: "POSTMARK_SERVER_TOKEN", hint: "Server API token" }]],
  ]),
  ...rows("Maps & Media", [
    ["cloudinary", "Cloudinary", "cloudinary.com", "", "explicit", "Image and video uploads, resizing and delivery.", [{ name: "CLOUDINARY_URL", hint: "cloudinary://key:secret@cloud" }]],
  ]),
  ...rows("Security & Infrastructure", [
    ["vercel", "Vercel", "vercel.com", "", "explicit", "Deploy to your own Vercel account.", [{ name: "VERCEL_TOKEN", hint: "An account token scoped to one team" }]],
    ["appwrite", "Appwrite", "appwrite.io", "", "explicit", "Self-hostable backend.", [{ name: "NEXT_PUBLIC_APPWRITE_ENDPOINT", hint: "https://cloud.appwrite.io/v1" }, { name: "NEXT_PUBLIC_APPWRITE_PROJECT_ID", hint: "Project id" }, { name: "APPWRITE_API_KEY", hint: "Server key; never public" }]],
    ["cloudbase", "Tencent CloudBase", "cloudbase.net", "", "explicit", "Backend for users in China.", [{ name: "NEXT_PUBLIC_TCB_ENV_ID", hint: "Environment id" }, { name: "TCB_SECRET_ID", hint: "Server only" }, { name: "TCB_SECRET_KEY", hint: "Server only" }]],
    ["database", "Postgres database", "postgresql.org", "", "explicit", "Your app's own database.", [{ name: "DATABASE_URL", hint: "postgres://user:password@host:5432/db" }]],
  ]),
];
