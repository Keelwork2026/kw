import type { Card, Img, Link as L, Page, Section, Site } from "@/lib/sites/types";
import { SITE_CSS, siteVars } from "@/lib/sites/css";
import { pieces, resolveHref } from "@/lib/sites/text";
import { Art } from "./art";
import { SiteIcon, SocialIcon } from "./icons";
import { AddToCart, CartView, Checkout, CookieBanner, CookieLink, DemoForm, Donate, NewsletterForm, Options } from "./interactive";

type Ctx = { site: Site; base: string; page: Page };

/** Text with [[placeholder]] chips for facts only the owner can supply. */
export function T({ s }: { s: string }) {
  return <>{pieces(s).map((p, i) => ("text" in p ? <span key={i}>{p.text}</span> : <span key={i} className="ks-ph" title="Placeholder — the owner fills this in">Add your {p.label}</span>))}</>;
}

function Pic({ img, ctx, className = "" }: { img: Img; ctx: Ctx; className?: string }) {
  return <div className={`ks-art ${className}`}><Art kind={img.art} palette={ctx.site.palette} seed={img.seed ?? 1} alt={img.alt} /></div>;
}

function A({ l, ctx, kind = "primary" }: { l: L; ctx: Ctx; kind?: "primary" | "ghost" | "light" }) {
  return <a className={`ks-btn ${kind}`} href={resolveHref(ctx.site, l.href, ctx.base)}>{l.label}</a>;
}

function Ctas({ ctas, ctx }: { ctas: L[]; ctx: Ctx }) {
  return ctas.length ? <div className="ks-ctas">{ctas.map((c, i) => <A key={c.label} l={c} ctx={ctx} kind={i ? "ghost" : "primary"} />)}</div> : null;
}

function Head({ eyebrow, title, sub, center }: { eyebrow?: string; title: string; sub?: string; center?: boolean }) {
  return <div className={`ks-head${center ? " center" : ""}`}>{eyebrow && <span className="ks-eyebrow">{eyebrow}</span>}<h2 className="ks-h2"><T s={title} /></h2>{sub && <p className="ks-sub"><T s={sub} /></p>}</div>;
}

const Sample = ({ on, what }: { on?: boolean; what: string }) => on ? <p className="ks-sample" title="Replace with your own before publishing">Sample {what} — replace with your own</p> : null;

function CardView({ c, v, ctx }: { c: Card; v: string; ctx: Ctx }) {
  const inner = (
    <>
      {c.img && <Pic img={c.img} ctx={ctx} />}
      <div className="ks-card-b">
        {(c.badge || c.meta) && <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>{c.meta && <span className="ks-meta"><T s={c.meta} /></span>}{c.badge && <span className="ks-badge">{c.badge}</span>}</div>}
        <h3 className="ks-h3" style={v === "article" ? { fontSize: 24 } : undefined}><T s={c.title} /></h3>
        {c.body && <p className="ks-meta" style={{ fontSize: 15 }}><T s={c.body} /></p>}
        {c.facts && <div className="ks-facts">{c.facts.map((f) => <span key={f}><T s={f} /></span>)}</div>}
        {c.tags && <div className="ks-tags">{c.tags.map((t) => <span key={t} className="ks-tag">{t}</span>)}</div>}
        {c.price && <p className="ks-price" style={{ marginTop: "auto", paddingTop: 6 }}><T s={c.price} /></p>}
      </div>
    </>
  );
  return c.href ? <a className="ks-card" href={resolveHref(ctx.site, c.href, ctx.base)}>{inner}</a> : <div className="ks-card">{inner}</div>;
}

function Field({ f }: { f: { label: string; type: string; options?: string[] } }) {
  return <label>{f.label}{f.type === "select" ? <select required defaultValue=""><option value="" disabled>Choose…</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select> : <input type={f.type} required min={f.type === "number" ? 1 : undefined} />}</label>;
}

