// k6 smoke test against staging: k6 run -e BASE_URL=https://staging.keelwork.example loadtest/k6-smoke.js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    smoke: { executor: "ramping-vus", startVUs: 1, stages: [{ duration: "30s", target: 20 }, { duration: "1m", target: 20 }, { duration: "15s", target: 0 }] },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800", "p(99)<1500"],
    "checks{page:health}": ["rate==1"],
    "checks{page:ready}": ["rate>0.99"],
  },
};

const BASE = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  check(http.get(`${BASE}/api/health`), { "health is 200": (r) => r.status === 200 }, { page: "health" });
  check(http.get(`${BASE}/api/ready`), { "ready is 200": (r) => r.status === 200 }, { page: "ready" });
  check(http.get(`${BASE}/`), { "home is 200": (r) => r.status === 200, "home has CSP": (r) => Boolean(r.headers["Content-Security-Policy"]) }, { page: "home" });
  check(http.get(`${BASE}/pricing`), { "pricing is 200": (r) => r.status === 200 }, { page: "pricing" });
  check(http.get(`${BASE}/sign-in`), { "sign-in is 200": (r) => r.status === 200 }, { page: "sign-in" });
  check(http.get(`${BASE}/dashboard`, { redirects: 0 }), { "app redirects anonymous users": (r) => r.status === 307 || r.status === 302 }, { page: "auth" });
  sleep(1);
}
