import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "Database Studio" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="database" searchParams={await searchParams} />;
}
