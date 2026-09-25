import type { SampleTable } from "@/types/question";
import { cn } from "@/lib/utils";

function formatCell(v: unknown) {
  if (v === null || v === undefined) return <span className="italic text-slate-500">NULL</span>;
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export function DataTable({ table, className }: { table: SampleTable; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1.5 font-mono text-xs font-semibold text-sky-300">{table.name}</p>
      <div className="no-scrollbar overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full border-collapse font-mono text-xs sm:text-[13px]">
          <thead>
            <tr className="bg-white/[0.04]">
              {table.columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-2.5 py-1.5 text-left font-semibold text-slate-300">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} className="border-t border-white/5">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "whitespace-nowrap px-2.5 py-1.5 text-slate-200",
                      typeof cell === "number" && "text-right text-amber-200",
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
  if (trimmed === "(no rows)") return <span className="font-mono text-sm italic text-slate-400">(no rows)</span>;
  const rows = trimmed.split("\n").map((line) => line.split(" | "));
  if (rows.length === 1 && rows[0].length === 1) {
    return <span className="font-mono text-base font-semibold text-slate-100">{rows[0][0]}</span>;
  }
  return (
    <table className="border-collapse font-mono text-xs sm:text-[13px]">
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i} className={cn(i > 0 && "border-t border-white/10")}>
            {cells.map((c, j) => (
              <td key={j} className={cn("px-2 py-1 text-slate-100", c.trim() === "NULL" && "italic text-slate-500")}>
                {c.trim()}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
