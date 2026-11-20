import type { AppTemplate } from "../types";
import { PAL } from "../palettes";

export const school: AppTemplate = {
  slug: "app-school-management", name: "School management office", category: "Education", industry: "Primary and secondary schools", type: "Internal tool",
  styles: ["Corporate", "Warm"], level: "Advanced", added: "2026-11-20",
  tagline: "Students, attendance, fees and parent messages for a school office.",
  description: "A school administration tool: student records by class, a daily attendance board, fee collection with outstanding balances, and messages to parents.",
  useCases: ["Keep student records in one place", "Take and review attendance", "Track school fees"],
  features: ["Student records", "Attendance", "Fees and balances", "Parent messages", "Term calendar"],
  effort: "About 3 hours of agent work", stack: "Next.js, Supabase, roles for teachers and bursars",
  keywords: ["school", "school management", "students", "attendance", "fees", "parents", "teachers", "education", "admin", "pupils"],
  brand: "Harmony", palette: PAL.sky, shell: "admin", user: { name: "Mrs Adaku Eze", role: "School administrator" },
  screens: [
    { slug: "overview", label: "Overview", icon: "chart", title: "First term, week 11", modules: [
      { m: "kpis", items: [{ label: "Students", value: "486" }, { label: "Present today", value: "94%", delta: "29 absent", tone: "info" }, { label: "Fees collected", value: "₦38.2M", delta: "81% of term" }, { label: "Outstanding", value: "₦8.9M", tone: "warn", delta: "74 families" }] },
      { m: "chart", title: "Attendance by class (%)", kind: "bar", labels: ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"], series: [{ label: "This week", values: [96, 95, 93, 92, 94, 97] }] },
    ] },
    { slug: "students", label: "Students", icon: "users", title: "Students", modules: [
      { m: "table", title: "All students", search: "Search by name or ID", action: "Add student", columns: ["Name", "Class", "Guardian", "Fees", "Status"], status: 4, filter: 1, tones: { Active: "good", "On leave": "warn", Graduated: "neutral" }, rows: [
        ["Chiamaka Obi", "JSS2", "Mr Obi", "Paid", "Active"], ["Daniel Musa", "SS1", "Mrs Musa", "₦85,000 due", "Active"], ["Esther Ojo", "SS3", "Mr Ojo", "Paid", "Active"], ["Farouk Sani", "JSS1", "Mr Sani", "₦170,000 due", "On leave"], ["Grace Ibe", "SS2", "Mrs Ibe", "Paid", "Active"],
      ] },
    ] },
    { slug: "attendance", label: "Attendance", icon: "check", title: "Today's attendance", modules: [
      { m: "kanban", title: "SS1 Science — tap to mark arrivals", columns: [
        { name: "Not marked", cards: [{ title: "Bola Adeyemi", meta: "SS1 Science" }, { title: "Ikenna Udo", meta: "SS1 Science" }] },
        { name: "Present", cards: [{ title: "Daniel Musa", meta: "08:02" }, { title: "Halima Garba", meta: "07:55" }] },
        { name: "Late", cards: [{ title: "Tosin Bello", meta: "08:24" }] },
      ] },
    ] },
    { slug: "messages", label: "Parents", icon: "chat", title: "Parent messages", modules: [
      { m: "inbox", title: "Messages", reply: "Reply to the parent…", items: [
        { title: "Farouk's leave", meta: "Mr Sani · today", badge: "New", preview: "Farouk will be away until the 28th…", body: ["Good morning. Farouk is travelling with family and will be back on the 28th. Please share any assignments."] },
        { title: "Fees instalment", meta: "Mrs Musa · yesterday", preview: "Can we pay the balance in two parts?", body: ["Can we pay the remaining ₦85,000 in two parts, this month and next?"] },
      ] },
    ] },
  ],
};

export const pharmacy: AppTemplate = {
  slug: "app-pharmacy-inventory", name: "Pharmacy stock & prescriptions", category: "Healthcare", industry: "Pharmacies", type: "Internal tool",
  styles: ["Minimal", "Technical"], level: "Advanced", added: "2026-11-20",
  tagline: "Stock levels, expiry dates, suppliers and sales for a community pharmacy.",
  description: "A pharmacy back office: stock with low-stock and expiry filters, purchase orders moving from draft to received, and daily sales.",
  useCases: ["Never run out of essentials", "Catch expiring stock early", "Order from suppliers"],
  features: ["Stock list", "Expiry alerts", "Purchase orders", "Sales summary", "Supplier contacts"],
  effort: "About 2–3 hours of agent work", stack: "Next.js, Supabase, barcode-friendly inputs",
  keywords: ["pharmacy", "inventory", "stock", "medicines", "drugs", "chemist", "expiry", "health", "supplies"],
  brand: "Medstock", palette: PAL.teal, shell: "admin", user: { name: "Pharm. Yemi Ola", role: "Superintendent pharmacist" },
  screens: [
    { slug: "stock", label: "Stock", icon: "database", title: "Stock", modules: [
      { m: "kpis", items: [{ label: "Products", value: "1,206" }, { label: "Low stock", value: "17", tone: "warn" }, { label: "Expiring in 60 days", value: "9", tone: "bad" }, { label: "Sales today", value: "₦412,300" }] },
      { m: "table", title: "Products", search: "Search product or barcode", action: "Add product", columns: ["Product", "Pack", "On hand", "Expiry", "Status"], status: 4, filter: 4, tones: { OK: "good", Low: "warn", Expiring: "bad", Out: "bad" }, rows: [
        ["Paracetamol 500mg", "Box of 100", "64", "Aug 2027", "OK"], ["Amoxicillin 500mg", "Box of 21", "8", "Mar 2027", "Low"], ["ORS sachets", "Pack of 20", "120", "Jan 2027", "OK"], ["Insulin glargine", "Pen", "6", "Jan 2026", "Expiring"], ["Artemether/lumefantrine", "Box of 24", "0", "—", "Out"],
      ] },
    ] },
    { slug: "orders", label: "Orders", icon: "workflow", title: "Purchase orders", modules: [
      { m: "kanban", title: "Orders", columns: [
        { name: "Draft", cards: [{ title: "PO-1182 · Emzor", meta: "Paracetamol, ORS", value: "₦184k" }] },
        { name: "Sent", cards: [{ title: "PO-1181 · Fidson", meta: "Amoxicillin ×40", value: "₦96k" }] },
        { name: "Received", cards: [{ title: "PO-1180 · GSK", meta: "Checked by Yemi", value: "₦310k" }] },
      ] },
    ] },
    { slug: "sales", label: "Sales", icon: "chart", title: "Sales", modules: [
      { m: "chart", title: "Daily sales (₦k)", kind: "line", labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], series: [{ label: "This week", values: [362, 398, 341, 420, 455, 512, 210] }, { label: "Last week", values: [340, 371, 352, 390, 430, 488, 198] }] },
    ] },
  ],
};

