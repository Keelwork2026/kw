import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "Security Centre" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="security" searchParams={await searchParams} />;
}
