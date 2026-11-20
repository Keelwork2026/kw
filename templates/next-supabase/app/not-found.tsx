import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "6rem 1.5rem" }} data-kw-source="app/not-found.tsx:5">
      <h1 style={{ fontSize: "2rem", letterSpacing: "-0.03em" }} data-kw-source="app/not-found.tsx:6">This page doesn&apos;t exist</h1>
      <p data-kw-source="app/not-found.tsx:7">The link may be out of date, or the address mistyped.</p>
      <p data-kw-source="app/not-found.tsx:8"><Link href="/">Go to the home page</Link></p>
    </main>
  );
}
