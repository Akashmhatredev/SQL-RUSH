import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="h-9 w-56 rounded-2xl" />
      <Skeleton className="mt-2 h-4 w-80 rounded-lg" />
      <div className="clay mt-6 space-y-2 rounded-3xl p-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
