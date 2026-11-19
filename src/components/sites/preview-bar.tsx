"use client";

import { useEffect, useState } from "react";

/** A slim bar on full-screen template demos. Hidden inside Keelwork's own preview frames. */
export function PreviewBar({ name, useHref, detailHref }: { name: string; useHref: string; detailHref: string }) {
  const [framed, setFramed] = useState(true);
  const [closed, setClosed] = useState(false);
  useEffect(() => { try { setFramed(window.self !== window.top); } catch { setFramed(true); } }, []);
  if (framed || closed) return null;
  return (
    <div role="region" aria-label="Template preview" style={{ position: "fixed", left: "50%", bottom: 16, transform: "translateX(-50%)", zIndex: 60, display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 16px", borderRadius: 999, background: "#1c1b19", color: "#fff", font: "500 13px/1.2 var(--kw-inter, system-ui)", boxShadow: "0 20px 40px -16px rgba(0,0,0,.5)", maxWidth: "calc(100vw - 24px)" }}>
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Template preview: <b>{name}</b></span>
      <a href={detailHref} style={{ color: "#fff", opacity: 0.8, whiteSpace: "nowrap" }}>Details</a>
      <a href={useHref} style={{ background: "#fff", color: "#1c1b19", borderRadius: 999, padding: "8px 14px", fontWeight: 600, whiteSpace: "nowrap" }}>Use this template</a>
      <button type="button" aria-label="Hide preview bar" onClick={() => setClosed(true)} style={{ background: "none", border: 0, color: "#fff", opacity: 0.7, cursor: "pointer", padding: "4px 6px", fontSize: 16 }}>×</button>
    </div>
  );
}
