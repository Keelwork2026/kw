import { HeaderSkeleton, Loading, StatSkeleton, CardGridSkeleton } from "@/components/skeletons";

export default function AppLoading() {
  return <Loading label="Loading"><HeaderSkeleton /><StatSkeleton /><div className="mt-8"><CardGridSkeleton count={3} thumb={false} /></div></Loading>;
}
