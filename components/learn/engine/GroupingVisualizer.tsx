"use client";

import { m } from "framer-motion";
import { Sigma } from "lucide-react";
import type { GroupInfo, Relation } from "@/lib/learn/sql/types";
import { cn } from "@/lib/utils";
import { CellText, RelationTable, type RelationTableProps } from "./RelationTable";
import { useAnimationTiming } from "./timing";

export const GROUP_COLORS = [
  { card: "bg-sky-50 ring-sky-200", chip: "bg-sky-200 text-sky-900", dot: "bg-sky-400" },
  { card: "bg-violet-50 ring-violet-200", chip: "bg-violet-200 text-violet-900", dot: "bg-violet-400" },
  { card: "bg-emerald-50 ring-emerald-200", chip: "bg-emerald-200 text-emerald-900", dot: "bg-emerald-400" },
  { card: "bg-amber-50 ring-amber-200", chip: "bg-amber-200 text-amber-900", dot: "bg-amber-400" },
  { card: "bg-rose-50 ring-rose-200", chip: "bg-rose-200 text-rose-900", dot: "bg-rose-400" },
  { card: "bg-fuchsia-50 ring-fuchsia-200", chip: "bg-fuchsia-200 text-fuchsia-900", dot: "bg-fuchsia-400" },
];

/**
 * GROUP BY and aggregates: the rows fly out of the table into one bucket per group ("group"),
 * then each bucket is summed up into a single row of values ("aggregate").
 */
export function GroupingVisualizer({
  input,
  groups,
  output,
  keys,
  aggregates,
  phase,
  scope,
  label,
  defs,
}: {
  input: Relation;
  groups: GroupInfo[];
  /** One row per group: the key values, then each aggregate. */
  output: Relation;
  keys: string[];
  aggregates: string[];
  phase: "group" | "aggregate";
  scope: string;
  label: string;
  defs?: RelationTableProps["defs"];
}) {
  const { fade, stagger } = useAnimationTiming();
  const keyCount = keys.length;
  const keyCols = new Set(
    input.columns
      .map((c, i) => (keys.some((k) => k.toLowerCase().split(".").pop() === c.name.toLowerCase()) ? i : -1))
      .filter((i) => i >= 0),
  );
  // Inside a bucket, show just what matters: the grouping columns, the columns being summed up,
  // and one column that names each row.
  const aggText = aggregates.join(" ").toLowerCase();
  const used = input.columns
    .map((c, i) => (keyCols.has(i) || new RegExp(`\\b${c.name.toLowerCase()}\\b`).test(aggText) ? i : -1))
    .filter((i) => i >= 0);
  const namer = input.columns.findIndex((c, i) => c.type === "text" && !keyCols.has(i));
  const shownCols = [...new Set([...(namer >= 0 ? [namer] : []), ...used])].sort((a, b) => a - b).slice(0, 4);
  const visible = shownCols.length >= 2 ? shownCols : input.columns.map((_, i) => i);
  const subset = (rel: Relation): Relation => ({
    columns: visible.map((i) => rel.columns[i]),
    rows: rel.rows.map((r) => ({ key: r.key, values: visible.map((i) => r.values[i]) })),
  });

  return (
    <div className="grid gap-2.5 sm:grid-cols-2" role="list" aria-label={`${label}: ${groups.length} groups`}>
      {groups.map((g, gi) => {
        const color = GROUP_COLORS[gi % GROUP_COLORS.length];
        const rel = subset({ columns: input.columns, rows: g.rows.map((ri) => input.rows[ri]) });
        const out = output.rows[gi];
        return (
          <m.div
            key={g.label + gi}
            role="listitem"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: fade, delay: gi * stagger * 0.6 }}
            className={cn("min-w-0 rounded-3xl p-2.5 ring-2", color.card)}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
              <span
                className={cn(
                  "truncate rounded-full px-2.5 py-0.5 font-mono text-xs font-bold shadow-clay-sm",
                  color.chip,
                )}
              >
                {keys.length ? g.label : "all rows"}
              </span>
              <span className="text-[11px] font-bold text-ink-500">
                {g.rows.length} row{g.rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <RelationTable
              relation={rel}
              scope={scope}
              size="sm"
              ariaLabel={`Group ${g.label}`}
              defs={defs ? visible.map((i) => defs[i]) : undefined}
              colTone={(i) => (keyCols.has(visible[i]) ? "key" : phase === "aggregate" ? "dim" : null)}
            />
            {phase === "aggregate" && out && (
              <m.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: fade, delay: 0.15 + gi * stagger }}
                className="mt-2 flex flex-wrap gap-1.5 px-1"
              >
                {aggregates.map((a, ai) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2 py-1 font-mono text-xs shadow-clay-sm"
                  >
                    <Sigma className="size-3.5 text-violet-500" aria-hidden />
                    <span className="text-ink-600">{a}</span>
                    <span className="text-ink-400">=</span>
                    <span className="font-bold">
                      <CellText value={out.values[keyCount + ai] ?? null} />
                    </span>
                  </span>
                ))}
              </m.div>
            )}
          </m.div>
        );
      })}
      {groups.length === 0 && (
        <p className="clay-inset col-span-full rounded-2xl p-5 text-center text-sm font-semibold text-ink-500">
          There are no rows, so there are no groups.
        </p>
      )}
    </div>
  );
}
