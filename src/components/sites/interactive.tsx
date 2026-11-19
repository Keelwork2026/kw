"use client";

import { useEffect, useState } from "react";
import type { Img, Palette } from "@/lib/sites/types";
import { Art } from "./art";

/**
 * The interactive parts of a template demo. They work for real in the
 * browser (forms validate, the cart adds and totals) but never pretend to
 * send anything: until the owner connects a form handler or a payment
 * provider, they say so plainly.
 */
export function DemoForm({ children, button, done, className = "ks-form" }: { children: React.ReactNode; button: string; done: string; className?: string }) {
  const [sent, setSent] = useState(false);
  if (sent) return <div className="ks-ok" role="status"><b>{done}</b><br /><span className="ks-note">This is a template preview, so nothing was sent. When you build with this template, Keelwork connects the form to your inbox.</span></div>;
  return (
    <form className={className} onSubmit={(e) => { e.preventDefault(); if (e.currentTarget.checkValidity()) setSent(true); }}>
      {children}
      <button className="ks-btn primary" type="submit" style={{ justifySelf: "start" }}>{button}</button>
    </form>
  );
}

export function NewsletterForm({ button, compact = false }: { button: string; compact?: boolean }) {
  const [sent, setSent] = useState(false);
  if (sent) return <p className={compact ? "" : "ks-ok"} role="status" style={compact ? { marginTop: 10, fontSize: 14 } : undefined}>Thanks — in a live site you&apos;d get a confirmation email to finish signing up.</p>;
  return (
    <form className={compact ? "ks-news" : "ks-search"} onSubmit={(e) => { e.preventDefault(); if (e.currentTarget.checkValidity()) setSent(true); }} style={compact ? undefined : { maxWidth: 520, margin: "28px auto 0" }}>
      <label className="ks-skip" htmlFor={compact ? "nl-f" : "nl-m"}>Email address</label>
      <input id={compact ? "nl-f" : "nl-m"} type="email" required placeholder="you@example.com" autoComplete="email" />
      <button className={`ks-btn ${compact ? "light" : "primary"}`} type="submit">{button}</button>
    </form>
  );
}

export function Options({ name, values }: { name: string; values: string[] }) {
  const [v, setV] = useState(values[0]);
  return (
    <div style={{ marginTop: 22 }}>
      <p className="ks-meta">{name}: <b style={{ color: "var(--ks-ink)" }}>{v}</b></p>
      <div className="ks-opts" role="group" aria-label={name}>{values.map((x) => <button key={x} type="button" aria-pressed={x === v} onClick={() => setV(x)}>{x}</button>)}</div>
    </div>
  );
}

type Line = { title: string; price: string; img?: Img; qty: number };
const key = (slug: string) => `ks-cart-${slug}`;
function readCart(slug: string): Line[] { try { return JSON.parse(sessionStorage.getItem(key(slug)) ?? "[]") as Line[]; } catch { return []; } }
function writeCart(slug: string, lines: Line[]) { try { sessionStorage.setItem(key(slug), JSON.stringify(lines)); } catch { /* storage unavailable: cart lasts for this page */ } }
const amount = (p: string) => Number(p.replace(/[^0-9.]/g, "")) || 0;
const money = (n: number, like: string) => `${like.match(/^[^0-9]*/)?.[0] || "£"}${n.toFixed(2)}`;

export function AddToCart({ slug, title, price, img, href }: { slug: string; title: string; price: string; img?: Img; href: string }) {
  const [added, setAdded] = useState(false);
  return (
    <div className="ks-ctas" style={{ marginTop: 26 }}>
      <button type="button" className="ks-btn primary" onClick={() => { const c = readCart(slug); const f = c.find((l) => l.title === title); if (f) f.qty++; else c.push({ title, price, img, qty: 1 }); writeCart(slug, c); setAdded(true); }}>{added ? "Added — add another" : "Add to basket"}</button>
      {added && <a className="ks-btn ghost" href={href}>View basket</a>}
    </div>
  );
}

export function CartView({ slug, palette, checkoutHref, shopHref }: { slug: string; palette: Palette; checkoutHref: string; shopHref: string }) {
  const [lines, setLines] = useState<Line[] | null>(null);
  useEffect(() => setLines(readCart(slug)), [slug]);
  const update = (i: number, d: number) => { const c = [...(lines ?? [])]; const l = c[i]!; l.qty += d; if (l.qty <= 0) c.splice(i, 1); writeCart(slug, c); setLines(c); };
  if (lines === null) return <p className="ks-note">Loading your basket…</p>;
  if (!lines.length) return <div className="ks-panel" style={{ textAlign: "center" }}><h2 className="ks-h3">Your basket is empty</h2><p className="ks-sub" style={{ margin: "10px auto 22px" }}>Pieces you add will wait here while you browse.</p><a className="ks-btn primary" href={shopHref}>Browse the shop</a></div>;
  const like = lines[0]!.price;
  const sub = lines.reduce((s, l) => s + amount(l.price) * l.qty, 0);
  const ship = sub >= 75 ? 0 : 4.95;
  return (
    <div className="ks-two">
      <div>{lines.map((l, i) => (
        <div className="ks-line" key={l.title}>
          {l.img ? <div className="ks-art"><Art kind={l.img.art} palette={palette} seed={l.img.seed} alt={l.img.alt} /></div> : <div className="ks-art" />}
          <div><b>{l.title}</b><p className="ks-meta">{l.price} each</p>
            <div className="ks-qty" style={{ marginTop: 8 }}><button type="button" aria-label={`One fewer ${l.title}`} onClick={() => update(i, -1)}>−</button><span aria-live="polite">{l.qty}</span><button type="button" aria-label={`One more ${l.title}`} onClick={() => update(i, 1)}>+</button></div>
          </div>
          <b>{money(amount(l.price) * l.qty, like)}</b>
        </div>))}
      </div>
      <div className="ks-panel ks-sum">
        <h2 className="ks-h3" style={{ marginBottom: 12 }}>Order summary</h2>
        <div><span>Subtotal</span><span>{money(sub, like)}</span></div>
        <div><span>Delivery</span><span>{ship ? money(ship, like) : "Free"}</span></div>
        <div className="tot"><span>Total</span><span>{money(sub + ship, like)}</span></div>
        <p className="ks-note" style={{ margin: "8px 0 18px" }}>Free delivery on orders over {money(75, like)}.</p>
        <a className="ks-btn primary" href={checkoutHref} style={{ width: "100%", justifyContent: "center" }}>Checkout</a>
      </div>
    </div>
  );
}

