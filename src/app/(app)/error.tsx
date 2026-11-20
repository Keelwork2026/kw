"use client";
import Link from "next/link";
import { Simple } from "@/components/simple/simple";

/** When a page fails to load: what happened, that work is safe, and what to do next. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="panel mx-auto mt-10 grid max-w-lg gap-3 p-6 text-center">
      <h1 className="text-2xl"><Simple simple="Oops — this page didn't open">This page couldn&apos;t load</Simple></h1>
      <p className="text-muted">
        <Simple simple="Something went wrong while opening this page. Your work is safe. Try again, or go back home.">
          Something went wrong while loading it. Nothing you saved was lost. Try again, or go back to the dashboard.
        </Simple>
      </p>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={reset} className="btn btn-primary"><Simple simple="Try again">Retry</Simple></button>
        <Link href="/dashboard" className="btn btn-secondary"><Simple simple="Go home">Dashboard</Simple></Link>
      </div>
    </div>
  );
}
