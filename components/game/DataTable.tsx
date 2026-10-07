import type { SampleTable } from "@/types/question";
import { cn } from "@/lib/utils";

function formatCell(v: unknown) {
  if (v === null || v === undefined) return <span className="italic text-ink-500">NULL</span>;
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export function DataTable({ table, className }: { table: SampleTable; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1.5 font-mono text-xs font-bold text-sky-700">{table.name}</p>
      <div className="clay-inset no-scrollbar overflow-x-auto rounded-2xl">
        <table className="w-full border-collapse font-mono text-xs sm:text-[13px]">
          <thead>
            <tr className="border-b border-ink-200/70 bg-white/50">
              {table.columns.map((c) => (
                <th
                  key={c}
                  className="whitespace-nowrap px-2.5 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 sm:text-[11px]"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-t border-ink-200/70 first:border-t-0">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "whitespace-nowrap px-2.5 py-1.5 text-ink-800",
                      typeof cell === "number" && "text-right font-semibold text-amber-700",
                    )}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Renders a predict-output option: rows separated by newlines, columns by " | ". */
export function OutputView({ text }: { text: string }) {
  const trimmed = text.trim();
  if (trimmed === "(no rows)") return <span className="font-mono text-sm italic text-ink-500">(no rows)</span>;
  const rows = trimmed.split("\n").map((line) => line.split(" | "));
  if (rows.length === 1 && rows[0].length === 1) {
    return <span className="font-mono text-base font-bold text-ink-900">{rows[0][0]}</span>;
  }
  return (
    <table className="border-collapse font-mono text-xs sm:text-[13px]">
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className={cn(i > 0 && "border-t border-ink-200/70")}>
            {cells.map((c, j) => (
              <td key={j} className={cn("px-2 py-1 text-ink-800", c.trim() === "NULL" && "italic text-ink-500")}>
                {c.trim()}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
