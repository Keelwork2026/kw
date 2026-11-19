import Link from "next/link";
import { requireOrg } from "@/lib/org";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { SITE_CATEGORIES } from "@/lib/sites";
import { VOICES } from "@/lib/sites/engine/copy";
import { createSiteDraft } from "../actions";

export const metadata = { title: "Create a website" };

const LANGS = [["en", "English"], ["fr", "Français"], ["es", "Español"], ["de", "Deutsch"], ["pt", "Português"]] as const;

export default async function NewSitePage({ searchParams }: { searchParams: Promise<{ industry?: string }> }) {
  const { can } = await requireOrg();
  const { industry } = await searchParams;
  if (!can("project.write")) return <PageHeader title="Create a website" description="You have read-only access in this workspace. Ask an owner or admin for member access." />;
  return (
    <>
      <PageHeader title="Create a website" description="Tell us about your business. Keelwork writes every page from your answers and leaves clearly marked spaces for details only you know." actions={<Link href="/starters" className="btn btn-secondary">Browse templates</Link>} />
      <ActionForm action={createSiteDraft} submitLabel="Write my website" pendingLabel="Writing your website…" className="grid max-w-3xl gap-6">
        <fieldset className="panel grid gap-4 p-6">
          <legend className="px-1 font-display text-lg font-bold">Your business</legend>
          <div><label className="label" htmlFor="name">Business name</label><input id="name" name="name" required maxLength={80} className="input" placeholder="e.g. Bright Smile Dental" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="industry">Industry</label><select id="industry" name="industry" className="input" defaultValue={SITE_CATEGORIES.find((c) => c === industry) ?? "Corporate & Business"}>{SITE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label" htmlFor="location">Location <span className="font-normal text-muted">(town, city or region)</span></label><input id="location" name="location" maxLength={80} className="input" placeholder="e.g. Leeds" /></div>
          </div>
          <div><label className="label" htmlFor="description">What you do, in a sentence or two</label><textarea id="description" name="description" required minLength={10} maxLength={400} rows={3} className="input" placeholder="A family dental practice offering check-ups, hygiene and cosmetic treatments." /></div>
          <div><label className="label" htmlFor="services">Main products or services <span className="font-normal text-muted">(one per line, up to 8)</span></label><textarea id="services" name="services" required rows={4} maxLength={600} className="input" placeholder={"Check-ups\nHygiene appointments\nTeeth whitening"} /></div>
        </fieldset>
        <fieldset className="panel grid gap-4 p-6">
          <legend className="px-1 font-display text-lg font-bold">Who it&apos;s for and what it should do</legend>
          <div><label className="label" htmlFor="audience">Who are your customers?</label><input id="audience" name="audience" maxLength={160} className="input" placeholder="Families and working professionals" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="goal">Main goal of the website</label><select id="goal" name="goal" className="input" defaultValue="Get enquiries">{["Get enquiries", "Book appointments", "Sell products online", "Request quotes", "Take donations", "Get sign-ups", "Get phone calls", "Book viewings or visits"].map((g) => <option key={g}>{g}</option>)}</select></div>
            <div><label className="label" htmlFor="size">Business size</label><select id="size" name="size" className="input" defaultValue="small"><option value="solo">Just me</option><option value="small">Small team</option><option value="mid">Medium-sized</option><option value="large">Large organisation</option></select></div>
          </div>
          <div><label className="label" htmlFor="purpose">What makes you different? <span className="font-normal text-muted">(optional — only things that are true)</span></label><textarea id="purpose" name="purpose" rows={2} maxLength={300} className="input" placeholder="Unhurried appointments and clear prices before any treatment." /></div>
        </fieldset>
        <fieldset className="panel grid gap-4 p-6">
          <legend className="px-1 font-display text-lg font-bold">Voice and language</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="voice">Brand voice</label><select id="voice" name="voice" className="input" defaultValue="professional">{VOICES.map((v) => <option key={v} value={v}>{v[0]!.toUpperCase() + v.slice(1)}</option>)}</select></div>
            <div><label className="label" htmlFor="lang">Website language</label><select id="lang" name="lang" className="input" defaultValue="en">{LANGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          </div>
          <p className="text-sm text-muted">We never invent facts. Phone numbers, addresses, prices, registration numbers, statistics and reviews appear as highlighted “Add your …” spaces for you to fill in.</p>
        </fieldset>
      </ActionForm>
    </>
  );
}
