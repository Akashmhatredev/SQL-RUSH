import type { CellValue } from "./ast";

/** Rounds away from zero like PostgreSQL's numeric round(). */
export function roundTo(value: number, places = 0): number {
  const sign = value < 0 ? -1 : 1;
  const shifted = Number(`${Math.abs(value)}e${places}`);
  const rounded = Number(`${Math.round(shifted + 1e-9)}e-${places}`);
  return sign * rounded;
}

/** Display a value in a table cell: NULL is spelled out, long decimals are trimmed to 2 places. */
export function formatCell(value: CellValue): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return String(roundTo(value, 2));
  }
  return value;
}

/** Display a value inside an explanation: text gets quotes so "Pune" reads as a value. */
export function formatLiteral(value: CellValue): string {
  if (typeof value === "string") return `'${value}'`;
  return formatCell(value);
}

/** Total order used by ORDER BY, MIN/MAX and comparisons. NULL handling is left to callers. */
export function compareValues(a: CellValue, b: CellValue): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b ? 0 : a ? 1 : -1;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** A key that is equal for values GROUP BY / DISTINCT treat as the same (NULLs group together). */
export function valueKey(values: CellValue[]): string {
  return JSON.stringify(values.map((v) => (typeof v === "number" ? `n:${v}` : v === null ? null : `${typeof v}:${v}`)));
}

export function likeToRegExp(pattern: string, caseInsensitive: boolean): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\" && i + 1 < pattern.length) {
      source += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    } else if (c === "%") source += "[\\s\\S]*";
    else if (c === "_") source += "[\\s\\S]";
    else source += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`, caseInsensitive ? "i" : "");
}
