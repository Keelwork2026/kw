import { CardGridSkeleton, HeaderSkeleton, Loading } from "@/components/skeletons";

export default function ConnectorsLoading() {
  return <Loading label="Loading connectors"><HeaderSkeleton /><div className="kw-skeleton mb-8 h-28 w-full rounded-[22px]" /><CardGridSkeleton count={6} thumb={false} /></Loading>;
}
