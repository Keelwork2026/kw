import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "Hosting and Infrastructure" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="hosting" searchParams={await searchParams} />;
}
