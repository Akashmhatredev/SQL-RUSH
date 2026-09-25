import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Server-rendered pager that keeps the current filters in the query string. */
export function Pagination({
  page,
  pageCount,
  count,
  basePath,
  params,
}: {
  page: number;
  pageCount: number;
  count: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
    if (p > 1) q.set("page", String(p));
    else q.delete("page");
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-400">
      <p>
        {count.toLocaleString()} result{count === 1 ? "" : "s"} · page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button size="sm" asChild>
            <Link href={href(page - 1)} aria-label="Previous page">
              <ChevronLeft aria-hidden /> Prev
            </Link>
          </Button>
        ) : (
          <Button size="sm" disabled aria-label="Previous page">
            <ChevronLeft aria-hidden /> Prev
          </Button>
        )}
        {page < pageCount ? (
          <Button size="sm" asChild>
            <Link href={href(page + 1)} aria-label="Next page">
              Next <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button size="sm" disabled aria-label="Next page">
            Next <ChevronRight aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
