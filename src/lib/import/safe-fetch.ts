/**
 * SSRF-safe outbound requests, used by website import, agent net.fetch,
 * automations and integrations.
 *
 * DNS is resolved at connect time and EVERY resolved address is checked:
 * private, loopback, link-local (incl. cloud metadata 169.254.169.254),
 * CGNAT, multicast, reserved, IPv6 ULA/link-local and IPv4-mapped/NAT64
 * forms are refused. The connection then goes to the exact address that was
 * checked (no second lookup). Redirects are followed manually (at most 3),
 * each hop re-checked. Bodies are size-capped and content types checked.
 */
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SafeFetchError extends Error {}

function v4ToInt(ip: string): number {
  return ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
}
function inV4(ip: string, cidr: string): boolean {
  const [base, bits] = cidr.split("/");
  const mask = Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (v4ToInt(ip) & mask) === (v4ToInt(base!) & mask);
}
const BLOCKED_V4 = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24",
  "192.0.2.0/24", "192.88.99.0/24", "192.168.0.0/16", "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24",
  "224.0.0.0/4", "240.0.0.0/4", "255.255.255.255/32",
];

function expandV6(ip: string): number[] | null {
  let s = ip.toLowerCase().split("%")[0]!;
  let tail: number[] = [];
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (v4) {
    const n = v4ToInt(v4[1]!);
    tail = [(n >>> 16) & 0xffff, n & 0xffff];
    s = s.slice(0, -v4[1]!.length) + "0:0";
  }
  const [head, rest] = s.split("::");
  const h = head ? head.split(":") : [];
  const r = rest !== undefined ? (rest ? rest.split(":") : []) : null;
  const parts = r === null ? h : [...h, ...Array(8 - h.length - r.length).fill("0"), ...r];
  if (parts.length !== 8) return null;
  const nums = parts.map((p) => parseInt(p || "0", 16));
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 0xffff)) return null;
  if (tail.length) { nums[6] = tail[0]!; nums[7] = tail[1]!; }
  return nums;
}

/** True only for globally routable unicast addresses. */
export function isPublicAddress(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) return !BLOCKED_V4.some((c) => inV4(ip, c));
  if (fam !== 6) return false;
  const w = expandV6(ip);
  if (!w) return false;
  if (w.every((x) => x === 0)) return false; // ::
  if (w.slice(0, 7).every((x) => x === 0) && w[7] === 1) return false; // ::1
  const embedded = (hi: number, lo: number) => `${hi >>> 8}.${hi & 255}.${lo >>> 8}.${lo & 255}`;
  if (w.slice(0, 5).every((x) => x === 0) && w[5] === 0xffff) return isPublicAddress(embedded(w[6]!, w[7]!)); // ::ffff:a.b.c.d
  if (w.slice(0, 6).every((x) => x === 0)) return false; // deprecated IPv4-compatible
  if (w[0] === 0x64 && w[1] === 0xff9b && w.slice(2, 6).every((x) => x === 0)) return isPublicAddress(embedded(w[6]!, w[7]!)); // NAT64
  if ((w[0]! & 0xfe00) === 0xfc00) return false; // fc00::/7 ULA
  if ((w[0]! & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  if ((w[0]! & 0xff00) === 0xff00) return false; // multicast
  if (w[0] === 0x2001 && w[1] === 0x0db8) return false; // documentation
  if (w[0] === 0x0100 && w.slice(1, 4).every((x) => x === 0)) return false; // discard
  if (w[0] === 0x2002) return isPublicAddress(embedded(w[1]!, w[2]!)); // 6to4
  return true;
}

export type Resolver = (host: string) => Promise<{ address: string; family: number }[]>;
export type SafeRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  maxBytes?: number;
  timeoutMs?: number;
  /** Required content type, e.g. /^text\/html/. */
  accept?: RegExp;
  maxRedirects?: number;
  followRedirects?: boolean;
  allowHttp?: boolean;
  resolver?: Resolver;
  /** Test hook: where to actually connect for a checked address. */
  connectTo?: (address: string, port: number) => { host: string; port: number };
};
export type SafeResponse = { status: number; headers: Record<string, string | string[] | undefined>; body: Buffer; finalUrl: string };

