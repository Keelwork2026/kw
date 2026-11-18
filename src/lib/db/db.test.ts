import { test } from "node:test";
import assert from "node:assert/strict";
import { splitStatements, buildSchema } from "./schema";
import { explainMigration, migrationRisk, unsupportedReason, checkConnectionString, applyMigration, checksum, type SqlClient } from "./apply";
import { analyzeSource, routePath, candidateFiles } from "@/lib/backend/routes";
import { checkMigration } from "@/lib/agents/policy";

test("splitStatements respects strings, dollar quotes and comments", () => {
  const sql = `create table a (x text default 'a;b'); -- c;d
create function f() returns void language plpgsql as $fn$ begin perform 1; end $fn$;
/* ; */ insert into a values ($$;$$);;`;
  const parts = splitStatements(sql);
  assert.equal(parts.length, 3);
  assert.match(parts[1]!, /perform 1; end/);
});

test("buildSchema replays tables, columns, keys, RLS and policies", () => {
  const schema = buildSchema([
    { name: "002.sql", sql: `alter table public.classes add column capacity int not null default 10;
alter table public.classes enable row level security;
create policy "members read" on public.classes for select to authenticated using (auth.uid() is not null);
alter table bookings drop column note; drop table scratch;` },
    { name: "001.sql", sql: `create table public.classes (id uuid primary key default gen_random_uuid(), title text not null, starts_at timestamptz);
create table bookings (id bigint, class_id uuid references public.classes(id), note text, primary key (id));
create table scratch (x int);` },
  ]);
  assert.deepEqual(schema.tables.map((t) => t.name), ["bookings", "classes"]);
  const classes = schema.tables.find((t) => t.name === "classes")!;
  assert.deepEqual(classes.columns.map((c) => `${c.name}:${c.type}:${c.nullable ? "null" : "notnull"}`), ["id:uuid:notnull", "title:text:notnull", "starts_at:timestamptz:null", "capacity:int:notnull"]);
  assert.equal(classes.columns[0]!.default, "gen_random_uuid()");
  assert.equal(classes.rls, true);
  assert.deepEqual(classes.policies[0], { name: "members read", command: "select", roles: "authenticated", using: "auth.uid() is not null", check: null });
  const bookings = schema.tables.find((t) => t.name === "bookings")!;
  assert.equal(bookings.rls, false);
  assert.ok(bookings.columns.find((c) => c.name === "id")!.primaryKey);
  assert.equal(bookings.columns.find((c) => c.name === "class_id")!.references, "classes.id");
  assert.ok(!bookings.columns.some((c) => c.name === "note"));
});

test("explainMigration gives plain language and risk per statement", () => {
  const ex = explainMigration("create table notes (id int); alter table notes enable row level security; alter table notes drop column body; drop table old;");
  assert.equal(ex[0]!.explanation, "Creates the table notes.");
  assert.equal(ex[0]!.risk, "additive", "RLS enabled later in the file counts");
  assert.equal(explainMigration("create table bare (id int);")[0]!.risk, "denied");
  assert.match(ex[1]!.explanation, /row-level security/);
  assert.equal(ex[2]!.risk, "destructive");
  assert.match(ex[3]!.explanation, /Deletes the table old/);
  assert.equal(migrationRisk("create table n (id int); alter table n enable row level security;"), "additive");
  assert.equal(migrationRisk("alter table n disable row level security;"), "denied");
});

test("unsupported statements are explained", () => {
  assert.match(unsupportedReason("create index concurrently i on t(x)")!, /CONCURRENTLY/);
  assert.match(unsupportedReason("BEGIN")!, /transaction control/);
  assert.match(unsupportedReason("vacuum full t")!, /VACUUM/);
  assert.match(unsupportedReason("alter type mood add value 'meh'")!, /separate migration/);
  assert.equal(unsupportedReason("create index i on t(x)"), null);
});

test("connection strings must point at public hosts", async () => {
  const resolver = async (h: string) => (h === "db.example.com" ? [{ address: "34.1.2.3" }] : h === "internal.example.com" ? [{ address: "34.1.2.3" }, { address: "10.0.0.8" }] : []);
  assert.deepEqual(await checkConnectionString("postgres://u:p@db.example.com:5432/app", resolver as never), { ok: true, host: "db.example.com" });
  assert.equal((await checkConnectionString("postgres://u:p@internal.example.com/app", resolver as never)).ok, false);
  assert.equal((await checkConnectionString("postgres://u:p@127.0.0.1/app", resolver as never)).ok, false);
  assert.equal((await checkConnectionString("postgres://u:p@[::1]/app", resolver as never)).ok, false);
  assert.equal((await checkConnectionString("mysql://u:p@db.example.com/app", resolver as never)).ok, false);
});

