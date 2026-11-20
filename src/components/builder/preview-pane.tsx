"use client";
import { useEffect, useState } from "react";
import { parseSelectionMessage, type DesignSelection, VISUAL_REQUEST_MAX } from "@/lib/design/bridge";
import { ActionForm } from "@/components/action-form";
import { requestVisualEdit } from "@/app/(app)/projects/[id]/design-actions";

export function PreviewPane(props: {
  projectId: string;
  brokerReady: boolean;
  sandboxStatus: string | null;
  sandboxError: string | null;
  previewUrl: string | null;
  previewInspectUrl?: string | null;
  previewOrigin: string | null;
  canDesign: boolean;
  designAvailable?: boolean;
}) {
  const [design, setDesign] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selection, setSelection] = useState<DesignSelection | null>(null);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!design) return;
    const onMessage = (e: MessageEvent) => {
      const sel = parseSelectionMessage(e.data, e.origin, props.previewOrigin);
      if (sel) setSelection(sel);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [design, props.previewOrigin]);

  if (!props.brokerReady) return <p className="notice">The sandbox service isn&apos;t connected to this installation, so there&apos;s no live preview. The code is still built and exportable.</p>;
  if (props.sandboxStatus !== "running") {
    return <p className="notice">{props.sandboxStatus === "failed" ? `The sandbox failed to start: ${props.sandboxError ?? "unknown error"}` : "The sandbox isn't running. Start it to see a live preview."}</p>;
  }
  if (!props.previewUrl) return <p className="notice">Previews aren&apos;t configured (PREVIEW_BASE_DOMAIN and PREVIEW_SECRET). The sandbox is running; you can still edit code and run tests.</p>;

  const src = design && props.previewInspectUrl ? props.previewInspectUrl : props.previewUrl;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 text-sm font-medium"><span aria-hidden className="kw-live h-2.5 w-2.5 rounded-full bg-success" />Live preview of your app</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <div role="group" aria-label="Preview size" className="flex rounded-full border border-border p-0.5">
            {(["desktop", "tablet", "mobile"] as const).map((d) => <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${device === d ? "bg-brand text-brand-contrast" : "text-muted hover:text-text"}`}>{d}</button>)}
          </div>
          {props.canDesign && props.designAvailable !== false && props.previewInspectUrl ? (
            <button type="button" className={`btn min-h-10 ${design ? "btn-primary" : "btn-secondary"}`} aria-pressed={design} onClick={() => { setDesign(!design); setSelection(null); setReloadKey((k) => k + 1); setLoading(true); }}>Design mode</button>
          ) : null}
          <button type="button" className="btn btn-secondary min-h-10" onClick={() => { setReloadKey((k) => k + 1); setLoading(true); }}>Restart</button>
          <a className="btn btn-secondary min-h-10" href={props.previewUrl} target="_blank" rel="noopener noreferrer">Open in new tab</a>
        </div>
      </div>
      {design && selection ? (
        <div className="design-bar kw-fade rounded-2xl p-4">
          <p className="text-sm"><strong>&lt;{selection.tag}&gt;</strong> “{selection.text.slice(0, 80) || "no text"}”{selection.source ? <> · <code className="font-mono text-xs">{selection.source.file}:{selection.source.line}</code></> : null}</p>
          <ActionForm action={requestVisualEdit} submitLabel="Ask the agents" pendingLabel="Planning…" pendingHint="The Software Architect is turning your request into a change" submitClassName="btn btn-gradient min-h-10" className="mt-2">
            <input type="hidden" name="projectId" value={props.projectId} />
            <input type="hidden" name="selection" value={JSON.stringify(selection)} />
            <label htmlFor="visual-request" className="sr-only">What should change?</label>
            <input id="visual-request" name="request" maxLength={VISUAL_REQUEST_MAX} required className="input" placeholder="Make this heading larger and use the brand colour" />
          </ActionForm>
          <button type="button" className="mt-2 text-sm font-semibold underline" onClick={() => setSelection(null)}>Clear</button>
        </div>
      ) : design ? <p className="design-bar rounded-2xl p-3 text-sm">Click any element in the preview to select it.</p> : null}
      <div className="relative mx-auto w-full transition-[max-width] duration-300" style={{ maxWidth: { desktop: "100%", tablet: "820px", mobile: "390px" }[device] }}>
        {loading && <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-surface/80 text-sm text-muted" role="status"><span className="animate-pulse">Loading your app…</span></div>}
        <iframe
          key={reloadKey}
          src={src}
          title="Live preview of your app"
          className={`w-full rounded-2xl border border-border bg-white ${device === "mobile" ? "h-[720px]" : "h-[560px]"}`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
