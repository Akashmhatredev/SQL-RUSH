"use client";

import { m } from "framer-motion";
import { ArrowRight, Unlink } from "lucide-react";
import type { CellValue, JoinPair, Relation } from "@/lib/learn/sql/types";
import { formatCell } from "@/lib/learn/sql/values";
import { cn } from "@/lib/utils";
import { GROUP_COLORS } from "./GroupingVisualizer";
import { RelationTable, TableChip, type RelationTableProps, type RowTone } from "./RelationTable";
import { useAnimationTiming } from "./timing";

/** Columns of `rel` that appear in the ON condition. */
function keyColumns(rel: Relation, on: string | null): Set<number> {
  const out = new Set<number>();
  if (!on) return out;
  const text = on.toLowerCase();
  rel.columns.forEach((c, i) => {
    const name = c.name.toLowerCase();
    const qualified = c.table ? `${c.table.toLowerCase()}.${name}` : null;
    if ((qualified && text.includes(qualified)) || new RegExp(`(^|[^.\\w])${name}\\b`).test(text)) out.add(i);
  });
  return out;
}

const label = (rel: Relation, i: number) => formatCell((rel.rows[i]?.values[0] ?? null) as CellValue);

/**
 * JOIN: both tables side by side ("show"); each left row finds its partners on the right, with
 * matching rows sharing a colour and unmatched rows outlined ("match"); then the combined rows,
 * where outer joins fill the missing side with NULL ("result").
 */
export function TableJoinVisualizer({
  left,
  right,
  rightName,
  leftName,
  matches,
  pairs,
  output,
  joinKind,
  keyword,
  on,
  phase,
  scope,
  leftDefs,
  rightDefs,
}: {
  left: Relation;
  right: Relation;
  leftName: string;
  rightName: string;
  matches: number[][];
  pairs: JoinPair[];
  output: Relation;
  joinKind: "inner" | "left" | "right" | "full" | "cross";
  keyword: string;
  on: string | null;
  phase: "show" | "match" | "result";
  scope: string;
  leftDefs?: RelationTableProps["defs"];
  rightDefs?: RelationTableProps["defs"];
}) {
  const { stagger, fade } = useAnimationTiming();

  if (phase === "result") {
    const keepsLeft = joinKind === "left" || joinKind === "full";
    const keepsRight = joinKind === "right" || joinKind === "full";
    return (
      <div className="space-y-2">
        <RelationTable
          relation={output}
          scope={`${scope}-joined`}
          ariaLabel={`${keyword} result`}
          caption={<TableChip name={keyword} tone="violet" />}
          rowTone={(i) => (pairs[i]?.left === null || pairs[i]?.right === null ? "unmatched" : "match")}
          rowDelay={(i) => i * stagger * 0.5}
          emptyText="No rows matched"
        />
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-sky-100 ring-2 ring-sky-300" /> matched pair
          </span>
          {(keepsLeft || keepsRight) && (
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-amber-50 outline-2 outline-dashed outline-amber-400" /> kept without a
              match (NULLs fill the gap)
            </span>
          )}
        </p>
      </div>
    );
  }

  const leftKeys = keyColumns(left, on);
  const rightKeys = keyColumns(right, on);
  // Colour each left row; its partners on the right share the colour.
  const rightColor = new Map<number, number>();
  matches.forEach((rs, li) => rs.forEach((r) => (rightColor.has(r) ? null : rightColor.set(r, li))));
  const showMatches = phase === "match";
  const leftTone = (i: number): RowTone => (!showMatches ? null : matches[i]?.length ? "match" : "unmatched");
  const rightTone = (i: number): RowTone => (!showMatches ? null : rightColor.has(i) ? "match" : "unmatched");
  const dot = (i: number) => GROUP_COLORS[i % GROUP_COLORS.length].dot;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <RelationTable
        relation={left}
        scope={`${scope}-left`}
        ariaLabel={`Left table ${leftName}`}
        caption={
          <TableChip name={leftName} tone="sky">
            left
          </TableChip>
        }
        defs={leftDefs}
        colTone={(i) => (leftKeys.has(i) ? "key" : null)}
        rowTone={leftTone}
        rowDelay={(i) => i * stagger}
        aside={
          showMatches
            ? {
                header: "Partners",
                width: "minmax(6rem, auto)",
                render: (i) => (
                  <m.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * stagger, duration: fade }}
                    className="flex items-center gap-1 font-sans text-[11px] font-bold"
                  >
                    {matches[i]?.length ? (
                      <>
                        <span className={cn("size-2.5 rounded-full", dot(i))} aria-hidden />
                        <ArrowRight className="size-3 text-sky-600" aria-hidden />
                        <span className="truncate font-mono text-sky-800">
                          {matches[i].map((r) => label(right, r)).join(", ")}
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-700">
                        <Unlink className="size-3" aria-hidden /> none
                      </span>
                    )}
                  </m.span>
                ),
              }
            : undefined
        }
      />
      <RelationTable
        relation={right}
        scope={`${scope}-right`}
        ariaLabel={`Right table ${rightName}`}
        caption={
          <TableChip name={rightName} tone="emerald">
            right
          </TableChip>
        }
        defs={rightDefs}
        colTone={(i) => (rightKeys.has(i) ? "key" : null)}
        rowTone={rightTone}
        rowDelay={(i) => (rightColor.get(i) ?? left.rows.length) * stagger}
        aside={
          showMatches
            ? {
                header: "",
                width: "1.5rem",
                render: (i) =>
                  rightColor.has(i) ? (
                    <span className={cn("size-2.5 rounded-full", dot(rightColor.get(i)!))} aria-hidden />
                  ) : (
                    <Unlink className="size-3 text-amber-600" aria-label="no match" />
                  ),
              }
            : undefined
        }
      />
    </div>
  );
}
