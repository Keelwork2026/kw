import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "Testing Centre" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="testing" searchParams={await searchParams} />;
}
