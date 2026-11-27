import type { CellValue, Clause, Statement } from "./ast";
import type { Span } from "./errors";

export type { CellValue };

export type ColType = "int" | "numeric" | "text" | "bool" | "date" | "unknown";

/** A column of a sample table, as a lesson defines it. */
export interface ColumnDef {
  name: string;
  type: ColType;
  /** Primary key: unique and never NULL. */
  pk?: boolean;
  /** Foreign key: values point at another table's column. */
  ref?: { table: string; column: string };
  /** Plain-language label shown next to the name, e.g. "Student's age in years". */
  description?: string;
}

/** A sample table: small enough to see every row at once. */
export interface TableData {
  name: string;
  /** One line about what the table holds, e.g. "The school's student register". */
  description?: string;
  columns: ColumnDef[];
  rows: CellValue[][];
}

/** Tables by (lower-case) name. */
export type DatabaseData = Record<string, TableData>;

export interface RelColumn {
  name: string;
  /** The FROM alias (or table name) the column came from; null for computed columns. */
  table: string | null;
  type: ColType;
}

export interface RelRow {
  /** Stable identity across stages, so animations can follow a row as it moves. */
  key: string;
  values: CellValue[];
}

/** A table-shaped intermediate result. */
export interface Relation {
  columns: RelColumn[];
  rows: RelRow[];
}

/** The outcome of testing one row (or group) against a condition. */
export interface RowCheck {
  pass: boolean | null;
  /** Each comparison with the row's values filled in, e.g. "20 > 18". */
  parts: { text: string; pass: boolean | null }[];
}

export interface JoinPair {
  left: number | null;
  right: number | null;
}

export interface GroupInfo {
  /** The GROUP BY values, formatted for display. */
  label: string;
  /** Indices into the stage's input rows. */
  rows: number[];
}

export type TraceStage =
  | { kind: "source"; clauseId: string | null; table: string; alias: string; relation: Relation }
  | {
      kind: "join";
      clauseId: string;
      joinKind: "inner" | "left" | "right" | "full" | "cross";
      keyword: string;
      on: string | null;
      left: Relation;
      right: Relation;
      rightName: string;
      /** For each left row, the right rows it matched. */
      matches: number[][];
      pairs: JoinPair[];
      output: Relation;
    }
  | {
      kind: "filter";
      clauseId: string;
      target: "where" | "having";
      condition: string;
      input: Relation;
      checks: RowCheck[];
      output: Relation;
    }
  | {
      kind: "group";
      clauseId: string | null;
      keys: string[];
      input: Relation;
      groups: GroupInfo[];
      /** One row per group: the GROUP BY values followed by each aggregate. */
      output: Relation;
      aggregates: string[];
    }
  | {
      kind: "window";
      clauseId: string;
      functions: string[];
      input: Relation;
      partitions: number[][];
      output: Relation;
    }
  | {
      kind: "project";
      clauseId: string;
      input: Relation;
      /** Input column index each output column copies, or null when it is computed. */
      picked: (number | null)[];
      star: boolean;
      output: Relation;
    }
  | { kind: "distinct"; clauseId: string; input: Relation; duplicateOf: (number | null)[]; output: Relation }
  | {
      kind: "sort";
      clauseId: string;
      keys: { text: string; dir: "asc" | "desc" }[];
      input: Relation;
      /** order[i] is the input index of the row that ends up at position i. */
      order: number[];
      output: Relation;
    }
  | { kind: "limit"; clauseId: string; limit: number | null; offset: number; input: Relation; output: Relation }
  | { kind: "insert"; clauseId: string; table: string; before: Relation; added: number[]; after: Relation }
  | {
      kind: "update";
      clauseId: string;
      table: string;
      condition: string | null;
      before: Relation;
      checks: RowCheck[] | null;
      changes: { row: number; column: number; from: CellValue; to: CellValue }[];
      after: Relation;
    }
  | {
      kind: "delete";
      clauseId: string;
      table: string;
      condition: string | null;
      before: Relation;
      checks: RowCheck[] | null;
      removed: number[];
      after: Relation;
    }
  | { kind: "cte"; clauseId: string; name: string; trace: TraceStage[]; output: Relation };

export type StageKind = TraceStage["kind"];

export interface SqlWarning {
  message: string;
  span: Span | null;
}

export interface StatementRun {
  statement: Statement;
  /** This statement's text. */
  sql: string;
  /** Offset of `sql` within the whole script, for mapping clause spans. */
  offset: number;
  clauses: Clause[];
  trace: TraceStage[];
  /** SELECT: the rows returned. */
  result: Relation | null;
  /** INSERT/UPDATE/DELETE: how many rows changed. */
  affected: number | null;
  table: string | null;
  /** True when the top-level query has ORDER BY, so row order is meaningful. */
  ordered: boolean;
  warnings: SqlWarning[];
}

export interface RunResult {
  runs: StatementRun[];
  /** The database after every statement ran. */
  db: DatabaseData;
}