export function SectionView({ s, ctx, index }: { s: Section; ctx: Ctx; index: number }) {
  const alt = index % 2 === 1 ? " alt" : "";
  switch (s.t) {
    case "hero": {
      if (s.v === "full") return (
        <section className="ks-hero-full">{s.img && <Pic img={s.img} ctx={ctx} />}<div className="ks-wrap">{s.eyebrow && <span className="ks-eyebrow">{s.eyebrow}</span>}<h1 className="ks-h1" style={{ maxWidth: "16ch" }}><T s={s.title} /></h1><p className="ks-sub"><T s={s.sub} /></p><Ctas ctas={s.ctas} ctx={ctx} /></div></section>
      );
      const text = (
        <div>
          {s.eyebrow && <span className="ks-eyebrow">{s.eyebrow}</span>}
          <h1 className="ks-h1"><T s={s.title} /></h1>
          <p className="ks-sub"><T s={s.sub} /></p>
          {s.search ? (
            <form className="ks-search" action={resolveHref(ctx.site, s.ctas[0]?.href ?? "/", ctx.base)}>
              <label className="ks-skip" htmlFor="hero-q">{s.search.placeholder}</label>
              <input id="hero-q" name="q" placeholder={s.search.placeholder} />
              {s.search.fields.map((f) => <select key={f} aria-label={f} defaultValue=""><option value="">{f}</option></select>)}
              <button className="ks-btn primary" type="submit">Search</button>
            </form>
          ) : <Ctas ctas={s.ctas} ctx={ctx} />}
          {s.stats && <div className="ks-hstats">{s.stats.map(([a, b]) => <div key={b}><b><T s={a} /></b><span><T s={b} /></span></div>)}</div>}
        </div>
      );
      if (s.v === "center") return <section className="ks-hero"><div className="ks-wrap ks-hero-center">{text}{s.img && <Pic img={s.img} ctx={ctx} />}</div></section>;
      if (s.v === "editorial") return <section className="ks-hero"><div className="ks-wrap ks-hero-ed">{text}{s.img && <Pic img={s.img} ctx={ctx} />}</div></section>;
      return <section className="ks-hero"><div className="ks-wrap ks-hero-split">{text}{s.img && <Pic img={s.img} ctx={ctx} />}</div></section>;
    }
    case "logos": return <section className="ks-sec" style={{ paddingTop: 40, paddingBottom: 40 }}><div className="ks-wrap" style={{ textAlign: "center" }}><Sample on={s.sample} what="names" /><p className="ks-meta" style={{ marginBottom: 22 }}>{s.title}</p><div className="ks-logos">{s.items.map((x) => <span key={x}>{x}</span>)}</div></div></section>;
    case "stats": return <section className={`ks-sec${s.v === "band" ? " ks-band" : alt}`}><div className="ks-wrap"><Sample on={s.sample} what="figures" />{s.title && <Head title={s.title} />}<div className={`ks-stats${s.v === "cards" ? " cards" : ""}`}>{s.items.map(([a, b]) => <div className="ks-stat" key={b}><b><T s={a} /></b><span><T s={b} /></span></div>)}</div></div></section>;
    case "features": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><Head title={s.title} sub={s.sub} center={s.v !== "list"} /><div className={`ks-grid ks-g${s.cols ?? 3}`}>{s.items.map((f) => <div key={f.title} className={`ks-feat${s.v === "list" ? " list" : ""}`}><div className="ks-ico"><SiteIcon name={f.icon} /></div><div><h3 className="ks-h3"><T s={f.title} /></h3><p><T s={f.body} /></p></div></div>)}</div></div></section>;
    case "split": return <section className={`ks-sec${alt}`}><div className={`ks-wrap ks-split${s.reverse ? " rev" : ""}`}><Pic img={s.img} ctx={ctx} /><div>{s.eyebrow && <span className="ks-eyebrow">{s.eyebrow}</span>}<h2 className="ks-h2"><T s={s.title} /></h2><div className="ks-body">{s.body.map((b) => <p key={b.slice(0, 40)}><T s={b} /></p>)}</div>{s.bullets && <ul className="ks-bul">{s.bullets.map((b) => <li key={b}><T s={b} /></li>)}</ul>}{s.cta && <div className="ks-ctas"><A l={s.cta} ctx={ctx} /></div>}</div></div></section>;
    case "cards": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap", marginBottom: 36 }}><div className="ks-head" style={{ marginBottom: 0 }}><h2 className="ks-h2"><T s={s.title} /></h2>{s.sub && <p className="ks-sub"><T s={s.sub} /></p>}</div>{s.more && <A l={s.more} ctx={ctx} kind="ghost" />}</div>{s.filters && <div className="ks-tags" style={{ marginBottom: 24 }}>{s.filters.map((f, i) => <span key={f} className="ks-tag" style={i === 0 ? { background: "var(--ks-ink)", color: "var(--ks-bg)", borderColor: "var(--ks-ink)" } : undefined}>{f}</span>)}</div>}<div className={`ks-grid ks-g${s.cols ?? 3}`}>{s.items.map((c) => s.v === "person" ? <div key={c.title} className="ks-person">{c.img && <Pic img={c.img} ctx={ctx} />}<h3 className="ks-h3" style={{ fontSize: 19 }}><T s={c.title} /></h3>{c.meta && <p><T s={c.meta} /></p>}{c.body && <p style={{ marginTop: 6 }}><T s={c.body} /></p>}</div> : <CardView key={c.title} c={c} v={s.v} ctx={ctx} />)}</div></div></section>;
    case "menu": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><Head title={s.title} sub={s.sub} center /><div className="ks-menu">{s.groups.map((g) => <div key={g.name}><h3>{g.name}</h3>{g.items.map((it) => <div className="ks-dish" key={it.name}><b>{it.name}{it.tags?.map((t) => <span key={t} className="ks-tag" style={{ marginLeft: 8, fontWeight: 500 }}>{t}</span>)}</b><span className="ks-price">{it.price}</span><p>{it.desc}</p></div>)}</div>)}</div><p className="ks-note" style={{ textAlign: "center", marginTop: 32 }}>Please tell us about any allergies or dietary needs before you order. Allergen information is available for every dish.</p></div></section>;
    case "gallery": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><Head title={s.title} sub={s.sub} center /><div className="ks-gal">{s.items.map((img, i) => <Pic key={i} img={img} ctx={ctx} />)}</div></div></section>;
    case "testimonials": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><Head title={s.title} center /><div style={{ textAlign: "center" }}><Sample on={s.sample} what="reviews" /></div><div className={`ks-grid ks-g${Math.min(3, s.items.length) as 2 | 3}`}>{s.items.map((q) => <figure key={q.name} className="ks-quote" style={{ margin: 0 }}><blockquote>“<T s={q.quote} />”</blockquote><figcaption><b><T s={q.name} /></b><T s={q.role} /></figcaption></figure>)}</div></div></section>;
    case "pricing": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><Head title={s.title} sub={s.sub} center /><div className={`ks-grid ks-g${Math.min(4, s.plans.length) as 2 | 3 | 4}`}>{s.plans.map((p) => <div key={p.name} className={`ks-plan${p.featured ? " feat" : ""}`}>{p.featured && <span className="ks-badge" style={{ alignSelf: "flex-start" }}>Most chosen</span>}<h3 className="ks-h3">{p.name}</h3><p><span className="amt"><T s={p.price} /></span> <span className="ks-meta">{p.per}</span></p><p className="ks-meta">{p.blurb}</p><ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul><A l={p.cta} ctx={ctx} kind={p.featured ? "primary" : "ghost"} /></div>)}</div></div></section>;
    case "faq": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><Head title={s.title} center /><div className="ks-faq">{s.items.map(([q, a]) => <details key={q}><summary><T s={q} /></summary><p><T s={a} /></p></details>)}</div></div></section>;
    case "cta": return <section className="ks-sec"><div className="ks-wrap"><div className="ks-cta" style={s.img ? undefined : { gridTemplateColumns: "1fr" }}><div><h2 className="ks-h2"><T s={s.title} /></h2><p className="ks-sub"><T s={s.sub} /></p><Ctas ctas={s.ctas} ctx={ctx} /></div>{s.img && <Pic img={s.img} ctx={ctx} />}</div></div></section>;
    case "newsletter": return <section className={`ks-sec${alt}`}><div className="ks-wrap" style={{ textAlign: "center" }}><Head title={s.title} sub={s.sub} center /><NewsletterForm button={s.button} /><p className="ks-note" style={{ marginTop: 12 }}>No spam. Unsubscribe with one click, any time.</p></div></section>;
    case "contact": return (
      <section className={`ks-sec${alt}`} id="contact"><div className="ks-wrap ks-two">
        <div><h2 className="ks-h2"><T s={s.title} /></h2><p className="ks-sub"><T s={s.sub} /></p>
          <dl className="ks-dl">{s.details.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><T s={v} /></dd></div>)}</dl>
          {s.hours && <><h3 className="ks-h3" style={{ marginTop: 32, fontSize: 18 }}>Hours</h3><dl className="ks-dl">{s.hours.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><T s={v} /></dd></div>)}</dl></>}
          <div className="ks-art" style={{ aspectRatio: "16/9", marginTop: 28 }}><Art kind="map" palette={ctx.site.palette} alt="Map showing the location" /></div>
        </div>
        <div className="ks-panel"><DemoForm button={s.button} done="Thanks — your message is ready to send.">{s.fields.map((f) => <label key={f}>{f}{/message|details|tell|question/i.test(f) ? <textarea rows={5} required /> : <input type={/email/i.test(f) ? "email" : /phone/i.test(f) ? "tel" : "text"} required={!/phone|company|optional/i.test(f)} autoComplete={/email/i.test(f) ? "email" : /name/i.test(f) ? "name" : /phone/i.test(f) ? "tel" : "off"} />}</label>)}<p className="ks-note">We use your details only to reply to you. See our privacy policy.</p></DemoForm></div>
      </div></section>
    );
    case "steps": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><Head title={s.title} sub={s.sub} center /><div className="ks-steps">{s.items.map((x) => <div className="ks-step" key={x.title}><h3 className="ks-h3"><T s={x.title} /></h3><p><T s={x.body} /></p></div>)}</div></div></section>;
    case "timeline": return <section className={`ks-sec${alt}`}><div className="ks-wrap" style={{ maxWidth: 820 }}><Head title={s.title} /><div className="ks-tl">{s.items.map((x) => <div key={x.title}><b><T s={x.year} /></b><h3 className="ks-h3" style={{ marginTop: 4 }}><T s={x.title} /></h3><p><T s={x.body} /></p></div>)}</div></div></section>;
    case "team": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><Head title={s.title} sub={s.sub} center /><div className="ks-grid ks-g4">{s.items.map((m, i) => <div className="ks-person" key={m.name + m.role}><Pic img={{ art: "portrait", alt: `Portrait illustration for ${m.role}`, seed: i + 3 }} ctx={ctx} /><h3 className="ks-h3" style={{ fontSize: 19 }}><T s={m.name} /></h3><p style={{ color: "var(--ks-accent)", fontWeight: 600 }}><T s={m.role} /></p>{m.bio && <p style={{ marginTop: 6 }}><T s={m.bio} /></p>}</div>)}</div></div></section>;
    case "schedule": return <section className={`ks-sec${alt}`}><div className="ks-wrap" style={{ maxWidth: 960 }}><Head title={s.title} />{s.days.map((d) => <div className="ks-day" key={d.day}><h3 className="ks-h3">{d.day}</h3>{d.sessions.map((x) => <div className="ks-slot" key={x.time + x.title}><time>{x.time}</time><div><b><T s={x.title} /></b><br /><span><T s={x.who} /></span></div><span>{x.room}</span></div>)}</div>)}</div></section>;
    case "detail": return (
      <section className="ks-sec" style={{ paddingTop: 48 }}><div className="ks-wrap ks-detail">
        <div><Pic img={s.img} ctx={ctx} className="main" />{s.gallery && <div className="ks-thumbs">{s.gallery.map((g, i) => <Pic key={i} img={g} ctx={ctx} />)}</div>}</div>
        <div>
          <h1 className="ks-h2"><T s={s.title} /></h1><p className="ks-sub" style={{ fontSize: 17 }}><T s={s.sub} /></p>
          {s.price && <p className="price"><T s={s.price} /></p>}
          {s.options && <Options name={s.options.name} values={s.options.values} />}
          {s.v === "product" && s.price ? <AddToCart slug={ctx.site.slug} title={s.title} price={s.price} img={s.img} href={resolveHref(ctx.site, "/cart", ctx.base)} /> : <div className="ks-ctas" style={{ marginTop: 26 }}><A l={s.cta} ctx={ctx} />{s.secondary && <A l={s.secondary} ctx={ctx} kind="ghost" />}</div>}
          <dl className="ks-dl">{s.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd><T s={v} /></dd></div>)}</dl>
          <div style={{ marginTop: 24, color: "var(--ks-muted)" }}>{s.body.map((b) => <p key={b.slice(0, 40)} style={{ marginTop: 12 }}><T s={b} /></p>)}</div>
          {s.highlights && <ul className="ks-bul">{s.highlights.map((h) => <li key={h}><T s={h} /></li>)}</ul>}
        </div>
      </div></section>
    );
    case "article": return <section className="ks-sec" style={{ paddingTop: 56 }}><article className="ks-wrap ks-article"><p className="ks-eyebrow"><T s={s.meta} /></p><h1 className="ks-h1" style={{ fontSize: "clamp(36px,5vw,58px)" }}><T s={s.title} /></h1><Pic img={s.img} ctx={ctx} />{s.body.map((p, i) => <div key={i}>{i === 2 && s.quote && <blockquote><T s={s.quote} /></blockquote>}<p><T s={p} /></p></div>)}</article></section>;
    case "rates": return <section className={`ks-sec${alt}`}><div className="ks-wrap"><Head title={s.title} sub={s.sub} /><div className="ks-scroll"><table className="ks-table"><thead><tr>{s.cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead><tbody>{s.rows.map((r) => <tr key={r.join()}>{r.map((c, i) => i === 0 ? <th key={i} scope="row" style={{ background: "none", textTransform: "none", letterSpacing: 0, fontSize: 15, color: "var(--ks-ink)" }}><T s={c} /></th> : <td key={i}><T s={c} /></td>)}</tr>)}</tbody></table></div><p className="ks-note" style={{ marginTop: 14 }}><T s={s.note} /></p></div></section>;
    case "booking": return (
      <section className={`ks-sec${alt}`} id="book"><div className="ks-wrap ks-two">
        <div><h2 className="ks-h2"><T s={s.title} /></h2><p className="ks-sub"><T s={s.sub} /></p><ul className="ks-bul">{s.aside.map((a) => <li key={a}><T s={a} /></li>)}</ul></div>
        <div className="ks-panel"><DemoForm button={s.button} done={{ table: "Your table request is ready.", appointment: "Your appointment request is ready.", tour: "Your enquiry is ready.", ticket: "Your ticket selection is ready.", visit: "Your viewing request is ready." }[s.kind]}><div className="ks-grid ks-g2">{s.fields.map((f) => <Field key={f.label} f={f} />)}</div></DemoForm></div>
      </div></section>
    );
    case "donate": return <section className={`ks-sec${alt}`} id="donate"><div className="ks-wrap ks-two"><div><h2 className="ks-h2"><T s={s.title} /></h2><p className="ks-sub"><T s={s.sub} /></p><dl className="ks-dl">{s.impact.map(([k, v]) => <div key={k}><dt>£{k}</dt><dd>{v}</dd></div>)}</dl></div><div className="ks-panel"><Donate amounts={s.amounts} impact={s.impact} /></div></div></section>;
    case "cart": return <section className="ks-sec" style={{ paddingTop: 48 }}><div className="ks-wrap"><h1 className="ks-h2" style={{ marginBottom: 28 }}>Your basket</h1><CartView slug={ctx.site.slug} palette={ctx.site.palette} checkoutHref={resolveHref(ctx.site, "/checkout", ctx.base)} shopHref={resolveHref(ctx.site, "/shop", ctx.base)} /></div></section>;
    case "checkout": return <section className="ks-sec" style={{ paddingTop: 48 }}><div className="ks-wrap"><h1 className="ks-h2" style={{ marginBottom: 28 }}>Checkout</h1><Checkout slug={ctx.site.slug} /></div></section>;
    case "account": return (
      <section className="ks-sec" style={{ paddingTop: 48 }}><div className="ks-wrap ks-two">
        <div className="ks-panel"><h1 className="ks-h3">Sign in</h1><DemoForm button="Sign in" done="Account sign-in works once your shop is live."><label>Email<input type="email" required autoComplete="email" /></label><label>Password<input type="password" required autoComplete="current-password" /></label></DemoForm></div>
        <div><h2 className="ks-h3">New here?</h2><p className="ks-sub" style={{ fontSize: 16 }}>An account keeps your orders, delivery addresses and saved pieces in one place. You can always check out as a guest.</p><ul className="ks-bul"><li>Track orders and returns</li><li>Save delivery addresses</li><li>Keep a wishlist</li></ul></div>
      </div></section>
    );
  }
}

