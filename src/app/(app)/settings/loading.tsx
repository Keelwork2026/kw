import { HeaderSkeleton, Loading, TableSkeleton } from "@/components/skeletons";

export default function SettingsLoading() {
  return <Loading label="Loading settings"><HeaderSkeleton /><TableSkeleton rows={4} /></Loading>;
}
