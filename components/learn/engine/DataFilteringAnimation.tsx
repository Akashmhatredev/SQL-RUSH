"use client";

import { m } from "framer-motion";
import { Check, CircleHelp, X } from "lucide-react";
import type { Relation, RowCheck } from "@/lib/learn/sql/types";
import { cn } from "@/lib/utils";
import { RelationTable, type RelationTableProps } from "./RelationTable";
import { useAnimationTiming } from "./timing";

/** ✓ / ✗ for one row, with the comparison it made ("20 > 18"). */
export function CheckBadge({ check, delay }: { check: RowCheck; delay: number }) {
  const { fade } = useAnimationTiming();
  const Icon = check.pass === true ? Check : check.pass === false ? X : CircleHelp;
  return (
    <m.span
      initial={{ opacity: 0, scale: 0.6, x: -6 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay, duration: fade, type: "spring", stiffness: 500, damping: 28 }}
      className="flex min-w-0 items-center gap-1.5"
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full text-white shadow-clay-sm",
          check.pass === true ? "bg-emerald-500" : check.pass === false ? "bg-rose-500" : "bg-ink-400",
        )}
        aria-label={check.pass === true ? "passes" : check.pass === false ? "fails" : "unknown (NULL), so it fails"}
      >
        <Icon className="size-3" strokeWidth={3} />
      </span>
      <span className="truncate font-mono text-[11px] text-ink-600">
        {check.parts.map((p, i) => (
          <span key={i} className={cn(p.pass === false && "text-rose-700", p.pass === true && "text-emerald-700")}>
            {i > 0 && <span className="text-ink-400"> · </span>}
            {p.text}
          </span>
        ))}
      </span>
    </m.span>
  );
}

/**
 * WHERE / HAVING / the row-picking part of UPDATE and DELETE: every row gets its yes/no answer
 * in turn ("check"), then the rows that failed drop out and the rest close ranks ("keep").
 */
export function DataFilteringAnimation({
  input,
  output,
  checks,
  phase,
  scope,
  label,
  defs,
  caption,
}: {
  input: Relation;
  output: Relation;
  checks: RowCheck[];
  phase: "check" | "keep";
  scope: string;
  label: string;
  defs?: RelationTableProps["defs"];
  caption?: RelationTableProps["caption"];
}) {
  const { stagger } = useAnimationTiming();
  if (phase === "keep") {
    return (
      <RelationTable
        relation={output}
        scope={scope}
        ariaLabel={`${label}: rows that passed`}
        defs={defs}
        caption={caption}
        rowTone={() => "pass"}
        emptyText="No rows passed the check"
      />
    );
  }
  return (
    <RelationTable
      relation={input}
      scope={scope}
      ariaLabel={`${label}: checking every row`}
      defs={defs}
      caption={caption}
      rowTone={(i) => (checks[i]?.pass === true ? "pass" : "fail")}
      rowDelay={(i) => i * stagger}
      aside={{
        header: "Check",
        width: "minmax(9rem, 1.4fr)",
        render: (i) => (checks[i] ? <CheckBadge check={checks[i]} delay={i * stagger} /> : null),
      }}
    />
  );
}
