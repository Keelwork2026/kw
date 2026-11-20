/**
 * Runs inside the project's sandbox (browser runtime image) against the
 * sandbox's own dev server and saves real PNG screenshots into the app.
 * Reads .keelwork/media/config.json; writes .keelwork/media/out.json.
 */
export const CAPTURE_SCRIPT = String.raw`import fs from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const cfg = JSON.parse(fs.readFileSync(".keelwork/media/config.json", "utf8"));
const out = { available: false, reason: null, shots: [] };
let chromium;
try {
  const require = createRequire(import.meta.url);
  const entry = require.resolve("playwright", { paths: [process.env.NODE_PATH || "/usr/local/lib/node_modules", process.cwd() + "/node_modules"] });
  const mod = await import(pathToFileURL(entry).href);
  ({ chromium } = mod.default ?? mod);
} catch { out.reason = "no-browser"; }
if (chromium) {
  let browser;
  try { browser = await chromium.launch({ headless: true }); out.available = true; } catch (e) { out.reason = "Chromium couldn't start: " + String(e.message || e).split("\n")[0].slice(0, 160); }
  if (browser) {
    fs.mkdirSync("public/screenshots", { recursive: true });
    for (const s of cfg.shots) {
      const ctx = await browser.newContext({ viewport: { width: s.width, height: s.width < 500 ? 844 : s.width < 1000 ? 1180 : 900 }, deviceScaleFactor: s.width < 1000 ? 2 : 1, isMobile: s.width < 500, hasTouch: s.width < 1000, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      let ok = true, status = null;
      try {
        const r = await page.goto(new URL(s.path, cfg.base).href, { waitUntil: "networkidle", timeout: 30000 });
        status = r ? r.status() : null;
        if (status === null || status >= 400) ok = false;
        await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-next-badge-root]{display:none!important}*{caret-color:transparent!important}" }).catch(() => {});
        await page.waitForTimeout(800);
        if (ok) await page.screenshot({ path: s.file, type: "png" });
      } catch (e) { ok = false; }
      out.shots.push({ path: s.path, width: s.width, file: s.file, ok, status });
      await ctx.close();
    }
    await browser.close();
  }
}
fs.writeFileSync(".keelwork/media/out.json", JSON.stringify(out));
`;
