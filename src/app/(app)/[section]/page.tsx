import { notFound } from "next/navigation";
import { sectionBySlug } from "@/lib/nav";
import { PageHeader } from "@/components/page-header";

/**
 * Honest placeholder for a section that has no page yet. It never shows
 * fake controls — only which phase delivers the section. Every live
 * section has its own route, which takes precedence over this one.
 */
export default async function SectionPlaceholder({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const s = sectionBySlug(section);
  if (!s) notFound();
  return (
    <>
      <PageHeader title={s.label} description={s.description} />
      <div className="card max-w-xl">
        <p className="pill bg-surface-2">Arrives in Phase {s.phase}</p>
        <p className="mt-3 text-muted">This section isn&apos;t built yet. Nothing here pretends to work until it does.</p>
      </div>
    </>
  );
}