const defaultResolver: Resolver = async (host) => lookup(host, { all: true, verbatim: true });

async function resolveChecked(host: string, resolver: Resolver): Promise<{ address: string; family: number }> {
  const literal = host.replace(/^\[|\]$/g, "");
  const addrs = isIP(literal) ? [{ address: literal, family: isIP(literal) }] : await resolver(host).catch(() => {
    throw new SafeFetchError(`couldn't resolve ${host}`);
  });
  if (addrs.length === 0) throw new SafeFetchError(`couldn't resolve ${host}`);
  for (const a of addrs) {
    if (!isPublicAddress(a.address)) throw new SafeFetchError(`${host} resolves to a private or reserved address`);
  }
  return addrs[0]!;
}

export async function safeRequest(rawUrl: string, o: SafeRequestOptions = {}): Promise<SafeResponse> {
  const maxBytes = o.maxBytes ?? 2_000_000;
  const maxRedirects = o.followRedirects === false ? 0 : Math.min(o.maxRedirects ?? 3, 3);
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new SafeFetchError("not a valid URL"); }
  const deadline = Date.now() + (o.timeoutMs ?? 15_000);

  for (let hop = 0; ; hop++) {
    if (url.protocol !== "https:" && !(o.allowHttp && url.protocol === "http:")) throw new SafeFetchError("only https URLs are allowed");
    if (url.username || url.password) throw new SafeFetchError("credentials in URLs are not allowed");
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    const target = await resolveChecked(url.hostname, o.resolver ?? defaultResolver);
    const dial = o.connectTo ? o.connectTo(target.address, port) : { host: target.address, port };
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new SafeFetchError("request timed out");

    const res = await new Promise<SafeResponse>((resolve, reject) => {
      const doRequest = url.protocol === "https:" ? httpsRequest : httpRequest;
      const req = doRequest({
        host: dial.host, port: dial.port, method: o.method ?? "GET", path: `${url.pathname}${url.search}`, agent: false,
        servername: isIP(url.hostname) ? undefined : url.hostname,
        headers: { "User-Agent": "KeelworkBot/1.0 (+https://keelwork.dev)", Accept: "*/*", ...o.headers, Host: url.host },
      }, (r) => {
        const status = r.statusCode ?? 0;
        if (status >= 300 && status < 400 && r.headers.location) {
          r.resume();
          resolve({ status, headers: r.headers, body: Buffer.alloc(0), finalUrl: url.toString() });
          return;
        }
        const type = String(r.headers["content-type"] ?? "");
        if (o.accept && !o.accept.test(type)) { r.destroy(); reject(new SafeFetchError(`unexpected content type ${type || "(none)"}`)); return; }
        const declared = Number(r.headers["content-length"]);
        if (Number.isFinite(declared) && declared > maxBytes) { r.destroy(); reject(new SafeFetchError(`response is larger than ${Math.round(maxBytes / 1_000_000)} MB`)); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        r.on("data", (c: Buffer) => {
          size += c.length;
          if (size > maxBytes) { r.destroy(); reject(new SafeFetchError(`response is larger than ${Math.round(maxBytes / 1_000_000)} MB`)); return; }
          chunks.push(c);
        });
        r.on("end", () => resolve({ status, headers: r.headers, body: Buffer.concat(chunks), finalUrl: url.toString() }));
        r.on("error", reject);
      });
      req.setTimeout(remaining, () => req.destroy(new SafeFetchError("request timed out")));
      req.on("error", (e) => reject(e instanceof SafeFetchError ? e : new SafeFetchError(`request failed: ${e.message}`)));
      if (o.body !== undefined) req.end(o.body); else req.end();
    });

    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      if (hop >= maxRedirects) throw new SafeFetchError(maxRedirects === 0 ? "redirects are not followed" : "too many redirects");
      try { url = new URL(String(res.headers.location), url); } catch { throw new SafeFetchError("invalid redirect"); }
      continue;
    }
    return res;
  }
}

export function safeFetch(url: string, o: Omit<SafeRequestOptions, "method" | "body"> = {}) {
  return safeRequest(url, { ...o, method: "GET" });
}
