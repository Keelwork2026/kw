import type { AppTemplate } from "../types";
import { PAL } from "../palettes";

export const analytics: AppTemplate = {
  slug: "app-sales-dashboard", name: "Sales dashboard", category: "Technology & SaaS", industry: "Sales and revenue teams", type: "Dashboard",
  styles: ["Technical", "Minimal"], level: "Beginner-friendly", featured: true, added: "2026-11-20",
  tagline: "Revenue, targets, regions and rep leaderboards on one dark dashboard.",
  description: "A sales analytics dashboard: headline metrics, revenue trend with ranges, performance by region, a rep leaderboard you can filter, and a deals-at-risk list.",
  useCases: ["Give the sales team one view of the numbers", "Spot regions falling behind", "Review rep performance weekly"],
  features: ["KPI tiles", "Revenue trend", "Regional breakdown", "Rep leaderboard", "Deals at risk"],
  effort: "About 1–2 hours of agent work", stack: "Next.js, Supabase views, CSV or CRM import",
  keywords: ["dashboard", "analytics", "sales dashboard", "kpi", "metrics", "reporting", "revenue", "bi", "charts", "sales team", "data"],
  brand: "Your Company", palette: PAL.night, shell: "admin", user: { name: "Ryan Adams", role: "Head of sales" },
  screens: [
    { slug: "overview", label: "Overview", icon: "chart", title: "Revenue overview", sub: "Updated 6 minutes ago from the CRM.", modules: [
      { m: "kpis", items: [{ label: "Revenue (MTD)", value: "$684k", delta: "↑ 12% vs last month" }, { label: "Target attainment", value: "87%", delta: "$786k target", tone: "info" }, { label: "New customers", value: "48", delta: "↑ 9" }, { label: "Churned", value: "3", tone: "bad", delta: "$21k MRR" }] },
      { m: "chart", title: "Monthly revenue", kind: "line", unit: "k", ranges: ["3M", "6M", "12M"], labels: ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"], series: [{ label: "Revenue", values: [402, 388, 431, 470, 455, 512, 538, 561, 549, 602, 611, 684] }, { label: "Target", values: [420, 420, 450, 480, 480, 520, 540, 560, 580, 610, 640, 786] }] },
      { m: "split", left: [{ m: "chart", title: "By region", kind: "bar", unit: "k", labels: ["Lagos", "Abuja", "Accra", "Nairobi", "Remote"], series: [{ label: "This month", values: [248, 131, 118, 104, 83] }] }],
        right: [{ m: "feed", title: "Deals at risk", items: [{ who: "Vantage Retail", what: "no reply in 14 days · $42k", when: "Sofia" }, { who: "Kora Labs", what: "budget review moved to Q1 · $36k", when: "Mason" }, { who: "Harbor Dental", what: "competitor trial started · $18k", when: "Ivy" }] }] },
    ] },
    { slug: "reps", label: "Team", icon: "users", title: "Rep leaderboard", modules: [
      { m: "table", title: "November", search: "Search reps", columns: ["Rep", "Region", "Closed", "Attainment", "Trend"], status: 4, filter: 1, tones: { Ahead: "good", "On track": "info", Behind: "warn" }, rows: [
        ["Emily Carter", "Lagos", "$128k", "112%", "Ahead"], ["Derek Miller", "Accra", "$94k", "98%", "On track"], ["Sofia Lindqvist", "Remote", "$83k", "92%", "On track"], ["Travis Baker", "Lagos", "$120k", "88%", "On track"], ["Wendy Kaufman", "Nairobi", "$71k", "79%", "Behind"], ["Mason Hill", "Abuja", "$66k", "74%", "Behind"],
      ] },
    ] },
  ],
};

export const marketing: AppTemplate = {
  slug: "app-campaign-planner", name: "Marketing campaign planner", category: "Marketing & Creative", industry: "Marketing teams and agencies", type: "Web app",
  styles: ["Playful", "Bold"], level: "Beginner-friendly", added: "2026-11-20",
  tagline: "Plan campaigns, schedule content and approve posts with clients.",
  description: "A marketing workspace: a content pipeline from idea to published, a content calendar, campaign results and a client approval inbox.",
  useCases: ["Plan a month of social content", "Get client sign-off", "Report campaign results"],
  features: ["Content pipeline", "Content calendar", "Approvals inbox", "Campaign metrics"],
  effort: "About 2 hours of agent work", stack: "Next.js, Supabase, image uploads",
  keywords: ["marketing", "campaign", "social media", "content calendar", "agency", "creative", "posts", "planner", "brand"],
  brand: "Your Agency", palette: PAL.rose, shell: "admin", user: { name: "Natalie Wong", role: "Content lead" },
  screens: [
    { slug: "pipeline", label: "Content", icon: "workflow", title: "Content pipeline", sub: "Ember Kitchen — December campaign", modules: [
      { m: "kanban", title: "Posts", columns: [
        { name: "Ideas", cards: [{ title: "Behind the grill reel", meta: "Instagram · Video" }, { title: "Staff picks carousel", meta: "Instagram · 5 slides" }] },
        { name: "Drafting", cards: [{ title: "Festive menu launch", meta: "All channels · Copy + photo" }] },
        { name: "Client review", cards: [{ title: "Gift card promo", meta: "Instagram + X · Due Fri" }] },
        { name: "Scheduled", cards: [{ title: "Weekend brunch", meta: "Sat 10:00 · Instagram" }] },
      ] },
    ] },
    { slug: "calendar", label: "Calendar", icon: "clock", title: "Content calendar", modules: [
      { m: "calendar", title: "Week of Dec 1", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], events: [
        { day: 0, start: "09:00", end: "10:00", title: "Festive menu teaser", tone: "info" }, { day: 2, start: "12:00", end: "13:00", title: "Chef reel", tone: "good" }, { day: 4, start: "17:00", end: "18:00", title: "Gift cards live", tone: "warn" }, { day: 5, start: "10:00", end: "11:00", title: "Weekend brunch", tone: "info" },
      ] },
    ] },
    { slug: "approvals", label: "Approvals", icon: "check", title: "Client approvals", modules: [
      { m: "inbox", title: "Waiting for sign-off", reply: "Reply to the client…", items: [
        { title: "Gift card promo", meta: "Ember Kitchen · sent 2h ago", badge: "Waiting", preview: "Can we say 'perfect for Christmas'?", body: ["Love the visuals. Can we change the headline to 'The gift that tastes like Christmas'?", "— Tori, Ember Kitchen"] },
        { title: "Festive menu launch", meta: "Ember Kitchen · yesterday", preview: "Approved with one change.", body: ["Approved — just swap the jollof photo for the ribeye one."] },
      ] },
    ] },
    { slug: "results", label: "Results", icon: "chart", title: "November results", modules: [
      { m: "kpis", items: [{ label: "Reach", value: "182k", delta: "↑ 24%" }, { label: "Engagement rate", value: "4.8%", delta: "↑ 0.6 pts" }, { label: "Link clicks", value: "6,410" }, { label: "Orders from social", value: "312", delta: "tracked via UTM", tone: "info" }] },
      { m: "chart", title: "Weekly reach", kind: "bar", unit: "k", labels: ["W1", "W2", "W3", "W4"], series: [{ label: "Organic", values: [31, 36, 42, 48] }, { label: "Paid", values: [4, 6, 7, 8] }] },
    ] },
  ],
};

