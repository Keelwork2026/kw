// Keelwork QA browser suite. Runs inside the project's sandbox with a
// headless Chromium (Playwright) against the sandbox dev server only.
import fs from "node:fs";

const cfg = JSON.parse(fs.readFileSync(".keelwork/qa/config.json", "utf8"));
const result = { available: false, engine: null, reason: null, pages: [] };
let chromium;
try {
  ({ chromium } = await import(process.cwd() + "/.keelwork/qa-browser/node_modules/playwright/index.mjs"));
} catch (e) {
  result.reason = "The browser runtime isn't installed in this sandbox.";
}
if (chromium) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    result.available = true;
    result.engine = `Chromium ${browser.version()}`;
  } catch (e) {
    result.reason = `Chromium couldn't start in this sandbox (${String(e.message || e).split("\n")[0].slice(0, 160)}). The sandbox image needs the browser's system libraries.`;
  }
  if (browser) {
    for (const path of cfg.browserPaths) {
      for (const width of cfg.viewports) {
        const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 780 : 900 }, deviceScaleFactor: 1, isMobile: width < 500, hasTouch: width < 800 });
        const page = await ctx.newPage();
        const consoleErrors = [];
        page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
        page.on("pageerror", (e) => consoleErrors.push(String(e.message || e)));
        await page.addInitScript(() => {
          window.__kw = { lcp: null, cls: 0 };
          try {
            new PerformanceObserver((l) => { const e = l.getEntries(); if (e.length) window.__kw.lcp = e[e.length - 1].startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
            new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__kw.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
          } catch { /* observers unsupported */ }
        });
        const t0 = Date.now();
        let ok = true;
        try { await page.goto(new URL(path, cfg.base).href, { waitUntil: "networkidle", timeout: 25000 }); } catch { ok = false; }
        const loadMs = Date.now() - t0;
        let m = { overflowX: 0, smallTargets: 0, lcp: null, cls: null };
        try {
          await page.waitForTimeout(600);
          m = await page.evaluate(() => {
            const overflowX = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
            let smallTargets = 0;
            for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button]")) {
              const r = el.getBoundingClientRect();
              const s = getComputedStyle(el);
              if (!r.width || !r.height || s.visibility === "hidden" || s.display === "none") continue;
              if (el.tagName === "A" && el.closest("p, li") && (el.textContent || "").trim().length) continue; // inline links are exempt
              if (r.width < 24 || r.height < 24) smallTargets++;
            }
            return { overflowX, smallTargets, lcp: window.__kw.lcp, cls: Math.round(window.__kw.cls * 1000) / 1000 };
          });
        } catch { ok = false; }
        let focusMissing = null;
        if (ok && width >= 1000) {
          focusMissing = 0;
          for (let i = 0; i < 15; i++) {
            await page.keyboard.press("Tab");
            const visible = await page.evaluate(() => {
              const el = document.activeElement;
              if (!el || el === document.body) return true;
              const s = getComputedStyle(el);
              return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== "none");
            }).catch(() => true);
            if (!visible) focusMissing++;
          }
        }
        let screenshot;
        if (ok && path === cfg.browserPaths[0]) {
          try { screenshot = "data:image/jpeg;base64," + (await page.screenshot({ type: "jpeg", quality: 35 })).toString("base64"); } catch { /* no screenshot */ }
        }
        result.pages.push({ path, viewport: width, ok, overflowX: m.overflowX, consoleErrors: consoleErrors.slice(0, 10).map((x) => x.slice(0, 400)), smallTargets: m.smallTargets, focusMissing, loadMs, lcp: m.lcp, cls: m.cls, screenshot });
        await ctx.close();
      }
    }
    await browser.close();
  }
}
fs.writeFileSync(".keelwork/qa/browser.json", JSON.stringify(result));
console.log(`browser: ${result.available ? result.engine : result.reason}`);
