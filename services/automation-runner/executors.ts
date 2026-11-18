/**
 * Outbound executors for workflow steps. Every call goes through the same
 * connect-time SSRF check as imports (safeRequest) with redirects off.
 * Email and Slack use the PROJECT's own Resend key and Slack webhook from
 * its vault — never a Keelwork-owned account.
 */
import { safeRequest, SafeFetchError, type SafeRequestOptions } from "../../src/lib/import/safe-fetch";
import { TemporaryError, type Executors } from "../../src/lib/automation/engine";

function classify(status: number, what: string): never {
  if (status === 429 || status >= 500) throw new TemporaryError(`${what} answered ${status}`);
  throw new Error(`${what} answered ${status}`);
}

export function createExecutors(secrets: Record<string, string>, opts: Pick<SafeRequestOptions, "resolver" | "connectTo" | "allowHttp"> = {}): Executors {
  const call = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }, what: string) => {
    try {
      return await safeRequest(url, { ...opts, method: init.method, headers: init.headers, body: init.body, followRedirects: false, maxBytes: 1_000_000, timeoutMs: 20_000 });
    } catch (e) {
      if (e instanceof SafeFetchError && /timed out|request failed|resolve/.test(e.message)) throw new TemporaryError(`${what}: ${e.message}`);
      throw e;
    }
  };
  return {
    async http(req) {
      const res = await call(req.url, { method: req.method, headers: req.headers, body: req.body }, "the server");
      if (res.status >= 400) classify(res.status, "the server");
      const text = res.body.toString("utf8");
      let json: unknown = null;
      try { json = JSON.parse(text); } catch { /* not JSON */ }
      return { status: res.status, json, text: text.slice(0, 20_000) };
    },
    async email(msg) {
      const key = secrets.RESEND_API_KEY;
      if (!key) throw new Error("add RESEND_API_KEY on the Secrets tab to send email");
      const to = msg.to.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
      const res = await call("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: msg.from, to, subject: msg.subject, text: msg.text }) }, "Resend");
      if (res.status >= 400) classify(res.status, "Resend");
      return { sent: to.length };
    },
    async slack(msg) {
      const hook = secrets.SLACK_WEBHOOK_URL;
      if (!hook) throw new Error("add SLACK_WEBHOOK_URL on the Secrets tab to post to Slack");
      if (!/^https:\/\/hooks\.slack\.com\//.test(hook)) throw new Error("SLACK_WEBHOOK_URL must be a hooks.slack.com URL");
      const res = await call(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: msg.text.slice(0, 4000) }) }, "Slack");
      if (res.status >= 400) classify(res.status, "Slack");
      return { posted: true };
    },
  };
}
