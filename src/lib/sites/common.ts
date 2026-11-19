import type { Footer, Link, Page, Section } from "./types";

/**
 * Shared building blocks for templates: legal pages written in plain
 * English (with placeholders for the details only the owner knows), and a
 * standard footer shape. Legal pages are a starting point, not legal
 * advice — the page says so.
 */
export function legalPages(name: string, o: { cookies?: boolean; extra?: string[] } = {}): Page[] {
  const pages: Page[] = [
    {
      slug: "privacy", nav: "Privacy", inNav: false, title: "Privacy policy", description: `How ${name} collects, uses and protects personal information.`,
      sections: [{ t: "article", title: "Privacy policy", meta: "Last updated [[date:date of last review]]", img: { art: "vault", alt: "Illustration of a secure vault" }, body: [
        `${name} ("we", "us") is responsible for the personal information you share with us through this website. This policy explains what we collect, why, how long we keep it and the choices you have.`,
        "What we collect: the details you give us when you contact us, book, buy or subscribe — usually your name, email address, phone number and the content of your message — and basic technical information such as the pages you visit, collected only if you allow analytics cookies.",
        "Why we use it: to reply to you, to provide what you asked for, to meet our legal and accounting obligations, and — only with your consent — to send occasional updates. We never sell your personal information.",
        ...(o.extra ?? []),
        "Who we share it with: the service providers that help us run this website (for example hosting, email and, where relevant, payments), under contracts that require them to protect it. We share information with authorities only when the law requires it.",
        "How long we keep it: only as long as we need it for the purpose it was collected, or as long as the law requires. Enquiries are normally deleted after [[retention:retention period]].",
        "Your rights: you can ask to see, correct or delete the information we hold about you, object to how we use it, or withdraw consent at any time. Email [[email]] and we will respond within one month. You can also complain to your local data protection authority.",
        "Contact: [[address]] · [[email]].",
      ], quote: "We collect only what we need, and we never sell your personal information." }],
    },
    {
      slug: "terms", nav: "Terms", inNav: false, title: "Terms of use", description: `The terms that apply when you use the ${name} website.`,
      sections: [{ t: "article", title: "Terms of use", meta: "Last updated [[date:date of last review]]", img: { art: "notebook", alt: "Illustration of an open notebook" }, body: [
        `These terms apply to your use of this website, operated by ${name}, registered at [[address]] ([[reg]]). By using the site you agree to them.`,
        "Using the site: you may browse, share and print pages for personal, non-commercial use. Please don't misuse the site — for example by trying to break its security or by copying its content wholesale.",
        "Information on the site: we work to keep everything accurate and up to date, but the content is general information and may change. Where a page describes prices, availability or services, the details confirmed to you in writing take precedence.",
        "Links to other sites: we're not responsible for the content of websites we link to.",
        "Liability: nothing in these terms limits liability that cannot be limited by law. Otherwise, we are not liable for losses arising from use of the website itself.",
        "Changes and law: we may update these terms; the date above shows the latest version. These terms are governed by the laws of [[jurisdiction:country or jurisdiction]].",
      ] }],
    },
  ];
  if (o.cookies !== false) pages.push({
    slug: "cookies", nav: "Cookies", inNav: false, title: "Cookie policy", description: `Which cookies the ${name} website uses and how to control them.`,
    sections: [
      { t: "article", title: "Cookie policy", meta: "Last updated [[date:date of last review]]", img: { art: "abstract", alt: "Abstract illustration", seed: 4 }, body: [
        "Cookies are small files a website stores in your browser. We use as few as possible and ask before using any that aren't essential.",
        "You can change your choice at any time with the “Cookie preferences” link at the bottom of every page, or by clearing cookies in your browser.",
      ] },
      { t: "rates", title: "Cookies we use", cols: ["Cookie", "Purpose", "Type", "Duration"], rows: [
        ["Consent", "Remembers your cookie choice", "Essential", "12 months"],
        ["Session", "Keeps forms and baskets working as you browse", "Essential", "Until you close the browser"],
        ["Analytics", "Counts visits and popular pages, without identifying you", "Optional — only with consent", "13 months"],
      ], note: "Essential cookies can't be switched off because the site doesn't work without them." },
    ],
  });
  return pages;
}

export function footer(o: {
  blurb: string;
  columns: { title: string; links: Link[] }[];
  contact?: [string, string][];
  social: Footer["social"];
  newsletter?: { title: string; button: string };
  legalName: string;
  reg?: string;
}): Footer {
  return {
    blurb: o.blurb,
    columns: o.columns,
    contact: o.contact ?? [["Phone", "[[phone]]"], ["Email", "[[email]]"], ["Visit", "[[address]]"]],
    social: o.social,
    newsletter: o.newsletter,
    legal: `© ${new Date().getFullYear()} ${o.legalName}.${o.reg ? ` ${o.reg}` : ""}`,
  };
}

/** A standard contact page: form, details, hours and a closing FAQ. */
export function contactPage(o: { title: string; sub: string; fields?: string[]; hours?: [string, string][]; faq?: [string, string][]; button?: string; extra?: Section[]; description: string }): Page {
  return {
    slug: "contact", nav: "Contact", title: "Contact", description: o.description,
    sections: [
      { t: "contact", title: o.title, sub: o.sub, details: [["Phone", "[[phone]]"], ["Email", "[[email]]"], ["Address", "[[address]]"]], fields: o.fields ?? ["Your name", "Email", "Phone (optional)", "How can we help?"], hours: o.hours, button: o.button ?? "Send message" },
      ...(o.extra ?? []),
      ...(o.faq ? [{ t: "faq", title: "Before you get in touch", items: o.faq } as Section] : []),
    ],
  };
}
