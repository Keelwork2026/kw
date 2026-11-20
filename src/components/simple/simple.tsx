/**
 * Simple Mode building blocks. Both wordings are rendered and CSS shows one,
 * keyed on <html data-simple="on">, so switching is instant: no reload, no
 * lost form input, no re-fetch. Works in server and client components.
 */
import { SIMPLE_ACTIONS, SIMPLE_STATUS, SIMPLE_TITLES } from "@/lib/simple/content";

/** Inline text with a simple alternative. Renders once when both are the same. */
export function Simple({ simple, children }: { simple?: React.ReactNode; children: React.ReactNode }) {
  if (simple === undefined || simple === null || simple === children) return <>{children}</>;
  return (<><span className="kw-std">{children}</span><span className="kw-simple">{simple}</span></>);
}

/** Content only shown in Simple Mode (block level). */
export function OnlySimple({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`kw-simple-block ${className}`}>{children}</div>;
}

/** Content only shown in standard mode (block level). */
export function OnlyStandard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`kw-std-block ${className}`}>{children}</div>;
}

/** A button or action label in simple words, when there is one. */
export function ActionLabel({ label }: { label: string }) {
  return <Simple simple={SIMPLE_ACTIONS[label]}>{label}</Simple>;
}

export function StatusWords({ status }: { status: string }) {
  const std = status.replace(/_/g, " ");
  return <Simple simple={SIMPLE_STATUS[status]}>{std}</Simple>;
}

export function simpleTitle(title: string) {
  return SIMPLE_TITLES[title];
}
