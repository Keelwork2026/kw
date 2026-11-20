import { Loading, TableSkeleton } from "@/components/skeletons";

/** Shown inside the project layout (name and tabs stay put) while a tab's content loads. */
export default function ProjectTabLoading() {
  return <Loading label="Loading"><div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"><TableSkeleton rows={4} /><div className="kw-skeleton aspect-video w-full rounded-[20px]" /></div></Loading>;
}
