import type { BusinessProfile, Lang, Voice } from "../types";

/**
 * Copywriting rules for the content engine. Everything here is derived from
 * what the owner told us — name, services, audience, location, goal — and
 * never adds facts (no years, counts, awards or reviews).
 */
export type Family = "formal" | "friendly" | "luxury" | "bold" | "minimal";

export const VOICE_FAMILY: Record<Voice, Family> = {
  professional: "formal", corporate: "formal", authoritative: "formal", traditional: "formal", technical: "minimal",
  friendly: "friendly", conversational: "friendly", warm: "friendly", playful: "friendly", youthful: "friendly",
  premium: "luxury", luxury: "luxury", elegant: "luxury",
  bold: "bold", innovative: "bold",
  minimalist: "minimal", editorial: "minimal",
};

export const VOICES = Object.keys(VOICE_FAMILY) as Voice[];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const low = (s: string) => (/^[A-Z]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
export const list = (xs: string[], and = "and") => xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${and} ${xs.at(-1)}`;

type L = { and: string; in: string; for: string };
const GLUE: Record<Lang, L> = { en: { and: "and", in: "in", for: "for" }, fr: { and: "et", in: "à", for: "pour" }, es: { and: "y", in: "en", for: "para" }, de: { and: "und", in: "in", for: "für" }, pt: { and: "e", in: "em", for: "para" } };

/** Structural strings, in every supported language. Generated body copy follows the profile language where templates exist. */
export const UI: Record<Lang, Record<string, string>> = {
  en: { services: "What we do", about: "About us", contact: "Get in touch", faq: "Questions", how: "How it works", why: "Why choose us", home: "Home", aboutNav: "About", servicesNav: "Services", contactNav: "Contact", send: "Send message", reply: "We'll reply as soon as we can.", ctaTitle: "Ready when you are", },
  fr: { services: "Nos services", about: "À propos", contact: "Contactez-nous", faq: "Questions fréquentes", how: "Comment ça marche", why: "Pourquoi nous choisir", home: "Accueil", aboutNav: "À propos", servicesNav: "Services", contactNav: "Contact", send: "Envoyer", reply: "Nous vous répondrons dès que possible.", ctaTitle: "Prêts quand vous l'êtes" },
  es: { services: "Lo que hacemos", about: "Sobre nosotros", contact: "Contacto", faq: "Preguntas frecuentes", how: "Cómo funciona", why: "Por qué elegirnos", home: "Inicio", aboutNav: "Nosotros", servicesNav: "Servicios", contactNav: "Contacto", send: "Enviar mensaje", reply: "Te responderemos lo antes posible.", ctaTitle: "Listos cuando tú lo estés" },
  de: { services: "Unsere Leistungen", about: "Über uns", contact: "Kontakt", faq: "Häufige Fragen", how: "So funktioniert es", why: "Warum wir", home: "Start", aboutNav: "Über uns", servicesNav: "Leistungen", contactNav: "Kontakt", send: "Nachricht senden", reply: "Wir antworten so schnell wie möglich.", ctaTitle: "Bereit, wenn Sie es sind" },
  pt: { services: "O que fazemos", about: "Sobre nós", contact: "Fale connosco", faq: "Perguntas frequentes", how: "Como funciona", why: "Porquê escolher-nos", home: "Início", aboutNav: "Sobre", servicesNav: "Serviços", contactNav: "Contacto", send: "Enviar mensagem", reply: "Responderemos o mais breve possível.", ctaTitle: "Prontos quando estiver" },
};

/** Calls to action by what the website is for. */
export function ctaFor(goal: string, lang: Lang = "en"): { label: string; kind: "book" | "shop" | "quote" | "donate" | "signup" | "call" | "contact" | "visit" } {
  const g = goal.toLowerCase();
  const L = (en: string, fr: string, es: string, de: string, pt: string) => ({ en, fr, es, de, pt })[lang];
  if (/book|appoint|reserv|table/.test(g)) return { label: L("Book now", "Réserver", "Reservar", "Jetzt buchen", "Reservar"), kind: "book" };
  if (/shop|buy|sell|order|purchase|store/.test(g)) return { label: L("Shop now", "Acheter", "Comprar", "Jetzt kaufen", "Comprar"), kind: "shop" };
  if (/quote|estimate|tender/.test(g)) return { label: L("Request a quote", "Demander un devis", "Pedir presupuesto", "Angebot anfordern", "Pedir orçamento"), kind: "quote" };
  if (/donat|fund|support us|give/.test(g)) return { label: L("Donate", "Faire un don", "Donar", "Spenden", "Doar"), kind: "donate" };
  if (/sign ?up|trial|waitlist|register|subscribe|download/.test(g)) return { label: L("Get started", "Commencer", "Empezar", "Loslegen", "Começar"), kind: "signup" };
  if (/call|phone/.test(g)) return { label: L("Call us", "Appelez-nous", "Llámanos", "Rufen Sie an", "Ligue-nos"), kind: "call" };
  if (/visit|view|tour/.test(g)) return { label: L("Plan a visit", "Planifier une visite", "Planear una visita", "Besuch planen", "Planear visita"), kind: "visit" };
  return { label: L("Get in touch", "Nous contacter", "Contactar", "Kontakt aufnehmen", "Contactar"), kind: "contact" };
}

/** Headline candidates for the hero. Variant n picks one; all are specific to the profile. */
export function headlines(p: BusinessProfile): string[] {
  const s0 = cap(p.services[0] ?? p.industry.split(" ")[0]!);
  const s = low(s0);
  const g = GLUE[p.lang];
  const aud = p.audience ? low(p.audience) : "";
  const where = p.location ? ` ${g.in} ${p.location}` : "";
  if (p.lang !== "en") return [`${s0}${aud ? ` ${g.for} ${aud}` : ""}${where}`, `${p.name} — ${s}${where}`, `${s0}${where}`];
  switch (VOICE_FAMILY[p.voice]) {
    case "formal": return [`${s0}${aud ? ` for ${aud}` : ""}${where}`, `Clear, dependable ${s}${where}`, `${p.name}: ${s} done properly`, `Expert ${s} for ${aud || "your organisation"}`];
    case "friendly": return [`${s0}, made easy`, `Hello! We're ${p.name}, here for your ${s}`, `${s0}${where}, with a friendly face`, `Your ${s}, sorted`];
    case "luxury": return [`${s0}, considered in every detail`, `The art of ${s}`, `${s0}${where}, beautifully done`, `Quietly exceptional ${s}`];
    case "bold": return [`${s0}. Done differently.`, `Rethink ${s}`, `${s0} without the hassle`, `Better ${s} starts here`];
    case "minimal": return [`${s0}.`, `${s0}${where}.`, `${s0} for ${aud || "people who care"}.`, `${p.name}. ${s0}.`];
  }
}

