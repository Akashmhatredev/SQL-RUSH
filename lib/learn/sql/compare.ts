import type { CellValue } from "./ast";
import type { DatabaseData, Relation, RunResult } from "./types";

export interface Verdict {
  ok: boolean;
  /** What to tell the learner. */
  message: string;
}

const norm = (v: CellValue): string =>
  v === null ? "∅" : typeof v === "number" ? `n:${Math.round(v * 1e6) / 1e6}` : `${typeof v}:${v}`;

const rowKey = (values: CellValue[]) => values.map(norm).join("|");

function multiset(rows: CellValue[][]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = rowKey(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function sameMultiset(a: CellValue[][], b: CellValue[][]): boolean {
  if (a.length !== b.length) return false;
  const ma = multiset(a);
  const mb = multiset(b);
  if (ma.size !== mb.size) return false;
  for (const [k, n] of ma) if (mb.get(k) !== n) return false;
  return true;
}

function permutations(n: number): number[][] {
  if (n > 6) return [];
  const out: number[][] = [];
  const go = (prefix: number[], rest: number[]) => {
    if (!rest.length) out.push(prefix);
    rest.forEach((x, i) => go([...prefix, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  go([], [...Array(n).keys()]);
  return out;
}

/**
 * Compares a learner's result with the expected one. Column names don't matter (aliases are a
 * matter of taste); values, row counts and, when the expected query sorts, row order do.
 */
export function compareRelations(got: Relation, expected: Relation, ordered: boolean): Verdict {
  const g = got.rows.map((r) => r.values);
  const e = expected.rows.map((r) => r.values);
  const gc = got.columns.length;
  const ec = expected.columns.length;

  if (gc !== ec) {
    return {
      ok: false,
      message: `Your result has ${gc} column${gc === 1 ? "" : "s"}, but the answer has ${ec}. Check which columns you SELECT.`,
    };
  }
  if (sameMultiset(g, e)) {
    if (!ordered) return { ok: true, message: "Correct!" };
    if (g.every((r, i) => rowKey(r) === rowKey(e[i]))) return { ok: true, message: "Correct!" };
    return { ok: false, message: "You have the right rows, but not in the right order. Check your ORDER BY." };
  }
  for (const p of permutations(gc)) {
    if (p.every((x, i) => x === i)) continue;
    if (
      sameMultiset(
        g.map((r) => p.map((i) => r[i])),
        e,
      )
    ) {
      return { ok: false, message: "You have the right data, but the columns are in a different order." };
    }
  }
  if (g.length !== e.length) {
    return {
      ok: false,
      message: `Your query returned ${g.length} row${g.length === 1 ? "" : "s"}, but the answer has ${e.length}.`,
    };
  }
  return { ok: false, message: "You have the right number of rows, but some values are different." };
}

/** Compares the effect of INSERT/UPDATE/DELETE statements: the changed tables must end up identical. */
export function compareDatabases(got: DatabaseData, expected: DatabaseData, tables: string[]): Verdict {
  for (const t of tables) {
    const a = got[t]?.rows ?? [];
    const b = expected[t]?.rows ?? [];
    if (!sameMultiset(a, b)) {
      if (a.length !== b.length) {
        return {
          ok: false,
          message: `${t} should end up with ${b.length} row${b.length === 1 ? "" : "s"}, but yours has ${a.length}.`,
        };
      }
      return { ok: false, message: `${t} doesn't look right yet: some values are different from what was asked.` };
    }
  }
  return { ok: true, message: "Correct!" };
}

/** Checks a learner's run against the solution's run on the same starting data. */
export function compareRuns(got: RunResult, expected: RunResult): Verdict {
  const lastExpected = expected.runs.at(-1)!;
  const lastGot = got.runs.at(-1)!;
  if (lastExpected.result) {
    if (!lastGot.result) return { ok: false, message: "This challenge needs a SELECT query that returns rows." };
    return compareRelations(lastGot.result, lastExpected.result, lastExpected.ordered);
  }
  const kinds = new Set(expected.runs.map((r) => r.statement.type));
  if (!got.runs.some((r) => kinds.has(r.statement.type))) {
    return { ok: false, message: `This challenge needs ${[...kinds].map((k) => k.toUpperCase()).join(" / ")}.` };
  }
  const tables = [...new Set(expected.runs.map((r) => r.table).filter((t): t is string => !!t))];
  return compareDatabases(got.db, expected.db, tables);
}

/** The keywords a query must contain, ignoring case, spacing, strings and comments. */
export function missingKeywords(sql: string, required: string[]): string[] {
  const stripped = sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\s+/g, " ")
    .toUpperCase();
  return required.filter(
    (k) => !new RegExp(`(^|[^A-Z_])${k.toUpperCase().replace(/\s+/g, "\\s+")}([^A-Z_]|$)`).test(stripped),
  );
}
