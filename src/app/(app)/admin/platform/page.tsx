import { requireStaff } from "@/lib/admin/server";
import { CAN } from "@/lib/admin/staff";
import { PageHeader, timeAgo } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { endAnnouncement, publishAnnouncement, setFlag } from "../actions";

export const metadata = { title: "Announcements & switches · back office" };

const FLAG_LABEL: Record<string, string> = { signups_open: "New sign-ups", builds_open: "New builds", marketplace_submissions_open: "Marketplace submissions" };

export default async function AdminPlatform() {
  const { supabase, role } = await requireStaff("platform");
  const [{ data: announcements }, { data: flags }] = await Promise.all([
    supabase.from("platform_announcements").select("id, message, level, starts_at, ends_at, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("platform_flags").select("key, enabled, description, updated_at").order("key"),
  ]);
  const now = Date.now();
  const live = (a: { starts_at: string; ends_at: string | null }) => new Date(a.starts_at).getTime() <= now && (!a.ends_at || new Date(a.ends_at).getTime() > now);
  return (
    <>
      <PageHeader title="Announcements & switches" description="Messages everyone signed in sees, and switches the database enforces for every workspace." />
      <div className="grid gap-6 lg:grid-cols-2">
        {CAN.announce(role) ? (
          <section className="card" aria-labelledby="ann">
            <h2 id="ann" className="text-lg">Publish an announcement</h2>
            <p className="mt-1 text-sm text-muted">Shown at the top of every page in the app. Keep it short and say what people should do.</p>
            <ActionForm action={publishAnnouncement} submitLabel="Publish" className="mt-3 grid gap-3">
              <div><label className="label" htmlFor="message">Message</label><textarea id="message" name="message" required minLength={5} maxLength={300} rows={2} className="input" placeholder="Builds are slower than usual while a model provider recovers." /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="label" htmlFor="level">Kind</label><select id="level" name="level" className="input"><option value="info">Information</option><option value="warning">Warning</option><option value="maintenance">Maintenance</option></select></div>
                <div><label className="label" htmlFor="hours">Show for (hours)</label><input id="hours" name="hours" type="number" min={1} max={720} placeholder="Until I end it" className="input" /></div>
              </div>
            </ActionForm>
          </section>
        ) : null}

        <section className="card" aria-labelledby="sw">
          <h2 id="sw" className="text-lg">Platform switches</h2>
          <p className="mt-1 text-sm text-muted">Enforced in the database, so every path (people, services, OAuth) obeys them.{CAN.switches(role) ? "" : " Only superadmins can change them."}</p>
          <ul className="mt-3 grid gap-3">
            {(flags ?? []).map((f) => (
              <li key={f.key} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{FLAG_LABEL[f.key] ?? f.key}</span><span className={`pill ${f.enabled ? "bg-[#e6fbf1] text-[#0b7a4b]" : "bg-[#fde8e4] text-[#a3281a]"}`}>{f.enabled ? "on" : "off"}</span><span className="text-xs text-muted">changed {timeAgo(f.updated_at)}</span></div>
                <p className="mt-1 text-sm text-muted">{f.description}</p>
                {CAN.switches(role) ? (
                  <ActionForm action={setFlag} submitLabel={f.enabled ? "Switch off" : "Switch on"} submitClassName={`btn min-h-10 ${f.enabled ? "btn-danger" : "btn-primary"}`} className="mt-2 flex flex-wrap items-center gap-2 [&>div]:mt-0" confirm={f.enabled ? `Switch off ${FLAG_LABEL[f.key]} for everyone?` : undefined}>
                    <input type="hidden" name="key" value={f.key} /><input type="hidden" name="enabled" value={f.enabled ? "0" : "1"} />
                    <label className="sr-only" htmlFor={`fr-${f.key}`}>Reason</label><input id={`fr-${f.key}`} name="reason" required minLength={10} maxLength={300} placeholder="Reason (for the audit log)" className="input min-h-10 flex-1" />
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-8" aria-labelledby="hist">
        <h2 id="hist" className="text-lg">Recent announcements</h2>
        {announcements?.length ? (
          <ul className="mt-3 grid gap-2">{announcements.map((a) => (
            <li key={a.id} className="panel flex flex-wrap items-center gap-3 p-4">
              <span className={`pill ${live(a) ? "bg-[#e6fbf1] text-[#0b7a4b]" : "bg-surface-2"}`}>{live(a) ? "showing" : "ended"}</span><span className="pill bg-surface-2">{a.level}</span>
              <span className="min-w-0 flex-1 text-sm">{a.message}</span>
              <span className="text-xs text-muted">{timeAgo(a.created_at)}{a.ends_at && live(a) ? ` · until ${new Date(a.ends_at).toLocaleString("en-GB")}` : ""}</span>
              {live(a) && CAN.announce(role) ? <ActionForm action={endAnnouncement} submitLabel="End now" submitClassName="btn btn-secondary min-h-9 px-3 text-sm" className="[&>div]:mt-0"><input type="hidden" name="id" value={a.id} /></ActionForm> : null}
            </li>
          ))}</ul>
        ) : <p className="mt-2 text-sm text-muted">None yet.</p>}
      </section>
    </>
  );
}
