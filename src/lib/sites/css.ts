import type { Site } from "./types";

/**
 * Template sites carry their own stylesheet (no Tailwind), so the same markup
 * renders in the gallery, in a static HTML export, and in the builder.
 */
export function siteVars(site: Site): Record<string, string> {
  const p = site.palette;
  const display = { serif: "var(--kw-serif, 'Iowan Old Style', Georgia, serif)", grotesk: "var(--kw-grotesk, 'Space Grotesk', system-ui, sans-serif)", sans: "var(--kw-inter, Inter, system-ui, sans-serif)", mono: "var(--kw-mono, ui-monospace, monospace)" }[site.fonts.display];
  const body = site.fonts.body === "serif" ? "Georgia, 'Iowan Old Style', serif" : "var(--kw-inter, Inter, system-ui, sans-serif)";
  const radius = { none: "0px", soft: "10px", round: "22px" }[site.radius];
  return {
    "--ks-bg": p.bg, "--ks-surface": p.surface, "--ks-ink": p.ink, "--ks-muted": p.muted, "--ks-accent": p.accent,
    "--ks-accent2": p.accent2, "--ks-soft": p.soft, "--ks-line": p.line, "--ks-on": p.onAccent,
    "--ks-display": display, "--ks-body": body, "--ks-r": radius,
    "--ks-display-style": site.fonts.display === "serif" ? "italic" : "normal",
    "--ks-display-weight": site.fonts.display === "serif" ? "400" : "700",
  };
}

