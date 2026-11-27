"use client";

import { ArrowDownWideNarrow, ArrowUpNarrowWide, Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CellValue, Relation } from "@/lib/learn/sql/types";
import { compareValues, formatCell } from "@/lib/learn/sql/values";
import type { LessonTable } from "@/lib/learn/types";
import { cn } from "@/lib/utils";
import { RelationTable, TableChip, type RowTone } from "./RelationTable";
import { RowColumnHighlighter, type TableFocus } from "./RowColumnHighlighter";

export type TableEvent =
  | { type: "click-row"; row: CellValue[] }
  | { type: "click-column"; column: string }
  | { type: "hover-cell"; column: string; row: CellValue[] }
  | { type: "select-rows"; count: number }
  | { type: "add-row"; row: CellValue[] }
  | { type: "edit-cell"; column: string; row: CellValue[] }
  | { type: "delete-row"; row: CellValue[] }
  | { type: "sort"; column: string }
  | { type: "reset" };

interface Draft {
  /** Index of the row being edited, or null for a new row. */
  row: number | null;
  values: string[];
}

/** How ascending and descending read for a column type. */
export function sortWords(type: string): [string, string] {
  if (type === "text") return ["A → Z", "Z → A"];
  if (type === "date") return ["oldest first", "newest first"];
  return ["smallest first", "biggest first"];
}

let keySeq = 0;
const newKey = () => `r${++keySeq}`;

function parseValue(raw: string, type: string): { value: CellValue; error: string | null } {
  const t = raw.trim();
  if (t === "") return { value: null, error: null };
  if (type === "int" || type === "numeric") {
    const n = Number(t);
    if (Number.isNaN(n)) return { value: null, error: "needs a number" };
    return { value: type === "int" ? Math.round(n) : n, error: null };
  }
  if (type === "bool") {
    if (/^(true|yes|1)$/i.test(t)) return { value: true, error: null };
    if (/^(false|no|0)$/i.test(t)) return { value: false, error: null };
    return { value: null, error: "true or false" };
  }
  if (type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(t)) return { value: null, error: "like 2024-03-15" };
  return { value: t, error: null };
}

/**
 * An interactive table for exploring data before any SQL: tap rows, columns and cells for a
 * plain-language explanation, sort by a column, select several rows and (when editable) add,
 * edit, delete and reset sample records.
 */