export function Checkout({ slug }: { slug: string }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [done, setDone] = useState(false);
  useEffect(() => setLines(readCart(slug)), [slug]);
  const like = lines[0]?.price ?? "£0";
  const total = lines.reduce((s, l) => s + amount(l.price) * l.qty, 0);
  if (done) return <div className="ks-panel" role="status"><h2 className="ks-h3">Checkout preview complete</h2><p className="ks-sub">In a live shop this step hands over to your payment provider (for example Stripe) and sends an order confirmation. This preview takes no payment and stores nothing.</p></div>;
  return (
    <div className="ks-two">
      <form className="ks-form ks-panel" onSubmit={(e) => { e.preventDefault(); if (e.currentTarget.checkValidity()) setDone(true); }}>
        <h2 className="ks-h3">Delivery details</h2>
        <label>Email<input type="email" required autoComplete="email" /></label>
        <label>Full name<input required autoComplete="name" /></label>
        <label>Address<input required autoComplete="street-address" /></label>
        <div className="ks-grid ks-g2"><label>Town or city<input required autoComplete="address-level2" /></label><label>Postcode<input required autoComplete="postal-code" /></label></div>
        <h2 className="ks-h3" style={{ marginTop: 10 }}>Payment</h2>
        <p className="ks-ok">Payment is handled by your payment provider once connected. This template never asks for card details itself.</p>
        <button className="ks-btn primary" type="submit" style={{ justifySelf: "start" }}>Continue to payment</button>
      </form>
      <div className="ks-panel ks-sum"><h2 className="ks-h3" style={{ marginBottom: 12 }}>Your order</h2>
        {lines.length ? lines.map((l) => <div key={l.title}><span>{l.qty} × {l.title}</span><span>{money(amount(l.price) * l.qty, like)}</span></div>) : <p className="ks-note">Your basket is empty — add something from the shop first.</p>}
        <div className="tot"><span>Total</span><span>{money(total, like)}</span></div>
      </div>
    </div>
  );
}

export function Donate({ amounts, impact }: { amounts: number[]; impact: [string, string][] }) {
  const [a, setA] = useState(amounts[1] ?? amounts[0]);
  const [monthly, setMonthly] = useState(true);
  const [done, setDone] = useState(false);
  if (done) return <div className="ks-ok" role="status"><b>Thank you.</b> In a live site this hands over to a secure donation provider. This preview takes no payment.</div>;
  return (
    <form className="ks-form" onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
      <div className="ks-opts" role="group" aria-label="Frequency"><button type="button" aria-pressed={monthly} onClick={() => setMonthly(true)}>Monthly</button><button type="button" aria-pressed={!monthly} onClick={() => setMonthly(false)}>One-off</button></div>
      <div className="ks-amts" role="group" aria-label="Amount">{amounts.map((x) => <button key={x} type="button" aria-pressed={x === a} onClick={() => setA(x)}>£{x}</button>)}</div>
      <p className="ks-note" aria-live="polite">{impact.find(([k]) => Number(k) === a)?.[1] ?? "Every gift goes where it is needed most."}</p>
      <button className="ks-btn primary" type="submit" style={{ justifySelf: "start" }}>Give £{a}{monthly ? " a month" : ""}</button>
    </form>
  );
}

export function CookieBanner({ slug, policyHref }: { slug: string; policyHref: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // Inside Keelwork's own preview frames the banner would only cover the page.
    let framed = true;
    try { framed = window.self !== window.top; } catch { /* cross-origin parent: treat as framed */ }
    if (!framed) { try { if (!localStorage.getItem(`ks-consent-${slug}`)) setOpen(true); } catch { setOpen(true); } }
    const show = () => setOpen(true);
    window.addEventListener("ks-cookies", show);
    return () => window.removeEventListener("ks-cookies", show);
  }, [slug]);
  const choose = (v: string) => { try { localStorage.setItem(`ks-consent-${slug}`, v); } catch { /* ignore */ } setOpen(false); };
  if (!open) return null;
  return (
    <div className="ks-cookie" role="dialog" aria-label="Cookie preferences">
      <b>Cookie preferences</b>
      <p>We use essential cookies to make this site work. With your permission we&apos;d also use analytics cookies to understand how it&apos;s used. <a href={policyHref} style={{ textDecoration: "underline" }}>Cookie policy</a></p>
      <div><button className="ks-btn primary" type="button" onClick={() => choose("all")}>Accept analytics</button><button className="ks-btn ghost" type="button" onClick={() => choose("essential")}>Essential only</button></div>
    </div>
  );
}

export function CookieLink() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event("ks-cookies"))}>Cookie preferences</button>;
}
