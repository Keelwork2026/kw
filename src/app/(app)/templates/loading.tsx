import { CardGridSkeleton, HeaderSkeleton, Loading } from "@/components/skeletons";

export default function TemplatesLoading() {
  return <Loading label="Loading templates"><HeaderSkeleton /><div className="kw-skeleton mb-8 h-36 w-full rounded-[22px]" /><CardGridSkeleton count={6} /></Loading>;
}
