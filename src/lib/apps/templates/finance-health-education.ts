import type { AppTemplate } from "../types";
import { PAL } from "../palettes";

export const banking: AppTemplate = {
  slug: "app-banking", name: "Mobile banking app", category: "Finance & Fintech", industry: "Digital banking", type: "Web app",
  styles: ["Premium", "Minimal"], level: "Advanced", featured: true, added: "2026-11-19",
  tagline: "Accounts, transfers, savings goals and statements for a digital bank.",
  description: "A customer banking app: account cards, spending insights, a transaction history with category filters, a two-step transfer with confirmation, and savings goals.",
  useCases: ["Let customers see balances and history", "Move money between accounts", "Save towards goals"],
  features: ["Account overview", "Spending insights", "Transaction history", "Transfers with confirmation", "Savings goals", "Statements"],
  effort: "About 3 hours of agent work", stack: "Next.js, Supabase, audited ledger tables with row-level security",
  keywords: ["bank", "banking", "fintech", "wallet", "money", "transfer", "payments", "savings", "transactions", "account", "neobank"],
  brand: "Your Bank", palette: PAL.green, shell: "admin", user: { name: "Chris Nguyen", role: "Personal account" },
  screens: [
    { slug: "home", label: "Home", icon: "layout", title: "Hi Chris", sub: "Here's where your money is today.", modules: [
      { m: "accounts", items: [{ name: "Everyday account", number: "•••• 4821", balance: "₦1,284,500.00", note: "Available" }, { name: "Savings", number: "•••• 0937", balance: "₦3,920,000.00", note: "12% p.a." }, { name: "USD wallet", number: "•••• 7710", balance: "$1,240.18", note: "Available" }] },
      { m: "split", left: [{ m: "chart", title: "Spending this month", kind: "bar", unit: "k", labels: ["Food", "Transport", "Bills", "Shopping", "Health", "Other"], series: [{ label: "This month", values: [142, 64, 118, 96, 22, 41] }, { label: "Last month", values: [128, 71, 118, 140, 15, 38] }] }],
        right: [{ m: "feed", title: "Latest", items: [{ who: "Grocery Outlet", what: "−₦18,450 · Food", when: "Today" }, { who: "Salary — Halden Ltd", what: "+₦850,000", when: "Nov 15" }, { who: "Bolt", what: "−₦4,200 · Transport", when: "Nov 14" }, { who: "IKEDC", what: "−₦25,000 · Bills", when: "Nov 12" }] }] },
    ] },
    { slug: "transactions", label: "Transactions", icon: "history", title: "Transactions", modules: [
      { m: "table", title: "November", search: "Search payee or amount", columns: ["Payee", "Category", "Date", "Amount", "Status"], status: 4, filter: 1, tones: { Completed: "good", Pending: "warn", Reversed: "neutral" }, rows: [
        ["Grocery Outlet", "Food", "Nov 18", "−₦18,450", "Completed"], ["Bolt", "Transport", "Nov 18", "−₦3,100", "Pending"], ["Salary — Halden Ltd", "Income", "Nov 15", "+₦850,000", "Completed"],
        ["Bolt", "Transport", "Nov 14", "−₦4,200", "Completed"], ["IKEDC", "Bills", "Nov 12", "−₦25,000", "Completed"], ["Amazon", "Shopping", "Nov 10", "−₦36,900", "Reversed"], ["Walgreens", "Health", "Nov 8", "−₦7,350", "Completed"],
      ] },
    ] },
    { slug: "transfer", label: "Transfer", icon: "share", title: "Send money", modules: [
      { m: "form", title: "New transfer", sub: "Transfers to other banks arrive within minutes.", submit: "Confirm and send", success: { title: "Transfer sent", body: "Your transfer is on its way and we've emailed you a receipt. (Preview — no money moves.)" }, steps: [
        { title: "Recipient", fields: [{ label: "Bank", type: "select", options: ["Your Bank", "Chase", "Bank of America", "Wells Fargo", "Citi", "Capital One"], required: true }, { label: "Account number", type: "text", required: true, placeholder: "10 digits" }, { label: "Account name", type: "text", placeholder: "Checked automatically" }] },
        { title: "Amount", fields: [{ label: "From", type: "select", options: ["Everyday •••• 4821", "Savings •••• 0937"], required: true }, { label: "Amount (₦)", type: "money", required: true }, { label: "Note", type: "text", placeholder: "Optional" }] },
        { title: "Confirm", fields: [{ label: "Transaction PIN", type: "text", required: true, placeholder: "4 digits" }] },
      ] },
    ] },
    { slug: "goals", label: "Savings goals", icon: "rocket", title: "Savings goals", modules: [
      { m: "progress", title: "Your goals", items: [{ title: "Emergency fund", meta: "₦2,400,000 of ₦3,000,000", pct: 80 }, { title: "New laptop", meta: "₦610,000 of ₦1,200,000", pct: 51 }, { title: "December travel", meta: "₦910,000 of ₦2,500,000", pct: 36 }] },
    ] },
  ],
};

