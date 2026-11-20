import { CardGridSkeleton, HeaderSkeleton, Loading, StatSkeleton } from "@/components/skeletons";

export default function AutomationsLoading() {
  return <Loading label="Loading automations"><HeaderSkeleton /><StatSkeleton /><div className="mt-10"><CardGridSkeleton count={2} thumb={false} /></div></Loading>;
}
