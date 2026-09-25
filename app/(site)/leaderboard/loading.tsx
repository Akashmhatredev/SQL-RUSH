import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-6 sm:pt-12" role="status" aria-label="Loading leaderboard">
      <Skeleton className="h-12 w-64 rounded-xl bg-white/5" />
      <Skeleton className="mt-6 h-11 w-full rounded-2xl bg-white/5" />
      <Skeleton className="mt-6 h-56 w-full rounded-3xl bg-white/5" />
      <div className="mt-4 space-y-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