export function TableVisualizer({
  table,
  rows: controlledRows,
  onRowsChange,
  editable = false,
  multiSelect = false,
  sortable = true,
  onEvent,
  rowTone,
  className,
  showExplainer = true,
}: {
  table: LessonTable;
  /** Controlled data; defaults to the table's own rows. */
  rows?: CellValue[][];
  onRowsChange?: (rows: CellValue[][]) => void;
  editable?: boolean;
  multiSelect?: boolean;
  sortable?: boolean;
  onEvent?: (event: TableEvent) => void;
  rowTone?: (row: CellValue[]) => RowTone;
  className?: string;
  showExplainer?: boolean;
}) {
  const [ownRows, setOwnRows] = useState<CellValue[][]>(table.rows);
  const rows = controlledRows ?? ownRows;
  const keysRef = useRef<string[]>([]);
  // Keep a stable key per row so edits and sorting animate instead of re-rendering.
  while (keysRef.current.length < rows.length) keysRef.current.push(newKey());
  if (keysRef.current.length > rows.length) keysRef.current.length = rows.length;

  const [focus, setFocus] = useState<TableFocus>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sort, setSort] = useState<{ col: number; dir: "asc" | "desc" } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const setRows = (next: CellValue[][], keys: string[]) => {
    keysRef.current = keys;
    if (onRowsChange) onRowsChange(next);
    else setOwnRows(next);
  };

  // Display order (sorting never changes the data itself).
  const order = useMemo(() => {
    const idx = rows.map((_, i) => i);
    if (!sort) return idx;
    return idx.sort((a, b) => {
      const x = rows[a][sort.col];
      const y = rows[b][sort.col];
      if (x === null || y === null) return x === y ? a - b : x === null ? 1 : -1;
      const c = compareValues(x, y);
      return (sort.dir === "asc" ? c : -c) || a - b;
    });
  }, [rows, sort]);

  const relation: Relation = {
    columns: table.columns.map((c) => ({ name: c.name, table: table.name, type: c.type })),
    rows: order.map((i) => ({ key: keysRef.current[i], values: rows[i] })),
  };
  const at = (displayIndex: number) => order[displayIndex];

  const focusedRow = focus?.kind === "row" ? focus.row : null;
  const focusedCol = focus?.kind === "column" ? focus.col : null;

  const clickRow = (d: number, col?: number) => {
    const i = at(d);
    if (multiSelect) {
      const next = new Set(selected);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      setSelected(next);
      setFocus(next.size > 1 ? { kind: "rows", rows: [...next].sort((a, b) => a - b) } : { kind: "row", row: i, col });
      onEvent?.({ type: "select-rows", count: next.size });
    } else {
      setFocus({ kind: "row", row: i, col });
    }
    onEvent?.({ type: "click-row", row: rows[i] });
    if (col !== undefined) onEvent?.({ type: "hover-cell", column: table.columns[col].name, row: rows[i] });
  };

  const startDraft = (row: number | null) => {
    setDraftError(null);
    setDraft({
      row,
      values: table.columns.map((c, ci) => {
        if (row !== null) {
          const v = rows[row][ci];
          return v === null ? "" : formatCell(v);
        }
        if (c.pk && c.type === "int") {
          const max = Math.max(0, ...rows.map((r) => (typeof r[ci] === "number" ? (r[ci] as number) : 0)));
          return String(max + 1);
        }
        return "";
      }),
    });
  };

  const saveDraft = () => {
    if (!draft) return;
    const parsed = table.columns.map((c, i) => ({ ...parseValue(draft.values[i], c.type), col: c }));
    const bad = parsed.find((p) => p.error);
    if (bad) return setDraftError(`${bad.col.name}: ${bad.error}.`);
    const values = parsed.map((p) => p.value);
    for (const [ci, c] of table.columns.entries()) {
      if (!c.pk) continue;
      if (values[ci] === null) return setDraftError(`${c.name} can't be empty: it's the primary key.`);
      const clash = rows.findIndex((r, ri) => ri !== draft.row && formatCell(r[ci]) === formatCell(values[ci]));
      if (clash >= 0) {
        return setDraftError(`${c.name} ${formatCell(values[ci])} is already used. Primary keys must be unique.`);
      }
    }
    if (draft.row === null) {
      setRows([...rows, values], [...keysRef.current, newKey()]);
      onEvent?.({ type: "add-row", row: values });
      setFocus({ kind: "row", row: rows.length });
    } else {
      const before = rows[draft.row];
      const next = rows.map((r, i) => (i === draft.row ? values : r));
      setRows(next, keysRef.current);
      table.columns.forEach((c, ci) => {
        if (formatCell(before[ci]) !== formatCell(values[ci]))
          onEvent?.({ type: "edit-cell", column: c.name, row: values });
      });
      setFocus({ kind: "row", row: draft.row });
    }
    setDraft(null);
  };

  const deleteRow = (i: number) => {
    const row = rows[i];
    setRows(
      rows.filter((_, ri) => ri !== i),
      keysRef.current.filter((_, ri) => ri !== i),
    );
    setFocus(null);
    setSelected(new Set());
    onEvent?.({ type: "delete-row", row });
  };

  const reset = () => {
    setRows(
      table.rows,
      table.rows.map(() => newKey()),
    );
    setFocus(null);
    setSelected(new Set());
    setSort(null);
    setDraft(null);
    onEvent?.({ type: "reset" });
  };

  const sortBy = (col: number, dir: "asc" | "desc") => {
    setSort({ col, dir });
    onEvent?.({ type: "sort", column: table.columns[col].name });
  };

  const actions = (
    <>
      {focusedCol !== null && sortable && (
        <>
          <Button size="sm" variant="secondary" onClick={() => sortBy(focusedCol, "asc")}>
            <ArrowUpNarrowWide aria-hidden /> Sort by {table.columns[focusedCol].name},{" "}
            {sortWords(table.columns[focusedCol].type)[0]}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => sortBy(focusedCol, "desc")}>
            <ArrowDownWideNarrow aria-hidden /> {sortWords(table.columns[focusedCol].type)[1]}
          </Button>
        </>
      )}
      {editable && focusedRow !== null && !draft && (
        <>
          <Button size="sm" variant="secondary" onClick={() => startDraft(focusedRow)}>
            <Pencil aria-hidden /> Edit this row
          </Button>
          <Button size="sm" variant="danger" onClick={() => deleteRow(focusedRow)}>
            <Trash2 aria-hidden /> Delete this row
          </Button>
        </>
      )}
    </>
  );
  const hasActions = (focusedCol !== null && sortable) || (editable && focusedRow !== null && !draft);

  return (
    <div className={cn("space-y-3", className)}>
      <RelationTable
        relation={relation}
        scope={`explore-${table.name}`}
        ariaLabel={`${table.name} table`}
        caption={
          <>
            <TableChip name={table.name} tone="sky" />
            <span className="text-xs font-bold text-ink-500">
              {rows.length} row{rows.length === 1 ? "" : "s"}
              {sort && ` · sorted by ${table.columns[sort.col].name} ${sort.dir === "asc" ? "↑" : "↓"}`}
            </span>
          </>
        }
        defs={table.columns}
        onRowClick={(d) => clickRow(d)}
        onCellClick={(d, c) => clickRow(d, c)}
        onCellEnter={(d, c) => {
          if (window.matchMedia("(hover: hover)").matches) {
            onEvent?.({ type: "hover-cell", column: table.columns[c].name, row: rows[at(d)] });
            if (!multiSelect) setFocus({ kind: "cell", row: at(d), col: c });
          }
        }}
        onColumnClick={(c) => {
          setFocus({ kind: "column", col: c });
          onEvent?.({ type: "click-column", column: table.columns[c].name });
        }}
        rowTone={(d) => {
          const i = at(d);
          const custom = rowTone?.(rows[i]);
          if (custom) return custom;
          if (selected.has(i) || focusedRow === i || (focus?.kind === "cell" && focus.row === i)) return "selected";
          return null;
        }}
        colTone={(c) => (focusedCol === c ? "focus" : sort?.col === c ? "key" : null)}
        cellTone={(d, c) =>
          focus?.kind === "cell" && focus.row === at(d) && focus.col === c
            ? "focus"
            : focus?.kind === "row" && focus.row === at(d) && focus.col === c
              ? "focus"
              : null
        }
      />

      {(editable || sort) && (
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button size="sm" variant="primary" onClick={() => startDraft(null)} disabled={!!draft}>
              <Plus aria-hidden /> Add row
            </Button>
          )}
          {(editable || sort) && (
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw aria-hidden /> Reset
            </Button>
          )}
        </div>
      )}

      {draft && (
        <form
          className="clay rounded-3xl p-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveDraft();
          }}
          aria-label={draft.row === null ? "New row" : "Edit row"}
        >
          <p className="mb-3 text-sm font-extrabold text-ink-900">
            {draft.row === null ? `New ${table.entity}` : `Edit row ${draft.row + 1}`}
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {table.columns.map((c, i) => (
              <label key={c.name} className="grid gap-1">
                <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-ink-600">
                  {c.name}
                  {c.pk && <span className="rounded bg-amber-100 px-1 font-sans text-[10px] text-amber-800">key</span>}
                </span>
                <input
                  value={draft.values[i]}
                  onChange={(e) =>
                    setDraft({ ...draft, values: draft.values.map((v, vi) => (vi === i ? e.target.value : v)) })
                  }
                  inputMode={c.type === "int" || c.type === "numeric" ? "decimal" : undefined}
                  placeholder={c.description ?? c.type}
                  className="clay-inset h-10 rounded-xl px-3 font-mono text-[16px] text-ink-900 outline-none focus:ring-2 focus:ring-violet-300 sm:text-sm"
                  autoFocus={i === (draft.row === null && table.columns[0].pk ? 1 : 0)}
                />
              </label>
            ))}
          </div>
          {draftError && (
            <p className="mt-2 text-sm font-semibold text-rose-700" role="alert">
              {draftError}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button type="submit" size="sm" variant="success">
              <Check aria-hidden /> Save row
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              <X aria-hidden /> Cancel
            </Button>
          </div>
        </form>
      )}

      {showExplainer && (
        <RowColumnHighlighter table={table} rows={rows} focus={focus} actions={hasActions ? actions : undefined} />
      )}
    </div>
  );
}
