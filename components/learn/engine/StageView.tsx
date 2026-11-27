"use client";

import { m } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ColumnDef, Relation, TraceStage } from "@/lib/learn/sql/types";
import { formatCell } from "@/lib/learn/sql/values";
import { stageOutput, type VisualStep } from "@/lib/learn/steps";
import { cn } from "@/lib/utils";
import { CheckBadge, DataFilteringAnimation } from "./DataFilteringAnimation";
import { DataSortingAnimation } from "./DataSortingAnimation";
import { GROUP_COLORS, GroupingVisualizer } from "./GroupingVisualizer";
import { CellText, RelationTable, TableChip } from "./RelationTable";
import { TableJoinVisualizer } from "./TableJoinVisualizer";
import { useAnimationTiming } from "./timing";

export type DefsFor = (rel: Relation) => (ColumnDef | undefined)[];

function ResultCaption({ rel }: { rel: Relation }) {
  return (
    <>
      <TableChip name="Result" tone="violet" />
      <span className="text-xs font-bold text-ink-500">
        {rel.rows.length} row{rel.rows.length === 1 ? "" : "s"} · {rel.columns.length} column
        {rel.columns.length === 1 ? "" : "s"}
      </span>
    </>
  );
}

/** INSERT / UPDATE / DELETE: the table before, the rows picked, then the change itself. */
function MutationAnimation({
  stage,
  phase,
  scope,
  defsFor,
}: {
  stage: Extract<TraceStage, { kind: "insert" | "update" | "delete" }>;
  phase: string;
  scope: string;
  defsFor: DefsFor;
}) {
  const { stagger } = useAnimationTiming();
  const caption = <TableChip name={stage.table} tone="sky" />;
  const label = `${stage.table} table`;

  if (stage.kind === "insert") {
    const added = new Set(stage.added);
    const rel = phase === "add" ? stage.after : stage.before;
    return (
      <RelationTable
        relation={rel}
        scope={scope}
        ariaLabel={label}
        caption={caption}
        defs={defsFor(rel)}
        rowTone={(i) => (phase === "add" && added.has(i) ? "new" : null)}
      />
    );
  }

  const checks = stage.checks;
  if (phase === "check" && checks) {
    return (
      <RelationTable
        relation={stage.before}
        scope={scope}
        ariaLabel={`${label}: finding rows`}
        caption={caption}
        defs={defsFor(stage.before)}
        rowTone={(i) => (checks[i]?.pass === true ? (stage.kind === "delete" ? "remove" : "focus") : "dim")}
        rowDelay={(i) => i * stagger}
        aside={{
          header: "Check",
          width: "minmax(9rem, 1.4fr)",
          render: (i) => <CheckBadge check={checks[i]} delay={i * stagger} />,
        }}
      />
    );
  }

  if (stage.kind === "update") {
    const changed = new Map(stage.changes.map((c) => [`${c.row}:${c.column}`, c]));
    const rows = new Set(stage.changes.map((c) => c.row));
    const showChange = phase === "change";
    const rel = showChange ? stage.after : stage.before;
    return (
      <RelationTable
        relation={rel}
        scope={scope}
        ariaLabel={label}
        caption={caption}
        defs={defsFor(rel)}
        rowTone={(i) => (showChange && rows.has(i) ? "changed" : null)}
        cellTone={(r, c) => (showChange && changed.has(`${r}:${c}`) ? "changed" : null)}
        renderCell={(r, c, v) => {
          const ch = showChange ? changed.get(`${r}:${c}`) : undefined;
          if (!ch || formatCell(ch.from) === formatCell(ch.to)) return undefined;
          return (
            <m.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col leading-tight"
            >
              <span className="text-[10px] text-ink-400 line-through">{formatCell(ch.from)}</span>
              <CellText value={v} />
            </m.span>
          );
        }}
      />
    );
  }

  // DELETE
  const rel = phase === "remove" ? stage.after : stage.before;
  return (
    <RelationTable
      relation={rel}
      scope={scope}
      ariaLabel={label}
      caption={caption}
      defs={defsFor(rel)}
      emptyText="The table is now empty"
    />
  );
}

