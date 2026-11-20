/**
 * Staff roles and what each can open in the back office. The database
 * enforces every action (see the staff_backoffice migration); this only
 * decides which sections to show, so people aren't offered what they can't do.
 */
export type StaffRole = "support" | "security" | "reviewer" | "superadmin";
export const STAFF_ROLES: { id: StaffRole; label: string; summary: string }[] = [
  { id: "support", label: "Support", summary: "Helps customers: organizations, people, owner-approved support access, announcements." },
  { id: "security", label: "Security", summary: "Abuse reports, suspensions, account bans, policy appeals and the staff audit log." },
  { id: "reviewer", label: "Reviewer", summary: "Marketplace submissions and policy appeals." },
  { id: "superadmin", label: "Superadmin", summary: "Everything, plus staff, credits and platform switches." },
];

export type StaffSection = { slug: string; label: string; roles: StaffRole[] | "all" };
export const STAFF_SECTIONS: StaffSection[] = [
  { slug: "", label: "Overview", roles: "all" },
  { slug: "orgs", label: "Organizations", roles: ["support", "security", "superadmin"] },
  { slug: "people", label: "People", roles: ["support", "security", "superadmin"] },
  { slug: "safety", label: "Trust & safety", roles: ["security", "superadmin"] },
  { slug: "policy", label: "Policy appeals", roles: ["reviewer", "security", "superadmin"] },
  { slug: "marketplace", label: "Marketplace", roles: ["reviewer", "superadmin"] },
  { slug: "platform", label: "Announcements & switches", roles: ["support", "superadmin"] },
  { slug: "audit", label: "Audit log", roles: ["security", "superadmin"] },
  { slug: "staff", label: "Staff", roles: "all" },
];

export function isStaffRole(r: unknown): r is StaffRole {
  return typeof r === "string" && STAFF_ROLES.some((x) => x.id === r);
}

export function canOpen(role: StaffRole | null, slug: string): boolean {
  const s = STAFF_SECTIONS.find((x) => x.slug === slug);
  if (!role || !s) return false;
  return s.roles === "all" || s.roles.includes(role);
}

export function sectionsFor(role: StaffRole | null): StaffSection[] {
  return STAFF_SECTIONS.filter((s) => canOpen(role, s.slug));
}

/** Which staff actions a role may take (mirrors the database checks). */
export const CAN = {
  suspend: (r: StaffRole) => r === "security" || r === "superadmin",
  ban: (r: StaffRole) => r === "security" || r === "superadmin",
  adjustCredits: (r: StaffRole) => r === "superadmin",
  manageStaff: (r: StaffRole) => r === "superadmin",
  switches: (r: StaffRole) => r === "superadmin",
  announce: (r: StaffRole) => r === "support" || r === "superadmin",
  supportAccess: (r: StaffRole) => r !== "reviewer",
};

/** Dollars (as typed) to micro-dollars, or null if it isn't a sensible adjustment. */
export function dollarsToMicros(input: string): number | null {
  const t = input.trim().replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(t)) return null;
  const micros = Math.round(Number(t) * 1_000_000);
  if (!micros || Math.abs(micros) > 10_000_000_000) return null;
  return micros;
}

export const REPORT_CATEGORIES = [
  { id: "phishing", label: "Phishing or fake login page" },
  { id: "malware", label: "Malware or harmful downloads" },
  { id: "fraud", label: "Fraud or scam" },
  { id: "harassment", label: "Harassment or threats" },
  { id: "illegal", label: "Illegal content or goods" },
  { id: "copyright", label: "Copyright or trademark" },
  { id: "spam", label: "Spam" },
  { id: "other", label: "Something else" },
] as const;
