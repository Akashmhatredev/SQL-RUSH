"use client";

import { AnimatePresence, m } from "framer-motion";
import { Database, KeyRound, Link2, Table2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LessonTable } from "@/lib/learn/types";
import { cn } from "@/lib/utils";
import { RelationTable } from "./RelationTable";

export interface Relationship {
  from: { table: string; column: string };
  to: { table: string; column: string };
}

export function relationshipsOf(tables: LessonTable[]): Relationship[] {
  const names = new Set(tables.map((t) => t.name));
  return tables.flatMap((t) =>
    t.columns
      .filter((c) => c.ref && names.has(c.ref.table))
      .map((c) => ({ from: { table: t.name, column: c.name }, to: { table: c.ref!.table, column: c.ref!.column } })),
  );
}

interface Line {
  d: string;
  key: string;
}

/**
 * A database at a glance: one card per table with its columns, primary keys and foreign keys,
 * and a line for every link between tables. Tap a table to look inside it; tap a link to light
 * up both ends.
 */
export function DatabaseVisualizer({
  tables,
  name = "school",
  onOpenTable,
  onFindLink,
  pickMode = false,
  picked,
  className,
}: {
  tables: LessonTable[];
  /** What the database is called, e.g. "school". */
  name?: string;
  onOpenTable?: (table: string) => void;
  onFindLink?: (link: Relationship) => void;
  /** Tapping a table picks it (for challenges) instead of opening it. */
  pickMode?: boolean;
  picked?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [activeLink, setActiveLink] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const links = relationshipsOf(tables);

  const measure = useCallback(() => {
    const root = wrap.current;
    if (!root) return;
    const box = root.getBoundingClientRect();
    const find = (t: string, c: string) => root.querySelector<HTMLElement>(`[data-col="${t}.${c}"]`);
    const next: Line[] = [];
    links.forEach((l, i) => {
      const a = find(l.from.table, l.from.column)?.getBoundingClientRect();
      const b = find(l.to.table, l.to.column)?.getBoundingClientRect();
      if (!a || !b) return;
      const ay = a.top + a.height / 2 - box.top;
      const by = b.top + b.height / 2 - box.top;
      // Leave from whichever sides face each other.
      const aRight = a.left + a.width / 2 < b.left + b.width / 2;
      const ax = (aRight ? a.right : a.left) - box.left;
      const bx = (aRight ? b.left : b.right) - box.left;
      const sameColumn = Math.abs(a.left - b.left) < 20;
      if (sameColumn) {
        const x = a.right - box.left;
        const bend = 28;
        next.push({
          key: String(i),
          d: `M ${x} ${ay} C ${x + bend} ${ay}, ${x + bend} ${by}, ${b.right - box.left} ${by}`,
        });
      } else {
        const mid = (ax + bx) / 2;
        next.push({ key: String(i), d: `M ${ax} ${ay} C ${mid} ${ay}, ${mid} ${by}, ${bx} ${by}` });
      }
    });
    setLines(next);
    // links is derived from tables; re-measure when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables]);

  useLayoutEffect(measure, [measure, open]);
  useEffect(() => {
    const root = wrap.current;
    if (!root) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure]);

  const highlighted = (t: string, c: string) =>
    activeLink !== null &&
    ((links[activeLink].from.table === t && links[activeLink].from.column === c) ||
      (links[activeLink].to.table === t && links[activeLink].to.column === c));

  const openTable = tables.find((t) => t.name === open);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="clay rounded-[1.75rem] p-3 sm:p-4">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-500">
          <Database className="size-4 text-violet-500" aria-hidden /> The {name} database · {tables.length} tables
        </p>
        <div ref={wrap} className="relative">
          <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible" aria-hidden>
            {lines.map((l, i) => (
              <path
                key={l.key}
                d={l.d}
                fill="none"
                strokeWidth={activeLink === i ? 3 : 2}
                strokeDasharray={activeLink === i ? undefined : "5 4"}
                className={cn(
                  "transition-[stroke] duration-300",
                  activeLink === i ? "stroke-sky-500" : "stroke-sky-300",
                )}
              />
            ))}
          </svg>
          <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Tables">
            {tables.map((t) => {
              const isPicked = picked === t.name;
              const isOpen = open === t.name;
              return (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!pickMode) setOpen(isOpen ? null : t.name);
                      onOpenTable?.(t.name);
                    }}
                    aria-pressed={pickMode ? isPicked : isOpen}
                    className={cn(
                      "w-full rounded-3xl bg-white/80 p-3 text-left shadow-clay-sm ring-2 ring-transparent transition-all hover:-translate-y-0.5 hover:bg-white",
                      (isPicked || isOpen) && "bg-violet-50 ring-violet-400",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-xl bg-sky-100 text-sky-700 shadow-clay-sm">
                        <Table2 className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-sm font-extrabold text-ink-900">{t.name}</span>
                        <span className="block truncate text-[11px] font-semibold text-ink-500">
                          {t.rows.length} rows{t.description ? ` · ${t.description}` : ""}
                        </span>
                      </span>
                    </span>
                    <span className="mt-2.5 block space-y-0.5">
                      {t.columns.map((c) => (
                        <span
                          key={c.name}
                          data-col={`${t.name}.${c.name}`}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-xs transition-colors",
                            highlighted(t.name, c.name) ? "bg-sky-200 font-bold text-sky-900" : "text-ink-700",
                          )}
                        >
                          {c.pk ? (
                            <KeyRound className="size-3 shrink-0 text-amber-600" aria-label="primary key" />
                          ) : c.ref ? (
                            <Link2 className="size-3 shrink-0 text-sky-600" aria-label={`links to ${c.ref.table}`} />
                          ) : (
                            <span className="size-3 shrink-0" />
                          )}
                          <span className="truncate">{c.name}</span>
                          <span className="ml-auto text-[10px] text-ink-400">{c.type}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {links.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-500">Links</span>
            {links.map((l, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setActiveLink(activeLink === i ? null : i);
                  onFindLink?.(l);
                }}
                aria-pressed={activeLink === i}
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-xs font-bold shadow-clay-sm transition-all hover:-translate-y-px",
                  activeLink === i ? "bg-sky-500 text-white" : "bg-sky-100 text-sky-800",
                )}
              >
                {l.from.table}.{l.from.column} → {l.to.table}.{l.to.column}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {openTable && !pickMode && (
          <m.div
            key={openTable.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <RelationTable
              relation={{
                columns: openTable.columns.map((c) => ({ name: c.name, table: openTable.name, type: c.type })),
                rows: openTable.rows.map((values, i) => ({ key: `${openTable.name}#${i}`, values })),
              }}
              scope={`db-${openTable.name}`}
              ariaLabel={`${openTable.name} table`}
              defs={openTable.columns}
              caption={<span className="text-sm font-extrabold text-ink-900">Inside {openTable.name}</span>}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