export const SITE_CSS = `
.ks{background:var(--ks-bg);color:var(--ks-ink);font-family:var(--ks-body);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased;min-height:100dvh}
.ks *{box-sizing:border-box}
.ks a{color:inherit;text-decoration:none}
.ks img,.ks svg{display:block;max-width:100%}
.ks h1,.ks h2,.ks h3,.ks h4{font-family:var(--ks-display);font-style:var(--ks-display-style);font-weight:var(--ks-display-weight);line-height:1.08;letter-spacing:-0.02em;margin:0}
.ks p{margin:0}
.ks-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.ks-sec{padding:88px 0}
.ks-sec.alt{background:var(--ks-surface)}
.ks-eyebrow{display:inline-block;font:600 12px/1 var(--kw-inter,system-ui);letter-spacing:.14em;text-transform:uppercase;color:var(--ks-accent);margin-bottom:14px}
.ks-h1{font-size:clamp(40px,6vw,76px)}
.ks-h2{font-size:clamp(30px,3.6vw,46px)}
.ks-h3{font-size:22px}
.ks-sub{color:var(--ks-muted);font-size:18px;max-width:62ch;margin-top:16px}
.ks-head{max-width:760px;margin-bottom:44px}
.ks-head.center{margin-left:auto;margin-right:auto;text-align:center}
.ks-head.center .ks-sub{margin-left:auto;margin-right:auto}
.ks-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border-radius:calc(var(--ks-r) + 2px);font:600 15px/1 var(--kw-inter,system-ui);border:1.5px solid transparent;cursor:pointer;transition:transform .15s,background .15s,box-shadow .15s}
.ks-btn:hover{transform:translateY(-1px)}
.ks-btn.primary{background:var(--ks-accent);color:var(--ks-on);box-shadow:0 8px 24px -10px var(--ks-accent)}
.ks-btn.ghost{border-color:var(--ks-line);background:transparent;color:var(--ks-ink)}
.ks-btn.ghost:hover{border-color:var(--ks-ink)}
.ks-btn.light{background:#fff;color:#141414}
.ks-ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.ks-grid{display:grid;gap:24px}
.ks-g2{grid-template-columns:repeat(2,minmax(0,1fr))}.ks-g3{grid-template-columns:repeat(3,minmax(0,1fr))}.ks-g4{grid-template-columns:repeat(4,minmax(0,1fr))}
@media(max-width:900px){.ks-g3,.ks-g4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.ks-g2,.ks-g3,.ks-g4{grid-template-columns:1fr}.ks-sec{padding:60px 0}}
.ks-art{overflow:hidden;border-radius:var(--ks-r);background:var(--ks-soft)}
.ks-art svg{width:100%;height:100%}
.ks-card{background:var(--ks-surface);border:1px solid var(--ks-line);border-radius:var(--ks-r);overflow:hidden;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s}
.ks-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px -24px rgba(0,0,0,.35)}
.ks-card .ks-art{border-radius:0;aspect-ratio:4/3}
.ks-card-b{padding:20px;display:flex;flex-direction:column;gap:8px;flex:1}
.ks-meta{font-size:13px;color:var(--ks-muted)}
.ks-price{font-weight:700;font-size:17px}
.ks-badge{display:inline-block;font:600 11px/1 var(--kw-inter,system-ui);letter-spacing:.06em;text-transform:uppercase;padding:6px 9px;border-radius:999px;background:var(--ks-soft);color:var(--ks-accent)}
.ks-tags{display:flex;flex-wrap:wrap;gap:6px}
.ks-tag{font-size:12px;padding:4px 9px;border-radius:999px;border:1px solid var(--ks-line);color:var(--ks-muted)}
.ks-facts{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;color:var(--ks-muted)}
.ks-ph{display:inline-flex;align-items:center;gap:5px;padding:1px 8px;border-radius:6px;border:1px dashed var(--ks-accent);background:color-mix(in srgb,var(--ks-accent) 8%,transparent);color:var(--ks-accent);font:600 .82em/1.6 var(--kw-inter,system-ui);font-style:normal;white-space:nowrap}
.ks-sample{display:inline-flex;align-items:center;gap:6px;font:600 11px/1 var(--kw-inter,system-ui);letter-spacing:.06em;text-transform:uppercase;padding:6px 10px;border-radius:999px;border:1px dashed var(--ks-muted);color:var(--ks-muted);margin-bottom:14px}
/* announcement + nav */
.ks-ann{background:var(--ks-ink);color:var(--ks-bg);text-align:center;font-size:13px;padding:9px 16px}
.ks-nav{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--ks-bg) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--ks-line)}
.ks-nav-in{display:flex;align-items:center;gap:28px;height:70px}
.ks-logo{display:flex;align-items:center;gap:10px;font-family:var(--ks-display);font-style:var(--ks-display-style);font-weight:var(--ks-display-weight);font-size:22px;letter-spacing:-.02em}
.ks-links{display:flex;gap:4px;margin-left:auto}
.ks-links a{padding:8px 12px;border-radius:999px;font-size:15px;color:var(--ks-muted)}
.ks-links a:hover,.ks-links a[aria-current=page]{color:var(--ks-ink);background:var(--ks-soft)}
.ks-burger{display:none;margin-left:auto}
.ks-burger summary{list-style:none;cursor:pointer;padding:10px;border:1px solid var(--ks-line);border-radius:10px}
.ks-burger summary::-webkit-details-marker{display:none}
.ks-burger nav{position:absolute;left:0;right:0;top:70px;background:var(--ks-bg);border-bottom:1px solid var(--ks-line);padding:12px 24px 24px;display:grid;gap:4px}
.ks-burger nav a{padding:12px 4px;border-bottom:1px solid var(--ks-line);font-size:17px}
@media(max-width:900px){.ks-links,.ks-nav .ks-navcta{display:none}.ks-burger{display:block}}
/* hero */
.ks-hero{padding:72px 0 88px;position:relative;overflow:hidden}
.ks-hero-split{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center}
.ks-hero-split .ks-art{aspect-ratio:5/4;box-shadow:0 40px 80px -40px rgba(0,0,0,.45)}
@media(max-width:900px){.ks-hero-split{grid-template-columns:1fr}}
.ks-hero-center{text-align:center;max-width:860px;margin:0 auto}
.ks-hero-center .ks-sub{margin-left:auto;margin-right:auto}.ks-hero-center .ks-ctas{justify-content:center}
.ks-hero-center .ks-art{margin-top:56px;aspect-ratio:16/8}
.ks-hero-full{position:relative;min-height:620px;display:flex;align-items:flex-end;color:#fff}
.ks-hero-full>.ks-art{position:absolute;inset:0;border-radius:0}
.ks-hero-full::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.65))}
.ks-hero-full .ks-wrap{position:relative;z-index:1;padding-bottom:72px;width:100%}
.ks-hero-full .ks-sub{color:rgba(255,255,255,.86)}.ks-hero-full .ks-eyebrow{color:#fff;opacity:.9}
.ks-hero-full .ks-btn.ghost{color:#fff;border-color:rgba(255,255,255,.6)}
.ks-hero-ed{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:end;border-bottom:1px solid var(--ks-line);padding-bottom:48px}
.ks-hero-ed .ks-art{aspect-ratio:4/5}
@media(max-width:900px){.ks-hero-ed{grid-template-columns:1fr}}
.ks-hstats{display:flex;flex-wrap:wrap;gap:36px;margin-top:40px}
.ks-hstats b{display:block;font-family:var(--ks-display);font-size:30px;font-weight:var(--ks-display-weight)}
.ks-hstats span{font-size:14px;color:var(--ks-muted)}
.ks-search{margin-top:32px;background:var(--ks-surface);border:1px solid var(--ks-line);border-radius:calc(var(--ks-r) + 6px);padding:10px;display:flex;flex-wrap:wrap;gap:8px;box-shadow:0 24px 48px -30px rgba(0,0,0,.4)}
.ks-search input,.ks-search select{flex:1 1 160px;border:0;background:var(--ks-bg);border-radius:var(--ks-r);padding:13px 14px;font:inherit;color:inherit;min-width:0}
/* logos & stats */
.ks-logos{display:flex;flex-wrap:wrap;justify-content:center;gap:16px 44px;opacity:.7;font:700 18px/1 var(--ks-display);letter-spacing:-.01em}
.ks-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:24px}
.ks-stat b{display:block;font-family:var(--ks-display);font-size:clamp(34px,4vw,52px);font-weight:var(--ks-display-weight);color:var(--ks-accent)}
.ks-stat span{color:var(--ks-muted);font-size:15px}
.ks-stats.cards .ks-stat{background:var(--ks-surface);border:1px solid var(--ks-line);border-radius:var(--ks-r);padding:24px}
.ks-band{background:var(--ks-ink);color:var(--ks-bg)}.ks-band .ks-stat span{color:color-mix(in srgb,var(--ks-bg) 70%,transparent)}
/* features */
.ks-feat{padding:28px;border-radius:var(--ks-r);background:var(--ks-surface);border:1px solid var(--ks-line)}
.ks-feat p{color:var(--ks-muted);margin-top:8px}
.ks-ico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;background:var(--ks-soft);color:var(--ks-accent);margin-bottom:18px}
.ks-feat.list{background:none;border:0;padding:0;display:grid;grid-template-columns:46px 1fr;gap:16px}.ks-feat.list .ks-ico{margin:0}
/* split */
.ks-split{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.ks-split.rev>.ks-art{order:2}
.ks-split .ks-art{aspect-ratio:1/1}
.ks-split p+p{margin-top:14px}.ks-split .ks-body{color:var(--ks-muted);font-size:17px;margin-top:18px}
.ks-bul{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:10px}
.ks-bul li{display:flex;gap:10px;align-items:flex-start}.ks-bul li::before{content:"";flex:none;width:20px;height:20px;margin-top:3px;border-radius:50%;background:var(--ks-accent) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M5.5 10.5l3 3 6-7' stroke='white' stroke-width='2' fill='none'/%3E%3C/svg%3E") center/14px no-repeat}
@media(max-width:900px){.ks-split{grid-template-columns:1fr;gap:32px}.ks-split.rev>.ks-art{order:0}}
/* menu */
.ks-menu{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:48px 64px}
@media(max-width:800px){.ks-menu{grid-template-columns:1fr}}
.ks-menu h3{font-size:26px;padding-bottom:12px;border-bottom:1px solid var(--ks-line);margin-bottom:8px}
.ks-dish{display:grid;grid-template-columns:1fr auto;gap:4px 16px;padding:14px 0;border-bottom:1px dashed var(--ks-line)}
.ks-dish b{font-size:17px}.ks-dish p{grid-column:1/-1;color:var(--ks-muted);font-size:15px}
/* gallery */
.ks-gal{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:200px;gap:14px}
.ks-gal .ks-art:nth-child(5n+1){grid-column:span 2;grid-row:span 2}
@media(max-width:700px){.ks-gal{grid-template-columns:repeat(2,1fr);grid-auto-rows:150px}}
/* testimonials */
.ks-quote{padding:30px;border-radius:var(--ks-r);background:var(--ks-surface);border:1px solid var(--ks-line);display:flex;flex-direction:column;gap:18px}
.ks-quote blockquote{margin:0;font-size:18px;line-height:1.55}
.ks-quote figcaption{font-size:14px;color:var(--ks-muted)}.ks-quote figcaption b{display:block;color:var(--ks-ink)}
/* pricing */
.ks-plan{padding:32px;border-radius:var(--ks-r);border:1px solid var(--ks-line);background:var(--ks-surface);display:flex;flex-direction:column;gap:14px}
.ks-plan.feat{border:2px solid var(--ks-accent);box-shadow:0 30px 60px -36px var(--ks-accent)}
.ks-plan .amt{font-family:var(--ks-display);font-size:44px;font-weight:var(--ks-display-weight)}
.ks-plan ul{list-style:none;padding:0;margin:0;display:grid;gap:9px;font-size:15px;flex:1}
.ks-plan li::before{content:"✓  ";color:var(--ks-accent);font-weight:700}
/* faq */
.ks-faq{max-width:820px;margin:0 auto}
.ks-faq details{border-bottom:1px solid var(--ks-line);padding:20px 0}
.ks-faq summary{cursor:pointer;font-weight:600;font-size:18px;list-style:none;display:flex;justify-content:space-between;gap:16px}
.ks-faq summary::after{content:"+";font-size:24px;line-height:1;color:var(--ks-accent)}
.ks-faq details[open] summary::after{content:"–"}
.ks-faq p{color:var(--ks-muted);margin-top:12px}
/* cta band */
.ks-cta{border-radius:calc(var(--ks-r) + 12px);background:var(--ks-accent);color:var(--ks-on);padding:64px;display:grid;grid-template-columns:1.3fr 1fr;gap:40px;align-items:center;overflow:hidden}
.ks-cta .ks-sub{color:color-mix(in srgb,var(--ks-on) 80%,transparent)}
.ks-cta .ks-btn.primary{background:var(--ks-on);color:var(--ks-accent)}
.ks-cta .ks-btn.ghost{color:var(--ks-on);border-color:color-mix(in srgb,var(--ks-on) 50%,transparent)}
.ks-cta .ks-art{aspect-ratio:4/3}
@media(max-width:800px){.ks-cta{grid-template-columns:1fr;padding:40px 28px}}
/* forms */
.ks-form{display:grid;gap:14px}
.ks-form label{display:grid;gap:6px;font-size:14px;font-weight:600}
.ks-form input,.ks-form select,.ks-form textarea{font:inherit;font-weight:400;color:var(--ks-ink);background:var(--ks-bg);border:1px solid var(--ks-line);border-radius:var(--ks-r);padding:12px 14px;width:100%}
.ks-form input:focus,.ks-form select:focus,.ks-form textarea:focus{outline:2px solid var(--ks-accent);outline-offset:1px}
.ks-note{font-size:13px;color:var(--ks-muted)}
.ks-ok{padding:14px 16px;border-radius:var(--ks-r);background:var(--ks-soft);color:var(--ks-ink);font-size:15px}
.ks-panel{background:var(--ks-surface);border:1px solid var(--ks-line);border-radius:calc(var(--ks-r) + 4px);padding:32px}
.ks-two{display:grid;grid-template-columns:1fr 1.1fr;gap:48px;align-items:start}
@media(max-width:900px){.ks-two{grid-template-columns:1fr}}
.ks-dl{display:grid;gap:14px;margin:24px 0 0}
.ks-dl div{display:grid;grid-template-columns:120px 1fr;gap:12px;padding-bottom:14px;border-bottom:1px solid var(--ks-line)}
.ks-dl dt{color:var(--ks-muted);font-size:14px}.ks-dl dd{margin:0}
/* steps & timeline */
.ks-steps{counter-reset:s;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px}
.ks-step{counter-increment:s;padding:28px;border-radius:var(--ks-r);background:var(--ks-surface);border:1px solid var(--ks-line)}
.ks-step::before{content:counter(s,decimal-leading-zero);display:block;font-family:var(--ks-display);font-size:34px;color:var(--ks-accent);margin-bottom:14px}
.ks-step p{color:var(--ks-muted);margin-top:8px}
.ks-tl{border-left:2px solid var(--ks-line);margin-left:8px;display:grid;gap:34px;padding-left:28px}
.ks-tl>div{position:relative}.ks-tl>div::before{content:"";position:absolute;left:-36px;top:6px;width:14px;height:14px;border-radius:50%;background:var(--ks-accent);box-shadow:0 0 0 4px var(--ks-bg)}
.ks-tl b{color:var(--ks-accent);font-size:14px;letter-spacing:.06em}.ks-tl p{color:var(--ks-muted);margin-top:6px}
/* team */
.ks-person .ks-art{aspect-ratio:1/1;margin-bottom:14px}
.ks-person p{color:var(--ks-muted);font-size:14px}
/* schedule */
.ks-day{margin-bottom:36px}.ks-day h3{margin-bottom:12px}
.ks-slot{display:grid;grid-template-columns:110px 1fr auto;gap:16px;padding:16px 0;border-bottom:1px solid var(--ks-line);align-items:baseline}
.ks-slot time{font-weight:700;color:var(--ks-accent)}.ks-slot span{color:var(--ks-muted);font-size:14px}
@media(max-width:620px){.ks-slot{grid-template-columns:80px 1fr}.ks-slot span:last-child{grid-column:2}}
/* detail */
.ks-detail{display:grid;grid-template-columns:1.1fr 1fr;gap:56px;align-items:start}
.ks-detail .ks-art.main{aspect-ratio:4/3}
.ks-thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px}.ks-thumbs .ks-art{aspect-ratio:1/1}
.ks-detail .price{font-family:var(--ks-display);font-size:34px;margin-top:14px}
.ks-opts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.ks-opts button{font:inherit;font-size:14px;padding:9px 14px;border-radius:999px;border:1px solid var(--ks-line);background:var(--ks-surface);color:var(--ks-ink);cursor:pointer}
.ks-opts button[aria-pressed=true]{border-color:var(--ks-ink);background:var(--ks-ink);color:var(--ks-bg)}
@media(max-width:900px){.ks-detail{grid-template-columns:1fr}}
/* article */
.ks-article{max-width:760px;margin:0 auto}
.ks-article .ks-art{aspect-ratio:16/9;margin:32px 0}
.ks-article p{font-size:19px;line-height:1.75;margin-top:22px;font-family:Georgia,'Iowan Old Style',serif}
.ks-article blockquote{margin:36px 0;padding-left:24px;border-left:3px solid var(--ks-accent);font-family:var(--ks-display);font-style:var(--ks-display-style);font-size:28px;line-height:1.3}
/* rates */
.ks-table{width:100%;border-collapse:collapse;font-size:15px;background:var(--ks-surface);border-radius:var(--ks-r);overflow:hidden}
.ks-table th,.ks-table td{text-align:left;padding:16px 18px;border-bottom:1px solid var(--ks-line)}
.ks-table th{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--ks-muted);background:var(--ks-soft)}
.ks-scroll{overflow-x:auto;border:1px solid var(--ks-line);border-radius:var(--ks-r)}
/* donate */
.ks-amts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.ks-amts button{font:inherit;font-weight:700;padding:16px 0;border-radius:var(--ks-r);border:1.5px solid var(--ks-line);background:var(--ks-bg);color:var(--ks-ink);cursor:pointer}
.ks-amts button[aria-pressed=true]{border-color:var(--ks-accent);background:var(--ks-soft);color:var(--ks-accent)}
/* cart */
.ks-line{display:grid;grid-template-columns:72px 1fr auto;gap:16px;align-items:center;padding:16px 0;border-bottom:1px solid var(--ks-line)}
.ks-line .ks-art{aspect-ratio:1/1}
.ks-qty{display:inline-flex;align-items:center;border:1px solid var(--ks-line);border-radius:999px}
.ks-qty button{font:inherit;width:32px;height:32px;border:0;background:none;color:inherit;cursor:pointer}
.ks-sum div{display:flex;justify-content:space-between;padding:8px 0}.ks-sum .tot{font-weight:700;font-size:18px;border-top:1px solid var(--ks-line);margin-top:6px;padding-top:14px}
/* footer */
.ks-foot{background:var(--ks-ink);color:var(--ks-bg);padding:72px 0 32px;margin-top:0}
.ks-foot-top{display:grid;grid-template-columns:1.4fr repeat(var(--ks-cols),1fr);gap:40px}
@media(max-width:900px){.ks-foot-top{grid-template-columns:1fr 1fr}}
.ks-foot h4{font:600 13px/1 var(--kw-inter,system-ui);letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px;opacity:.7;font-style:normal}
.ks-foot ul{list-style:none;padding:0;margin:0;display:grid;gap:10px;font-size:15px}
.ks-foot a{opacity:.85}.ks-foot a:hover{opacity:1;text-decoration:underline}
.ks-foot .blurb{opacity:.75;margin:14px 0 20px;max-width:36ch;font-size:15px}
.ks-foot .ks-ph{color:var(--ks-bg);border-color:color-mix(in srgb,var(--ks-bg) 50%,transparent);background:transparent}
.ks-social{display:flex;gap:10px}.ks-social a{width:38px;height:38px;border-radius:50%;border:1px solid color-mix(in srgb,var(--ks-bg) 25%,transparent);display:grid;place-items:center}
.ks-news{display:flex;gap:8px;margin-top:10px}.ks-news input{flex:1;min-width:0;padding:11px 14px;border-radius:var(--ks-r);border:1px solid color-mix(in srgb,var(--ks-bg) 25%,transparent);background:transparent;color:inherit;font:inherit}
.ks-legal{margin-top:56px;padding-top:24px;border-top:1px solid color-mix(in srgb,var(--ks-bg) 18%,transparent);display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;font-size:13px;opacity:.75}
.ks-legal nav{display:flex;flex-wrap:wrap;gap:18px}
.ks-legal button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline}
.ks-cookie{position:fixed;left:16px;right:16px;bottom:16px;z-index:50;max-width:520px;background:var(--ks-surface);color:var(--ks-ink);border:1px solid var(--ks-line);border-radius:calc(var(--ks-r) + 4px);padding:20px;box-shadow:0 30px 60px -20px rgba(0,0,0,.4)}
.ks-cookie p{font-size:14px;color:var(--ks-muted);margin:6px 0 14px}
.ks-cookie div{display:flex;flex-wrap:wrap;gap:8px}
.ks-skip{position:absolute;left:-999px}.ks-skip:focus{left:16px;top:16px;z-index:99;background:var(--ks-ink);color:var(--ks-bg);padding:10px 14px;border-radius:8px}
.ks a:focus-visible,.ks button:focus-visible,.ks summary:focus-visible{outline:2px solid var(--ks-accent);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.ks *{transition:none!important}}
`;
