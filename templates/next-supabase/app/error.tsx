"use client";

import Link from "next/link";

/** Shown when a page throws. The error's details stay in the server logs. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "6rem 1.5rem" }} data-kw-source="app/error.tsx:8">
      <h1 style={{ fontSize: "2rem", letterSpacing: "-0.03em" }} data-kw-source="app/error.tsx:9">Something went wrong</h1>
      <p data-kw-source="app/error.tsx:10">This page couldn&apos;t load. Please try again.</p>
      <p data-kw-source="app/error.tsx:11">
        <button type="button" onClick={() => reset()} data-kw-source="app/error.tsx:12">Try again</button>{" "}
        <Link href="/" data-kw-source="app/error.tsx:13">Go to the home page</Link>
      </p>
    </main>
  );
}
