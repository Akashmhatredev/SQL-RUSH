"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import type { Relation } from "@/lib/learn/sql/types";
import { RelationTable, TableChip, type RelationTableProps } from "./RelationTable";

/** Index of the output column an ORDER BY key refers to (by name or alias), if any. */
export function sortColumnIndex(rel: Relation, keyText: string): number {
  const k = keyText.trim().toLowerCase();
  const bare = k.includes(".") ? k.split(".").pop()! : k;
  if (/^\d+$/.test(k)) return Number(k) - 1;
  return rel.columns.findIndex((c) => c.name.toLowerCase() === k || c.name.toLowerCase() === bare);
}

/**
 * ORDER BY: first the sort column lights up ("keys"), then the rows glide into their new
 * order ("move"). The same table stays mounted, so each row visibly travels to its place.
 */
export function DataSortingAnimation({
  input,
  output,
  keys,
  phase,
  scope,
  label,
  defs,
}: {
  input: Relation;
  output: Relation;
  keys: { text: string; dir: "asc" | "desc" }[];
  phase: "keys" | "move";
  scope: string;
  label: string;
  defs?: RelationTableProps["defs"];
}) {
  const rel = phase === "keys" ? input : output;
  const keyCols = new Set(keys.map((k) => sortColumnIndex(rel, k.text)).filter((i) => i >= 0));
  return (
    <RelationTable
      relation={rel}
      scope={scope}
      ariaLabel={`${label}: ${phase === "keys" ? "before sorting" : "sorted"}`}
      defs={defs}
      colTone={(i) => (keyCols.has(i) ? "key" : null)}
      caption={
        <span className="flex flex-wrap gap-1.5">
          {keys.map((k) => {
            const col = rel.columns[sortColumnIndex(rel, k.text)];
            const [lo, hi] =
              col?.type === "text" ? ["A", "Z"] : col?.type === "date" ? ["old", "new"] : ["small", "big"];
            return (
              <TableChip key={k.text} name={k.text} tone="sky">
                {k.dir === "desc" ? (
                  <ArrowDownWideNarrow className="size-3.5" aria-label="descending" />
                ) : (
                  <ArrowUpNarrowWide className="size-3.5" aria-label="ascending" />
                )}
                <span className="font-sans text-[10px] font-bold uppercase">
                  {k.dir === "desc" ? `${hi} → ${lo}` : `${lo} → ${hi}`}
                </span>
              </TableChip>
            );
          })}
        </span>
      }
    />
  );
}
