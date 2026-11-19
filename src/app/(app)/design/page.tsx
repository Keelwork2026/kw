import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "Design Studio" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="design" searchParams={await searchParams} />;
}
