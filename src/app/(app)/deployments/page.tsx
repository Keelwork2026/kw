import { SectionPicker } from "@/components/section-picker";

export const metadata = { title: "Deployment Centre" };

export default async function Page({ searchParams }: { searchParams: Promise<{ to?: string; at?: string; q?: string }> }) {
  return <SectionPicker slug="deployments" searchParams={await searchParams} />;
}
