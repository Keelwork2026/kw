"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordMfaEvent } from "../actions";

type Factor = { id: string; status: string; friendly_name?: string | null };
type State = { kind: "idle" } | { kind: "busy" } | { kind: "ok"; message: string } | { kind: "error"; message: string };

/** Enrol, verify and remove a TOTP factor through Supabase Auth. */
export function MfaPanel() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrol, setEnrol] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const load = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setState({ kind: "error", message: "Couldn't load your authenticators." }); return; }
    setFactors(data.totp as Factor[]);
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);

  async function start() {
    setState({ kind: "busy" });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}` });
    if (error) { setState({ kind: "error", message: "Couldn't start setup. Try again." }); return; }
    setEnrol({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setState({ kind: "idle" });
  }
  async function verify() {
    if (!enrol || !/^\d{6}$/.test(code)) { setState({ kind: "error", message: "Enter the 6-digit code." }); return; }
    setState({ kind: "busy" });
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrol.id, code });
    if (error) { setState({ kind: "error", message: "That code didn't work. Try the current one." }); return; }
    await recordMfaEvent("enrolled");
    setEnrol(null); setCode("");
    setState({ kind: "ok", message: "Two-step verification is on." });
    await load();
  }
  async function remove(id: string) {
    if (!window.confirm("Remove this authenticator? You'll sign in with just your password.")) return;
    setState({ kind: "busy" });
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) { setState({ kind: "error", message: "Couldn't remove it. You may need to verify with a code first." }); return; }
    await recordMfaEvent("removed");
    setState({ kind: "ok", message: "Authenticator removed." });
    await load();
  }

  const verified = factors?.filter((f) => f.status === "verified") ?? [];
  return (
    <section className="panel p-6" aria-labelledby="mfa">
      <h2 id="mfa" className="text-xl">Two-step verification</h2>
      {factors === null ? <p className="mt-2 text-sm text-muted" aria-busy="true">Loading…</p> : null}
      {verified.length ? (
        <ul className="mt-3 grid gap-2 text-sm">
          {verified.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2"><span>{f.friendly_name ?? "Authenticator app"}</span>
              <button className="btn btn-danger min-h-9 px-3 text-xs" onClick={() => void remove(f.id)} disabled={state.kind === "busy"}>Remove</button></li>
          ))}
        </ul>
      ) : factors !== null && !enrol ? (
        <>
          <p className="mt-1 text-sm text-muted">Add an authenticator app for a second step at sign-in.</p>
          <button className="btn btn-primary mt-4" onClick={() => void start()} disabled={state.kind === "busy"}>{state.kind === "busy" ? "Starting…" : "Set up authenticator"}</button>
        </>
      ) : null}
      {enrol ? (
        <div className="mt-4 grid gap-3">
          {/* The QR code is an SVG data URL returned by Supabase. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrol.qr} alt="QR code for your authenticator app" width={180} height={180} className="rounded-xl bg-white p-2" />
          <p className="text-xs text-muted">Can&apos;t scan? Enter this key: <code className="break-all">{enrol.secret}</code></p>
          <label className="label" htmlFor="mfa-code">6-digit code</label>
          <input id="mfa-code" className="input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
          <button className="btn btn-gradient" onClick={() => void verify()} disabled={state.kind === "busy"}>{state.kind === "busy" ? "Verifying…" : "Verify and turn on"}</button>
        </div>
      ) : null}
      {state.kind === "ok" ? <p role="status" className="mt-3 text-sm text-success">{state.message}</p> : null}
      {state.kind === "error" ? <p role="alert" className="mt-3 text-sm text-danger">{state.message}</p> : null}
    </section>
  );
}