function fakeDb() {
  const ledger = new Map<string, string>();
  const ran: string[] = [];
  const client: SqlClient = {
    begin: async (fn) => {
      const snapshot = new Map(ledger), before = ran.length;
      try {
        return await fn({ unsafe: async (q, params) => {
          ran.push(q);
          if (q.startsWith("select checksum")) return ledger.has(String(params![0])) ? [{ checksum: ledger.get(String(params![0])) }] : [];
          if (q.startsWith("insert into public._keelwork_migrations")) ledger.set(String(params![0]), String(params![1]));
          if (q.includes("FAIL")) throw new Error("syntax error");
          return [];
        } });
      } catch (e) { ledger.clear(); for (const [k, v] of snapshot) ledger.set(k, v); ran.splice(before); throw e; }
    },
  };
  return { client, ledger, ran };
}

test("the applier applies once in a transaction and refuses drift and double-apply", async () => {
  const db = fakeDb();
  const file = { filename: "001.sql", content: "create table n (id int); alter table n enable row level security;" };
  assert.deepEqual(await applyMigration(db.client, file), { checksum: checksum(file.content) });
  assert.ok(db.ran.includes(file.content));
  await assert.rejects(applyMigration(db.client, file), /already applied/);
  await assert.rejects(applyMigration(db.client, { ...file, content: file.content + " " }), /drift/);
  await assert.rejects(applyMigration(db.client, { filename: "002.sql", content: "alter table n disable row level security;" }), /refused/);
  await assert.rejects(applyMigration(db.client, { filename: "003.sql", content: "create index concurrently i on n(id);" }), /unsupported/);
  await assert.rejects(applyMigration(db.client, { filename: "004.sql", content: "select FAIL;" }), /syntax/);
  assert.ok(!db.ledger.has("004.sql"), "a failed migration leaves no ledger row");
});

test("platform schemas are off limits but auth.users can be referenced", () => {
  assert.equal(checkMigration("create table p (id uuid references auth.users(id)); alter table p enable row level security; create policy x on p using (auth.uid() = id);").risk, "additive");
  assert.equal(checkMigration("create trigger t after insert on auth.users for each row execute function f();").risk, "denied");
  assert.equal(checkMigration("update storage.buckets set public = true where id = 'x';").risk, "denied");
  assert.equal(checkMigration("create or replace function keelwork.x() returns int language sql as $$ select 1 $$;").risk, "denied");
});

test("backend route analysis", () => {
  assert.equal(routePath("app/(shop)/api/orders/[id]/route.ts"), "/api/orders/[id]");
  assert.equal(routePath("src/app/route.ts"), "/");
  assert.deepEqual(candidateFiles(["app/api/x/route.ts", "app/page.tsx", "lib/a.test.ts", "README.md"]), ["app/api/x/route.ts", "app/page.tsx"]);
  const open = analyzeSource("app/api/orders/route.ts", "export async function POST(req: Request) { const b = await req.json(); return Response.json(b); }\nexport function GET() {}")!;
  assert.deepEqual(open.methods, ["POST", "GET"]);
  assert.deepEqual(open.issues, ["Doesn't check who the caller is.", "Doesn't validate its input."]);
  const safe = analyzeSource("app/api/orders/route.ts", "export async function POST(req: Request) { const { data } = await supabase.auth.getUser(); const body = Schema.safeParse(await req.json()); }")!;
  assert.deepEqual(safe.issues, []);
  const leaky = analyzeSource("components/admin.tsx", `"use client";\nconst k = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;`)!;
  assert.ok(leaky.clientReachable && leaky.serviceRole);
  assert.equal(leaky.issues.length, 2);
  const action = analyzeSource("app/actions.ts", `// comment\n"use server";\nexport async function save(f: FormData) { await db.insert(f.get("x")); }`)!;
  assert.equal(action.kind, "action");
  assert.equal(analyzeSource("lib/util.ts", "export const x = 1;"), null);
  assert.equal(analyzeSource("components/button.tsx", `"use client"; export function B() {}`), null);
});
