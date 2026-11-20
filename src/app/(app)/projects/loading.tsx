import { CardGridSkeleton, HeaderSkeleton, Loading } from "@/components/skeletons";

export default function ProjectsLoading() {
  return <Loading label="Loading your projects"><HeaderSkeleton /><CardGridSkeleton /></Loading>;
}
