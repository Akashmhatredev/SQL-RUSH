import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12" role="status" aria-label="Loading dashboard">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full shadow-clay-sm ring-4 ring-white" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-xl" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
      </div>
      <Skeleton className="clay mt-6 h-52 w-full rounded-[2rem] bg-clay" />
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="clay h-32 rounded-3xl bg-clay" />
        ))}
      </div>
    </div>
  );
}
