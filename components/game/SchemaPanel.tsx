"use client";

import { ChevronDown, Database, KeyRound } from "lucide-react";
import { useState } from "react";
import { SCHEMA, type SchemaTable } from "@/data/schema";
import { cn } from "@/lib/utils";

function TableCard({ table }: { table: SchemaTable }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/60 p-3">
      <p className="font-mono text-sm font-semibold text-sky-300">{table.name}</p>
      <p className="mb-2 text-[11px] text-slate-500">{table.description}</p>
      <ul className="space-y-1">
        {table.columns.map((c) => (
          <li key={c.name} className="flex items-baseline gap-2 font-mono text-xs">
            <span className="flex items-center gap-1 text-slate-200">
              {c.note === "PK" && <KeyRound className="size-3 text-amber-300" aria-label="Primary key" />}
              {c.name}
            </span>
            <span className="text-slate-600">{c.type}</span>
            {c.note && c.note !== "PK" && (
              <span className="ml-auto truncate text-right text-[10px] text-slate-500" title={c.note}>
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
          className="w-full rounded-lg py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
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
          className="glass flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-medium text-slate-200"
        >
          <span className="flex items-center gap-2">
            <Database className="size-4 text-sky-300" aria-hidden /> Schema
            <span className="font-mono text-xs text-slate-500">{tables.map((t) => t.name).join(", ")}</span>
          </span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {open && <div className="mt-2">{body}</div>}
      </div>
      {/* Desktop: always visible sidebar */}
      <div className="glass hidden rounded-2xl p-4 lg:block">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          <Database className="size-4 text-sky-300" aria-hidden /> Schema · PostgreSQL
        </p>
        <div className="no-scrollbar max-h-[calc(100dvh-12rem)] overflow-y-auto">{body}</div>
      </div>
    </aside>
  );
}