export const community: AppTemplate = {
  slug: "app-community-events", name: "Community events & RSVPs", category: "Personal & Community", industry: "Communities, churches and clubs", type: "Web app",
  styles: ["Warm", "Playful"], level: "Beginner-friendly", added: "2026-11-20",
  tagline: "Events, RSVPs, members and announcements for a community group.",
  description: "A community app: upcoming events people can RSVP to, a member directory, announcements and a volunteer sign-up form.",
  useCases: ["Publish events and take RSVPs", "Keep a member directory", "Recruit volunteers"],
  features: ["Events with RSVP", "Member directory", "Announcements", "Volunteer sign-up"],
  effort: "About 1–2 hours of agent work", stack: "Next.js, Supabase, email reminders",
  keywords: ["community", "events", "club", "church", "members", "rsvp", "meetup", "association", "volunteers", "nonprofit", "group"],
  brand: "Your Community", palette: PAL.violet, shell: "consumer",
  screens: [
    { slug: "events", label: "Events", icon: "layout", title: "Events", modules: [
      { m: "hero", eyebrow: "Yaba Makers Club", title: "Make things with your neighbours.", sub: "Workshops, repair cafés and build nights every week. Free for members; most events open to everyone.", cta: "See events", secondary: "Become a member", art: "crowd", seed: 2, stats: [["340", "members"], ["Every week", "events"]] },
      { m: "catalog", title: "Coming up", filters: ["Workshops", "Socials", "Volunteering"], action: "RSVP", cols: 3, items: [
        { title: "Repair café", meta: "Sat Nov 22 · 10:00 · Hub hall", price: "Free", art: "hands", seed: 1, tag: "Volunteering" }, { title: "Intro to soldering", meta: "Tue Nov 25 · 18:00 · 12 spots", price: "₦5,000", art: "desk", seed: 3, tag: "Workshops", badge: "4 spots left" },
        { title: "Members' mixer", meta: "Fri Nov 28 · 19:00 · Rooftop", price: "Free", art: "crowd", seed: 4, tag: "Socials" }, { title: "Woodwork basics", meta: "Sat Nov 29 · 11:00", price: "₦8,000", art: "hands", seed: 6, tag: "Workshops" },
      ] },
    ] },
    { slug: "members", label: "Members", icon: "users", title: "Member directory", modules: [
      { m: "table", title: "Members", search: "Search members", columns: ["Name", "Skills", "Joined", "Role"], status: 3, filter: 3, tones: { Organiser: "info", Volunteer: "good", Member: "neutral" }, rows: [
        ["Toby Lopez", "Electronics, 3D printing", "2023", "Organiser"], ["Grace Owens", "Sewing, upcycling", "2024", "Volunteer"], ["Justin Bell", "Woodwork", "2022", "Organiser"], ["Ella Foster", "Bikes, repairs", "2025", "Member"], ["Samuel Evans", "Coding, Arduino", "2025", "Volunteer"],
      ] },
    ] },
    { slug: "volunteer", label: "Volunteer", icon: "sparkles", title: "Volunteer with us", modules: [
      { m: "form", title: "Sign up to help", submit: "Sign me up", success: { title: "Thank you!", body: "An organiser will message you before the next repair café." }, steps: [{ title: "About you", fields: [
        { label: "Name", type: "text", required: true }, { label: "Email", type: "email", required: true }, { label: "How would you like to help?", type: "select", options: ["Repair café fixer", "Workshop host", "Event set-up", "Social media"], required: true }, { label: "Skills or experience", type: "textarea" },
      ] }] },
    ] },
  ],
};

