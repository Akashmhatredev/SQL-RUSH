"use client";

import { AnimatePresence, m } from "framer-motion";
import { Columns3, Grid2x2, KeyRound, Link2, MousePointerClick, Rows3 } from "lucide-react";
import type { ReactNode } from "react";
import type { CellValue } from "@/lib/learn/sql/types";
import { formatCell, formatLiteral } from "@/lib/learn/sql/values";
import type { LessonTable } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

export type TableFocus =
  | { kind: "row"; row: number; col?: number }
  | { kind: "column"; col: number }
  | { kind: "cell"; row: number; col: number }
  | { kind: "rows"; rows: number[] }
  | null;

const plural = (word: string) =>
  /(s|x|ch|sh)$/.test(word) ? `${word}es` : /[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`;

/** "Priya" for a row, using the table's label column (or the first column). */
export function rowName(table: LessonTable, values: CellValue[]): string {
  const i = Math.max(0, table.labelColumn ? table.columns.findIndex((c) => c.name === table.labelColumn) : 0);
  return formatCell(values[i] ?? null);
}

function Panel({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode;
  tone: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl shadow-clay-btn", tone)}>{icon}</span>
      <div className="min-w-0 text-sm leading-relaxed text-ink-700 sm:text-[15px]">
        <p className="font-extrabold text-ink-900">{title}</p>
        {children}
      </div>
    </div>
  );
}

/**
 * The explainer under an interactive table: says, in plain words, what the learner just
 * clicked (a row is one record, a column is one kind of detail, a cell is one value) using
 * the table's own data and column descriptions.
 */
export function RowColumnHighlighter({
  table,
  rows,
  focus,
  className,
  actions,
}: {
  table: LessonTable;
  rows: CellValue[][];
  focus: TableFocus;
  className?: string;
  /** Buttons that act on the focused row/column (edit, delete, sort…). */
  actions?: ReactNode;
}) {
  const entity = table.entity;
  let content: ReactNode;
  let key = "none";

  if (!focus) {
    content = (
      <Panel
        icon={<MousePointerClick className="size-5" />}
        tone="bg-violet-500 text-white"
        title={`The ${table.name} table`}
      >
        <p>
          {table.description ? `${table.description}. ` : ""}It has {rows.length} {rows.length === 1 ? "row" : "rows"}{" "}
          (one per {entity}) and {table.columns.length} columns. Tap a row, a column name or a single value to see what
          it is.
        </p>
      </Panel>
    );
  } else if (focus.kind === "row" && rows[focus.row]) {
    key = `row-${focus.row}-${focus.col ?? ""}`;
    const values = rows[focus.row];
    const cell = focus.col !== undefined ? table.columns[focus.col] : null;
    content = (
      <Panel
        icon={<Rows3 className="size-5" />}
        tone="bg-violet-500 text-white"
        title={`Row ${focus.row + 1}: ${rowName(table, values)}'s record`}
      >
        <p>
          A <strong>row</strong> goes across the table and holds everything about <strong>one {entity}</strong>:
        </p>
        <dl className="mt-1.5 flex flex-wrap gap-1.5">
          {table.columns.map((c, i) => (
            <div
              key={c.name}
              className={cn(
                "rounded-xl bg-white px-2 py-1 font-mono text-xs shadow-clay-sm",
                focus.col === i && "ring-2 ring-amber-400",
              )}
            >
              <dt className="inline text-ink-500">{c.name}: </dt>
              <dd className="inline font-bold text-ink-900">{formatCell(values[i] ?? null)}</dd>
            </div>
          ))}
        </dl>
        {cell && focus.col !== undefined && (
          <p className="mt-1.5">
            You tapped one <strong>cell</strong>: where {rowName(table, values)}&apos;s row meets the{" "}
            <strong>{cell.name}</strong> column. It holds a single value: {formatLiteral(values[focus.col] ?? null)}.
          </p>
        )}
      </Panel>
    );
  } else if (focus.kind === "column" && table.columns[focus.col]) {
    key = `col-${focus.col}`;
    const c = table.columns[focus.col];
    const values = rows.map((r) => formatCell(r[focus.col] ?? null));
    content = (
      <Panel icon={<Columns3 className="size-5" />} tone="bg-amber-500 text-white" title={`The ${c.name} column`}>
        <p>
          A <strong>column</strong> goes down the table and holds <strong>one kind of detail</strong> for every {entity}
          {c.description ? `: ${c.description.charAt(0).toLowerCase()}${c.description.slice(1)}` : ""}.
        </p>
        <p className="mt-1 font-mono text-xs text-ink-600">
          {values.slice(0, 10).join(" · ")}
          {values.length > 10 ? " · …" : ""}
        </p>
        {c.pk && (
          <p className="mt-1.5 flex items-start gap-1.5 text-amber-800">
            <KeyRound className="mt-1 size-3.5 shrink-0" aria-hidden />
            <span>
              This is the <strong>primary key</strong>: every {entity} has a different {c.name}, so it points at exactly
              one row.
            </span>
          </p>
        )}
        {c.ref && (
          <p className="mt-1.5 flex items-start gap-1.5 text-sky-800">
            <Link2 className="mt-1 size-3.5 shrink-0" aria-hidden />
            <span>
              Each value points at a row in <strong>{c.ref.table}</strong> (its {c.ref.column}). That is how the two
              tables are linked.
            </span>
          </p>
        )}
      </Panel>
    );
  } else if (focus.kind === "cell" && rows[focus.row] && table.columns[focus.col]) {
    key = `cell-${focus.row}-${focus.col}`;
    const c = table.columns[focus.col];
    const v = rows[focus.row][focus.col] ?? null;
    content = (
      <Panel icon={<Grid2x2 className="size-5" />} tone="bg-sky-500 text-white" title={`One value: ${formatCell(v)}`}>
        <p>
          A <strong>cell</strong> is where a row meets a column. This one is {rowName(table, rows[focus.row])}&apos;s{" "}
          <strong>{c.name}</strong>
          {v === null ? (
            <>
              , and it&apos;s empty: <strong>NULL</strong> means the value is missing or unknown.
            </>
          ) : (
            <>: {formatLiteral(v)}.</>
          )}
        </p>
      </Panel>
    );
  } else if (focus.kind === "rows") {
    key = `rows-${focus.rows.join(",")}`;
    const names = focus.rows.map((r) => (rows[r] ? rowName(table, rows[r]) : "")).filter(Boolean);
    content = (
      <Panel
        icon={<Rows3 className="size-5" />}
        tone="bg-violet-500 text-white"
        title={`${names.length} rows selected`}
      >
        <p>
          {names.length ? `${names.join(", ")}: ` : ""}each selected row is a whole {entity}. Selecting several rows is
          what a database does when it returns a few {plural(entity)} out of the whole table.
        </p>
      </Panel>
    );
  }

  return (
    <div className={cn("clay rounded-3xl p-4", className)} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {content}
        </m.div>
      </AnimatePresence>
      {actions && <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">{actions}</div>}
    </div>
  );
}