export const invoicing: AppTemplate = {
  slug: "app-invoicing", name: "Invoicing & payments", category: "Finance & Fintech", industry: "Freelancers and small businesses", type: "Web app",
  styles: ["Minimal", "Premium"], level: "Beginner-friendly", added: "2026-11-20",
  tagline: "Create invoices, chase payments and see cash flow.",
  description: "Invoicing for a small business: invoices with status filters, a create-invoice form, clients, and a cash-flow chart.",
  useCases: ["Send professional invoices", "Know who owes you", "See monthly cash flow"],
  features: ["Invoice list", "Create invoice", "Clients", "Cash-flow chart", "Payment reminders"],
  effort: "About 1–2 hours of agent work", stack: "Next.js, Supabase, PDF generation",
  keywords: ["invoice", "invoicing", "billing", "accounting", "payments", "freelancer", "small business", "receipts", "finance"],
  brand: "Paperless", palette: PAL.ink, shell: "admin", user: { name: "Zara Bello", role: "Owner, Bello Design" },
  screens: [
    { slug: "invoices", label: "Invoices", icon: "card", title: "Invoices", modules: [
      { m: "kpis", items: [{ label: "Outstanding", value: "₦1,840,000", delta: "6 invoices", tone: "info" }, { label: "Overdue", value: "₦420,000", tone: "bad", delta: "2 invoices" }, { label: "Paid this month", value: "₦2,960,000" }, { label: "Avg. days to pay", value: "18" }] },
      { m: "table", title: "All invoices", search: "Search invoices", columns: ["Invoice", "Client", "Issued", "Amount", "Status"], status: 4, filter: 4, tones: { Paid: "good", Sent: "info", Overdue: "bad", Draft: "neutral" }, rows: [
        ["INV-0142", "Kestrel Shop", "Nov 18", "₦650,000", "Sent"], ["INV-0141", "Lumen App", "Nov 10", "₦380,000", "Sent"], ["INV-0140", "Harbour Clinic", "Oct 22", "₦240,000", "Overdue"], ["INV-0139", "Ember Kitchen", "Oct 15", "₦180,000", "Overdue"], ["INV-0138", "Talentboard", "Oct 2", "₦1,200,000", "Paid"], ["INV-0143", "Gather", "—", "₦95,000", "Draft"],
      ] },
    ] },
    { slug: "new", label: "New invoice", icon: "plus", title: "New invoice", modules: [
      { m: "form", title: "Invoice details", submit: "Create invoice", success: { title: "Invoice INV-0144 created", body: "Download the PDF or send it by email from the invoice page." }, steps: [
        { title: "Client", fields: [{ label: "Client", type: "select", options: ["Kestrel Shop", "Lumen App", "Harbour Clinic", "Ember Kitchen", "New client…"], required: true }, { label: "Client email", type: "email", required: true }, { label: "Due date", type: "date", required: true }] },
        { title: "Items", fields: [{ label: "Description", type: "text", required: true }, { label: "Amount (₦)", type: "money", required: true }, { label: "Notes", type: "textarea", placeholder: "Bank details, thank-you note…" }] },
      ] },
    ] },
    { slug: "cashflow", label: "Cash flow", icon: "chart", title: "Cash flow", modules: [
      { m: "chart", title: "Money in vs out (₦k)", kind: "bar", ranges: ["3M", "6M"], labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"], series: [{ label: "In", values: [1820, 2140, 1960, 2480, 2210, 2960] }, { label: "Out", values: [1340, 1420, 1510, 1490, 1620, 1580] }] },
    ] },
  ],
};

export const logistics: AppTemplate = {
  slug: "app-delivery-tracking", name: "Delivery tracking & dispatch", category: "Business & Corporate", industry: "Logistics and couriers", type: "Web app",
  styles: ["Bold", "Technical"], level: "Advanced", added: "2026-11-20",
  tagline: "Shipments, drivers and customer tracking for a delivery company.",
  description: "A courier operations app: live shipment board, driver schedule, a shipment table with status filters, and a public tracking form for customers.",
  useCases: ["Dispatch deliveries", "Track drivers and delays", "Let customers track parcels"],
  features: ["Dispatch board", "Shipments table", "Driver schedule", "Customer tracking", "Delivery metrics"],
  effort: "About 3 hours of agent work", stack: "Next.js, Supabase realtime, SMS once connected",
  keywords: ["logistics", "delivery", "courier", "shipping", "dispatch", "tracking", "drivers", "fleet", "parcels"],
  brand: "Swiftmile", palette: PAL.amber, shell: "admin", user: { name: "Kunle Ade", role: "Dispatch lead" },
  screens: [
    { slug: "dispatch", label: "Dispatch", icon: "workflow", title: "Today's deliveries", modules: [
      { m: "kpis", items: [{ label: "Deliveries today", value: "312" }, { label: "On time", value: "91%", delta: "↑ 3 pts" }, { label: "Drivers out", value: "24" }, { label: "Delayed", value: "11", tone: "warn" }] },
      { m: "kanban", title: "Shipments", columns: [
        { name: "Ready", cards: [{ title: "SM-88412", meta: "Ikeja → Lekki · 2 parcels" }, { title: "SM-88415", meta: "Yaba → Surulere" }] },
        { name: "Picked up", cards: [{ title: "SM-88402", meta: "Driver: Sule · VI" }] },
        { name: "Out for delivery", cards: [{ title: "SM-88391", meta: "Driver: Ngozi · ETA 14:20" }] },
        { name: "Delivered", cards: [{ title: "SM-88377", meta: "Signed by M. Ade · 11:48" }] },
      ] },
    ] },
    { slug: "shipments", label: "Shipments", icon: "database", title: "All shipments", modules: [
      { m: "table", title: "Shipments", search: "Search tracking number", columns: ["Tracking", "From", "To", "Driver", "Status"], status: 4, filter: 4, tones: { Delivered: "good", "In transit": "info", Delayed: "warn", Failed: "bad" }, rows: [
        ["SM-88412", "Ikeja", "Lekki", "—", "In transit"], ["SM-88402", "Apapa", "VI", "Sule", "In transit"], ["SM-88391", "Yaba", "Ikoyi", "Ngozi", "Delayed"], ["SM-88377", "Surulere", "Ajah", "Sule", "Delivered"], ["SM-88350", "Ikeja", "Ikorodu", "Bayo", "Failed"],
      ] },
    ] },
    { slug: "track", label: "Track (public)", icon: "search", title: "Track a parcel", modules: [
      { m: "form", title: "Where's my parcel?", submit: "Track", success: { title: "Out for delivery", body: "SM-88391 is with Ngozi and should arrive between 14:00 and 15:00." }, steps: [{ title: "Tracking", fields: [{ label: "Tracking number", type: "text", required: true, placeholder: "SM-00000" }, { label: "Phone number on the order", type: "tel", required: true }] }] },
    ] },
  ],
};

export const saasAdmin: AppTemplate = {
  slug: "app-saas-admin", name: "SaaS admin console", category: "Technology & SaaS", industry: "Software companies", type: "Dashboard",
  styles: ["Technical", "Minimal"], level: "Advanced", added: "2026-11-20",
  tagline: "Customers, subscriptions, MRR and feature flags for a SaaS team.",
  description: "An admin console for a subscription product: MRR and churn, a customer table with plan filters, a release checklist and an audit feed.",
  useCases: ["Watch recurring revenue", "Look up and help customers", "Ship releases safely"],
  features: ["MRR dashboard", "Customer lookup", "Plans and subscriptions", "Release checklist", "Audit feed"],
  effort: "About 2–3 hours of agent work", stack: "Next.js, Supabase, Stripe billing once connected",
  keywords: ["saas", "admin", "subscriptions", "mrr", "customers", "billing", "churn", "software", "startup", "console"],
  brand: "Orbit", palette: PAL.night, shell: "admin", user: { name: "Dami Ola", role: "Founder" },
  screens: [
    { slug: "revenue", label: "Revenue", icon: "chart", title: "Revenue", modules: [
      { m: "kpis", items: [{ label: "MRR", value: "$48,920", delta: "↑ 6.2% this month" }, { label: "Customers", value: "612" }, { label: "Churn", value: "1.9%", delta: "↓ 0.4 pts" }, { label: "Trials", value: "84", tone: "info", delta: "21% convert" }] },
      { m: "chart", title: "MRR ($k)", kind: "line", ranges: ["6M", "12M"], labels: ["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"], series: [{ label: "MRR", values: [24, 26, 28, 30, 31, 34, 36, 39, 41, 44, 46, 49] }] },
    ] },
    { slug: "customers", label: "Customers", icon: "users", title: "Customers", modules: [
      { m: "table", title: "Accounts", search: "Search by name or email", columns: ["Account", "Plan", "Seats", "MRR", "Status"], status: 4, filter: 1, tones: { Active: "good", Trial: "info", "Past due": "warn", Cancelled: "neutral" }, rows: [
        ["Kestrel Shop", "Team", "12", "$348", "Active"], ["Harbor Dental", "Pro", "4", "$116", "Past due"], ["Plume Studio", "Pro", "3", "$87", "Active"], ["Northline Ltd", "Business", "40", "$1,560", "Active"], ["Bolt Couriers", "Team", "8", "$0", "Trial"],
      ] },
    ] },
    { slug: "releases", label: "Releases", icon: "rocket", title: "Release 4.12", modules: [
      { m: "progress", title: "Checklist", items: [{ title: "Migrations reviewed", meta: "2 of 2", pct: 100 }, { title: "Tests passing", meta: "1,284 of 1,290", pct: 99 }, { title: "Docs updated", meta: "3 of 5 pages", pct: 60 }, { title: "Staged rollout", meta: "10% of accounts", pct: 10 }] },
      { m: "feed", title: "Audit log", items: [{ who: "Dami", what: "enabled 'bulk export' for 10% of accounts", when: "09:12" }, { who: "Tobi", what: "changed Harbor Dental to Pro", when: "Yesterday" }, { who: "System", what: "retried 3 failed webhooks", when: "Yesterday" }] },
    ] },
  ],
};

export const expenses: AppTemplate = {
  slug: "app-expense-approvals", name: "Expense claims & approvals", category: "Productivity & Workflow", industry: "Finance and operations teams", type: "Internal tool",
  styles: ["Corporate", "Minimal"], level: "Beginner-friendly", added: "2026-11-20",
  tagline: "Expense claims with receipts, approvals and reimbursements.",
  description: "An approvals workflow: staff submit expense claims, managers approve from an inbox, finance moves approved claims to paid, with a spend summary by team.",
  useCases: ["Replace paper expense forms", "Approve claims quickly", "See spend by team"],
  features: ["Claim form", "Approval inbox", "Reimbursement board", "Spend by team", "Audit trail"],
  effort: "About 2 hours of agent work", stack: "Next.js, Supabase, receipt uploads to storage",
  keywords: ["expenses", "approvals", "workflow", "reimbursement", "claims", "finance", "operations", "receipts", "internal tool"],
  brand: "Approvly", palette: PAL.violet, shell: "admin", user: { name: "Olu Martins", role: "Finance manager" },
  screens: [
    { slug: "approve", label: "To approve", icon: "inbox", title: "Waiting for you", modules: [
      { m: "inbox", title: "Claims", reply: "Add a note to the claimant…", items: [
        { title: "Client lunch — ₦42,500", meta: "Amara Okafor · Sales · today", badge: "New", preview: "Lunch with Halden Logistics at Ember…", body: ["Lunch with Daniel Brooks (Halden Logistics) to discuss the proposal. Receipt attached.", "Cost centre: Sales"] },
        { title: "Taxi to Ikeja site — ₦9,800", meta: "Emeka Obi · Operations · yesterday", preview: "Two taxi rides for the site visit…", body: ["Two taxi rides for the Ikeja Clinic site inspection. Receipts attached."] },
      ] },
    ] },
    { slug: "claims", label: "Reimbursements", icon: "workflow", title: "Reimbursements", modules: [
      { m: "kanban", title: "Claims", columns: [
        { name: "Submitted", cards: [{ title: "Conference ticket", meta: "Sofia · Marketing", value: "₦120k" }] },
        { name: "Approved", cards: [{ title: "Laptop charger", meta: "Ope · Engineering", value: "₦28k" }, { title: "Fuel", meta: "Kunle · Logistics", value: "₦35k" }] },
        { name: "Paid", cards: [{ title: "Team offsite snacks", meta: "Jide · Product", value: "₦18k" }] },
      ] },
    ] },
    { slug: "submit", label: "New claim", icon: "plus", title: "Submit a claim", modules: [
      { m: "form", title: "Expense claim", submit: "Submit for approval", success: { title: "Claim submitted", body: "Your manager has been notified. You'll see the status under Reimbursements." }, steps: [{ title: "Claim", fields: [
        { label: "What was it for?", type: "text", required: true }, { label: "Category", type: "select", options: ["Travel", "Meals", "Equipment", "Training", "Other"], required: true }, { label: "Date", type: "date", required: true }, { label: "Amount (₦)", type: "money", required: true }, { label: "Notes", type: "textarea" },
      ] }] },
    ] },
    { slug: "spend", label: "Spend", icon: "chart", title: "Spend by team", modules: [
      { m: "chart", title: "November (₦k)", kind: "bar", labels: ["Sales", "Ops", "Marketing", "Engineering", "Product"], series: [{ label: "Claimed", values: [412, 286, 198, 144, 62] }] },
    ] },
  ],
};

export const fitness: AppTemplate = {
  slug: "app-gym-membership", name: "Gym memberships & class booking", category: "Healthcare", industry: "Gyms and fitness studios", type: "Web app",
  styles: ["Bold", "Playful"], level: "Beginner-friendly", added: "2026-11-20",
  tagline: "Class timetable, memberships and check-ins for a gym.",
  description: "A gym app: membership plans members can pick, a weekly class timetable, a member list with plan filters, and check-in numbers for staff.",
  useCases: ["Sell memberships online", "Publish the class timetable", "Track check-ins"],
  features: ["Membership plans", "Class timetable", "Member list", "Check-in stats"],
  effort: "About 2 hours of agent work", stack: "Next.js, Supabase, Paystack or Stripe once connected",
  keywords: ["gym", "fitness", "membership", "classes", "workout", "studio", "wellness", "trainer", "yoga"],
  brand: "Pulsefit", palette: PAL.rose, shell: "consumer",
  screens: [
    { slug: "join", label: "Join", icon: "layout", title: "Memberships", modules: [
      { m: "hero", eyebrow: "Open 5am–10pm · Lekki", title: "Train hard. Recover properly.", sub: "Strength floor, 30 classes a week and coaches who learn your name.", cta: "Choose a membership", secondary: "See classes", art: "team", seed: 3 },
      { m: "catalog", title: "Plans", action: "Choose", cart: true, cols: 3, items: [
        { title: "Off-peak", meta: "Weekdays 10am–4pm · All classes", price: "₦25,000", art: "abstract", seed: 1 }, { title: "Unlimited", meta: "Any time · All classes · 1 guest pass", price: "₦40,000", art: "abstract", seed: 2, badge: "Most chosen" }, { title: "Student", meta: "Any time · ID required", price: "₦20,000", art: "abstract", seed: 3 },
      ] },
    ] },
    { slug: "classes", label: "Classes", icon: "clock", title: "This week's classes", modules: [
      { m: "calendar", title: "Timetable", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], events: [
        { day: 0, start: "06:00", end: "07:00", title: "HIIT", meta: "Coach Tayo", tone: "bad" }, { day: 1, start: "18:00", end: "19:00", title: "Yoga flow", meta: "Coach Ama", tone: "good" }, { day: 2, start: "07:00", end: "08:00", title: "Strength 101", meta: "Coach Femi", tone: "info" }, { day: 3, start: "18:30", end: "19:30", title: "Spin", meta: "Coach Tayo", tone: "warn" }, { day: 5, start: "09:00", end: "10:30", title: "Bootcamp", meta: "All coaches", tone: "bad" },
      ] },
    ] },
    { slug: "members", label: "Staff", icon: "users", title: "Members (staff)", modules: [
      { m: "kpis", items: [{ label: "Active members", value: "418" }, { label: "Check-ins today", value: "136" }, { label: "New this month", value: "37", delta: "↑ 8" }, { label: "Renewals due", value: "22", tone: "warn" }] },
      { m: "table", title: "Members", search: "Search members", columns: ["Name", "Plan", "Since", "Last visit", "Status"], status: 4, filter: 1, tones: { Active: "good", Frozen: "info", Lapsed: "warn" }, rows: [["Kemi Adeyemi", "Unlimited", "2024", "Today", "Active"], ["Tunde Ola", "Off-peak", "2025", "Yesterday", "Active"], ["Ruth Eze", "Student", "2025", "3 weeks", "Lapsed"], ["Musa Bello", "Unlimited", "2023", "1 month", "Frozen"]] },
    ] },
  ],
};

