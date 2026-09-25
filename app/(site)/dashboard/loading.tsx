import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12" role="status" aria-label="Loading dashboard">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full bg-white/5" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 rounded-lg bg-white/5" />
          <Skeleton className="h-4 w-40 rounded bg-white/5" />
        </div>
      </div>
      <Skeleton className="mt-6 h-52 w-full rounded-3xl bg-white/5" />
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
