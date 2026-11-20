"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./icons";
import { ThemeSwitch } from "./theme-switch";
import { QuickStart } from "./quick-start";
import type { FormAction } from "./action-form";

type Experience = "new" | "some" | "developer";
type Kind = "website" | "web-app" | "dashboard" | "ai-tool" | "saas" | "unsure";

const EXPERIENCE: { value: Experience; title: string; body: string }[] = [
  { value: "new", title: "I'm new to building apps", body: "Plain-language guidance, with menu hints on." },
  { value: "some", title: "I've built a few things", body: "Menu hints on; switch them off when you know your way." },
  { value: "developer", title: "I'm a developer", body: "Menu hints off. Code, logs and git history are one click away." },
];

const KINDS: { value: Kind; label: string; icon: IconName }[] = [
  { value: "website", label: "A website", icon: "globe" },
  { value: "web-app", label: "A web app", icon: "layout" },
  { value: "dashboard", label: "A dashboard", icon: "chart" },
  { value: "ai-tool", label: "An AI tool", icon: "sparkles" },
  { value: "saas", label: "A SaaS product", icon: "rocket" },
  { value: "unsure", label: "Not sure yet", icon: "search" },
];

type Feature = { icon: IconName; title: string; body: string; href: string };
const F: Record<string, Feature> = {
  sites: { icon: "globe", title: "Website writer", body: "Answer a few questions; get every page written, ready to edit and export.", href: "/sites" },
  design: { icon: "edit", title: "Design mode", body: "Click anything in the live preview and describe the change.", href: "/design" },
  database: { icon: "database", title: "Database Studio", body: "Tables, security policies and migrations — reviewed before they run.", href: "/database" },
  backend: { icon: "code", title: "Backend Studio", body: "API routes and server actions, with the code to read and edit.", href: "/backend" },
  qa: { icon: "flask", title: "Testing & QA", body: "Pages, security, accessibility and layout checked, with evidence.", href: "/testing" },
  deploy: { icon: "rocket", title: "Deploy", body: "To your own Cloudflare or Vercel account, with one-click rollback.", href: "/deployments" },
  automations: { icon: "workflow", title: "Automations", body: "Schedules and webhooks that send reports, sync data and clean up.", href: "/automation" },
  integrations: { icon: "plug", title: "Integrations & secrets", body: "Connect AI providers, payments and email with keys encrypted at rest.", href: "/integrations" },
  team: { icon: "users", title: "Team & roles", body: "Invite people as owners, members, billing or viewers.", href: "/team" },
  templates: { icon: "layers", title: "Templates", body: "Start from a reviewed brief instead of a blank page.", href: "/templates" },
};
const FOR_KIND: Record<Kind, Feature[]> = {
  website: [F.sites!, F.design!, F.deploy!],
  "web-app": [F.database!, F.backend!, F.qa!],
  dashboard: [F.database!, F.automations!, F.qa!],
  "ai-tool": [F.integrations!, F.backend!, F.qa!],
  saas: [F.database!, F.team!, F.deploy!],
  unsure: [F.templates!, F.sites!, F.qa!],
};
const KIND_TO_IDEA: Partial<Record<Kind, string>> = { website: "website", "web-app": "web-app", dashboard: "dashboard", "ai-tool": "ai-tool", saas: "saas" };

const STEPS = ["Welcome", "About you", "Personalise", "What you'll build", "Start"] as const;
const HINTS_KEY = "kw.menu.hints";

/**
 * Five short steps, every one skippable: what Keelwork does, who you are
 * (only what changes the experience), your workspace and theme, the
 * features that fit what you want to build, and your first project.
 */
