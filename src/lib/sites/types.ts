/**
 * Website templates are data: a brand, a palette, typography and pages made
 * of sections. One renderer draws every template, so each site is a real,
 * clickable, multi-page website — and the same data is the brief the agents
 * build from when someone uses the template.
 */
export type ArtKind =
  | "dish" | "drinks" | "dining-room" | "chef"
  | "house" | "apartment" | "living-room" | "skyline" | "office" | "meeting"
  | "construction" | "crane" | "bridge" | "blueprint"
  | "bottle" | "shoe" | "dress" | "bag" | "ceramic" | "rack" | "model"
  | "classroom" | "books" | "campus" | "graduate"
  | "clinic" | "doctor" | "care"
  | "mountain" | "beach" | "old-town" | "plane"
  | "stage" | "crowd" | "venue"
  | "hands" | "river" | "garden"
  | "card" | "growth" | "vault"
  | "laptop" | "phone" | "dashboard"
  | "portrait" | "team" | "desk" | "notebook" | "abstract" | "map";

export type Img = { art: ArtKind; alt: string; seed?: number };
export type Link = { label: string; href: string };
export type Icon = "spark" | "shield" | "chart" | "clock" | "leaf" | "heart" | "star" | "users" | "pin" | "phone" | "mail" | "bolt" | "globe" | "lock" | "check" | "cup" | "home" | "tool" | "book" | "plane" | "ticket" | "card" | "gift" | "sun" | "truck" | "chat";

export type Card = { title: string; meta?: string; body?: string; img?: Img; price?: string; href?: string; badge?: string; tags?: string[]; facts?: string[] };

export type Section = SectionBody & { id?: string };

type SectionBody =
  | { t: "hero"; v: "split" | "center" | "full" | "search" | "editorial"; eyebrow?: string; title: string; sub: string; ctas: Link[]; img?: Img; stats?: [string, string][]; search?: { placeholder: string; fields: string[] } }
  | { t: "logos"; title: string; items: string[]; sample?: boolean }
  | { t: "stats"; title?: string; items: [string, string][]; v?: "band" | "cards"; sample?: boolean }
  | { t: "features"; title: string; sub?: string; items: { icon: Icon; title: string; body: string }[]; v?: "cards" | "list" | "icons"; cols?: 2 | 3 | 4 }
  | { t: "split"; eyebrow?: string; title: string; body: string[]; bullets?: string[]; img: Img; reverse?: boolean; cta?: Link }
  | { t: "cards"; title: string; sub?: string; v: "product" | "property" | "project" | "article" | "course" | "tour" | "person" | "event" | "service" | "plain"; items: Card[]; cols?: 2 | 3 | 4; more?: Link; filters?: string[] }
  | { t: "menu"; title: string; sub?: string; groups: { name: string; items: { name: string; desc: string; price: string; tags?: string[] }[] }[] }
  | { t: "gallery"; title: string; sub?: string; items: Img[] }
  | { t: "testimonials"; title: string; items: { quote: string; name: string; role: string }[]; sample?: boolean }
  | { t: "pricing"; title: string; sub?: string; plans: { name: string; price: string; per: string; blurb: string; features: string[]; cta: Link; featured?: boolean }[] }
  | { t: "faq"; title: string; items: [string, string][] }
  | { t: "cta"; title: string; sub: string; ctas: Link[]; img?: Img }
  | { t: "newsletter"; title: string; sub: string; button: string }
  | { t: "contact"; title: string; sub: string; details: [string, string][]; fields: string[]; hours?: [string, string][]; button: string }
  | { t: "steps"; title: string; sub?: string; items: { title: string; body: string }[] }
  | { t: "timeline"; title: string; items: { year: string; title: string; body: string }[] }
  | { t: "team"; title: string; sub?: string; items: { name: string; role: string; bio?: string }[] }
  | { t: "schedule"; title: string; days: { day: string; sessions: { time: string; title: string; who: string; room: string }[] }[] }
  | { t: "detail"; v: "product" | "property" | "project" | "course" | "tour" | "doctor"; title: string; sub: string; img: Img; gallery?: Img[]; price?: string; facts: [string, string][]; body: string[]; highlights?: string[]; cta: Link; secondary?: Link; options?: { name: string; values: string[] } }
  | { t: "article"; title: string; meta: string; img: Img; body: string[]; quote?: string }
  | { t: "rates"; title: string; sub?: string; cols: string[]; rows: string[][]; note: string }
  | { t: "booking"; title: string; sub: string; kind: "table" | "appointment" | "tour" | "ticket" | "visit"; fields: { label: string; type: "date" | "time" | "select" | "text" | "email" | "tel" | "number"; options?: string[] }[]; button: string; aside: string[] }
  | { t: "donate"; title: string; sub: string; amounts: number[]; impact: [string, string][] }
  | { t: "cart" }
  | { t: "checkout" }
  | { t: "account" };

