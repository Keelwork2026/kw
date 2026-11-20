import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { REPORT_CATEGORIES } from "@/lib/admin/staff";
import { submitReport } from "./actions";

export const metadata = { title: "Report abuse", description: "Report a site or app built with Keelwork that's being used for phishing, fraud, malware or other harm." };

export default function ReportPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">Trust & safety</p>
      <h1 className="mt-2 text-4xl">Report abuse</h1>
      <p className="mt-3 text-muted">Seen a site or app built with Keelwork that&apos;s used for phishing, fraud, malware or other harm? Tell us. Our team reviews every report. We act on what software <em>does</em> — not on opinions or topics people disagree with (see our <Link href="/acceptable-use" className="font-semibold text-accent">acceptable use policy</Link>).</p>
      <ActionForm action={submitReport} submitLabel="Send report" submitClassName="btn btn-gradient" className="card mt-8 grid gap-4">
        <div><label className="label" htmlFor="category">What&apos;s the problem?</label>
          <select id="category" name="category" required defaultValue="" className="input"><option value="" disabled>Choose one</option>{REPORT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div><label className="label" htmlFor="url">Address of the page (if you have it)</label><input id="url" name="url" type="url" maxLength={500} placeholder="https://" className="input" /></div>
        <div><label className="label" htmlFor="details">What happened?</label><textarea id="details" name="details" required minLength={10} maxLength={2000} rows={5} className="input" placeholder="What you saw, and why it's harmful. Don't include passwords or card numbers." /></div>
        <div><label className="label" htmlFor="contact">Your email (optional)</label><input id="contact" name="contact" type="email" maxLength={200} className="input" /><p className="mt-1 text-xs text-muted">Only so we can ask follow-up questions. Never shared with the site&apos;s owner.</p></div>
        <div aria-hidden className="hidden"><label htmlFor="website">Leave empty</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      </ActionForm>
    </section>
  );
}
