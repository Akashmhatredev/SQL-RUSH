"use client";

import { ChevronDown, Database, KeyRound } from "lucide-react";
import { useState } from "react";
import { SCHEMA, type SchemaTable } from "@/data/schema";
import { cn } from "@/lib/utils";

function TableCard({ table }: { table: SchemaTable }) {
  return (
    <div className="clay-inset rounded-2xl p-3">
      <p className="font-mono text-sm font-bold text-sky-700">{table.name}</p>
      <p className="mb-2 text-[11px] text-ink-500">{table.description}</p>
      <ul className="space-y-1">
        {table.columns.map((c) => (
          <li key={c.name} className="flex items-baseline gap-2 font-mono text-xs">
            <span className="flex items-center gap-1 font-semibold text-ink-800">
              {c.note === "PK" && <KeyRound className="size-3 text-amber-600" aria-label="Primary key" />}
              {c.name}
            </span>
            <span className="text-ink-500">{c.type}</span>
            {c.note && c.note !== "PK" && (
              <span className="ml-auto truncate text-right text-[10px] text-ink-500" title={c.note}>
                {c.note}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Reference card for the practice database, focused on the tables this question uses. */
export function SchemaPanel({ tables, className }: { tables: SchemaTable[]; className?: string }) {
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState(false);
  const shown = showAll || tables.length === 0 ? SCHEMA : tables;

  const body = (
    <div className="space-y-2.5">
      {shown.map((t) => (
        <TableCard key={t.name} table={t} />
      ))}
      {tables.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full rounded-2xl py-1.5 text-xs font-bold text-violet-700 transition-all hover:bg-white hover:text-violet-900 hover:shadow-clay-sm active:shadow-clay-pressed"
        >
          {showAll ? "Only tables for this question" : `Show all ${SCHEMA.length} tables`}
        </button>
      )}
    </div>
  );

  return (
    <aside className={cn("min-w-0", className)} aria-label="Database schema">
      {/* Mobile / tablet: collapsible */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="clay flex w-full items-center justify-between rounded-3xl px-4 py-3 text-sm font-bold text-ink-800 transition-all hover:-translate-y-0.5 hover:bg-white active:translate-y-px active:shadow-clay-pressed"
        >
          <span className="flex items-center gap-2">
            <Database className="size-4 text-sky-600" aria-hidden /> Schema
            <span className="font-mono text-xs font-normal text-ink-500">{tables.map((t) => t.name).join(", ")}</span>
          </span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {open && <div className="mt-2">{body}</div>}
      </div>
      {/* Desktop: always visible sidebar */}
      <div className="clay hidden rounded-3xl p-4 lg:block">
        <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-500">
          <span className="grid size-7 place-items-center rounded-xl bg-sky-100 shadow-clay-sm">
            <Database className="size-4 text-sky-600" aria-hidden />
          </span>
          Schema · PostgreSQL
        </p>
        <div className="no-scrollbar max-h-[calc(100dvh-12rem)] overflow-y-auto">{body}</div>
      </div>
    </aside>
  );
}
