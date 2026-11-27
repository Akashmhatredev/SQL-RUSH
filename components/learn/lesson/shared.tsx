"use client";

import { m } from "framer-motion";
import { ArrowRight, Check, Lightbulb, TriangleAlert } from "lucide-react";
import { SqlHighlight } from "@/components/game/SqlCode";
import { RelationTable, TableChip } from "@/components/learn/engine/RelationTable";
import { InlineText } from "@/components/learn/engine/RichText";
import type { SqlError } from "@/lib/learn/sql/errors";
import type { DatabaseData, Relation, TableData } from "@/lib/learn/sql/types";
import type { LessonTable } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

export function lessonDb(tables: LessonTable[]): DatabaseData {
  return Object.fromEntries(tables.map((t) => [t.name.toLowerCase(), t]));
}

export function tableRelation(t: TableData, scope = t.name): Relation {
  return {
    columns: t.columns.map((c) => ({ name: c.name, table: t.name, type: c.type })),
    rows: t.rows.map((values, i) => ({ key: `${scope}#${i}`, values })),
  };
}

/** A list of small tasks that tick off as the learner does them. */
export function TaskChecklist({ tasks, done }: { tasks: string[]; done: boolean[] }) {
  if (!tasks.length) return null;
  const count = done.filter(Boolean).length;
  return (
    <div className="clay rounded-3xl p-4">
      <p className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
        Try these{" "}
        <span className="font-mono">
          {count}/{tasks.length}
        </span>
      </p>
      <ul className="space-y-1.5">
        {tasks.map((t, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-2.5 text-sm font-semibold",
              done[i] ? "text-emerald-800" : "text-ink-700",
            )}
          >
            <m.span
              animate={done[i] ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              className={cn(
                "mt-px grid size-5 shrink-0 place-items-center rounded-full",
                done[i] ? "bg-emerald-500 text-white shadow-clay-sm" : "clay-inset",
              )}
            >
              {done[i] && <Check className="size-3" strokeWidth={3} aria-label="done" />}
            </m.span>
            <span className={cn(done[i] && "line-through decoration-emerald-400")}>
              <InlineText text={t} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A SQL mistake, with the offending part of the query underlined and a friendly hint. */
export function SqlErrorView({ error, sql }: { error: SqlError; sql: string }) {
  const span = error.span && error.span.end <= sql.length ? error.span : null;
  return (
    <div className="rounded-3xl bg-rose-50 p-4 ring-2 ring-rose-200" role="alert">
      <p className="flex items-start gap-2 text-sm font-bold text-rose-900">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden />
        {error.message}
      </p>
      {span && (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-white/80 p-3 font-mono text-[13px] leading-6">
          <SqlHighlight code={sql.slice(0, span.start)} />
          <span className="rounded bg-rose-200 underline decoration-rose-500 decoration-wavy decoration-2 underline-offset-4">
            {sql.slice(span.start, span.end) || " "}
          </span>
          <SqlHighlight code={sql.slice(span.end)} />
        </pre>
      )}
      {error.hint && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-ink-700">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <InlineText text={error.hint} />
        </p>
      )}
    </div>
  );
}

/** Two tables side by side: how the data looks before and after an operation. */
export function BeforeAfter({
  before,
  after,
  beforeLabel,
  afterLabel,
}: {
  before: Relation;
  after: Relation;
  beforeLabel: string;
  afterLabel: string;
}) {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[1fr_auto_1fr]">
      <RelationTable
        relation={before}
        scope="compare-before"
        size="sm"
        ariaLabel={beforeLabel}
        caption={<TableChip name={beforeLabel} tone="sky" />}
      />
      <div className="flex justify-center lg:pt-12" aria-hidden>
        <span className="grid size-9 place-items-center rounded-full bg-violet-100 text-violet-700 shadow-clay-sm">
          <ArrowRight className="size-4 rotate-90 lg:rotate-0" />
        </span>
      </div>
      <RelationTable
        relation={after}
        scope="compare-after"
        size="sm"
        ariaLabel={afterLabel}
        caption={<TableChip name={afterLabel} tone="emerald" />}
        rowTone={() => "pass"}
      />
    </div>
  );
}

/** Row indices of `table` that a single-table query returns (the engine keeps each row's source key). */
export function sourceRows(result: Relation): Set<number> {
  return new Set(result.rows.map((r) => Number(r.key.split("#")[1])).filter((n) => Number.isInteger(n)));
}