/** Draws one animation step. Each trace stage keeps one component across its phases, so rows animate between them. */
export function StageView({ step, scope, defsFor }: { step: VisualStep; scope: string; defsFor: DefsFor }) {
  const { stage, phase } = step;
  const { stagger, fade } = useAnimationTiming();

  if (phase === "result" && stage.kind !== "join" && stage.kind !== "project") {
    const rel = stageOutput(stage);
    return (
      <RelationTable
        relation={rel}
        scope={scope}
        ariaLabel="Result"
        caption={<ResultCaption rel={rel} />}
        defs={defsFor(rel)}
        rowTone={() => "pass"}
        emptyText="No rows"
      />
    );
  }

  switch (stage.kind) {
    case "source":
      return (
        <RelationTable
          relation={stage.relation}
          scope={scope}
          ariaLabel={`The ${stage.table} table`}
          caption={
            <TableChip name={stage.table} tone="sky">
              {stage.alias !== stage.table ? <span className="font-sans text-[10px]">as {stage.alias}</span> : null}
            </TableChip>
          }
          defs={defsFor(stage.relation)}
        />
      );
    case "cte":
      return (
        <RelationTable
          relation={stage.output}
          scope={`${scope}-cte-${stage.name}`}
          ariaLabel={`Named result ${stage.name}`}
          caption={<TableChip name={stage.name} tone="fuchsia" />}
        />
      );
    case "join": {
      const leftName = [...new Set(stage.left.columns.map((c) => c.table).filter(Boolean))].join(" + ") || "left";
      return (
        <TableJoinVisualizer
          left={stage.left}
          right={stage.right}
          leftName={leftName}
          rightName={stage.rightName}
          matches={stage.matches}
          pairs={stage.pairs}
          output={stage.output}
          joinKind={stage.joinKind}
          keyword={stage.keyword}
          on={stage.on}
          phase={phase === "show" ? "show" : phase === "match" ? "match" : "result"}
          scope={scope}
          leftDefs={defsFor(stage.left)}
          rightDefs={defsFor(stage.right)}
        />
      );
    }
    case "filter":
      return (
        <DataFilteringAnimation
          input={stage.input}
          output={stage.output}
          checks={stage.checks}
          phase={phase === "check" ? "check" : "keep"}
          scope={scope}
          label={stage.target === "having" ? "Groups" : "Rows"}
          defs={stage.target === "having" ? undefined : defsFor(stage.input)}
          caption={<TableChip name={stage.condition} tone="amber" />}
        />
      );
    case "group":
      return (
        <GroupingVisualizer
          input={stage.input}
          groups={stage.groups}
          output={stage.output}
          keys={stage.keys}
          aggregates={stage.aggregates}
          phase={phase === "group" ? "group" : "aggregate"}
          scope={scope}
          label="Groups"
          defs={defsFor(stage.input)}
        />
      );
    case "window": {
      const partitionOf = new Map<number, number>();
      stage.partitions.forEach((rows, p) => rows.forEach((r) => partitionOf.set(r, p)));
      const computing = phase === "compute";
      const rel = computing ? stage.output : stage.input;
      const added = stage.input.columns.length;
      return (
        <RelationTable
          relation={rel}
          scope={scope}
          ariaLabel={computing ? "Rows with the new window column" : "Rows lined up for the window"}
          colTone={(i) => (computing && i >= added ? "focus" : null)}
          rowDelay={(i) => i * stagger * 0.5}
          caption={
            <span className="flex flex-wrap gap-1.5">
              {stage.functions.map((f) => (
                <TableChip key={f} name={f} tone="violet" />
              ))}
            </span>
          }
          aside={
            stage.partitions.length > 1
              ? {
                  header: "Window",
                  width: "4.5rem",
                  render: (i) => (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-sans text-[10px] font-bold",
                        GROUP_COLORS[(partitionOf.get(i) ?? 0) % GROUP_COLORS.length].chip,
                      )}
                    >
                      #{(partitionOf.get(i) ?? 0) + 1}
                    </span>
                  ),
                }
              : undefined
          }
        />
      );
    }
    case "project": {
      if (phase === "pick") {
        const picked = new Set(stage.picked.filter((p): p is number => p !== null));
        const computed = stage.output.columns.filter((_, i) => stage.picked[i] === null).map((c) => c.name);
        return (
          <RelationTable
            relation={stage.star ? stage.output : stage.input}
            scope={scope}
            ariaLabel="Choosing columns"
            defs={defsFor(stage.star ? stage.output : stage.input)}
            colTone={(i) => (stage.star ? "focus" : picked.has(i) ? "focus" : "dim")}
            caption={
              <span className="flex flex-wrap items-center gap-1.5">
                {stage.output.columns.map((c, i) => (
                  <TableChip key={`${c.name}${i}`} name={c.name} tone={stage.picked[i] === null ? "violet" : "amber"}>
                    {stage.picked[i] === null && <Sparkles className="size-3" aria-label="worked out" />}
                  </TableChip>
                ))}
                {computed.length > 0 && (
                  <span className="text-[11px] font-semibold text-ink-500">✨ = worked out per row</span>
                )}
              </span>
            }
          />
        );
      }
      const rel = stage.output;
      return (
        <RelationTable
          relation={rel}
          scope={scope}
          ariaLabel={phase === "result" && step.title === "The result" ? "Result" : "The chosen columns"}
          caption={step.title === "The result" ? <ResultCaption rel={rel} /> : undefined}
          defs={defsFor(rel)}
          rowTone={step.title === "The result" ? () => "pass" : undefined}
          emptyText="No rows"
        />
      );
    }
    case "distinct":
      return (
        <RelationTable
          relation={phase === "check" ? stage.input : stage.output}
          scope={scope}
          ariaLabel={phase === "check" ? "Spotting repeated rows" : "Without repeats"}
          rowTone={(i) => (phase === "check" ? (stage.duplicateOf[i] !== null ? "remove" : "pass") : null)}
          rowDelay={(i) => i * stagger * 0.6}
          aside={
            phase === "check"
              ? {
                  header: "Repeat?",
                  width: "minmax(7rem, auto)",
                  render: (i) => (
                    <m.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * stagger * 0.6, duration: fade }}
                      className={cn(
                        "font-sans text-[11px] font-bold",
                        stage.duplicateOf[i] !== null ? "text-rose-700" : "text-emerald-700",
                      )}
                    >
                      {stage.duplicateOf[i] !== null ? `same as row ${stage.duplicateOf[i]! + 1}` : "first one"}
                    </m.span>
                  ),
                }
              : undefined
          }
        />
      );
    case "sort":
      return (
        <DataSortingAnimation
          input={stage.input}
          output={stage.output}
          keys={stage.keys}
          phase={phase === "keys" ? "keys" : "move"}
          scope={scope}
          label="Rows"
          defs={defsFor(stage.input)}
        />
      );
    case "limit": {
      const end = stage.limit === null ? Infinity : stage.offset + stage.limit;
      const cutting = phase === "cut";
      return (
        <RelationTable
          relation={cutting ? stage.input : stage.output}
          scope={scope}
          ariaLabel={cutting ? "Counting off rows" : "The rows that remain"}
          rowTone={(i) => (!cutting ? null : i < stage.offset ? "dim" : i < end ? "pass" : "remove")}
          rowDelay={(i) => i * stagger * 0.6}
          aside={
            cutting
              ? {
                  header: "Count",
                  width: "4.5rem",
                  render: (i) => (
                    <m.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * stagger * 0.6, duration: fade }}
                      className={cn(
                        "font-sans text-[11px] font-black",
                        i >= stage.offset && i < end ? "text-emerald-700" : "text-ink-400",
                      )}
                    >
                      {i < stage.offset ? "skip" : i < end ? `#${i - stage.offset + 1}` : "drop"}
                    </m.span>
                  ),
                }
              : undefined
          }
        />
      );
    }
    case "insert":
    case "update":
    case "delete":
      return <MutationAnimation stage={stage} phase={phase} scope={scope} defsFor={defsFor} />;
  }
}