export const recruiting: AppTemplate = {
  slug: "app-hiring-tracker", name: "Hiring pipeline tracker", category: "Business & Corporate", industry: "HR and recruiting", type: "Internal tool",
  styles: ["Corporate", "Minimal"], level: "Beginner-friendly", added: "2026-11-20",
  tagline: "Open roles, candidate pipeline and interview schedule for a growing company.",
  description: "An applicant tracker: open roles with headcount, a candidate pipeline you can advance, an interview calendar and a public application form.",
  useCases: ["Hire for several roles at once", "Coordinate interviewers", "Accept applications from a careers page"],
  features: ["Roles overview", "Candidate pipeline", "Interview calendar", "Application form"],
  effort: "About 2 hours of agent work", stack: "Next.js, Supabase, CV uploads to storage",
  keywords: ["hiring", "recruiting", "ats", "applicant tracking", "hr", "jobs", "candidates", "careers", "interviews", "recruit workers"],
  brand: "Your Company", palette: PAL.sky, shell: "admin", user: { name: "Heather Young", role: "People partner" },
  screens: [
    { slug: "pipeline", label: "Candidates", icon: "workflow", title: "Candidate pipeline", modules: [
      { m: "kanban", title: "All roles", columns: [
        { name: "Applied", cards: [{ title: "Jessica Edwards", meta: "Product designer · referral" }, { title: "Andrew Park", meta: "Backend engineer · careers page" }, { title: "Lara Smith", meta: "Account executive · LinkedIn" }] },
        { name: "Screen", cards: [{ title: "Kenji Sato", meta: "Backend engineer" }] },
        { name: "Interview", cards: [{ title: "Hannah Jackson", meta: "Product designer · panel Thu" }] },
        { name: "Offer", cards: [{ title: "Diego Alvarez", meta: "Account executive", value: "Sent" }] },
      ] },
    ] },
    { slug: "roles", label: "Roles", icon: "folder", title: "Open roles", modules: [
      { m: "kpis", items: [{ label: "Open roles", value: "5" }, { label: "Candidates in process", value: "38" }, { label: "Time to hire", value: "29 days", delta: "↓ 4 days" }, { label: "Offer acceptance", value: "86%" }] },
      { m: "table", title: "Roles", columns: ["Role", "Team", "Location", "Candidates", "Status"], status: 4, filter: 4, tones: { Open: "good", Paused: "warn", Filled: "neutral" }, rows: [["Backend engineer", "Engineering", "Lagos / remote", "14", "Open"], ["Product designer", "Product", "Lagos", "9", "Open"], ["Account executive", "Sales", "Nairobi", "11", "Open"], ["Office manager", "Operations", "Lagos", "4", "Paused"], ["Data analyst", "Finance", "Remote", "0", "Filled"]] },
    ] },
    { slug: "apply", label: "Careers page", icon: "globe", title: "Apply (public page)", modules: [
      { m: "form", title: "Backend engineer — apply", submit: "Send application", success: { title: "Application sent", body: "Thanks — we reply to every applicant within 10 working days." }, steps: [{ title: "Application", fields: [
        { label: "Full name", type: "text", required: true }, { label: "Email", type: "email", required: true }, { label: "Location", type: "text" }, { label: "Link to CV or portfolio", type: "text", required: true }, { label: "Why this role?", type: "textarea", required: true },
      ] }] },
    ] },
  ],
};

