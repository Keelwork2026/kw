import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "API and Integrations" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="integrations" searchParams={await searchParams} />;
}