export const inventory: AppTemplate = {
  slug: "app-inventory", name: "Inventory & stock control", category: "E-commerce & Retail", industry: "Retail and wholesale", type: "Internal tool",
  styles: ["Minimal", "Technical"], level: "Beginner-friendly", added: "2026-11-20",
  tagline: "Stock across locations, reorder points and supplier orders.",
  description: "Inventory for a retailer with two shops and a warehouse: stock by location with low-stock filters, stock movements, supplier orders and stock value.",
  useCases: ["Know what's in stock where", "Reorder before you run out", "Track stock value"],
  features: ["Stock by location", "Low-stock alerts", "Supplier orders", "Stock movements", "Stock value"],
  effort: "About 2 hours of agent work", stack: "Next.js, Supabase, CSV import",
  keywords: ["inventory", "stock", "warehouse", "retail", "wholesale", "products", "reorder", "suppliers", "sku"],
  brand: "Shelfwise", palette: PAL.green, shell: "admin", user: { name: "Ifeanyi Okoro", role: "Store manager" },
  screens: [
    { slug: "stock", label: "Stock", icon: "database", title: "Stock", modules: [
      { m: "kpis", items: [{ label: "SKUs", value: "2,340" }, { label: "Stock value", value: "₦46.8M" }, { label: "Below reorder point", value: "31", tone: "warn" }, { label: "Out of stock", value: "4", tone: "bad" }] },
      { m: "table", title: "Products", search: "Search SKU or name", action: "Add product", columns: ["Product", "SKU", "Location", "On hand", "Status"], status: 4, filter: 2, tones: { "In stock": "good", Low: "warn", Out: "bad" }, rows: [
        ["Rice 50kg", "RC-050", "Warehouse", "84", "In stock"], ["Vegetable oil 5L", "VO-005", "Ikeja shop", "6", "Low"], ["Sugar 1kg", "SG-001", "Ikeja shop", "0", "Out"], ["Tomato paste (carton)", "TP-024", "Warehouse", "140", "In stock"], ["Detergent 2kg", "DT-002", "Yaba shop", "12", "Low"],
      ] },
    ] },
    { slug: "orders", label: "Supplier orders", icon: "workflow", title: "Supplier orders", modules: [
      { m: "kanban", title: "Orders", columns: [{ name: "To order", cards: [{ title: "Sugar 1kg ×200", meta: "Dangote · reorder point hit" }] }, { name: "Ordered", cards: [{ title: "Vegetable oil ×60", meta: "Power Oil · ETA Fri", value: "₦540k" }] }, { name: "Received", cards: [{ title: "Rice 50kg ×40", meta: "Checked in · Warehouse", value: "₦2.6M" }] }] },
    ] },
    { slug: "movements", label: "Movements", icon: "history", title: "Stock movements", modules: [
      { m: "feed", title: "Today", items: [{ who: "Warehouse → Ikeja", what: "moved 20 × Rice 50kg", when: "10:42" }, { who: "Yaba shop", what: "sold 14 × Detergent 2kg", when: "10:15" }, { who: "Warehouse", what: "received 40 × Rice 50kg from supplier", when: "08:30" }] },
    ] },
  ],
};