function Logo({ site }: { site: Site }) {
  const m = site.logo.mark;
  const shape = { circle: <circle cx="14" cy="14" r="12" />, square: <rect x="3" y="3" width="22" height="22" rx="5" />, diamond: <path d="M14 2l12 12-12 12L2 14z" />, arch: <path d="M3 26V14a11 11 0 0122 0v12z" />, wave: <path d="M2 18c4-8 8-8 12 0s8 8 12 0V26H2z" />, stack: <g><rect x="3" y="4" width="22" height="6" rx="2" /><rect x="3" y="12" width="22" height="6" rx="2" opacity=".7" /><rect x="3" y="20" width="22" height="6" rx="2" opacity=".45" /></g> }[m];
  return <><svg width="28" height="28" viewBox="0 0 28 28" fill="var(--ks-accent)" aria-hidden>{shape}</svg><span>{site.logo.word}</span></>;
}

export function SiteDocument({ site, page, base }: { site: Site; page: Page; base: string }) {
  const ctx: Ctx = { site, base, page };
  const nav = site.pages.filter((p) => p.inNav !== false && p.slug !== "" && !["privacy", "terms", "cookies", "cart", "checkout", "account", "accessibility"].includes(p.slug));
  const has = (slug: string) => site.pages.some((p) => p.slug === slug);
  const href = (h: string) => resolveHref(site, h, base);
  return (
    <div className="ks" style={siteVars(site) as React.CSSProperties} lang={site.lang ?? "en"}>
      <style dangerouslySetInnerHTML={{ __html: SITE_CSS }} />
      <a className="ks-skip" href="#ks-main">Skip to content</a>
      {site.announcement && <div className="ks-ann"><T s={site.announcement} /></div>}
      <header className="ks-nav">
        <div className="ks-wrap ks-nav-in">
          <a href={href("/")} className="ks-logo" aria-label={`${site.name} home`}><Logo site={site} /></a>
          <nav className="ks-links" aria-label="Main">{nav.map((p) => <a key={p.slug} href={href(`/${p.slug}`)} aria-current={p.slug === page.slug ? "page" : undefined}>{p.nav}</a>)}</nav>
          {has("cart") && <a className="ks-navcta" href={href("/cart")} aria-label="Basket" style={{ padding: 8 }}><SiteIcon name="gift" /></a>}
          <a className="ks-btn primary ks-navcta" href={href(site.primaryCta.href)} style={{ padding: "11px 18px" }}>{site.primaryCta.label}</a>
          <details className="ks-burger"><summary aria-label="Menu"><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg></summary>
            <nav aria-label="Mobile">{nav.map((p) => <a key={p.slug} href={href(`/${p.slug}`)}>{p.nav}</a>)}{has("cart") && <a href={href("/cart")}>Basket</a>}<a className="ks-btn primary" style={{ marginTop: 12, justifyContent: "center" }} href={href(site.primaryCta.href)}>{site.primaryCta.label}</a></nav>
          </details>
        </div>
      </header>
      <main id="ks-main">{page.sections.map((s, i) => <div key={i} id={s.id} style={s.id ? { scrollMarginTop: 80 } : undefined}><SectionView s={s} ctx={ctx} index={i} /></div>)}</main>
      <footer className="ks-foot">
        <div className="ks-wrap">
          <div className="ks-foot-top" style={{ "--ks-cols": site.footer.columns.length + (site.footer.newsletter ? 1 : 0) } as React.CSSProperties}>
            <div>
              <a href={href("/")} className="ks-logo"><Logo site={site} /></a>
              <p className="blurb"><T s={site.footer.blurb} /></p>
              <ul style={{ marginBottom: 20 }}>{site.footer.contact.map(([k, v]) => <li key={k} style={{ opacity: 0.85 }}><span style={{ opacity: 0.6 }}>{k}: </span><T s={v} /></li>)}</ul>
              <div className="ks-social">{site.footer.social.map((s) => <a key={s} href="#" aria-label={`${site.name} on ${s} (link added when you publish)`} title="Add your profile link when you publish"><SocialIcon name={s} /></a>)}</div>
            </div>
            {site.footer.columns.map((c) => <div key={c.title}><h4>{c.title}</h4><ul>{c.links.map((l) => <li key={l.label}><a href={href(l.href)}>{l.label}</a></li>)}</ul></div>)}
            {site.footer.newsletter && <div><h4>{site.footer.newsletter.title}</h4><p style={{ opacity: 0.75, fontSize: 14 }}>Occasional updates. Unsubscribe any time.</p><NewsletterForm button={site.footer.newsletter.button} compact /></div>}
          </div>
          <div className="ks-legal">
            <span><T s={site.footer.legal} /></span>
            <nav aria-label="Legal">{has("privacy") && <a href={href("/privacy")}>Privacy policy</a>}{has("terms") && <a href={href("/terms")}>Terms</a>}{has("cookies") && <a href={href("/cookies")}>Cookie policy</a>}{has("accessibility") && <a href={href("/accessibility")}>Accessibility</a>}{has("cookies") && <CookieLink />}</nav>
          </div>
        </div>
      </footer>
      {has("cookies") && <CookieBanner slug={site.slug} policyHref={href("/cookies")} />}
    </div>
  );
}