export const loans: AppTemplate = {
  slug: "app-loan-application", name: "Loan applications & approvals", category: "Finance & Fintech", industry: "Lending", type: "Portal",
  styles: ["Corporate", "Minimal"], level: "Advanced", added: "2026-11-19",
  tagline: "Loan applications with eligibility, documents and an officer review queue.",
  description: "A lending portal: a customer application in steps with validation, an officer queue with risk filters and application details, and a portfolio dashboard.",
  useCases: ["Take loan applications online", "Review and approve applications", "Track repayments and arrears"],
  features: ["Multi-step application", "Document checklist", "Review queue", "Portfolio dashboard", "Repayment tracking"],
  effort: "About 3 hours of agent work", stack: "Next.js, Supabase, role-based access for officers",
  keywords: ["loan", "lending", "credit", "application", "microfinance", "underwriting", "fintech", "borrow"],
  brand: "Your Lender", palette: PAL.navy, shell: "admin", user: { name: "Karen Olsen", role: "Credit officer" },
  screens: [
    { slug: "apply", label: "Apply", icon: "edit", title: "Apply for a loan", sub: "Takes about 5 minutes. We'll tell you what you're eligible for before you submit.", modules: [
      { m: "form", title: "Business loan application", submit: "Submit application", success: { title: "Application received", body: "Reference LW-20481. An officer will review it within 2 working days and email you." }, steps: [
        { title: "About you", fields: [{ label: "Full name", type: "text", required: true }, { label: "Email", type: "email", required: true }, { label: "Phone", type: "tel", required: true }, { label: "Date of birth", type: "date", required: true }] },
        { title: "Your business", fields: [{ label: "Business name", type: "text", required: true }, { label: "Sector", type: "select", options: ["Retail", "Food", "Transport", "Services", "Agriculture", "Manufacturing"], required: true }, { label: "Monthly revenue (₦)", type: "money", required: true }] },
        { title: "Loan", fields: [{ label: "Amount (₦)", type: "money", required: true }, { label: "Term", type: "select", options: ["3 months", "6 months", "12 months", "18 months"], required: true }, { label: "What is it for?", type: "textarea", required: true }] },
      ] },
    ] },
    { slug: "queue", label: "Review queue", icon: "inbox", title: "Applications to review", modules: [
      { m: "table", title: "Pending", search: "Search applicant", columns: ["Applicant", "Amount", "Term", "Risk", "Submitted"], status: 3, filter: 3, tones: { Low: "good", Medium: "warn", High: "bad" }, rows: [
        ["Corner Stores", "₦2,500,000", "12 months", "Low", "Today"], ["Metro Transport", "₦6,000,000", "18 months", "Medium", "Today"], ["Green Leaf Farms", "₦1,200,000", "6 months", "Low", "Yesterday"],
        ["Quickprint Ltd", "₦4,800,000", "12 months", "High", "Yesterday"], ["Main Street Diner", "₦800,000", "3 months", "Medium", "2 days"],
      ] },
    ] },
    { slug: "portfolio", label: "Portfolio", icon: "chart", title: "Portfolio", modules: [
      { m: "kpis", items: [{ label: "Active loans", value: "1,284" }, { label: "Outstanding", value: "₦2.41B" }, { label: "Repaid on time", value: "93.6%", delta: "↑ 0.8 pts" }, { label: "In arrears > 30 days", value: "2.1%", tone: "warn", delta: "27 loans" }] },
      { m: "chart", title: "Disbursed vs repaid", kind: "line", unit: "M", labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"], series: [{ label: "Disbursed", values: [310, 342, 368, 401, 436, 288] }, { label: "Repaid", values: [276, 298, 330, 352, 390, 264] }], ranges: ["3M", "6M"] },
    ] },
  ],
};

export const patients: AppTemplate = {
  slug: "app-patient-portal", name: "Patient portal with appointments", category: "Healthcare", industry: "Clinics", type: "Portal",
  styles: ["Warm", "Minimal"], level: "Advanced", featured: true, added: "2026-11-19",
  tagline: "Appointments, messages, results and prescriptions for clinic patients.",
  description: "A patient portal for a family clinic: upcoming appointments, booking in steps, secure messages with the care team, test results and repeat prescriptions.",
  useCases: ["Let patients book and manage visits", "Message the care team", "Share results and prescriptions"],
  features: ["Appointment booking", "Secure messages", "Results", "Repeat prescriptions", "Clinic schedule"],
  effort: "About 3 hours of agent work", stack: "Next.js, Supabase with strict row-level security, audit log",
  keywords: ["patient portal", "clinic", "hospital", "health", "medical", "appointments", "doctor", "healthcare", "telehealth", "booking"],
  brand: "Your Clinic", palette: PAL.sky, shell: "consumer",
  screens: [
    { slug: "home", label: "Home", icon: "layout", title: "Your health, in one place", modules: [
      { m: "hero", eyebrow: "Cedar Family Clinic", title: "Book, message and manage your care.", sub: "See your next appointment, message your care team and order repeat prescriptions — without calling the front desk.", cta: "Book an appointment", secondary: "Message my GP", art: "clinic", seed: 3 },
      { m: "features", title: "What you can do here", items: [{ icon: "clock", title: "Book visits", body: "Choose a clinician and a time that suits you; reschedule up to 2 hours before." }, { icon: "chat", title: "Message your team", body: "Non-urgent questions answered within one working day." }, { icon: "shield", title: "Private by design", body: "Only you and your care team can see your records." }] },
    ] },
    { slug: "book", label: "Book", icon: "plus", title: "Book an appointment", modules: [
      { m: "form", title: "New appointment", sub: "For emergencies call 112.", submit: "Book appointment", success: { title: "You're booked", body: "We've emailed your confirmation and will text you a reminder the day before." }, steps: [
        { title: "Visit", fields: [{ label: "Type of visit", type: "select", options: ["GP consultation", "Follow-up", "Vaccination", "Blood test", "Antenatal check"], required: true }, { label: "Clinician", type: "select", options: ["Any available", "Dr Rachel Kim", "Dr Samuel Reid", "Nurse Kelly Lee"] }] },
        { title: "Time", fields: [{ label: "Date", type: "date", required: true }, { label: "Time", type: "time", required: true }, { label: "Reason (optional)", type: "textarea" }] },
      ] },
    ] },
    { slug: "messages", label: "Messages", icon: "chat", title: "Messages", modules: [
      { m: "inbox", title: "Care team", reply: "Write to your care team…", items: [
        { title: "Your blood test results", meta: "Dr Rachel Kim · Yesterday", badge: "New", preview: "Your results are back and look normal…", body: ["Hello, your results are back and everything is within the normal range. No action needed — we'll recheck at your annual review."] },
        { title: "Repeat prescription ready", meta: "Pharmacy · Nov 12", preview: "Ready to collect from Monday.", body: ["Your repeat prescription is ready to collect from Monday at the front desk."] },
      ] },
    ] },
    { slug: "appointments", label: "Appointments", icon: "clock", title: "Your appointments", modules: [
      { m: "table", title: "Upcoming and past", columns: ["Visit", "Clinician", "Date", "Time", "Status"], status: 4, filter: 4, tones: { Confirmed: "good", Requested: "warn", Completed: "neutral", Cancelled: "bad" }, rows: [
        ["Follow-up", "Dr Rachel Kim", "Nov 26", "10:30", "Confirmed"], ["Flu vaccination", "Nurse Kelly Lee", "Dec 3", "09:00", "Requested"], ["Blood test", "Nurse Kelly Lee", "Nov 14", "08:15", "Completed"], ["GP consultation", "Dr Samuel Reid", "Oct 30", "15:45", "Completed"],
      ] },
    ] },
  ],
};

export const lms: AppTemplate = {
  slug: "app-learning-platform", name: "Online learning platform", category: "Education", industry: "Online courses", type: "Web app",
  styles: ["Playful", "Warm"], level: "Beginner-friendly", featured: true, added: "2026-11-18",
  tagline: "Courses, lessons, progress and a class schedule for students.",
  description: "A learning platform for a tutoring school: a course catalogue with subject filters, student progress, a weekly live-class timetable and an enrolment form.",
  useCases: ["Sell or share courses", "Let students track progress", "Run live classes"],
  features: ["Course catalogue", "Progress tracking", "Live class timetable", "Enrolment", "Teacher messages"],
  effort: "About 2 hours of agent work", stack: "Next.js, Supabase, video links per lesson",
  keywords: ["lms", "learning", "courses", "students", "school", "education", "elearning", "tutoring", "classes", "teachers", "platform for students"],
  brand: "Your Academy", palette: PAL.amber, shell: "consumer",
  screens: [
    { slug: "courses", label: "Courses", icon: "folder", title: "Courses", modules: [
      { m: "hero", eyebrow: "WAEC · JAMB · IGCSE", title: "Learn at your pace, with teachers who know your exam.", sub: "Short video lessons, practice questions and weekly live classes for secondary school students.", cta: "Browse courses", secondary: "See the timetable", art: "classroom", seed: 2, stats: [["42", "courses"], ["18", "teachers"], ["Weekly", "live classes"]] },
      { m: "catalog", title: "Popular courses", filters: ["Maths", "Sciences", "English", "Exam prep"], action: "Enrol", items: [
        { title: "Further Maths: Calculus", meta: "24 lessons · SS2–SS3", price: "₦15,000", art: "notebook", seed: 1, tag: "Maths", badge: "New" }, { title: "Physics: Waves & Light", meta: "18 lessons · SS2", price: "₦12,000", art: "books", seed: 4, tag: "Sciences" },
        { title: "English: Essay Writing", meta: "12 lessons · All levels", price: "₦9,000", art: "desk", seed: 2, tag: "English" }, { title: "JAMB Use of English", meta: "30 lessons · Exam prep", price: "₦18,000", art: "graduate", seed: 3, tag: "Exam prep" },
        { title: "Chemistry: Organic Basics", meta: "16 lessons · SS2", price: "₦12,000", art: "books", seed: 7, tag: "Sciences" }, { title: "Maths: Algebra Refresher", meta: "14 lessons · JSS3–SS1", price: "₦8,000", art: "notebook", seed: 5, tag: "Maths" },
      ] },
    ] },
    { slug: "progress", label: "My learning", icon: "chart", title: "My learning", modules: [
      { m: "kpis", items: [{ label: "Lessons finished", value: "37" }, { label: "Practice score", value: "78%", delta: "↑ 9 pts this month" }, { label: "Next live class", value: "Thu 4pm", tone: "info" }, { label: "Courses", value: "3" }] },
      { m: "progress", title: "Courses in progress", items: [{ title: "Further Maths: Calculus", meta: "Next: Integration by parts", pct: 62 }, { title: "Physics: Waves & Light", meta: "Next: Refraction", pct: 40 }, { title: "JAMB Use of English", meta: "Next: Lexis and structure", pct: 15 }] },
    ] },
    { slug: "timetable", label: "Live classes", icon: "clock", title: "This week's live classes", modules: [
      { m: "calendar", title: "Timetable", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], events: [
        { day: 0, start: "16:00", end: "17:00", title: "Calculus Q&A", meta: "Mr Walker", tone: "info" }, { day: 1, start: "17:00", end: "18:00", title: "Essay clinic", meta: "Mrs O'Brien", tone: "good" }, { day: 3, start: "16:00", end: "17:30", title: "Waves practical", meta: "Dr Patel", tone: "info" }, { day: 5, start: "10:00", end: "12:00", title: "JAMB mock", meta: "All students", tone: "warn" },
      ] },
    ] },
  ],
};
