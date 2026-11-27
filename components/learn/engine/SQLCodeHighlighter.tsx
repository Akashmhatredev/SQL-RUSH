"use client";

import { Fragment } from "react";
import { SqlHighlight } from "@/components/game/SqlCode";
import type { Clause } from "@/lib/learn/sql/ast";
import { cn } from "@/lib/utils";

export const CLAUSE_LABELS: Record<string, string> = {
  with: "WITH",
  select: "SELECT",
  from: "FROM",
  join: "JOIN",
  where: "WHERE",
  group: "GROUP BY",
  having: "HAVING",
  order: "ORDER BY",
  limit: "LIMIT",
  insert: "INSERT INTO",
  values: "VALUES",
  update: "UPDATE",
  set: "SET",
  delete: "DELETE FROM",
};

/** Default plain-language meaning of each clause, used when a lesson doesn't give its own. */
export function defaultClauseMeaning(clause: Clause, sql: string): string {
  const text = sql.slice(clause.span.start, clause.span.end).replace(/\s+/g, " ").trim();
  const rest = text.replace(/^\S+(\s+(BY|INTO|FROM|JOIN|OUTER JOIN))?\s*/i, "");
  switch (clause.kind) {
    case "select":
      return /^select\s+(distinct\s+)?\*$/i.test(text)
        ? "Show every column."
        : `Show these columns: ${rest.replace(/^distinct\s+/i, "")}.${/^select\s+distinct/i.test(text) ? " DISTINCT removes repeated rows." : ""}`;
    case "from":
      return `Look in the ${rest} table.`;
    case "join":
      return `Bring in a second table and pair up rows that match: ${text}.`;
    case "where":
      return `Keep only the rows where ${rest} is true.`;
    case "group":
      return `Put rows with the same ${rest} into one group each.`;
    case "having":
      return `Keep only the groups where ${rest} is true.`;
    case "order":
      return `Sort the result by ${rest}.`;
    case "limit":
      return `Keep only the first rows: ${text}.`;
    case "with":
      return "Work out a named, temporary result first, then use it like a table.";
    case "insert":
      return `Add new rows to ${rest.replace(/\s*\(.*$/, "")}.`;
    case "values":
      return "The values for each new row, in column order.";
    case "update":
      return `Change rows in the ${rest} table.`;
    case "set":
      return `The new values: ${rest}.`;
    case "delete":
      return `Remove rows from ${rest}.`;
    default:
      return text;
  }
}

/**
 * SQL with each top-level clause as a tappable chunk. The active clause is highlighted (and the
 * rest dimmed), so code and animation stay in step: tap a clause to jump to its part of the animation.
 */
export function SQLCodeHighlighter({
  sql,
  clauses,
  activeClauseId,
  onSelect,
  className,
  size = "md",
}: {
  sql: string;
  clauses: Clause[];
  activeClauseId?: string | null;
  onSelect?: (clauseId: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const sorted = [...clauses].sort((a, b) => a.span.start - b.span.start);
  const parts: { text: string; clause: Clause | null }[] = [];
  let at = 0;
  for (const c of sorted) {
    if (c.span.start < at) continue;
    if (c.span.start > at) parts.push({ text: sql.slice(at, c.span.start), clause: null });
    parts.push({ text: sql.slice(c.span.start, c.span.end), clause: c });
    at = c.span.end;
  }
  if (at < sql.length) parts.push({ text: sql.slice(at), clause: null });
  const anyActive = !!activeClauseId && clauses.some((c) => c.id === activeClauseId);

  return (
    <pre
      className={cn(
        "clay-inset overflow-x-auto whitespace-pre-wrap break-words rounded-2xl p-3 font-mono leading-7 text-ink-900 sm:p-4",
        size === "sm" ? "text-[13px]" : "text-[14px] sm:text-[15px]",
        className,
      )}
    >
      <code>
        {parts.map((p, i) => {
          if (!p.clause) return <Fragment key={i}>{p.text}</Fragment>;
          const active = p.clause.id === activeClauseId;
          const interactive = !!onSelect;
          return (
            <span
              key={i}
              role={interactive ? "button" : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-pressed={interactive ? active : undefined}
              aria-label={
                interactive ? `${CLAUSE_LABELS[p.clause.kind] ?? p.clause.kind} clause: ${p.text}` : undefined
              }
              onClick={interactive ? () => onSelect(p.clause!.id) : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(p.clause!.id);
                      }
                    }
                  : undefined
              }
              className={cn(
                "rounded-lg px-0.5 transition-[background-color,box-shadow,opacity] duration-300 [box-decoration-break:clone]",
                interactive && "cursor-pointer hover:bg-white/80 focus-visible:outline-2",
                active && "bg-amber-200/80 shadow-[0_0_0_2px_rgb(251_191_36/0.7)]",
                anyActive && !active && "opacity-45",
              )}
            >
              <SqlHighlight code={p.text} />
            </span>
          );
        })}
      </code>
    </pre>
  );
}