/** One-paragraph supporting text under the headline. */
export function heroSub(p: BusinessProfile): string {
  const svc = list(p.services.slice(0, 3).map(low), GLUE[p.lang].and);
  if (p.lang !== "en") return `${p.name}${p.location ? ` · ${p.location}` : ""}. ${cap(svc)}.`;
  const base = p.description.trim().replace(/\.$/, "");
  const who = p.audience ? ` for ${low(p.audience)}` : "";
  switch (VOICE_FAMILY[p.voice]) {
    case "friendly": return `${base}. We offer ${svc}${who}${p.location ? ` in and around ${p.location}` : ""} — and we're happy to answer any questions.`;
    case "luxury": return `${base}. ${cap(svc)}, delivered with care${who}.`;
    case "bold": return `${base}. ${cap(svc)}${who} — simple to start, built around you.`;
    case "minimal": return `${base}. ${cap(svc)}.`;
    default: return `${base}. We provide ${svc}${who}${p.location ? ` across ${p.location}` : ""}, with clear communication at every step.`;
  }
}

/** A short, honest description of one service. */
export function serviceBody(service: string, p: BusinessProfile, i: number): string {
  const s = low(service);
  const who = p.audience ? low(p.audience) : "our clients";
  if (p.lang !== "en") return `${cap(s)} — ${p.name}.`;
  const lines: Record<Family, string[]> = {
    formal: [`Tailored ${s} for ${who}, planned with you and delivered to an agreed scope.`, `${cap(s)} with clear timelines, transparent pricing and a single point of contact.`, `We handle ${s} from first conversation to completion, keeping you informed throughout.`],
    friendly: [`${cap(s)} without the jargon — we'll talk it through and find what works for you.`, `Need help with ${s}? We'll make it simple and keep you in the loop.`, `${cap(s)} for ${who}, done with care and a smile.`],
    luxury: [`${cap(s)}, shaped around your preferences and finished to a high standard.`, `A considered approach to ${s}, attentive to every detail.`, `${cap(s)} with a personal, unhurried service.`],
    bold: [`${cap(s)} that gets results you can see.`, `Fast, focused ${s} — no fuss, no filler.`, `${cap(s)} built around what you actually need.`],
    minimal: [`${cap(s)}.`, `${cap(s)}, done well.`, `${cap(s)} for ${who}.`],
  };
  const fam = lines[VOICE_FAMILY[p.voice]];
  return fam[i % fam.length]!;
}

