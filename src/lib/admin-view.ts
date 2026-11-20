/** Pure helpers for the staff portal's lists (filtering, sorting, grant state). */
export type AdminOrg = { id: string; name: string; plan_key: string; member_count: number; project_count: number; created_at: string; suspended_at?: string | null; last_active?: string | null };
export type OrgSort = "newest" | "oldest" | "projects" | "members" | "name";
export const ORG_SORTS: { value: OrgSort; label: string }[] = [
  { value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "projects", label: "Most projects" },
  { value: "members", label: "Most members" }, { value: "name", label: "Name" },
];

export function filterOrgs(orgs: AdminOrg[], o: { q?: string; plan?: string; sort?: string; state?: string }): AdminOrg[] {
  const q = (o.q ?? "").trim().toLowerCase().slice(0, 100);
  const sort = (ORG_SORTS.some((s) => s.value === o.sort) ? o.sort : "newest") as OrgSort;
  const out = orgs.filter((x) => (!q || x.name.toLowerCase().includes(q) || x.id.startsWith(q)) && (!o.plan || x.plan_key === o.plan)
    && (o.state !== "suspended" || Boolean(x.suspended_at)) && (o.state !== "active" || !x.suspended_at));
  const by: Record<OrgSort, (a: AdminOrg, b: AdminOrg) => number> = {
    newest: (a, b) => b.created_at.localeCompare(a.created_at),
    oldest: (a, b) => a.created_at.localeCompare(b.created_at),
    projects: (a, b) => Number(b.project_count) - Number(a.project_count),
    members: (a, b) => Number(b.member_count) - Number(a.member_count),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return [...out].sort(by[sort]);
}

export type GrantView = "active" | "waiting" | "ended";
/** An approved grant past its expiry has ended even if its status hasn't been swept yet. */
export function grantView(g: { status: string; expires_at: string | null }, now: Date): GrantView {
  // Support grants are "requested" until an owner decides.
  if (g.status === "requested" || g.status === "pending") return "waiting";
  if (g.status === "approved" && g.expires_at && new Date(g.expires_at) > now) return "active";
  return "ended";
}

export function timeLeft(expires: string | null, now: Date): string | null {
  if (!expires) return null;
  const ms = new Date(expires).getTime() - now.getTime();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h ? `${h} h ${m} min left` : `${m} min left`;
}
