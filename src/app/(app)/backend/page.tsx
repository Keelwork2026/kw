import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "Backend Studio" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="backend" searchParams={await searchParams} />;
}
