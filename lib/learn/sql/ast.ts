import type { Span } from "./errors";

export type CellValue = string | number | boolean | null;

export type BinaryOp = "+" | "-" | "*" | "/" | "%" | "||" | "=" | "!=" | "<" | "<=" | ">" | ">=" | "and" | "or";

export type Expr =
  | { type: "literal"; value: CellValue; kind: "int" | "numeric" | "text" | "bool" | "null" | "date"; span: Span }
  | { type: "column"; table: string | null; name: string; span: Span }
  | { type: "star"; table: string | null; span: Span }
  | { type: "unary"; op: "-" | "not"; arg: Expr; span: Span }
  | { type: "binary"; op: BinaryOp; left: Expr; right: Expr; span: Span }
  | { type: "is_null"; arg: Expr; not: boolean; span: Span }
  | { type: "in"; arg: Expr; list: Expr[] | null; query: SelectStmt | null; not: boolean; span: Span }
  | { type: "between"; arg: Expr; low: Expr; high: Expr; not: boolean; span: Span }
  | { type: "like"; arg: Expr; pattern: Expr; not: boolean; ci: boolean; span: Span }
  | {
      type: "func";
      name: string;
      args: Expr[];
      distinct: boolean;
      star: boolean;
      over: WindowSpec | null;
      span: Span;
    }
  | { type: "case"; base: Expr | null; whens: { when: Expr; then: Expr }[]; else: Expr | null; span: Span }
  | { type: "subquery"; query: SelectStmt; span: Span }
  | { type: "exists"; query: SelectStmt; not: boolean; span: Span }
  | { type: "cast"; arg: Expr; to: "int" | "numeric" | "text" | "date"; span: Span };

export interface WindowSpec {
  partitionBy: Expr[];
  orderBy: OrderItem[];
  span: Span;
}

export interface OrderItem {
  expr: Expr;
  dir: "asc" | "desc";
  nulls: "first" | "last" | null;
  span: Span;
}

export interface SelectItem {
  expr: Expr;
  alias: string | null;
  span: Span;
}

export type FromItem =
  | { kind: "table"; name: string; alias: string | null; span: Span }
  | { kind: "subquery"; query: SelectStmt; alias: string; span: Span };

export type JoinKind = "inner" | "left" | "right" | "full" | "cross";

export interface JoinClause {
  kind: JoinKind;
  /** How the join was written, e.g. "LEFT JOIN", "JOIN". */
  keyword: string;
  item: FromItem;
  on: Expr | null;
  span: Span;
}

export interface Cte {
  name: string;
  query: SelectStmt;
  span: Span;
}

export type ClauseKind =
  | "with"
  | "select"
  | "from"
  | "join"
  | "where"
  | "group"
  | "having"
  | "order"
  | "limit"
  | "insert"
  | "values"
  | "update"
  | "set"
  | "delete";

/** A top-level clause of a statement and where it sits in the source, for synchronized highlighting. */
export interface Clause {
  id: string;
  kind: ClauseKind;
  span: Span;
}

export interface SelectStmt {
  type: "select";
  ctes: Cte[];
  distinct: boolean;
  columns: SelectItem[];
  from: FromItem | null;
  joins: JoinClause[];
  where: Expr | null;
  groupBy: Expr[];
  having: Expr | null;
  orderBy: OrderItem[];
  limit: Expr | null;
  offset: Expr | null;
  clauses: Clause[];
  span: Span;
}

export interface InsertStmt {
  type: "insert";
  table: string;
  tableSpan: Span;
  columns: string[] | null;
  rows: Expr[][];
  clauses: Clause[];
  span: Span;
}

export interface UpdateStmt {
  type: "update";
  table: string;
  tableSpan: Span;
  sets: { column: string; expr: Expr; span: Span }[];
  where: Expr | null;
  clauses: Clause[];
  span: Span;
}

export interface DeleteStmt {
  type: "delete";
  table: string;
  tableSpan: Span;
  where: Expr | null;
  clauses: Clause[];
  span: Span;
}

export type Statement = SelectStmt | InsertStmt | UpdateStmt | DeleteStmt;

export const AGGREGATES = new Set(["count", "sum", "avg", "min", "max"]);
export const WINDOW_ONLY = new Set(["row_number", "rank", "dense_rank", "lag", "lead"]);
