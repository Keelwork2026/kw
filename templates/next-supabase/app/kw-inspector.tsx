"use client";
import { useEffect } from "react";
import { buildSelection, inspectorActive } from "../lib/inspector.ts";

/**
 * Design-mode inspector. Inactive unless this page is inside Keelwork's
 * preview frame with ?kw-inspect=1. Selections are posted only to the
 * Keelwork app origin, never to "*".
 */
export function KwInspector() {
  useEffect(() => {
    const appOrigin = process.env.NEXT_PUBLIC_KW_APP_ORIGIN;
    if (!inspectorActive(window.location.search, window.parent !== window, appOrigin)) return;
    let outlined: HTMLElement | null = null;
    const over = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (outlined) outlined.style.outline = "";
      outlined = el;
      el.style.outline = "2px solid #3d2bff";
    };
    const click = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage(buildSelection(e.target as unknown as Parameters<typeof buildSelection>[0]), appOrigin!);
    };
    document.addEventListener("mouseover", over, true);
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("mouseover", over, true);
      document.removeEventListener("click", click, true);
      if (outlined) outlined.style.outline = "";
    };
  }, []);
  return null;
}