/* ---------- section-level editing tools (deterministic) ---------- */

const SIMPLE: [RegExp, string][] = [
  [/\butili[sz]e\b/gi, "use"], [/\bcommence\b/gi, "start"], [/\bfacilitate\b/gi, "help"], [/\bassistance\b/gi, "help"],
  [/\bapproximately\b/gi, "about"], [/\bpurchase\b/gi, "buy"], [/\bendeavou?r\b/gi, "try"], [/\bin order to\b/gi, "to"],
  [/\bprior to\b/gi, "before"], [/\bsubsequently\b/gi, "then"], [/\bdemonstrate\b/gi, "show"], [/\bnumerous\b/gi, "many"],
  [/\bcomprehensive\b/gi, "complete"], [/\boptimi[sz]e\b/gi, "improve"], [/\bleverage\b/gi, "use"],
];

const FORMAL: [RegExp, string][] = [[/\bwe're\b/gi, "we are"], [/\byou're\b/gi, "you are"], [/\bit's\b/gi, "it is"], [/\bdon't\b/gi, "do not"], [/\bwe'll\b/gi, "we will"], [/\bcan't\b/gi, "cannot"], [/\bHi\b/g, "Hello"], [/!/g, "."], [/\bsorted\b/gi, "taken care of"]];

/** Replace words, keeping a leading capital where the original had one. */
function swap(t: string, rules: [RegExp, string][]): string {
  return rules.reduce((s, [re, r]) => s.replace(re, (m) => (/^[A-Z]/.test(m) ? cap(r) : r)), t);
}

export type TextOp = "shorten" | "expand" | "simplify" | "professional" | "persuasive";

/** Quick, local edits. AI-powered rewrites (tone, language, audience) go through the gateway. */
export function editText(text: string, op: TextOp, p?: BusinessProfile): string {
  const t = text.trim();
  switch (op) {
    case "shorten": {
      const first = t.split(/(?<=[.!?])\s+/)[0]!;
      if (first !== t) return first;
      const words = t.split(/\s+/);
      return words.length > 8 ? `${words.slice(0, Math.ceil(words.length * 0.6)).join(" ").replace(/[,;:—-]+$/, "")}.` : t;
    }
    case "expand": {
      const extra = p ? ` ${p.location ? `Based in ${p.location}, we` : "We"} work with ${p.audience ? low(p.audience) : "people"} who want ${p.services[0] ? low(p.services[0]) : "this"} done properly.` : " Get in touch to find out more.";
      return /[.!?]$/.test(t) ? `${t}${extra}` : `${t}.${extra}`;
    }
    case "simplify": return swap(t, SIMPLE);
    case "professional": return swap(t, FORMAL);
    case "persuasive": {
      if (!p) return t;
      const c = ctaFor(p.goal).label.toLowerCase();
      return /[.!?]$/.test(t) ? `${t} ${cap(c)} today — it only takes a minute.` : `${t}. ${cap(c)} today — it only takes a minute.`;
    }
  }
}

/** Alternative calls to action for the same goal. */
export function ctaAlternatives(p: BusinessProfile): string[] {
  const k = ctaFor(p.goal, p.lang).kind;
  const en: Record<string, string[]> = {
    book: ["Book now", "Check availability", "Reserve your place", "Book an appointment"],
    shop: ["Shop now", "Browse the collection", "See what's new", "Find your favourite"],
    quote: ["Request a quote", "Get a free estimate", "Tell us about your project", "Start your quote"],
    donate: ["Donate", "Give monthly", "Support our work", "Make a gift"],
    signup: ["Get started", "Start free", "Create your account", "Join now"],
    call: ["Call us", "Speak to our team", "Request a callback", "Talk to us"],
    visit: ["Plan a visit", "Book a viewing", "Come and see us", "Arrange a tour"],
    contact: ["Get in touch", "Send us a message", "Ask a question", "Start a conversation"],
  };
  return p.lang === "en" ? en[k]! : [ctaFor(p.goal, p.lang).label];
}
