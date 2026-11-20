"use client";
import { useEffect, useState } from "react";

const PROMPTS = [
  "A booking app for my yoga studio with class passes and card payments",
  "A portfolio with case-study pages and a contact form",
  "A habit tracker that sends me a gentle nudge every evening",
  "An online shop for my handmade ceramics",
  "A client portal where customers upload files and track progress",
];

const CHIPS = [
  { label: "Booking app", color: "#ff5c8a", text: "A booking app with time slots, reminders and payments" },
  { label: "Portfolio", color: "#8b6cff", text: "A portfolio with case-study pages and a contact form" },
  { label: "SaaS dashboard", color: "#ff8a4c", text: "A SaaS dashboard with sign-in, teams and usage charts" },
  { label: "Online shop", color: "#3fb37f", text: "An online shop with a catalogue, cart and checkout" },
  { label: "Habit tracker", color: "#ffc46b", text: "A habit tracker with streaks and an evening nudge" },
  { label: "Generate Image", color: "#38a3ff", text: "An AI image generator: describe a picture, choose a style and size, and save the results to a gallery" },
  { label: "Generate Video", color: "#c45cff", text: "An AI video generator: describe a short clip or start from an image, then preview and download it" },
];

/** The homepage prompt. Submitting carries the idea through sign-up into the first project. */
export function HeroPrompt() {
  const [value, setValue] = useState("");
  const [ghost, setGhost] = useState("");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (value) return;
    if (reduced) { setGhost(PROMPTS[0]!); return; }
    let p = 0, i = 0, deleting = false;
    const id = window.setInterval(() => {
      const target = PROMPTS[p]!;
      if (!deleting) { i++; if (i > target.length + 24) deleting = true; }
      else { i -= 2; if (i <= 0) { deleting = false; p = (p + 1) % PROMPTS.length; i = 0; } }
      setGhost(target.slice(0, Math.max(0, Math.min(i, target.length))));
    }, 45);
    return () => window.clearInterval(id);
  }, [value, reduced]);

  return (
    <form action="/sign-up" method="get" className="mx-auto mt-10 w-full max-w-3xl">
      <div className="relative rounded-[28px] border border-border bg-surface p-3 text-left shadow-[0_40px_90px_-40px_rgba(199,37,78,0.35)]">
        <label htmlFor="hero-prompt" className="sr-only">Describe the app you want to build</label>
        <textarea
          id="hero-prompt"
          name="prompt"
          rows={3}
          maxLength={2000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full resize-none rounded-2xl bg-transparent p-3 text-lg outline-none"
        />
        {!value ? (
          <div aria-hidden className="pointer-events-none absolute left-6 top-6 right-6 text-lg text-muted">
            {ghost}<span className="kw-caret">▍</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <p className="text-xs text-muted">Keelwork plans first. Nothing is built until you approve.</p>
          <button type="submit" className="btn btn-gradient">Start building</button>
        </div>
      </div>
      <ul className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Example ideas">
        {CHIPS.map((c) => (
          <li key={c.label}>
            <button type="button" onClick={() => setValue(c.text)} className="pill min-h-11 border border-border bg-surface px-4 text-sm">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.label}
            </button>
          </li>
        ))}
      </ul>
    </form>
  );
}
