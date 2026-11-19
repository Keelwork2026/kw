import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "AI Builder" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="builder" searchParams={await searchParams} />;
}