export const habits: AppTemplate = {
  slug: "app-personal-budget", name: "Personal budget tracker", category: "Personal & Community", industry: "Personal finance", type: "Web app",
  styles: ["Minimal", "Playful"], level: "Beginner-friendly", added: "2026-11-20",
  tagline: "A personal budget with categories, bills and savings pots.",
  description: "A personal budgeting app: monthly budget by category, upcoming bills, a spending log you can add to, and savings pots.",
  useCases: ["Plan a monthly budget", "Remember bills", "Save for specific things"],
  features: ["Budget categories", "Bills calendar", "Spending log", "Savings pots"],
  effort: "About 1 hour of agent work", stack: "Next.js, Supabase, private per-user data",
  keywords: ["budget", "personal finance", "expenses", "money", "savings", "bills", "spending tracker", "personal"],
  brand: "My Budget", palette: PAL.green, shell: "admin", user: { name: "You", role: "Personal" },
  screens: [
    { slug: "budget", label: "Budget", icon: "chart", title: "November budget", sub: "₦412,000 left to spend this month.", modules: [
      { m: "progress", title: "Categories", items: [{ title: "Food & groceries", meta: "₦118,000 of ₦150,000", pct: 79 }, { title: "Transport", meta: "₦41,000 of ₦60,000", pct: 68 }, { title: "Eating out", meta: "₦52,000 of ₦50,000 — over by ₦2,000", pct: 100 }, { title: "Data & airtime", meta: "₦9,000 of ₦20,000", pct: 45 }] },
      { m: "accounts", items: [{ name: "Holiday pot", number: "Goal Dec 20", balance: "₦340,000", note: "68%" }, { name: "Rainy day", number: "No end date", balance: "₦580,000", note: "Growing" }] },
    ] },
    { slug: "spending", label: "Spending", icon: "history", title: "Spending log", modules: [
      { m: "table", title: "This month", search: "Search", action: "Add expense", columns: ["What", "Category", "Date", "Amount", "Type"], status: 4, filter: 1, tones: { Planned: "info", "One-off": "neutral", Over: "warn" }, rows: [["Groceries", "Food & groceries", "Nov 18", "₦23,400", "Planned"], ["Uber to Ikeja", "Transport", "Nov 17", "₦6,800", "One-off"], ["Dinner with Amy", "Eating out", "Nov 15", "₦18,000", "Over"], ["MTN data", "Data & airtime", "Nov 12", "₦9,000", "Planned"]] },
    ] },
    { slug: "bills", label: "Bills", icon: "clock", title: "Upcoming bills", modules: [
      { m: "table", title: "Next 30 days", columns: ["Bill", "Due", "Amount", "Status"], status: 3, tones: { Paid: "good", Due: "warn", Scheduled: "info" }, rows: [["Rent", "Dec 1", "₦250,000", "Scheduled"], ["Electricity", "Nov 25", "₦25,000", "Due"], ["Netflix", "Nov 22", "₦4,400", "Scheduled"], ["Gym", "Nov 10", "₦15,000", "Paid"]] },
    ] },
  ],
};
