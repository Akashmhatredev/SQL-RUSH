import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="h-9 w-56 rounded-lg bg-white/5" />
      <Skeleton className="mt-2 h-4 w-80 rounded bg-white/5" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
