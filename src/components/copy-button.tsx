"use client";
import { useState } from "react";
import { Icon } from "./icons";

/** Copies text and says so ("Copied"), or says it couldn't — never silently. */
export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState("done"); } catch { setState("failed"); }
    setTimeout(() => setState("idle"), 2000);
  };
  return (
    <button type="button" onClick={copy} className={`inline-flex items-center gap-1 font-semibold ${state === "failed" ? "text-danger" : "text-accent"} hover:underline ${className}`}>
      <Icon name={state === "done" ? "check" : "copy"} size={15} className={state === "done" ? "kw-pop" : ""} />
      <span aria-live="polite">{state === "done" ? "Copied" : state === "failed" ? "Couldn't copy — select the link instead" : label}</span>
    </button>
  );
}
