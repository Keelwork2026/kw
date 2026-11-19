import type { Site } from "../types";
import { contactPage, footer, legalPages } from "../common";

export const meridian: Site = {
  slug: "meridian-advisory", name: "Meridian Advisory", category: "Corporate & Business", style: "Calm corporate", voice: "corporate",
  tagline: "Management consultancy with services, insights, team and careers.",
  description: "A professional services site with service lines, an approach page, case studies, insights, leadership team, careers and contact — for consultancies, agencies and B2B firms.",
  palette: { bg: "#f7f8fa", surface: "#ffffff", ink: "#14213d", muted: "#5a6478", accent: "#1d4ed8", accent2: "#0ea5a3", soft: "#e6edfb", line: "#dfe4ee", onAccent: "#ffffff" },
  fonts: { display: "sans", body: "sans" }, logo: { mark: "stack", word: "Meridian" }, radius: "soft",
  primaryCta: { label: "Talk to us", href: "/contact" },
  pages: [
    { slug: "", nav: "Home", title: "Strategy and operations advice for growing organisations", description: "Meridian Advisory helps leadership teams make better decisions about strategy, operations and change — and see them through.",
      seo: { keywords: ["management consultancy", "strategy consulting", "operations improvement", "change management"] },
      sections: [
        { t: "hero", v: "split", eyebrow: "Management consultancy", title: "Clear decisions. Delivered change.", sub: "We help leadership teams decide what matters most, design how to get there, and stay alongside them until the change sticks.", ctas: [{ label: "Talk to us", href: "/contact" }, { label: "Our services", href: "/services" }], img: { art: "meeting", alt: "Team reviewing a growth chart in a meeting" } },
        { t: "features", title: "How we help", sub: "Three practices, one team. We bring in the right mix for each engagement.", items: [
          { icon: "chart", title: "Strategy", body: "Market and portfolio choices, growth plans and the business cases behind them." },
          { icon: "tool", title: "Operations", body: "Process redesign, cost and service improvement, and operating models that scale." },
          { icon: "users", title: "Change and people", body: "Organisation design, leadership alignment and programmes people actually adopt." },
        ] },
        { t: "steps", title: "Our approach", items: [
          { title: "Diagnose", body: "We start with your data and your people, not a template, to understand what's really going on." },
          { title: "Decide", body: "We set out the options with honest trade-offs, so your leadership team can choose with confidence." },
          { title: "Deliver", body: "We work alongside your teams to put the plan in place and measure whether it's working." },
        ] },
        { t: "cards", v: "project", title: "Selected work", sub: "Client names are shared with permission. Outcomes are described in the client's own words.", more: { label: "All case studies", href: "/work" }, items: [
          { title: "Refocusing a regional distributor", meta: "Strategy · Wholesale", body: "A portfolio review that narrowed focus to the most profitable lines.", img: { art: "growth", alt: "Rising bar chart" }, href: "/work" },
          { title: "Faster onboarding for a services firm", meta: "Operations · Professional services", body: "A redesigned client onboarding process with fewer hand-offs.", img: { art: "dashboard", alt: "Operations dashboard" }, href: "/work" },
          { title: "Merging two teams into one", meta: "Change · Healthcare", body: "Organisation design and leadership alignment after a merger.", img: { art: "team", alt: "Group of colleagues" }, href: "/work" },
        ] },
        { t: "stats", sample: true, title: "In numbers", items: [["[[stat]]", "engagements completed"], ["[[stat]]", "sectors served"], ["[[stat]]", "of clients who return"]] },
        { t: "cta", title: "Facing a decision that matters?", sub: "A 30-minute conversation with a partner costs nothing and commits you to nothing.", ctas: [{ label: "Book a conversation", href: "/contact" }] },
      ] },
    { slug: "services", nav: "Services", title: "Services", description: "Strategy, operations, and change and people services from Meridian Advisory.",
      sections: [
        { t: "hero", v: "center", eyebrow: "Services", title: "Advice that fits how you work", sub: "Engagements range from a two-week diagnostic to multi-month programmes. We'll recommend the smallest piece of work that solves the problem.", ctas: [{ label: "Discuss your needs", href: "/contact" }] },
        { t: "split", eyebrow: "Strategy", title: "Choose where to play and how to win", body: ["We help you understand your market, your position in it and the moves available to you."], bullets: ["Growth and market-entry strategy", "Portfolio and pricing reviews", "Business cases and investment plans"], img: { art: "growth", alt: "Upward trend chart", seed: 3 } },
        { t: "split", eyebrow: "Operations", title: "Make the work flow", body: ["We map how work really gets done, find the bottlenecks and redesign processes with the people who run them."], bullets: ["Process and service redesign", "Cost and productivity reviews", "Operating model design"], img: { art: "dashboard", alt: "Process dashboard", seed: 2 }, reverse: true },
        { t: "split", eyebrow: "Change and people", title: "Bring everyone with you", body: ["Good plans fail without adoption. We design the organisation, the roles and the communication that make change last."], bullets: ["Organisation design", "Leadership team alignment", "Change programme management"], img: { art: "team", alt: "Team working together", seed: 3 } },
        { t: "faq", title: "Working with us", items: [["How do you charge?", "Usually a fixed fee per phase, agreed up front, so there are no surprises."], ["How big are your teams?", "Typically two to four people, led by a partner who stays involved throughout."], ["Do you work with public-sector organisations?", "Yes, through direct engagement and established procurement frameworks."]] },
      ] },
    { slug: "work", nav: "Case studies", title: "Case studies", description: "Examples of strategy, operations and change engagements.",
      sections: [
        { t: "cards", v: "project", title: "Case studies", filters: ["All", "Strategy", "Operations", "Change"], items: [
          { title: "Refocusing a regional distributor", meta: "Strategy", body: "Narrowed the portfolio to the most profitable lines and built a three-year plan.", img: { art: "growth", alt: "Chart", seed: 5 } },
          { title: "Faster onboarding for a services firm", meta: "Operations", body: "Halved the number of hand-offs in client onboarding.", img: { art: "dashboard", alt: "Dashboard", seed: 4 } },
          { title: "Merging two teams into one", meta: "Change", body: "A single structure and leadership team after a merger.", img: { art: "team", alt: "Team", seed: 6 } },
          { title: "Pricing review for a software company", meta: "Strategy", body: "Simpler plans aligned to how customers buy.", img: { art: "laptop", alt: "Laptop" } },
          { title: "Service redesign for a housing provider", meta: "Operations", body: "Repairs reporting rebuilt around residents' needs.", img: { art: "apartment", alt: "Apartment building" } },
          { title: "Leadership alignment for a charity", meta: "Change", body: "A shared strategy and clear decision rights.", img: { art: "meeting", alt: "Meeting", seed: 3 } },
        ] },
      ] },
    { slug: "insights", nav: "Insights", title: "Insights", description: "Articles and practical guides from the Meridian team.",
      sections: [
        { t: "cards", v: "article", title: "Insights", sub: "Practical thinking from our consultants. No jargon, no gated downloads.", items: [
          { title: "Five questions to ask before a reorganisation", meta: "Change · 6 min read", body: "Most restructures fix the chart, not the work. Start here instead.", img: { art: "notebook", alt: "Notebook" }, href: "/insights/before-a-reorganisation" },
          { title: "How to run a two-week diagnostic", meta: "Operations · 8 min read", body: "A simple format for finding what's really slowing you down.", img: { art: "desk", alt: "Desk with laptop" }, href: "/insights/before-a-reorganisation" },
          { title: "Pricing is a strategy decision", meta: "Strategy · 5 min read", body: "Why pricing deserves a seat at the leadership table.", img: { art: "growth", alt: "Chart", seed: 7 }, href: "/insights/before-a-reorganisation" },
        ] },
      ] },
    { slug: "insights/before-a-reorganisation", nav: "Article", inNav: false, title: "Five questions to ask before a reorganisation", description: "A practical checklist for leaders considering a restructure.",
      sections: [{ t: "article", title: "Five questions to ask before a reorganisation", meta: "Change · 6 min read", img: { art: "notebook", alt: "Open notebook with handwritten notes", seed: 2 }, quote: "If you can't describe the work, you can't design the organisation around it.", body: [
        "Reorganisations are one of the most common responses to a business that isn't performing. They are also one of the most disruptive. Before redrawing the chart, it's worth asking whether structure is really the problem.",
        "First: what outcome are we trying to change? Be specific. “Better collaboration” is not an outcome; “quotes issued within two days” is.",
        "Second: where does work get stuck today? Follow a few real pieces of work from start to finish and note every hand-off and wait.",
        "Third: which decisions are slow, and who makes them? Many structural problems are really unclear decision rights.",
        "Fourth: what will stay the same? People cope with change better when they know what isn't changing.",
        "Fifth: how will we know it worked? Agree the measures before you start, and check them six months later.",
      ] }] },
    { slug: "about", nav: "About", title: "About us", description: "Who we are and how Meridian Advisory works.",
      sections: [
        { t: "hero", v: "editorial", eyebrow: "About", title: "Independent advice, senior attention", sub: "Meridian Advisory is an independent consultancy founded in [[founded]]. Every engagement is led by a partner, and we keep our teams small on purpose.", ctas: [], img: { art: "office", alt: "Bright modern office" } },
        { t: "team", title: "Leadership", items: [{ name: "[[name:partner name]]", role: "Managing partner" }, { name: "[[name:partner name]]", role: "Partner, Strategy" }, { name: "[[name:partner name]]", role: "Partner, Operations" }, { name: "[[name:partner name]]", role: "Partner, Change" }] },
        { t: "features", title: "What we believe", v: "list", cols: 2, items: [{ icon: "check", title: "Say what we think", body: "Clients pay for our honest view, including when it isn't what they hoped to hear." }, { icon: "users", title: "Build capability", body: "We leave your team able to do it without us." }, { icon: "shield", title: "Independence", body: "We don't sell software or take referral fees, so our advice is ours." }, { icon: "leaf", title: "Responsible business", body: "We publish our environmental and inclusion commitments each year." }] },
      ] },
    { slug: "careers", nav: "Careers", title: "Careers", description: "Join Meridian Advisory. Open roles and how we hire.",
      sections: [
        { t: "hero", v: "split", eyebrow: "Careers", title: "Do your best work with good people", sub: "We hire curious, practical people from consulting and industry, and we invest in helping them grow.", ctas: [{ label: "Open roles", href: "#roles" }], img: { art: "team", alt: "Colleagues smiling", seed: 8 } },
        { t: "cards", v: "plain", id: "roles", title: "Open roles", items: [{ title: "Senior consultant, Operations", meta: "Hybrid · [[address:office city]]", body: "Lead workstreams on process and service redesign.", href: "/contact" }, { title: "Consultant, Strategy", meta: "Hybrid · [[address:office city]]", body: "Market analysis, business cases and client workshops.", href: "/contact" }, { title: "Operations coordinator", meta: "Office-based", body: "Keep our engagements and our office running smoothly.", href: "/contact" }] },
        { t: "steps", title: "How we hire", items: [{ title: "Apply", body: "A CV and a short note about why the role interests you." }, { title: "Conversation", body: "A relaxed 45-minute chat with two of the team." }, { title: "Case exercise", body: "A realistic problem worked through together, not a trick test." }, { title: "Offer", body: "Feedback at every stage, whatever the outcome." }] },
      ] },
    contactPage({ title: "Start a conversation", sub: "Tell us a little about the challenge you're facing. A partner will reply within two working days.", description: "Contact Meridian Advisory.", fields: ["Your name", "Email", "Organisation", "Phone (optional)", "Tell us about the challenge"] }),
    ...legalPages("Meridian Advisory"),
  ],
  footer: footer({
    blurb: "Independent strategy, operations and change advice for growing organisations.",
    columns: [
      { title: "Services", links: [{ label: "Strategy", href: "/services" }, { label: "Operations", href: "/services" }, { label: "Change and people", href: "/services" }] },
      { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Case studies", href: "/work" }, { label: "Insights", href: "/insights" }, { label: "Careers", href: "/careers" }] },
    ],
    social: ["linkedin"], newsletter: { title: "Monthly insights", button: "Subscribe" }, legalName: "Meridian Advisory Ltd", reg: "Registered in [[jurisdiction:country]] · [[reg]]",
  }),
};

export const lumen: Site = {
  slug: "lumen", name: "Lumen", category: "Technology & SaaS", style: "Crisp product", voice: "innovative",
  tagline: "SaaS product site with features, pricing, integrations, docs and sign-up.",
  description: "A software product website with product tour, feature pages, integrations, pricing with plan comparison, customer stories, changelog and contact — for SaaS and app makers.",
  palette: { bg: "#ffffff", surface: "#f7f7fb", ink: "#111127", muted: "#5d5d78", accent: "#6d4aff", accent2: "#22c3a6", soft: "#efeaff", line: "#e7e6f0", onAccent: "#ffffff" },
  fonts: { display: "grotesk", body: "sans" }, logo: { mark: "circle", word: "lumen" }, radius: "round",
  announcement: "New: shared dashboards for teams",
  primaryCta: { label: "Start free", href: "/pricing" },
  pages: [
    { slug: "", nav: "Home", title: "Analytics your whole team understands", description: "Lumen turns product and revenue data into clear, shared dashboards — without SQL. Start free.",
      seo: { keywords: ["product analytics", "dashboards", "SaaS analytics", "no-code reporting"] },
      sections: [
        { t: "hero", v: "center", eyebrow: "Product analytics for teams", title: "Know what's working. Share it in one click.", sub: "Lumen connects to the tools you already use and turns the numbers into dashboards everyone can read — no SQL, no waiting for a data team.", ctas: [{ label: "Start free", href: "/pricing" }, { label: "See how it works", href: "/product" }], img: { art: "dashboard", alt: "Lumen dashboard with charts and key metrics" } },
        { t: "features", title: "Everything you need, nothing you don't", cols: 3, items: [
          { icon: "bolt", title: "Connect in minutes", body: "Bring in data from your database, payments and product tools with guided connectors." },
          { icon: "chart", title: "Dashboards anyone can build", body: "Drag, drop and describe what you want to see. Lumen picks the right chart." },
          { icon: "users", title: "Shared by default", body: "Comment on charts, set alerts and share a live link with your team or clients." },
          { icon: "lock", title: "Secure from day one", body: "Role-based access, single sign-on on Business plans and encryption at rest." },
          { icon: "clock", title: "Scheduled reports", body: "A Monday summary in everyone's inbox, built from the dashboards you already have." },
          { icon: "globe", title: "Works where you work", body: "Embed charts in your docs, wiki or customer portal." },
        ] },
        { t: "split", eyebrow: "Ask in plain English", title: "Questions in, answers out", body: ["Type a question like “How many trials converted last month?” and Lumen builds the chart, shows the query behind it, and lets you save it to a dashboard."], bullets: ["See exactly how every number is calculated", "Edit the chart with a click", "Save, share or schedule"], img: { art: "laptop", alt: "Laptop showing a chart built from a question" }, cta: { label: "Explore the product", href: "/product" } },
        { t: "logos", sample: true, title: "Teams using Lumen", items: ["Acorn", "Parallel", "Harbor", "Tandem", "Northstar", "Fieldnote"] },
        { t: "testimonials", sample: true, title: "What teams say", items: [
          { quote: "We stopped arguing about whose spreadsheet was right.", name: "Customer quote", role: "Replace with a real customer" },
          { quote: "Our weekly metrics meeting now takes ten minutes.", name: "Customer quote", role: "Replace with a real customer" },
          { quote: "Setting up took an afternoon, not a quarter.", name: "Customer quote", role: "Replace with a real customer" },
        ] },
        { t: "cta", title: "Your first dashboard is ten minutes away", sub: "Free for up to three users. No card required.", ctas: [{ label: "Start free", href: "/pricing" }, { label: "Talk to sales", href: "/contact" }] },
      ] },
    { slug: "product", nav: "Product", title: "Product tour", description: "A tour of Lumen: connectors, dashboards, questions in plain English, alerts and sharing.",
      sections: [
        { t: "hero", v: "split", eyebrow: "Product", title: "From raw data to shared answers", sub: "A quick tour of what Lumen does and how teams use it every day.", ctas: [{ label: "Start free", href: "/pricing" }], img: { art: "dashboard", alt: "Dashboard overview", seed: 3 } },
        { t: "split", eyebrow: "1 · Connect", title: "Bring your data together", body: ["Guided connectors for popular databases, payment platforms and product tools. Lumen syncs on a schedule you choose."], img: { art: "laptop", alt: "Connector setup screen", seed: 2 } },
        { t: "split", eyebrow: "2 · Explore", title: "Build dashboards without code", body: ["Drag fields onto the canvas or ask a question. Every chart shows the logic behind it."], img: { art: "dashboard", alt: "Dashboard editor", seed: 5 }, reverse: true },
        { t: "split", eyebrow: "3 · Share", title: "Keep everyone on the same page", body: ["Live links, comments, alerts and scheduled emails mean the numbers come to people."], img: { art: "phone", alt: "Mobile alert notification" } },
      ] },
    { slug: "integrations", nav: "Integrations", title: "Integrations", description: "Connect Lumen to your databases, payment platforms and product tools.",
      sections: [
        { t: "cards", v: "service", title: "Integrations", sub: "Connectors are maintained by our team. Don't see yours? Tell us.", cols: 4, items: [
          { title: "PostgreSQL", meta: "Database", body: "Read-only connection with scheduled sync." }, { title: "MySQL", meta: "Database", body: "Read-only connection with scheduled sync." }, { title: "Stripe", meta: "Payments", body: "Revenue, subscriptions and churn." }, { title: "Google Sheets", meta: "Spreadsheets", body: "Import and keep in sync." },
          { title: "HubSpot", meta: "CRM", body: "Deals, pipelines and contacts." }, { title: "Segment", meta: "Events", body: "Product events and user traits." }, { title: "Slack", meta: "Alerts", body: "Send alerts and summaries to channels." }, { title: "Webhooks", meta: "Custom", body: "Push data from anything." },
        ] },
      ] },
    { slug: "pricing", nav: "Pricing", title: "Pricing", description: "Simple pricing for Lumen. Free for small teams; upgrade when you need more.",
      sections: [
        { t: "pricing", title: "Simple, transparent pricing", sub: "Monthly or annual billing. Cancel any time.", plans: [
          { name: "Free", price: "£0", per: "forever", blurb: "For trying Lumen with a small team.", features: ["Up to 3 users", "2 data sources", "Unlimited dashboards", "Community support"], cta: { label: "Start free", href: "/contact" } },
          { name: "Team", price: "[[price:team plan price]]", per: "per user / month", blurb: "For growing teams that share numbers daily.", features: ["Unlimited data sources", "Alerts and scheduled reports", "Comments and sharing", "Email support"], cta: { label: "Start a trial", href: "/contact" }, featured: true },
          { name: "Business", price: "[[price:business plan price]]", per: "per user / month", blurb: "For organisations with security needs.", features: ["Single sign-on", "Audit log", "Row-level permissions", "Priority support"], cta: { label: "Talk to sales", href: "/contact" } },
        ] },
        { t: "faq", title: "Pricing questions", items: [["Is there a free trial?", "Team and Business plans come with a 14-day trial. The Free plan is free for as long as you like."], ["Who counts as a user?", "Anyone who can sign in. People you share a public link with don't count."], ["Can I change plans?", "Yes, any time. Changes are prorated automatically."]] },
      ] },
    { slug: "changelog", nav: "Changelog", title: "Changelog", description: "What's new in Lumen.",
      sections: [{ t: "timeline", title: "What's new", items: [
        { year: "[[date:release date]]", title: "Shared dashboards for teams", body: "Collections of dashboards with their own permissions." },
        { year: "[[date:release date]]", title: "Alerts in Slack", body: "Get notified in a channel when a metric crosses a threshold." },
        { year: "[[date:release date]]", title: "Questions in plain English", body: "Ask a question and get an editable chart, with its query shown." },
      ] }] },
    contactPage({ title: "Talk to us", sub: "Questions about plans, security or a demo for your team? We'll reply within one working day.", description: "Contact the Lumen team for sales or support.", fields: ["Your name", "Work email", "Company", "What would you like to know?"] }),
    ...legalPages("Lumen", { extra: ["Customer data: data you connect to Lumen is processed on your instructions under our data processing agreement. We don't use it for any other purpose."] }),
  ],
  footer: footer({
    blurb: "Product analytics your whole team understands.",
    columns: [
      { title: "Product", links: [{ label: "Tour", href: "/product" }, { label: "Integrations", href: "/integrations" }, { label: "Pricing", href: "/pricing" }, { label: "Changelog", href: "/changelog" }] },
      { title: "Company", links: [{ label: "Contact", href: "/contact" }, { label: "Security", href: "/privacy" }] },
    ],
    social: ["x", "linkedin", "youtube"], newsletter: { title: "Product updates", button: "Subscribe" }, legalName: "Lumen", contact: [["Sales", "[[email:sales email]]"], ["Support", "[[email:support email]]"]],
  }),
};

export const northbank: Site = {
  slug: "northbank", name: "Northbank", category: "Finance & Banking", style: "Trustworthy and clear", voice: "authoritative",
  tagline: "Banking and savings site with accounts, rates, security and support.",
  description: "A financial services site with current and savings accounts, a rates table, business banking, security guidance, help centre and regulatory footer — for banks, credit unions and fintechs.",
  palette: { bg: "#f8faf9", surface: "#ffffff", ink: "#0b2b26", muted: "#4f6762", accent: "#0b6e4f", accent2: "#c9a227", soft: "#e3f1ec", line: "#d9e5e1", onAccent: "#ffffff" },
  fonts: { display: "sans", body: "sans" }, logo: { mark: "square", word: "Northbank" }, radius: "soft",
  primaryCta: { label: "Open an account", href: "/accounts" },
  pages: [
    { slug: "", nav: "Home", title: "Everyday banking, made clear", description: "Current accounts, savings and business banking from Northbank. See our rates and open an account online.",
      seo: { keywords: ["current account", "savings account", "business banking", "savings rates"] },
      sections: [
        { t: "hero", v: "split", eyebrow: "Personal and business banking", title: "Banking that's clear about everything", sub: "Accounts with no hidden fees, savings rates shown up front, and real people to talk to when you need them.", ctas: [{ label: "Open an account", href: "/accounts" }, { label: "See savings rates", href: "/savings" }], img: { art: "card", alt: "Debit card beside a banking app" } },
        { t: "features", title: "Why people choose us", cols: 4, items: [
          { icon: "check", title: "No hidden fees", body: "Every charge is listed in our fee table — in plain English." },
          { icon: "phone", title: "Manage it in the app", body: "Instant notifications, spending insights and card controls." },
          { icon: "chat", title: "Real people", body: "UK-based support by phone, chat and in branch." },
          { icon: "shield", title: "Protected", body: "Eligible deposits are protected under [[regulator:deposit protection scheme]]." },
        ] },
        { t: "cards", v: "service", title: "Accounts for every need", items: [
          { title: "Everyday current account", body: "Contactless card, app, and an arranged overdraft subject to status.", href: "/accounts", badge: "Personal" },
          { title: "Easy-access saver", body: "Add or withdraw whenever you like.", href: "/savings", badge: "Savings" },
          { title: "Business account", body: "For sole traders and small companies, with invoicing built in.", href: "/business", badge: "Business" },
        ] },
        { t: "split", eyebrow: "Security", title: "We'll never ask for your PIN or passcode", body: ["Fraudsters often pretend to be from a bank. We will never call, text or email to ask for your PIN, passcode or to move money to a 'safe account'."], bullets: ["Freeze and unfreeze your card in the app", "Get alerts for every payment", "Report fraud 24/7 on [[phone:fraud line]]"], img: { art: "vault", alt: "Secure vault illustration" }, cta: { label: "Security centre", href: "/security" } },
        { t: "cta", title: "Open an account in minutes", sub: "You'll need photo ID and to be 18 or over. Accounts are subject to eligibility.", ctas: [{ label: "Get started", href: "/accounts" }] },
      ] },
    { slug: "accounts", nav: "Current accounts", title: "Current accounts", description: "Compare Northbank current accounts and their fees.",
      sections: [
        { t: "hero", v: "split", eyebrow: "Current accounts", title: "An everyday account that keeps things simple", sub: "Spend, save and pay bills from one account, with every fee shown before you sign up.", ctas: [{ label: "Apply now", href: "/contact" }], img: { art: "phone", alt: "Banking app on a phone" } },
        { t: "rates", title: "Fees and charges", cols: ["Service", "Charge"], rows: [["Monthly account fee", "[[price:monthly fee]]"], ["Card payments abroad", "[[price:foreign transaction fee]]"], ["Arranged overdraft", "[[rate:overdraft EAR]] EAR variable"], ["Replacement card", "Free"]], note: "Overdrafts are subject to status. Representative example: [[rate:representative example]]." },
        { t: "faq", title: "Questions", items: [["Who can apply?", "UK residents aged 18 or over, with photo ID. Approval is subject to our checks."], ["Can I switch my existing account?", "Yes — the Current Account Switch Service moves your payments for you."]] },
      ] },
    { slug: "savings", nav: "Savings", title: "Savings rates", description: "Northbank savings accounts and current interest rates.",
      sections: [
        { t: "rates", title: "Savings rates", sub: "Rates are variable unless stated. AER shows what the interest rate would be if interest were paid and compounded once a year.", cols: ["Account", "Rate (AER)", "Access", "Minimum"], rows: [["Easy-access saver", "[[rate:AER]]", "Unlimited withdrawals", "£1"], ["Notice saver (95 days)", "[[rate:AER]]", "95 days' notice", "£1,000"], ["Fixed saver (1 year)", "[[rate:AER]] fixed", "At maturity", "£1,000"]], note: "Rates correct as of [[date:rate date]]. Eligible deposits are protected up to the applicable limit under [[regulator:deposit protection scheme]]." },
        { t: "split", title: "Saving made easy", body: ["Set up savings pots for goals, round up card spending into your saver, and move money instantly between accounts."], img: { art: "growth", alt: "Savings growth chart" } },
      ] },
    { slug: "business", nav: "Business", title: "Business banking", description: "Business accounts for sole traders and small companies.",
      sections: [
        { t: "hero", v: "split", eyebrow: "Business", title: "Banking for small businesses", sub: "Open a business account online, send invoices and get paid faster.", ctas: [{ label: "Talk to our business team", href: "/contact" }], img: { art: "office", alt: "Small business owner's office" } },
        { t: "features", title: "Built for business owners", items: [{ icon: "card", title: "Business cards", body: "Cards for you and your team, with spending limits." }, { icon: "book", title: "Invoicing", body: "Create invoices and match payments automatically." }, { icon: "chart", title: "Accounting links", body: "Connect your accounting software." }] },
      ] },
    { slug: "security", nav: "Security", title: "Security centre", description: "How to spot scams and protect your account.",
      sections: [
        { t: "features", title: "Stay safe from scams", v: "list", cols: 2, items: [
          { icon: "phone", title: "We'll never ask you to move money", body: "If someone asks you to move money to a 'safe account', it's a scam. Hang up." },
          { icon: "lock", title: "Keep codes private", body: "Never share your passcode, PIN or one-time codes — not even with us." },
          { icon: "mail", title: "Check links", body: "Log in through the app or by typing our address, not from links in messages." },
          { icon: "shield", title: "Report it fast", body: "Call [[phone:fraud line]] any time if you think you've been targeted." },
        ] },
      ] },
    contactPage({ title: "We're here to help", sub: "For account questions, use the app chat for the fastest answer. For anything else, send us a message.", description: "Contact Northbank support.", hours: [["Phone", "08:00 – 20:00 daily"], ["Fraud line", "24 hours, 7 days"]] }),
    ...legalPages("Northbank"),
  ],
  footer: footer({
    blurb: "Personal and business banking with every fee shown up front.",
    columns: [
      { title: "Banking", links: [{ label: "Current accounts", href: "/accounts" }, { label: "Savings", href: "/savings" }, { label: "Business", href: "/business" }] },
      { title: "Help", links: [{ label: "Security centre", href: "/security" }, { label: "Contact", href: "/contact" }] },
    ],
    social: ["linkedin", "facebook"], legalName: "Northbank", reg: "Authorised and regulated by [[regulator]]. Registered office: [[address]].",
  }),
};

export const launchpad: Site = {
  slug: "launchpad", name: "Launchpad", category: "Landing Pages", style: "Gradient launch", voice: "bold",
  tagline: "Single-page product launch with waitlist, features and FAQ.",
  description: "A focused landing page for launching a product or campaign: hero with waitlist, benefits, how it works, early-access pricing and FAQ — designed to convert.",
  palette: { bg: "#fffaf5", surface: "#ffffff", ink: "#1c1917", muted: "#6b625c", accent: "#ef476f", accent2: "#ff9f1c", soft: "#ffe8ee", line: "#f1e2d8", onAccent: "#ffffff" },
  fonts: { display: "grotesk", body: "sans" }, logo: { mark: "diamond", word: "Pocketplan" }, radius: "round",
  primaryCta: { label: "Join the waitlist", href: "#join" },
  pages: [
    { slug: "", nav: "Home", title: "Pocketplan — your week, planned in five minutes", description: "Pocketplan turns your to-dos and calendar into a realistic weekly plan. Join the waitlist for early access.",
      seo: { keywords: ["weekly planner app", "time blocking", "productivity app", "waitlist"] },
      sections: [
        { t: "hero", v: "split", eyebrow: "Coming soon", title: "Your week, planned in five minutes", sub: "Pocketplan looks at your calendar and to-do list and suggests a realistic plan — with breaks included. You stay in charge of every change.", ctas: [{ label: "Join the waitlist", href: "#join" }, { label: "How it works", href: "#how" }], img: { art: "phone", alt: "Pocketplan app showing a weekly plan" } },
        { t: "features", title: "Plans that fit real life", items: [
          { icon: "clock", title: "Realistic by design", body: "Plans leave room for breaks and the unexpected, so they survive Monday." },
          { icon: "spark", title: "One tap to adjust", body: "Moved a meeting? Pocketplan reshuffles the rest of your day." },
          { icon: "lock", title: "Private", body: "Your calendar stays yours. We don't sell data or show ads." },
        ] },
        { t: "steps", id: "how", title: "How it works", items: [{ title: "Connect", body: "Link your calendar and to-do app, or start fresh." }, { title: "Review", body: "Pocketplan suggests a plan for the week. Drag anything to change it." }, { title: "Go", body: "Get a gentle nudge before each block. Skip or snooze freely." }] },
        { t: "pricing", title: "Early-access pricing", sub: "People on the waitlist get the first year at the founding price.", plans: [{ name: "Personal", price: "Free", per: "", blurb: "Plan one calendar.", features: ["Weekly planning", "One calendar", "Mobile and web"], cta: { label: "Join the waitlist", href: "#join" } }, { name: "Plus", price: "[[price:founding price]]", per: "per month", blurb: "For busy weeks.", features: ["Unlimited calendars", "Smart rescheduling", "Focus mode"], cta: { label: "Join the waitlist", href: "#join" }, featured: true }] },
        { t: "faq", title: "Questions", items: [["When does it launch?", "We're inviting people from the waitlist in small groups from [[date:launch month]]."], ["Which calendars work?", "Google Calendar and Outlook at launch, with more to follow."], ["Will there be a free plan?", "Yes, and it isn't a trial."]] },
        { t: "newsletter", id: "join", title: "Be first in line", sub: "Join the waitlist and we'll email you when your invite is ready. One email, no spam.", button: "Join the waitlist" },
      ] },
    ...legalPages("Pocketplan"),
  ],
  footer: footer({
    blurb: "A calmer way to plan your week.",
    columns: [{ title: "Pocketplan", links: [{ label: "How it works", href: "#how" }, { label: "Waitlist", href: "#join" }] }],
    social: ["x", "instagram", "tiktok"], legalName: "Pocketplan", contact: [["Email", "[[email]]"]],
  }),
};