export function Onboarding({ initial, canRenameOrg, carry, quickStart, complete }: {
  initial: { displayName: string; experience: Experience | null; orgName: string };
  canRenameOrg: boolean;
  carry: { prompt?: string; template?: string; name?: string };
  quickStart: FormAction;
  complete: (input: { displayName?: string; experience?: string; orgName?: string }) => Promise<{ ok: boolean; message?: string }>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial.displayName);
  const [experience, setExperience] = useState<Experience | null>(initial.experience);
  const [orgName, setOrgName] = useState(initial.orgName);
  const [hints, setHints] = useState<boolean | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus(); }, [step]);
  const hintsOn = hints ?? experience !== "developer";

  const saveHints = () => { try { localStorage.setItem(HINTS_KEY, hintsOn ? "1" : "0"); } catch { /* storage unavailable */ } };
  // "Skip for now" saves nothing but the fact that onboarding was offered; "Finish" saves the answers.
  const finish = (then: "start" | "dashboard") => start(async () => {
    setError(null);
    const r = await complete(then === "dashboard" ? {} : { displayName: name, experience: experience ?? undefined, orgName: canRenameOrg ? orgName : undefined });
    if (then === "start") saveHints();
    if (!r.ok) { setError(r.message ?? "Something went wrong."); return; }
    if (then === "dashboard") router.push("/dashboard"); else setStep(4);
  });

  // A template chosen before sign-up goes straight to its brief.
  const templateHref = carry.template ? `/new-project?${new URLSearchParams({ template: carry.template, ...(carry.name ? { name: carry.name } : {}), ...(carry.prompt ? { prompt: carry.prompt } : {}) })}` : null;

  return (
    <div className="kw-fade">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
          <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
            <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: "var(--grad-art)" }} />
          </div>
        </div>
        {step < 4 ? <button type="button" disabled={pending} onClick={() => finish("dashboard")} className="text-sm font-semibold text-muted hover:text-text hover:underline">Skip for now</button>
          : <Link href="/dashboard" className="text-sm font-semibold text-muted hover:text-text hover:underline">Go to the dashboard</Link>}
      </div>

      <section className="rounded-3xl border border-border bg-surface p-6 shadow-[0_30px_80px_-50px_rgba(11,31,58,0.35)] sm:p-10" aria-labelledby="onb-title">
        {step === 0 ? (
          <>
            <h1 id="onb-title" ref={heading} tabIndex={-1} className="font-display text-3xl font-bold outline-none sm:text-4xl">Welcome{initial.displayName ? `, ${initial.displayName}` : ""}.</h1>
            <p className="mt-3 max-w-xl text-muted">Keelwork builds real apps from a description. You stay in charge: specialist agents propose a plan, you approve it, and you can see every file they write.</p>
            <ol className="mt-8 grid gap-3 sm:grid-cols-4">
              {([["chat", "Describe", "Say what you want in plain words."], ["success", "Approve", "Review the plan before anything is built."], ["flask", "Test", "Checks run in a private sandbox."], ["rocket", "Ship", "Deploy to your own hosting account."]] as [IconName, string, string][]).map(([icon, t, b], i) => (
                <li key={t} className="rounded-2xl border border-border bg-bg p-4">
                  <span className="kw-empty-icon !h-10 !w-10 !rounded-xl"><Icon name={icon} size={20} /></span>
                  <p className="mt-3 text-xs font-bold text-muted">{i + 1}</p>
                  <p className="font-semibold">{t}</p>
                  <p className="mt-1 text-sm text-muted">{b}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-muted">Four quick questions, about a minute. Every one is optional.</p>
          </>
        ) : step === 1 ? (
          <>
            <h1 id="onb-title" ref={heading} tabIndex={-1} className="font-display text-3xl font-bold outline-none">A little about you</h1>
            <p className="mt-2 text-muted">Only what changes your experience.</p>
            <div className="mt-6 max-w-sm">
              <label className="label" htmlFor="onb-name">What should we call you?</label>
              <input id="onb-name" className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
            <fieldset className="mt-6">
              <legend className="label">How much have you built before?</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {EXPERIENCE.map((x) => (
                  <label key={x.value} className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition ${experience === x.value ? "border-accent bg-soft-accent" : "border-border bg-bg hover:border-accent"}`}>
                    <input type="radio" name="experience" value={x.value} checked={experience === x.value} onChange={() => setExperience(x.value)} className="sr-only" />
                    <span className="font-semibold">{x.title}</span>
                    <span className="mt-1 text-sm text-muted">{x.body}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="mt-4 text-xs text-muted">This only sets how much guidance you see. Change it any time in Settings.</p>
          </>
        ) : step === 2 ? (
          <>
            <h1 id="onb-title" ref={heading} tabIndex={-1} className="font-display text-3xl font-bold outline-none">Make it yours</h1>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="onb-org">Workspace name</label>
                <input id="onb-org" className="input" value={orgName} maxLength={80} onChange={(e) => setOrgName(e.target.value)} disabled={!canRenameOrg} aria-describedby="onb-org-hint" />
                <p id="onb-org-hint" className="mt-1 text-xs text-muted">{canRenameOrg ? "Shown to anyone you invite. A business name works well." : "Only owners and admins can rename this workspace."}</p>
              </div>
              <div>
                <p className="label">Theme</p>
                <ThemeSwitch />
                <p className="mt-1 text-xs text-muted">Applies straight away.</p>
              </div>
            </div>
            <label className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-bg p-4">
              <input type="checkbox" className="mt-1" checked={hintsOn} onChange={(e) => setHints(e.target.checked)} />
              <span><span className="font-semibold">Show hints in the menu</span><span className="block text-sm text-muted">A short line under each menu entry explaining what it does. You can switch it off later from the menu. {experience === "developer" ? "Off by default for developers." : "Recommended while you find your way around."}</span></span>
            </label>
          </>
        ) : step === 3 ? (
          <>
            <h1 id="onb-title" ref={heading} tabIndex={-1} className="font-display text-3xl font-bold outline-none">What will you build first?</h1>
            <p className="mt-2 text-muted">We&apos;ll point you at the parts of Keelwork that matter for it.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="What you'll build">
              {KINDS.map((k) => (
                <button key={k.value} type="button" role="radio" aria-checked={kind === k.value} onClick={() => setKind(k.value)}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left font-semibold transition ${kind === k.value ? "border-accent bg-soft-accent text-soft-accent-ink" : "border-border bg-bg hover:border-accent"}`}>
                  <Icon name={k.icon} />{k.label}
                </button>
              ))}
            </div>
            {kind ? (
              <div className="kw-fade mt-8">
                <h2 className="text-lg">Useful for {KINDS.find((k) => k.value === kind)!.label.toLowerCase()}</h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                  {FOR_KIND[kind].map((f) => (
                    <li key={f.title} className="rounded-2xl border border-border bg-bg p-4">
                      <Icon name={f.icon} className="text-accent" />
                      <p className="mt-2 font-semibold">{f.title}</p>
                      <p className="mt-1 text-sm text-muted">{f.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h1 id="onb-title" ref={heading} tabIndex={-1} className="font-display text-3xl font-bold outline-none">You&apos;re set up{name ? `, ${name}` : ""}.</h1>
            <p className="mt-2 text-muted">Start your first project now — or look around first. Nothing is built until you approve a plan.</p>
            <div className="mt-6">
              {templateHref ? (
                <Link href={templateHref} className="btn btn-gradient">Continue with your template <span aria-hidden>→</span></Link>
              ) : (
                <QuickStart action={quickStart} heading="Describe your first project" defaultIdea={carry.prompt ?? ""} defaultKind={kind ? KIND_TO_IDEA[kind] ?? "" : ""} />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/templates#starters" className="btn btn-secondary"><Icon name="layers" size={18} className="mr-1.5" />Browse templates</Link>
              <Link href="/sites/new" className="btn btn-secondary"><Icon name="globe" size={18} className="mr-1.5" />Write a website instead</Link>
            </div>
          </>
        )}

        {error ? <p role="alert" className="mt-4 text-sm font-semibold text-danger">{error}</p> : null}

        {step < 4 ? (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
            {step > 0 ? <button type="button" onClick={() => setStep(step - 1)} className="btn btn-secondary">Back</button> : <span />}
            <button type="button" disabled={pending} onClick={() => (step === 3 ? finish("start") : setStep(step + 1))} className="btn btn-gradient">
              {pending ? "Saving…" : step === 0 ? "Get started" : step === 3 ? "Finish" : "Continue"} <span aria-hidden>→</span>
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
