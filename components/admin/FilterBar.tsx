"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterSelect {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

const ALL = "__all";

/** Search box + selects bound to the URL query string (server pages read them). */
export function FilterBar({
  searchPlaceholder,
  selects = [],
}: {
  searchPlaceholder?: string;
  selects?: FilterSelect[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const apply = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    startTransition(() => router.replace(next.size ? `${pathname}?${next}` : pathname));
  };

  // Debounced search.
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const id = window.setTimeout(() => apply({ q: q.trim() || null }), 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={cn("mb-4 flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")}>
      {searchPlaceholder && (
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 pl-9"
            aria-label="Search"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-slate-500 hover:text-white"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
      {selects.map((s) => (
        <Select
          key={s.name}
          value={params.get(s.name) ?? ALL}
          onValueChange={(v) => apply({ [s.name]: v === ALL ? null : v })}
        >
          <SelectTrigger className="h-10 w-auto min-w-36" aria-label={s.label}>
            <SelectValue placeholder={s.label} />
          </SelectTrigger>
          <SelectContent className="glass-strong">
            <SelectItem value={ALL}>All {s.label.toLowerCase()}</SelectItem>
            {s.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
