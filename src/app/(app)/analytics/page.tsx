import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "Analytics" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="analytics" searchParams={await searchParams} />;
}
