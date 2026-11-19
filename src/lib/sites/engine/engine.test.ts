import { test } from "node:test";
import assert from "node:assert/strict";
import type { BusinessProfile } from "../types";
import { SITE_CATEGORIES } from "../index";
import { qaSite } from "../qa";
import { generateSite, regenerateSection, slugify } from "./generate";
import { ctaAlternatives, ctaFor, editText, headlines, VOICES } from "./copy";

const profile: BusinessProfile = {
  name: "Bright Smile Dental", industry: "Healthcare", description: "A family dental practice offering check-ups, hygiene and cosmetic treatments",
  services: ["Check-ups", "Hygiene appointments", "Teeth whitening", "Emergency appointments"], audience: "Families and working professionals",
  location: "Leeds", purpose: "We want every visit to feel calm and unhurried.", goal: "Book appointments", voice: "warm", lang: "en",
};

test("generates a complete, personalised site that passes template QA", () => {
  const s = generateSite(profile);
  assert.equal(s.name, "Bright Smile Dental");
  assert.equal(s.slug, "bright-smile-dental");
  assert.ok(!JSON.stringify(s).includes("Willow Clinic"), "blueprint brand fully replaced");
  const hero = s.pages[0]!.sections.find((x) => x.t === "hero")!;
  assert.ok(hero.t === "hero" && /check-ups/i.test(hero.title + hero.sub));
  assert.equal(s.primaryCta.label, "Book now");
  assert.equal(s.primaryCta.href, "/appointments");
  assert.deepEqual(qaSite(s), []);
  for (const p of s.pages) { assert.ok(p.seo?.title && p.seo.title.length <= 65); assert.ok(p.seo?.description && p.seo.description.length <= 160); }
  assert.ok(s.pages[0]!.seo!.keywords!.includes("check-ups leeds"));
});

test("never invents facts", () => {
  for (const c of SITE_CATEGORIES) for (const voice of VOICES) {
    const s = generateSite({ ...profile, industry: c, voice });
    const txt = JSON.stringify(s.pages[0]);
    assert.doesNotMatch(txt, /award|trusted by \d|\d+\+? years|#1|best in/i, `${c}/${voice}`);
    assert.deepEqual(qaSite(s).filter((i) => i.rule !== "structure"), [], `${c}/${voice}`);
  }
});

test("deterministic, with variants and single-section regeneration", () => {
  assert.deepEqual(generateSite(profile), generateSite(profile));
  const a = generateSite(profile), b = generateSite(profile, { variant: 1 });
  assert.notEqual(JSON.stringify(a.pages[0]!.sections[0]), JSON.stringify(b.pages[0]!.sections[0]));
  const r = regenerateSection(a, "", 0, 2);
  assert.notDeepEqual(r.pages[0]!.sections[0], a.pages[0]!.sections[0]);
  assert.deepEqual(r.pages[0]!.sections.slice(1), a.pages[0]!.sections.slice(1), "other sections untouched");
  assert.deepEqual(r.pages.slice(1), a.pages.slice(1));
});

test("copy tools", () => {
  assert.equal(ctaFor("Get people to request quotes").kind, "quote");
  assert.equal(ctaFor("donations").label, "Donate");
  assert.equal(ctaFor("Book", "fr").label, "Réserver");
  assert.ok(ctaAlternatives(profile).length >= 3);
  assert.ok(headlines({ ...profile, voice: "luxury" })[0]!.includes("Check-ups"));
  assert.equal(editText("We help you. We also do more.", "shorten"), "We help you.");
  assert.equal(editText("We will utilise our assistance", "simplify"), "We will use our help");
  assert.equal(editText("We're here! It's easy", "professional"), "We are here. It is easy");
  assert.match(editText("Great care", "persuasive", profile), /Book now today/);
  assert.match(editText("Great care.", "expand", profile), /Based in Leeds/);
  assert.equal(slugify("Café & Co!"), "cafe-co");
  assert.match(generateSite({ ...profile, lang: "fr" }).pages[0]!.sections.find((x) => x.t === "features")!.t, /features/);
});
