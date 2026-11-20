"use client";
import { useState, useTransition } from "react";
import { sendSimpleFeedback } from "@/lib/simple/actions";

/** "Did this page make sense?" — two taps, an optional note, once per page. */
export function GuideFeedback({ pageKey }: { pageKey: string }) {
  const store = `kw.simple.feedback.${pageKey}`;
  const [answer, setAnswer] = useState<null | boolean>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const already = typeof window !== "undefined" && (() => { try { return window.localStorage.getItem(store) === "1"; } catch { return false; } })();
  if (already && !msg) return null;

  const send = (helpful: boolean, text?: string) => start(async () => {
    const r = await sendSimpleFeedback({ page: pageKey, helpful, note: text });
    setMsg(r.message);
    if (r.ok) { try { window.localStorage.setItem(store, "1"); } catch { /* fine */ } }
  });

  if (msg) return <p role="status" className="mt-4 border-t border-border pt-3 text-sm text-success">{msg}</p>;
  return (
    <div className="mt-4 border-t border-border pt-3 text-sm">
      {answer === false ? (
        <form onSubmit={(e) => { e.preventDefault(); send(false, note); }} className="grid gap-2">
          <label htmlFor={`fb-${pageKey}`} className="font-semibold">What was confusing? <span className="font-normal text-muted">(you can leave this empty)</span></label>
          <textarea id={`fb-${pageKey}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className="input" placeholder="For example: I didn't know which key to copy." />
          <div className="flex gap-2"><button type="submit" disabled={pending} className="btn btn-secondary min-h-10">{pending ? "Sending…" : "Send"}</button><button type="button" onClick={() => setAnswer(null)} className="text-sm font-semibold text-muted">Cancel</button></div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Did this page make sense?</span>
          <button type="button" disabled={pending} onClick={() => send(true)} className="kw-term">Yes</button>
          <button type="button" disabled={pending} onClick={() => setAnswer(false)} className="kw-term">Not really</button>
        </div>
      )}
    </div>
  );
}
