"use client";

import { AnimatePresence, m } from "framer-motion";
import { KeyRound, Link2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { CellValue, ColumnDef, Relation } from "@/lib/learn/sql/types";
import { formatCell } from "@/lib/learn/sql/values";
import { cn } from "@/lib/utils";
import { useAnimationTiming } from "./timing";

export type RowTone =
  | "pass"
  | "fail"
  | "dim"
  | "focus"
  | "new"
  | "remove"
  | "changed"
  | "selected"
  | "match"
  | "unmatched"
  | "wrong"
  | "missed"
  | null;

export type ColTone = "focus" | "dim" | "key" | null;

const ROW_TONES: Record<Exclude<RowTone, null>, string> = {
  pass: "bg-emerald-50 ring-2 ring-emerald-300",
  fail: "bg-rose-50/70 text-ink-400 [&_[data-cell]]:line-through [&_[data-cell]]:decoration-rose-300",
  dim: "opacity-35",
  focus: "bg-amber-50 ring-2 ring-amber-300",
  new: "bg-emerald-100 ring-2 ring-emerald-400",
  remove: "bg-rose-100 ring-2 ring-rose-300 [&_[data-cell]]:line-through",
  changed: "bg-sky-50 ring-2 ring-sky-300",
  selected: "bg-violet-100 ring-2 ring-violet-400",
  match: "bg-sky-100 ring-2 ring-sky-300",
  unmatched: "bg-amber-50 outline-2 outline-dashed outline-amber-400 -outline-offset-2",
  wrong: "bg-rose-100 ring-2 ring-rose-400",
  missed: "bg-amber-50 outline-2 outline-dashed outline-amber-500 -outline-offset-2",
};

const COL_TONES: Record<Exclude<ColTone, null>, string> = {
  focus: "bg-amber-100/90 text-amber-900",
  dim: "opacity-35",
  key: "bg-sky-100/80 text-sky-900",
};

/** Column widths from content length, so every row's grid lines up and long text gets room. */
export function columnTemplate(relation: Relation, extra?: string): string {
  const cols = relation.columns.map((c, i) => {
    const longest = Math.max(c.name.length, ...relation.rows.map((r) => formatCell(r.values[i] ?? null).length));
    const w = Math.min(16, Math.max(3, longest));
    return `minmax(${Math.max(3.6, w * 0.6).toFixed(1)}rem, ${w}fr)`;
  });
  return [...cols, ...(extra ? [extra] : [])].join(" ");
}

export function CellText({ value }: { value: CellValue }) {
  if (value === null || value === undefined)
    return <span className="font-sans text-[11px] font-bold italic text-ink-400">NULL</span>;
  if (typeof value === "boolean")
    return <span className={value ? "text-emerald-700" : "text-rose-700"}>{String(value)}</span>;
  if (typeof value === "number")
    return <span className="font-semibold text-amber-700 tabular-nums">{formatCell(value)}</span>;
  return <>{value}</>;
}

export interface RelationTableProps {
  relation: Relation;
  /** Namespace for shared-layout animation: rows with the same key in the same scope glide between steps. */
  scope: string;
  ariaLabel: string;
  caption?: ReactNode;
  /** Column metadata (primary/foreign keys) aligned with relation.columns. */
  defs?: (ColumnDef | undefined)[];
  rowTone?: (index: number) => RowTone;
  /** Seconds to wait before this row's tone (and aside) appears, for row-by-row reveals. */
  rowDelay?: (index: number) => number;
  colTone?: (index: number) => ColTone;
  cellTone?: (row: number, col: number) => "changed" | "focus" | "match" | "dim" | null;
  renderCell?: (row: number, col: number, value: CellValue) => ReactNode | undefined;
  /** An extra column on the right, e.g. the ✓/✗ of a WHERE check. */
  aside?: { header: string; width?: string; render: (row: number) => ReactNode };
  onRowClick?: (index: number) => void;
  onColumnClick?: (index: number) => void;
  onCellEnter?: (row: number, col: number) => void;
  onCellClick?: (row: number, col: number) => void;
  selectedRow?: number | null;
  selectedRows?: Set<number>;
  emptyText?: string;
  className?: string;
  size?: "sm" | "md";
}

/**
 * A small table drawn with CSS grid so every row can animate on its own: rows glide to new
 * positions (sorting), fly into groups, fade out (filtering) or slide in (INSERT).
 */
export function RelationTable({
  relation,
  scope,
  ariaLabel,
  caption,
  defs,
  rowTone,
  rowDelay,
  colTone,
  cellTone,
  renderCell,
  aside,
  onRowClick,
  onColumnClick,
  onCellEnter,
  onCellClick,
  selectedRow,
  selectedRows,
  emptyText = "No rows",
  className,
  size = "md",
}: RelationTableProps) {
  const { layout, fade } = useAnimationTiming();
  const template = columnTemplate(relation, aside ? (aside.width ?? "minmax(6.5rem, auto)") : undefined);
  const interactive = !!(onRowClick || onColumnClick || onCellClick);
  const style = { gridTemplateColumns: template } as CSSProperties;
  const cellPad = size === "sm" ? "px-2 py-1.5" : "px-2.5 py-2";

  return (
    <div className={cn("min-w-0", className)}>
      {caption && <div className="mb-1.5 flex items-center gap-2">{caption}</div>}
      <div className="clay-inset no-scrollbar overflow-x-auto rounded-2xl">
        <div
          role={interactive ? "grid" : "table"}
          aria-label={ariaLabel}
          aria-rowcount={relation.rows.length + 1}
          className={cn(
            "min-w-fit p-1.5 font-mono",
            size === "sm" ? "text-[11.5px] sm:text-xs" : "text-xs sm:text-[13px]",
          )}
        >
          <div role="row" className="grid gap-x-0.5" style={style}>
            {relation.columns.map((c, ci) => {
              const tone = colTone?.(ci) ?? null;
              const def = defs?.[ci];
              const numeric = c.type === "int" || c.type === "numeric";
              const header = (
                <span className={cn("flex items-center gap-1 truncate", numeric && "justify-end")}>
                  {def?.pk && <KeyRound className="size-3 shrink-0 text-amber-600" aria-label="Primary key" />}
                  {def?.ref && (
                    <Link2 className="size-3 shrink-0 text-sky-600" aria-label={`Links to ${def.ref.table}`} />
                  )}
                  <span className="truncate">{c.name}</span>
                </span>
              );
              return (
                <div
                  key={`${c.table ?? ""}.${c.name}.${ci}`}
                  role="columnheader"
                  className={cn(
                    "rounded-lg text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 transition-[background-color,opacity] duration-300 sm:text-[11px]",
                    tone && COL_TONES[tone],
                  )}
                >
                  {onColumnClick ? (
                    <button
                      type="button"
                      onClick={() => onColumnClick(ci)}
                      className={cn("w-full rounded-lg text-left hover:bg-white/80", cellPad)}
                      aria-label={`Column ${c.name}`}
                    >
                      {header}
                    </button>
                  ) : (
                    <div className={cellPad} title={def?.description}>
                      {header}
                    </div>
                  )}
                </div>
              );
            })}
            {aside && (
              <div
                role="columnheader"
                className={cn("text-[10px] font-bold uppercase tracking-wider text-violet-600 sm:text-[11px]", cellPad)}
              >
                {aside.header}
              </div>
            )}
          </div>

          <div className="relative">
            <AnimatePresence initial={false} mode="popLayout">
              {relation.rows.map((row, ri) => {
                const tone = rowTone?.(ri) ?? (selectedRows?.has(ri) || selectedRow === ri ? "selected" : null);
                const delay = rowDelay?.(ri) ?? 0;
                return (
                  <m.div
                    key={row.key}
                    layoutId={`${scope}:${row.key}`}
                    layout="position"
                    role="row"
                    aria-selected={interactive ? selectedRows?.has(ri) || selectedRow === ri : undefined}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: fade } }}
                    transition={{ layout: { duration: layout, ease: [0.22, 1, 0.36, 1] }, duration: fade }}
                    tabIndex={onRowClick ? 0 : undefined}
                    onClick={onRowClick ? () => onRowClick(ri) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick(ri);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "relative mt-0.5 grid gap-x-0.5 rounded-xl bg-white/70 text-ink-800 shadow-[0_1px_0_rgb(80_60_150/0.08)] transition-[background-color,box-shadow,opacity,color]",
                      onRowClick &&
                        "cursor-pointer hover:bg-white focus-visible:outline-2 focus-visible:outline-violet-500",
                      tone && ROW_TONES[tone],
                    )}
                    style={{
                      ...style,
                      transitionDuration: `${Math.round(fade * 1000)}ms`,
                      transitionDelay: `${delay}s`,
                    }}
                  >
                    {row.values.map((v, ci) => {
                      const ct = cellTone?.(ri, ci) ?? null;
                      const colT = colTone?.(ci) ?? null;
                      const custom = renderCell?.(ri, ci, v);
                      return (
                        <div
                          key={ci}
                          role="cell"
                          data-cell
                          onMouseEnter={onCellEnter ? () => onCellEnter(ri, ci) : undefined}
                          onFocus={onCellEnter ? () => onCellEnter(ri, ci) : undefined}
                          onClick={
                            onCellClick
                              ? (e) => {
                                  e.stopPropagation();
                                  onCellClick(ri, ci);
                                }
                              : undefined
                          }
                          className={cn(
                            "truncate rounded-lg transition-[background-color,opacity] duration-300",
                            cellPad,
                            typeof v === "number" && "text-right",
                            colT === "focus" && "bg-amber-100/70",
                            colT === "key" && "bg-sky-100/70",
                            colT === "dim" && "opacity-35",
                            ct === "changed" && "bg-sky-200/80 font-bold",
                            ct === "focus" && "bg-amber-200/80 font-bold ring-2 ring-amber-400",
                            ct === "match" && "bg-sky-200/80 font-bold",
                            ct === "dim" && "opacity-35",
                            onCellClick && "cursor-pointer hover:bg-violet-100",
                          )}
                        >
                          {custom ?? <CellText value={v} />}
                        </div>
                      );
                    })}
                    {aside && (
                      <div role="cell" className={cn("flex items-center", cellPad)}>
                        {aside.render(ri)}
                      </div>
                    )}
                  </m.div>
                );
              })}
            </AnimatePresence>
            {relation.rows.length === 0 && (
              <p className="px-3 py-5 text-center font-sans text-sm font-semibold text-ink-500">{emptyText}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A small chip naming a table, e.g. above a RelationTable. */
export function TableChip({
  name,
  tone = "sky",
  children,
}: {
  name: string;
  tone?: "sky" | "violet" | "emerald" | "amber" | "rose" | "fuchsia";
  children?: ReactNode;
}) {
  const tones = {
    fuchsia: "bg-fuchsia-100 text-fuchsia-800",
    sky: "bg-sky-100 text-sky-800",
    violet: "bg-violet-100 text-violet-800",
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-xs font-bold shadow-clay-sm",
        tones[tone],
      )}
    >
      <span>{name}</span>
      {children && <span className="font-sans text-[10px] font-bold uppercase opacity-70">{children}</span>}
    </span>
  );
}