/** SEO for one page. title/description are what search engines show; og* are for social sharing. */
export type Seo = { title: string; description: string; keywords: string[]; ogTitle?: string; ogDescription?: string; canonical?: string };

export type Page = { slug: string; nav: string; title: string; description: string; seo?: Partial<Seo>; inNav?: boolean; sections: Section[] };

export type Footer = {
  blurb: string;
  columns: { title: string; links: Link[] }[];
  contact: [string, string][];
  social: ("instagram" | "facebook" | "linkedin" | "x" | "youtube" | "tiktok" | "pinterest")[];
  newsletter?: { title: string; button: string };
  legal: string;
};

export type Category =
  | "Corporate & Business" | "Technology & SaaS" | "Finance & Banking" | "Restaurant & Hospitality" | "Fashion & Beauty"
  | "E-commerce" | "Real Estate" | "Education" | "Healthcare" | "Travel & Tourism" | "Construction & Engineering"
  | "Creative & Portfolio" | "Events" | "Nonprofit" | "Personal Websites" | "Landing Pages" | "Blogs & Publications";

export type Palette = { bg: string; surface: string; ink: string; muted: string; accent: string; accent2: string; soft: string; line: string; onAccent: string };

export type Voice = "professional" | "corporate" | "premium" | "luxury" | "friendly" | "conversational" | "minimalist" | "bold" | "innovative" | "technical" | "editorial" | "playful" | "traditional" | "elegant" | "youthful" | "authoritative" | "warm";

export type Lang = "en" | "fr" | "es" | "de" | "pt";

/**
 * What the content engine knows about the business. Facts that can't be
 * invented (phone, address, licence numbers, statistics, reviews) stay as
 * [[placeholders]] until the owner fills them in.
 */
export type BusinessProfile = {
  name: string;
  industry: Category;
  description: string;
  services: string[];
  audience: string;
  location: string;
  purpose: string;
  goal: string;
  voice: Voice;
  size?: "solo" | "small" | "mid" | "large";
  lang: Lang;
};

/**
 * Text can carry [[placeholders]] — e.g. [[phone]], [[email]], [[address]],
 * [[licence]], [[years]] — for facts only the owner can supply. The renderer
 * shows them as clearly marked "Add your …" chips.
 */
export type Site = {
  slug: string;
  voice?: Voice;
  lang?: Lang;
  profile?: BusinessProfile;
  name: string;
  category: Category;
  style: string;
  tagline: string;
  description: string;
  palette: Palette;
  fonts: { display: "serif" | "grotesk" | "sans" | "mono"; body: "sans" | "serif" };
  logo: { mark: "circle" | "square" | "diamond" | "arch" | "wave" | "stack"; word: string };
  radius: "none" | "soft" | "round";
  announcement?: string;
  primaryCta: Link;
  pages: Page[];
  footer: Footer;
};
