import {
  AGGREGATES,
  WINDOW_ONLY,
  type CellValue,
  type Clause,
  type ClauseKind,
  type DeleteStmt,
  type Expr,
  type FromItem,
  type InsertStmt,
  type SelectStmt,
  type Statement,
  type UpdateStmt,
} from "./ast";
import { SqlError, suggest } from "./errors";
import { parseSql } from "./parser";
import type {
  ColType,
  ColumnDef,
  DatabaseData,
  GroupInfo,
  JoinPair,
  RelColumn,
  Relation,
  RelRow,
  RowCheck,
  RunResult,
  SqlWarning,
  StatementRun,
  TableData,
  TraceStage,
} from "./types";
import { compareValues, formatCell, formatLiteral, likeToRegExp, roundTo, valueKey } from "./values";

// ---------------------------------------------------------------------------
// Scopes and environment
// ---------------------------------------------------------------------------

interface Scope {
  cols: RelColumn[];
  values: CellValue[];
  outer: Scope | null;
  aggs: Map<Expr, CellValue> | null;
  wins: Map<Expr, CellValue> | null;
}

interface Item {
  key: string;
  scope: Scope;
}

interface TableSource {
  name: string;
  columns: RelColumn[];
  rows: CellValue[][];
}

interface Env {
  sql: string;
  tables: Map<string, TableSource>;
  warnings: SqlWarning[];
}

type ClauseRole = "select" | "where" | "on" | "group" | "having" | "order" | "values" | "set" | "limit";

const SCALAR_FUNCTIONS: Record<string, [min: number, max: number]> = {
  upper: [1, 1],
  lower: [1, 1],
  length: [1, 1],
  trim: [1, 1],
  round: [1, 2],
  abs: [1, 1],
  ceil: [1, 1],
  floor: [1, 1],
  coalesce: [1, 20],
  nullif: [2, 2],
  concat: [1, 20],
};

const WINDOW_FUNCTIONS: Record<string, [min: number, max: number]> = {
  row_number: [0, 0],
  rank: [0, 0],
  dense_rank: [0, 0],
  lag: [1, 3],
  lead: [1, 3],
};

const ALL_FUNCTIONS = [...Object.keys(SCALAR_FUNCTIONS), ...AGGREGATES, ...Object.keys(WINDOW_FUNCTIONS)];

const text = (env: Env, e: { span: { start: number; end: number } }) => env.sql.slice(e.span.start, e.span.end);

const isAggregate = (e: Expr): e is Extract<Expr, { type: "func" }> =>
  e.type === "func" && AGGREGATES.has(e.name) && !e.over;
const isWindow = (e: Expr): e is Extract<Expr, { type: "func" }> => e.type === "func" && !!e.over;

/** Child expressions, without descending into subqueries. */
function children(e: Expr): Expr[] {
  switch (e.type) {
    case "unary":
      return [e.arg];
    case "binary":
      return [e.left, e.right];
    case "is_null":
      return [e.arg];
    case "in":
      return [e.arg, ...(e.list ?? [])];
    case "between":
      return [e.arg, e.low, e.high];
    case "like":
      return [e.arg, e.pattern];
    case "func":
      return [...e.args, ...(e.over ? [...e.over.partitionBy, ...e.over.orderBy.map((o) => o.expr)] : [])];
    case "case":
      return [...(e.base ? [e.base] : []), ...e.whens.flatMap((w) => [w.when, w.then]), ...(e.else ? [e.else] : [])];
    case "cast":
      return [e.arg];
    default:
      return [];
  }
}

function collect(e: Expr | null, pred: (e: Expr) => boolean, out: Expr[] = [], descend = false): Expr[] {
  if (!e) return out;
  if (pred(e)) {
    out.push(e);
    if (!descend) return out;
  }
  for (const c of children(e)) collect(c, pred, out, descend);
  return out;
}

// ---------------------------------------------------------------------------
// Column resolution
// ---------------------------------------------------------------------------

function matchColumns(cols: RelColumn[], table: string | null, name: string): number[] {
  const out: number[] = [];
  cols.forEach((c, i) => {
    if (c.name === name && (table === null || c.table === table)) out.push(i);
  });
  return out;
}

function resolveColumn(env: Env, scope: Scope, e: Extract<Expr, { type: "column" }>): { scope: Scope; index: number } {
  let s: Scope | null = scope;
  while (s) {
    const found = matchColumns(s.cols, e.table, e.name);
    if (found.length > 1) {
      const tables = [...new Set(found.map((i) => s!.cols[i].table).filter(Boolean))];
      throw new SqlError(
        `"${e.name}" is in more than one table here${tables.length ? ` (${tables.join(", ")})` : ""}, so say which one you mean.`,
        e.span,
        tables.length ? `Write ${tables[0]}.${e.name}` : null,
      );
    }
    if (found.length === 1) return { scope: s, index: found[0] };
    s = s.outer;
  }
  throw unknownColumn(env, scope, e);
}

function unknownColumn(env: Env, scope: Scope, e: Extract<Expr, { type: "column" }>): SqlError {
  const raw = text(env, e);
  if (raw.startsWith('"') && e.table === null) {
    return new SqlError(
      `${raw} in double quotes is read as a column name, and there's no such column.`,
      e.span,
      `For a text value, use single quotes: '${e.name}'.`,
    );
  }
  const all: RelColumn[] = [];
  for (let s: Scope | null = scope; s; s = s.outer) all.push(...s.cols);
  if (e.table !== null) {
    const tables = new Set(all.map((c) => c.table).filter((t): t is string => !!t));
    if (!tables.has(e.table)) {
      const alt = suggest(e.table, tables);
      return new SqlError(
        `There's no table called "${e.table}" in this part of the query.`,
        e.span,
        alt ? `Did you mean ${alt}.${e.name}?` : tables.size ? `Tables here: ${[...tables].join(", ")}.` : null,
      );
    }
    const inTable = all.filter((c) => c.table === e.table).map((c) => c.name);
    const alt = suggest(e.name, inTable);
    return new SqlError(
      `The table ${e.table} has no column called "${e.name}".`,
      e.span,
      alt ? `Did you mean ${e.table}.${alt}?` : `Its columns are: ${inTable.join(", ")}.`,
    );
  }
  const names = [...new Set(all.map((c) => c.name))];
  const alt = suggest(e.name, names);
  if (!names.length) {
    return new SqlError(
      `"${raw}" isn't a value I recognise.`,
      e.span,
      `If it's text, put it in single quotes: '${raw}'.`,
    );
  }
  return new SqlError(
    `There's no column called "${raw.startsWith('"') ? e.name : raw}".`,
    e.span,
    alt
      ? `Did you mean "${alt}"?`
      : `If ${raw} is a text value rather than a column, put it in single quotes: '${raw}'. Columns you can use: ${names.join(", ")}.`,
  );
}

// ---------------------------------------------------------------------------
// Static types (for integer division and result column types)
// ---------------------------------------------------------------------------

function typeOf(env: Env, e: Expr, scope: Scope): ColType {
  switch (e.type) {
    case "literal":
      return e.kind === "null" ? "unknown" : e.kind;
    case "column": {
      const r = resolveColumn(env, scope, e);
      return r.scope.cols[r.index].type;
    }
    case "unary":
      return e.op === "not" ? "bool" : typeOf(env, e.arg, scope);
    case "binary": {
      if (["+", "-", "*", "/", "%"].includes(e.op)) {
        const l = typeOf(env, e.left, scope);
        const r = typeOf(env, e.right, scope);
        return l === "int" && r === "int" ? "int" : "numeric";
      }
      return e.op === "||" ? "text" : "bool";
    }
    case "is_null":
    case "in":
    case "between":
    case "like":
    case "exists":
      return "bool";
    case "func":
      switch (e.name) {
        case "count":
        case "row_number":
        case "rank":
        case "dense_rank":
        case "length":
          return "int";
        case "sum": {
          const t = typeOf(env, e.args[0], scope);
          return t === "int" ? "int" : "numeric";
        }
        case "avg":
        case "round":
        case "ceil":
        case "floor":
          return "numeric";
        case "upper":
        case "lower":
        case "concat":
        case "trim":
          return "text";
        default: {
          for (const a of e.args) {
            const t = typeOf(env, a, scope);
            if (t !== "unknown") return t;
          }
          return "unknown";
        }
      }
    case "case": {
      for (const w of e.whens) {
        const t = typeOf(env, w.then, scope);
        if (t !== "unknown") return t;
      }
      return e.else ? typeOf(env, e.else, scope) : "unknown";
    }
    case "cast":
      return e.to;
    default:
      return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Validation (so mistakes are reported even when a table is empty)
// ---------------------------------------------------------------------------

function checkExpr(env: Env, e: Expr, scope: Scope, role: ClauseRole, inAggregate = false): void {
  switch (e.type) {
    case "column":
      resolveColumn(env, scope, e);
      return;
    case "star":
      throw new SqlError("* can only be used as SELECT * or COUNT(*).", e.span);
    case "subquery":
    case "exists":
      checkSubquery(env, e.query, scope);
      if (e.type === "subquery") {
        const cols = selectWidth(env, e.query, scope);
        if (cols !== 1) throw new SqlError("A subquery used as a single value must return exactly one column.", e.span);
      }
      return;
    case "in":
      if (e.query) {
        checkSubquery(env, e.query, scope);
        if (selectWidth(env, e.query, scope) !== 1) {
          throw new SqlError("The subquery after IN must return exactly one column.", e.span);
        }
      }
      break;
    case "func": {
      const name = e.name;
      if (e.over) {
        if (role !== "select" && role !== "order") {
          throw new SqlError(
            `Window functions like ${name.toUpperCase()}() OVER (…) can only be used in SELECT or ORDER BY.`,
            e.span,
          );
        }
        if (inAggregate) throw new SqlError("A window function can't be used inside an aggregate.", e.span);
        if (!AGGREGATES.has(name) && !WINDOW_FUNCTIONS[name]) {
          throw new SqlError(`${name.toUpperCase()}() can't be used with OVER.`, e.span);
        }
        const [min, max] = WINDOW_FUNCTIONS[name] ?? [e.star ? 0 : 1, 1];
        if (!e.star && (e.args.length < min || e.args.length > max)) {
          throw new SqlError(`${name.toUpperCase()}() got the wrong number of values.`, e.span);
        }
        for (const a of children(e)) checkExpr(env, a, scope, role, inAggregate);
        return;
      }
      if (WINDOW_ONLY.has(name)) {
        throw new SqlError(
          `${name.toUpperCase()}() needs OVER (…), e.g. ${name.toUpperCase()}() OVER (ORDER BY score DESC).`,
          e.span,
        );
      }
      if (AGGREGATES.has(name)) {
        if (role === "where") {
          throw new SqlError(
            `Aggregate functions like ${name.toUpperCase()}() can't be used in WHERE, because WHERE looks at one row at a time.`,
            e.span,
            "To filter groups by a count or total, use HAVING after GROUP BY.",
          );
        }
        if (role === "on" || role === "group" || role === "values" || role === "set" || role === "limit") {
          throw new SqlError(`${name.toUpperCase()}() can't be used here.`, e.span);
        }
        if (inAggregate) throw new SqlError("Aggregate functions can't be nested inside each other.", e.span);
        if (e.star && name !== "count")
          throw new SqlError(`Only COUNT can use *. Try ${name.toUpperCase()}(column).`, e.span);
        if (!e.star && e.args.length !== 1) {
          throw new SqlError(`${name.toUpperCase()}() takes exactly one column or value.`, e.span);
        }
        for (const a of e.args) checkExpr(env, a, scope, role, true);
        return;
      }
      const arity = SCALAR_FUNCTIONS[name];
      if (!arity) {
        const alt = suggest(name, ALL_FUNCTIONS);
        throw new SqlError(
          `I don't know a function called ${name.toUpperCase()}().`,
          e.span,
          alt ? `Did you mean ${alt.toUpperCase()}()?` : null,
        );
      }
      if (e.star) throw new SqlError(`${name.toUpperCase()}(*) isn't valid.`, e.span);
      if (e.args.length < arity[0] || e.args.length > arity[1]) {
        throw new SqlError(`${name.toUpperCase()}() got the wrong number of values.`, e.span);
      }
      break;
    }
    case "binary": {
      if (["=", "!=", "<", "<=", ">", ">="].includes(e.op)) {
        const nullSide = [e.left, e.right].find((x) => x.type === "literal" && x.value === null);
        if (nullSide && !env.warnings.some((w) => w.span?.start === e.span.start)) {
          env.warnings.push({
            message:
              e.op === "=" || e.op === "!="
                ? `Comparing with NULL using ${e.op === "=" ? "=" : "!="} is never true, so no rows match. Use IS ${e.op === "=" ? "" : "NOT "}NULL instead.`
                : "Comparing with NULL is never true, so no rows match.",
            span: e.span,
          });
        }
        const l = e.left.type === "literal" ? "literal" : typeOf(env, e.left, scope);
        const r = e.right.type === "literal" ? "literal" : typeOf(env, e.right, scope);
        const num = (t: string) => t === "int" || t === "numeric";
        if ((l === "text" && num(r)) || (num(l) && r === "text")) {
          throw new SqlError("This compares text with a number, which SQL doesn't allow.", e.span);
        }
        const lit = e.left.type === "literal" ? e.left : e.right.type === "literal" ? e.right : null;
        const other = lit === e.left ? r : l;
        if (lit && lit.type === "literal" && typeof lit.value === "number" && other === "text") {
          throw new SqlError(
            "This compares a text column with a number.",
            e.span,
            `If you meant the text, put it in single quotes: '${lit.value}'.`,
          );
        }
      }
      break;
    }
  }
  for (const c of children(e)) checkExpr(env, c, scope, role, inAggregate);
}

function checkSubquery(env: Env, q: SelectStmt, scope: Scope): void {
  // Running it once with this scope reports any mistakes inside it.
  execSelect(env, q, scope, null);
}

function selectWidth(env: Env, q: SelectStmt, scope: Scope): number {
  return execSelect(env, q, scope, null).columns.length;
}

/** Same expression, ignoring spacing and how columns are qualified. */
function sameExpr(env: Env, a: Expr, b: Expr, scope: Scope): boolean {
  if (a.type === "column" && b.type === "column") {
    try {
      const ra = resolveColumn(env, scope, a);
      const rb = resolveColumn(env, scope, b);
      return ra.scope === rb.scope && ra.index === rb.index;
    } catch {
      return false;
    }
  }
  return normalizeText(text(env, a)) === normalizeText(text(env, b));
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/^\((.*)\)$/, "$1");
}

/** Every column used outside an aggregate must be one of the GROUP BY expressions. */
function checkGrouped(env: Env, e: Expr, groupBy: Expr[], scope: Scope): void {
  if (groupBy.some((g) => sameExpr(env, e, g, scope))) return;
  if (isAggregate(e) || e.type === "subquery" || e.type === "exists") return;
  if (e.type === "column") {
    const r = resolveColumn(env, scope, e);
    if (r.scope !== scope) return; // outer reference in a correlated subquery
    throw new SqlError(
      groupBy.length
        ? `"${text(env, e)}" must be in GROUP BY or inside an aggregate like COUNT(), SUM() or MAX().`
        : `"${text(env, e)}" can't be shown next to an aggregate unless you GROUP BY it.`,
      e.span,
      groupBy.length
        ? "Each group becomes one row, so every other column needs to be summarised."
        : `Add GROUP BY ${text(env, e)} to get one row per ${text(env, e)}.`,
    );
  }
  if (e.type === "in" && e.query) {
    checkGrouped(env, e.arg, groupBy, scope);
    return;
  }
  for (const c of children(e)) checkGrouped(env, c, groupBy, scope);
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

function toNumber(env: Env, v: CellValue, e: Expr): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  throw new SqlError(`${formatLiteral(v)} isn't a number, so I can't do maths with it.`, e.span);
}

function truthy(env: Env, v: CellValue, e: Expr): boolean | null {
  if (v === null) return null;
  if (typeof v === "boolean") return v;
  throw new SqlError(
    `"${text(env, e)}" isn't a true/false condition.`,
    e.span,
    "Conditions compare something, e.g. age > 18.",
  );
}

function compareForCondition(env: Env, a: CellValue, b: CellValue, e: Expr): number | null {
  if (a === null || b === null) return null;
  if (typeof a === "number" && typeof b === "string") b = toNumber(env, b, e);
  else if (typeof a === "string" && typeof b === "number") a = toNumber(env, a, e);
  return compareValues(a, b);
}

function evalExpr(env: Env, e: Expr, scope: Scope): CellValue {
  switch (e.type) {
    case "literal":
      return e.value;
    case "column": {
      const r = resolveColumn(env, scope, e);
      return r.scope.values[r.index] ?? null;
    }
    case "star":
      throw new SqlError("* can only be used as SELECT * or COUNT(*).", e.span);
    case "unary": {
      const v = evalExpr(env, e.arg, scope);
      if (e.op === "not") {
        const b = truthy(env, v, e.arg);
        return b === null ? null : !b;
      }
      return v === null ? null : -toNumber(env, v, e.arg);
    }
    case "binary":
      return evalBinary(env, e, scope);
    case "is_null": {
      const v = evalExpr(env, e.arg, scope);
      return e.not ? v !== null : v === null;
    }
    case "in": {
      const v = evalExpr(env, e.arg, scope);
      const candidates = e.query
        ? execSelect(env, e.query, scope, null).rows.map((r) => r.values[0])
        : (e.list ?? []).map((x) => evalExpr(env, x, scope));
      if (v === null) return null;
      let sawNull = false;
      for (const c of candidates) {
        const cmp = compareForCondition(env, v, c, e);
        if (cmp === null) sawNull = true;
        else if (cmp === 0) return !e.not;
      }
      return sawNull ? null : e.not;
    }
    case "between": {
      const v = evalExpr(env, e.arg, scope);
      const lo = compareForCondition(env, v, evalExpr(env, e.low, scope), e);
      const hi = compareForCondition(env, v, evalExpr(env, e.high, scope), e);
      const a = lo === null ? null : lo >= 0;
      const b = hi === null ? null : hi <= 0;
      const result = a === false || b === false ? false : a === null || b === null ? null : true;
      return result === null ? null : e.not ? !result : result;
    }
    case "like": {
      const v = evalExpr(env, e.arg, scope);
      const p = evalExpr(env, e.pattern, scope);
      if (v === null || p === null) return null;
      const ok = likeToRegExp(String(p), e.ci).test(String(v));
      return e.not ? !ok : ok;
    }
    case "func":
      return evalFunc(env, e, scope);
    case "case": {
      const base = e.base ? evalExpr(env, e.base, scope) : undefined;
      for (const w of e.whens) {
        if (base !== undefined) {
          if (compareForCondition(env, base, evalExpr(env, w.when, scope), w.when) === 0)
            return evalExpr(env, w.then, scope);
        } else if (truthy(env, evalExpr(env, w.when, scope), w.when) === true) {
          return evalExpr(env, w.then, scope);
        }
      }
      return e.else ? evalExpr(env, e.else, scope) : null;
    }
    case "subquery": {
      const rel = execSelect(env, e.query, scope, null);
      if (rel.rows.length > 1) {
        throw new SqlError("This subquery returned more than one row, but it's used as a single value.", e.span);
      }
      return rel.rows[0]?.values[0] ?? null;
    }
    case "exists": {
      const rel = execSelect(env, e.query, scope, null);
      return e.not ? rel.rows.length === 0 : rel.rows.length > 0;
    }
    case "cast":
      return castValue(env, evalExpr(env, e.arg, scope), e.to, e);
  }
}

function castValue(env: Env, v: CellValue, to: ColType, e: Expr): CellValue {
  if (v === null) return null;
  switch (to) {
    case "int":
      return Math.round(toNumber(env, v, e));
    case "numeric":
      return toNumber(env, v, e);
    case "text":
      return formatCell(v);
    case "date":
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      throw new SqlError(`${formatLiteral(v)} isn't a date. Dates look like '2024-03-15'.`, e.span);
    default:
      return v;
  }
}

function evalBinary(env: Env, e: Extract<Expr, { type: "binary" }>, scope: Scope): CellValue {
  if (e.op === "and" || e.op === "or") {
    const l = truthy(env, evalExpr(env, e.left, scope), e.left);
    if (e.op === "and" && l === false) return false;
    if (e.op === "or" && l === true) return true;
    const r = truthy(env, evalExpr(env, e.right, scope), e.right);
    if (e.op === "and") return r === false ? false : l === null || r === null ? null : true;
    return r === true ? true : l === null || r === null ? null : false;
  }
  const l = evalExpr(env, e.left, scope);
  const r = evalExpr(env, e.right, scope);
  switch (e.op) {
    case "=":
    case "!=":
    case "<":
    case "<=":
    case ">":
    case ">=": {
      const c = compareForCondition(env, l, r, e);
      if (c === null) return null;
      return e.op === "="
        ? c === 0
        : e.op === "!="
          ? c !== 0
          : e.op === "<"
            ? c < 0
            : e.op === "<="
              ? c <= 0
              : e.op === ">"
                ? c > 0
                : c >= 0;
    }
    case "||":
      return l === null || r === null ? null : formatCell(l) + formatCell(r);
    default: {
      if (l === null || r === null) return null;
      const a = toNumber(env, l, e.left);
      const b = toNumber(env, r, e.right);
      const intMath = typeOf(env, e.left, scope) === "int" && typeOf(env, e.right, scope) === "int";
      switch (e.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          if (b === 0) throw new SqlError("You can't divide by zero.", e.span);
          return intMath ? Math.trunc(a / b) : a / b;
        case "%":
          if (b === 0) throw new SqlError("You can't divide by zero.", e.span);
          return a % b;
      }
    }
  }
  return null;
}

function evalFunc(env: Env, e: Extract<Expr, { type: "func" }>, scope: Scope): CellValue {
  if (e.over) {
    for (let s: Scope | null = scope; s; s = s.outer) {
      if (s.wins?.has(e)) return s.wins.get(e) ?? null;
    }
    throw new SqlError(`${e.name.toUpperCase()}() OVER (…) can't be used here.`, e.span);
  }
  if (AGGREGATES.has(e.name)) {
    for (let s: Scope | null = scope; s; s = s.outer) {
      if (s.aggs?.has(e)) return s.aggs.get(e) ?? null;
    }
    throw new SqlError(`${e.name.toUpperCase()}() can't be used here.`, e.span);
  }
  const args = e.args.map((a) => evalExpr(env, a, scope));
  const [a, b] = args;
  switch (e.name) {
    case "upper":
      return a === null ? null : formatCell(a).toUpperCase();
    case "lower":
      return a === null ? null : formatCell(a).toLowerCase();
    case "trim":
      return a === null ? null : formatCell(a).trim();
    case "length":
      return a === null ? null : formatCell(a).length;
    case "abs":
      return a === null ? null : Math.abs(toNumber(env, a, e));
    case "ceil":
      return a === null ? null : Math.ceil(toNumber(env, a, e));
    case "floor":
      return a === null ? null : Math.floor(toNumber(env, a, e));
    case "round":
      if (a === null || (args.length > 1 && b === null)) return null;
      return roundTo(toNumber(env, a, e), args.length > 1 ? toNumber(env, b, e) : 0);
    case "coalesce":
      return args.find((v) => v !== null) ?? null;
    case "nullif":
      return compareForCondition(env, a, b, e) === 0 ? null : a;
    case "concat":
      return args.map((v) => (v === null ? "" : formatCell(v))).join("");
  }
  return null;
}

function computeAggregate(env: Env, e: Extract<Expr, { type: "func" }>, scopes: Scope[]): CellValue {
  if (e.star) return scopes.length;
  let values = scopes.map((s) => evalExpr(env, e.args[0], s)).filter((v) => v !== null);
  if (e.distinct) {
    const seen = new Set<string>();
    values = values.filter((v) => {
      const k = valueKey([v]);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  switch (e.name) {
    case "count":
      return values.length;
    case "sum":
      return values.length ? values.reduce<number>((t, v) => t + toNumber(env, v, e), 0) : null;
    case "avg":
      return values.length ? values.reduce<number>((t, v) => t + toNumber(env, v, e), 0) / values.length : null;
    case "min":
      return values.length ? values.reduce((m, v) => (compareValues(v, m) < 0 ? v : m)) : null;
    case "max":
      return values.length ? values.reduce((m, v) => (compareValues(v, m) > 0 ? v : m)) : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Explaining conditions row by row
// ---------------------------------------------------------------------------

const OP_TEXT: Record<string, string> = { "=": "=", "!=": "≠", "<": "<", "<=": "≤", ">": ">", ">=": "≥" };

function leaves(e: Expr): Expr[] {
  if (e.type === "binary" && (e.op === "and" || e.op === "or")) return [...leaves(e.left), ...leaves(e.right)];
  if (e.type === "unary" && e.op === "not") return leaves(e.arg);
  return [e];
}

function show(env: Env, e: Expr, scope: Scope): string {
  if (e.type === "literal") return text(env, e);
  try {
    return formatLiteral(evalExpr(env, e, scope));
  } catch {
    return text(env, e);
  }
}

function describeLeaf(env: Env, e: Expr, scope: Scope): string {
  switch (e.type) {
    case "binary":
      if (OP_TEXT[e.op]) return `${show(env, e.left, scope)} ${OP_TEXT[e.op]} ${show(env, e.right, scope)}`;
      break;
    case "is_null":
      return `${show(env, e.arg, scope)} IS ${e.not ? "NOT " : ""}NULL`;
    case "in":
      return `${show(env, e.arg, scope)} ${e.not ? "NOT " : ""}IN ${e.query ? "(subquery)" : `(${(e.list ?? []).map((x) => text(env, x)).join(", ")})`}`;
    case "between":
      return `${show(env, e.arg, scope)} ${e.not ? "NOT " : ""}BETWEEN ${show(env, e.low, scope)} AND ${show(env, e.high, scope)}`;
    case "like":
      return `${show(env, e.arg, scope)} ${e.not ? "NOT " : ""}${e.ci ? "ILIKE" : "LIKE"} ${show(env, e.pattern, scope)}`;
  }
  return text(env, e);
}

function explainCheck(env: Env, cond: Expr, scope: Scope): RowCheck {
  const pass = truthy(env, evalExpr(env, cond, scope), cond);
  const parts = leaves(cond)
    .slice(0, 4)
    .map((leaf) => {
      let p: boolean | null = null;
      try {
        const v = evalExpr(env, leaf, scope);
        p = typeof v === "boolean" ? v : null;
      } catch {
        p = null;
      }
      return { text: describeLeaf(env, leaf, scope), pass: p };
    });
  return { pass, parts };
}

// ---------------------------------------------------------------------------
// SELECT
// ---------------------------------------------------------------------------

const scopeFor = (cols: RelColumn[], values: CellValue[], outer: Scope | null): Scope => ({
  cols,
  values,
  outer,
  aggs: null,
  wins: null,
});

const relationOf = (cols: RelColumn[], items: Item[]): Relation => ({
  columns: cols,
  rows: items.map((i) => ({ key: i.key, values: i.scope.values })),
});

function clauseId(clauses: Clause[], kind: ClauseKind, nth = 0): string {
  return clauses.filter((c) => c.kind === kind)[nth]?.id ?? clauses[0]?.id ?? kind;
}

function loadFrom(
  env: Env,
  item: FromItem,
  outer: Scope | null,
): { alias: string; label: string; cols: RelColumn[]; rows: CellValue[][] } {
  if (item.kind === "subquery") {
    const rel = execSelect(env, item.query, outer, null);
    return {
      alias: item.alias,
      label: item.alias,
      cols: rel.columns.map((c) => ({ ...c, table: item.alias })),
      rows: rel.rows.map((r) => r.values),
    };
  }
  const table = env.tables.get(item.name);
  if (!table) {
    const alt = suggest(item.name, env.tables.keys());
    throw new SqlError(
      `There's no table called "${item.name}".`,
      item.span,
      alt ? `Did you mean ${alt}?` : `Tables you can use: ${[...env.tables.keys()].join(", ")}.`,
    );
  }
  const alias = item.alias ?? item.name;
  return { alias, label: table.name, cols: table.columns.map((c) => ({ ...c, table: alias })), rows: table.rows };
}

function outputName(e: Expr): string {
  switch (e.type) {
    case "column":
      return e.name;
    case "func":
      return e.name;
    case "case":
      return "case";
    case "cast":
      return e.arg.type === "column" ? e.arg.name : e.to;
    case "exists":
      return "exists";
    default:
      return "?column?";
  }
}

function execSelect(env: Env, stmt: SelectStmt, outer: Scope | null, trace: TraceStage[] | null): Relation {
  // WITH: each named query becomes a table for the rest of the statement.
  if (stmt.ctes.length) {
    const tables = new Map(env.tables);
    const inner: Env = { ...env, tables };
    for (const cte of stmt.ctes) {
      const cteTrace: TraceStage[] | null = trace ? [] : null;
      const rel = execSelect(inner, cte.query, outer, cteTrace);
      tables.set(cte.name, {
        name: cte.name,
        columns: rel.columns.map((c) => ({ ...c, table: null })),
        rows: rel.rows.map((r) => r.values),
      });
      trace?.push({
        kind: "cte",
        clauseId: clauseId(stmt.clauses, "with"),
        name: cte.name,
        trace: cteTrace ?? [],
        output: {
          columns: rel.columns.map((c) => ({ ...c, table: cte.name })),
          rows: rel.rows.map((r, i) => ({ key: `${cte.name}#${i}`, values: r.values })),
        },
      });
    }
    return execSelect(inner, { ...stmt, ctes: [] }, outer, trace);
  }

  // FROM
  let cols: RelColumn[] = [];
  let items: Item[] = [{ key: "row", scope: scopeFor([], [], outer) }];
  if (stmt.from) {
    const src = loadFrom(env, stmt.from, outer);
    cols = src.cols;
    items = src.rows.map((values, i) => ({ key: `${src.alias}#${i}`, scope: scopeFor(cols, values, outer) }));
    trace?.push({
      kind: "source",
      clauseId: clauseId(stmt.clauses, "from"),
      table: src.label,
      alias: src.alias,
      relation: relationOf(cols, items),
    });
  }

  // JOINs
  stmt.joins.forEach((join, j) => {
    const right = loadFrom(env, join.item, outer);
    if (cols.some((c) => c.table === right.alias)) {
      throw new SqlError(
        `The name "${right.alias}" is used twice. Give one of the tables an alias, e.g. ${right.label} AS x.`,
        join.item.span,
      );
    }
    const joined = [...cols, ...right.cols];
    const nullsLeft = cols.map(() => null);
    const nullsRight = right.cols.map(() => null);
    const probe = scopeFor(joined, [...nullsLeft, ...nullsRight], outer);
    if (join.on) {
      checkExpr(env, join.on, probe, "on");
      truthyCheck(env, join.on, probe);
    }
    const matches: number[][] = items.map(() => []);
    const rightMatched = new Set<number>();
    const pairs: JoinPair[] = [];
    const out: Item[] = [];
    items.forEach((l, li) => {
      right.rows.forEach((rv, ri) => {
        const values = [...l.scope.values, ...rv];
        const ok = join.on
          ? truthy(env, evalExpr(env, join.on, scopeFor(joined, values, outer)), join.on) === true
          : true;
        if (ok) {
          matches[li].push(ri);
          rightMatched.add(ri);
          pairs.push({ left: li, right: ri });
          out.push({ key: `${l.key}+${right.alias}#${ri}`, scope: scopeFor(joined, values, outer) });
        }
      });
      if (!matches[li].length && (join.kind === "left" || join.kind === "full")) {
        pairs.push({ left: li, right: null });
        out.push({ key: `${l.key}+∅`, scope: scopeFor(joined, [...l.scope.values, ...nullsRight], outer) });
      }
    });
    if (join.kind === "right" || join.kind === "full") {
      right.rows.forEach((rv, ri) => {
        if (rightMatched.has(ri)) return;
        pairs.push({ left: null, right: ri });
        out.push({ key: `∅+${right.alias}#${ri}`, scope: scopeFor(joined, [...nullsLeft, ...rv], outer) });
      });
    }
    trace?.push({
      kind: "join",
      clauseId: clauseId(stmt.clauses, "join", j),
      joinKind: join.kind,
      keyword: join.keyword,
      on: join.on ? text(env, join.on) : null,
      left: relationOf(cols, items),
      right: {
        columns: right.cols,
        rows: right.rows.map((values, i) => ({ key: `${right.alias}#${i}`, values })),
      },
      rightName: right.label,
      matches,
      pairs,
      output: relationOf(joined, out),
    });
    cols = joined;
    items = out;
  });

  const probe = scopeFor(
    cols,
    cols.map(() => null),
    outer,
  );

  // WHERE
  if (stmt.where) {
    checkExpr(env, stmt.where, probe, "where");
    truthyCheck(env, stmt.where, probe);
    const input = relationOf(cols, items);
    const checks = items.map((it) => explainCheck(env, stmt.where!, it.scope));
    items = items.filter((_, i) => checks[i].pass === true);
    trace?.push({
      kind: "filter",
      clauseId: clauseId(stmt.clauses, "where"),
      target: "where",
      condition: text(env, stmt.where),
      input,
      checks,
      output: relationOf(cols, items),
    });
  }

  // SELECT list, with * expanded
  const selectItems: { expr: Expr; name: string; picked: number | null }[] = [];
  let star = false;
  for (const si of stmt.columns) {
    if (si.expr.type === "star") {
      star = true;
      const tbl = si.expr.table;
      const idx = cols.map((_, i) => i).filter((i) => tbl === null || cols[i].table === tbl);
      if (tbl !== null && !idx.length) {
        throw new SqlError(`There's no table called "${tbl}" in this query.`, si.expr.span);
      }
      if (tbl === null && !stmt.from) throw new SqlError("SELECT * needs a FROM to say which table to read.", si.span);
      for (const i of idx) {
        selectItems.push({
          expr: { type: "column", table: cols[i].table, name: cols[i].name, span: si.span },
          name: cols[i].name,
          picked: i,
        });
      }
      continue;
    }
    let picked: number | null = null;
    if (si.expr.type === "column") {
      try {
        const r = resolveColumn(env, probe, si.expr);
        if (r.scope === probe) picked = r.index;
      } catch {
        picked = null;
      }
    }
    selectItems.push({ expr: si.expr, name: si.alias ?? outputName(si.expr), picked });
  }
  for (const si of selectItems) checkExpr(env, si.expr, probe, "select");
  for (const si of stmt.columns) {
    if (si.alias && si.expr.type === "column" && cols.some((c) => c.name === si.alias)) {
      const raw = text(env, si);
      if (!/\bas\b/i.test(raw)) {
        env.warnings.push({
          message: `"${si.alias}" was read as a new name for ${si.expr.name}. Did you forget a comma between ${si.expr.name} and ${si.alias}?`,
          span: si.span,
        });
      }
    }
  }

  // GROUP BY / aggregates
  const groupBy = stmt.groupBy.map((g) => {
    if (g.type === "literal" && typeof g.value === "number" && Number.isInteger(g.value)) {
      const target = stmt.columns[g.value - 1];
      if (!target || target.expr.type === "star") {
        throw new SqlError(`GROUP BY ${g.value} doesn't match a column in the SELECT list.`, g.span);
      }
      return target.expr;
    }
    if (g.type === "column" && g.table === null && !matchColumns(cols, null, g.name).length) {
      const byAlias = stmt.columns.find((s) => s.alias === g.name);
      if (byAlias) return byAlias.expr;
    }
    return g;
  });
  for (const g of groupBy) checkExpr(env, g, probe, "group");
  if (stmt.having) {
    checkExpr(env, stmt.having, probe, "having");
    truthyCheck(env, stmt.having, probe);
  }

  const groupRowsByKey = new Map<string, RelRow>();
  const aggExprs = [
    ...selectItems.flatMap((s) => collect(s.expr, (e) => isAggregate(e) || isWindow(e))),
    ...collect(stmt.having, isAggregate),
    ...stmt.orderBy.flatMap((o) => collect(o.expr, (e) => isAggregate(e) || isWindow(e))),
  ].filter(isAggregate);
  // Aggregates inside window functions' arguments, e.g. RANK() OVER (ORDER BY SUM(x)).
  for (const w of [
    ...selectItems.flatMap((s) => collect(s.expr, isWindow)),
    ...stmt.orderBy.flatMap((o) => collect(o.expr, isWindow)),
  ]) {
    for (const c of children(w)) aggExprs.push(...collect(c, isAggregate).filter(isAggregate));
  }
  const grouped = groupBy.length > 0 || aggExprs.length > 0 || !!stmt.having;
  let groupCols = cols;

  if (grouped) {
    for (const si of selectItems) checkGrouped(env, si.expr, groupBy, probe);
    if (stmt.having) checkGrouped(env, stmt.having, groupBy, probe);
    for (const o of stmt.orderBy) {
      const isOutputRef =
        (o.expr.type === "literal" && typeof o.expr.value === "number") ||
        (o.expr.type === "column" &&
          o.expr.table === null &&
          selectItems.some((s) => s.name === (o.expr as { name: string }).name));
      if (!isOutputRef) checkGrouped(env, o.expr, groupBy, probe);
    }

    const input = relationOf(cols, items);
    const buckets = new Map<string, { key: CellValue[]; members: number[] }>();
    if (!groupBy.length) buckets.set("all", { key: [], members: items.map((_, i) => i) });
    items.forEach((it, i) => {
      if (!groupBy.length) return;
      const key = groupBy.map((g) => evalExpr(env, g, it.scope));
      const k = valueKey(key);
      const b = buckets.get(k);
      if (b) b.members.push(i);
      else buckets.set(k, { key, members: [i] });
    });

    const uniqueAggs: Expr[] = [];
    for (const a of aggExprs) {
      if (!uniqueAggs.some((u) => u === a)) uniqueAggs.push(a);
    }
    const aggLabels: string[] = [];
    const labelIndex = new Map<Expr, number>();
    for (const a of uniqueAggs) {
      const label = text(env, a);
      let idx = aggLabels.findIndex((l) => normalizeText(l) === normalizeText(label));
      if (idx < 0) {
        idx = aggLabels.length;
        aggLabels.push(label);
      }
      labelIndex.set(a, idx);
    }

    const groups: GroupInfo[] = [];
    const nextItems: Item[] = [];
    const groupRows: RelRow[] = [];
    for (const [k, b] of buckets) {
      const memberScopes = b.members.map((i) => items[i].scope);
      const aggs = new Map<Expr, CellValue>();
      for (const a of uniqueAggs)
        aggs.set(a, computeAggregate(env, a as Extract<Expr, { type: "func" }>, memberScopes));
      const first = memberScopes[0];
      const scope: Scope = { cols, values: first ? first.values : cols.map(() => null), outer, aggs, wins: null };
      const key = `g:${k}`;
      nextItems.push({ key, scope });
      groups.push({ label: b.key.map(formatCell).join(", ") || "all rows", rows: b.members });
      const aggValues = aggLabels.map((_, li) => {
        const a = uniqueAggs.find((u) => labelIndex.get(u) === li)!;
        return aggs.get(a) ?? null;
      });
      const groupRow = { key, values: [...b.key, ...aggValues] };
      groupRows.push(groupRow);
      groupRowsByKey.set(key, groupRow);
    }

    groupCols = [
      ...groupBy.map((g) => ({ name: text(env, g), table: null, type: typeOf(env, g, probe) })),
      ...aggLabels.map((l) => {
        const a = uniqueAggs.find((u) => normalizeText(text(env, u)) === normalizeText(l))!;
        return { name: l, table: null, type: typeOf(env, a, probe) };
      }),
    ];
    trace?.push({
      kind: "group",
      clauseId: stmt.groupBy.length ? clauseId(stmt.clauses, "group") : clauseId(stmt.clauses, "select"),
      keys: groupBy.map((g) => text(env, g)),
      input,
      groups,
      output: { columns: groupCols, rows: groupRows },
      aggregates: aggLabels,
    });
    items = nextItems;

    if (stmt.having) {
      const inputRel: Relation = { columns: groupCols, rows: groupRows };
      const checks = items.map((it) => explainCheck(env, stmt.having!, it.scope));
      const keep = new Set(items.filter((_, i) => checks[i].pass === true).map((it) => it.key));
      items = items.filter((it) => keep.has(it.key));
      trace?.push({
        kind: "filter",
        clauseId: clauseId(stmt.clauses, "having"),
        target: "having",
        condition: text(env, stmt.having),
        input: inputRel,
        checks,
        output: { columns: groupCols, rows: groupRows.filter((r) => keep.has(r.key)) },
      });
    }
  }

  const snapshot = (): Relation =>
    grouped
      ? {
          columns: groupCols,
          rows: items.map((it) => groupRowsByKey.get(it.key) ?? { key: it.key, values: [] }),
        }
      : relationOf(cols, items);

  // Window functions
  let windowOutput: Relation | null = null;
  const windows = [
    ...selectItems.flatMap((s) => collect(s.expr, isWindow)),
    ...stmt.orderBy.flatMap((o) => collect(o.expr, isWindow)),
  ] as Extract<Expr, { type: "func" }>[];
  if (windows.length) {
    const input = snapshot();
    let partitionsForTrace: number[][] = [];
    for (const it of items) it.scope = { ...it.scope, wins: new Map(it.scope.wins ?? []) };
    for (const w of windows) {
      const over = w.over!;
      const parts = new Map<string, number[]>();
      items.forEach((it, i) => {
        const k = valueKey(over.partitionBy.map((p) => evalExpr(env, p, it.scope)));
        const list = parts.get(k);
        if (list) list.push(i);
        else parts.set(k, [i]);
      });
      if (!partitionsForTrace.length) partitionsForTrace = [...parts.values()];
      for (const members of parts.values()) {
        const keys = members.map((i) => over.orderBy.map((o) => evalExpr(env, o.expr, items[i].scope)));
        const order = members.map((_, j) => j);
        order.sort((x, y) => compareKeys(keys[x], keys[y], over.orderBy) || x - y);
        const sorted = order.map((j) => members[j]);
        const sortedKeys = order.map((j) => keys[j]);
        const peerEnd = (pos: number) => {
          let end = pos;
          while (end + 1 < sorted.length && valueKey(sortedKeys[end + 1]) === valueKey(sortedKeys[pos])) end++;
          return end;
        };
        let rank = 0;
        let dense = 0;
        sorted.forEach((idx, pos) => {
          const newPeer = pos === 0 || valueKey(sortedKeys[pos]) !== valueKey(sortedKeys[pos - 1]);
          if (newPeer) {
            rank = pos + 1;
            dense++;
          }
          let value: CellValue = null;
          const scope = items[idx].scope;
          switch (w.name) {
            case "row_number":
              value = pos + 1;
              break;
            case "rank":
              value = over.orderBy.length ? rank : 1;
              break;
            case "dense_rank":
              value = over.orderBy.length ? dense : 1;
              break;
            case "lag":
            case "lead": {
              const offset = w.args[1] ? toNumber(env, evalExpr(env, w.args[1], scope), w) : 1;
              const target = w.name === "lag" ? pos - offset : pos + offset;
              value =
                target >= 0 && target < sorted.length
                  ? evalExpr(env, w.args[0], items[sorted[target]].scope)
                  : w.args[2]
                    ? evalExpr(env, w.args[2], scope)
                    : null;
              break;
            }
            default: {
              const frameEnd = over.orderBy.length ? peerEnd(pos) : sorted.length - 1;
              const frame = sorted.slice(0, frameEnd + 1).map((i) => items[i].scope);
              value = computeAggregate(env, w, frame);
            }
          }
          scope.wins!.set(w, value);
        });
      }
    }
    const fnLabels = windows.map((w) => text(env, w));
    windowOutput = {
      columns: [
        ...input.columns,
        ...windows.map((w, i) => ({ name: fnLabels[i], table: null, type: typeOf(env, w, probe) })),
      ],
      rows: input.rows.map((r, i) => ({
        key: r.key,
        values: [...r.values, ...windows.map((w) => items[i].scope.wins!.get(w) ?? null)],
      })),
    };
    trace?.push({
      kind: "window",
      clauseId: clauseId(stmt.clauses, "select"),
      functions: fnLabels,
      input,
      partitions: partitionsForTrace,
      output: windowOutput,
    });
  }

  // Projection
  const projectInput = windowOutput ?? snapshot();
  const baseWidth = projectInput.columns.length - windows.length;
  const outCols: RelColumn[] = selectItems.map((s) => ({
    name: s.name,
    table: s.picked !== null ? cols[s.picked].table : null,
    type: typeOf(env, s.expr, probe),
  }));
  let rows: { key: string; values: CellValue[]; scope: Scope }[] = items.map((it) => ({
    key: it.key,
    values: selectItems.map((s) => evalExpr(env, s.expr, it.scope)),
    scope: it.scope,
  }));
  trace?.push({
    kind: "project",
    clauseId: clauseId(stmt.clauses, "select"),
    input: projectInput,
    picked: selectItems.map((s) => {
      const wi = windows.indexOf(s.expr as Extract<Expr, { type: "func" }>);
      if (wi >= 0) return baseWidth + wi;
      if (!grouped) return s.picked;
      const gi = groupBy.findIndex((g) => sameExpr(env, s.expr, g, probe));
      return gi >= 0 ? gi : null;
    }),
    star,
    output: { columns: outCols, rows: rows.map((r) => ({ key: r.key, values: r.values })) },
  });

  // DISTINCT
  if (stmt.distinct) {
    const input: Relation = { columns: outCols, rows: rows.map((r) => ({ key: r.key, values: r.values })) };
    const firstSeen = new Map<string, number>();
    const duplicateOf = rows.map((r, i) => {
      const k = valueKey(r.values);
      const f = firstSeen.get(k);
      if (f === undefined) {
        firstSeen.set(k, i);
        return null;
      }
      return f;
    });
    rows = rows.filter((_, i) => duplicateOf[i] === null);
    trace?.push({
      kind: "distinct",
      clauseId: clauseId(stmt.clauses, "select"),
      input,
      duplicateOf,
      output: { columns: outCols, rows: rows.map((r) => ({ key: r.key, values: r.values })) },
    });
  }

  // ORDER BY
  if (stmt.orderBy.length) {
    const resolvers = stmt.orderBy.map((o) => {
      if (o.expr.type === "literal" && typeof o.expr.value === "number" && Number.isInteger(o.expr.value)) {
        const pos = o.expr.value;
        if (pos < 1 || pos > outCols.length) {
          throw new SqlError(
            `ORDER BY ${pos} doesn't match a column: there ${outCols.length === 1 ? "is 1 column" : `are ${outCols.length} columns`}.`,
            o.expr.span,
          );
        }
        return (r: { values: CellValue[] }) => r.values[pos - 1];
      }
      if (o.expr.type === "column" && o.expr.table === null) {
        const name = o.expr.name;
        const byName = outCols.map((c, i) => (c.name === name ? i : -1)).filter((i) => i >= 0);
        if (byName.length > 1 && !stmt.distinct) {
          // Several output columns share the name (e.g. after SELECT *): fall back to the input column.
        } else if (byName.length === 1 || (byName.length > 1 && stmt.distinct)) {
          const idx = byName[0];
          return (r: { values: CellValue[] }) => r.values[idx];
        }
      }
      if (stmt.distinct) {
        const idx = selectItems.findIndex((s) => sameExpr(env, s.expr, o.expr, probe));
        if (idx < 0) {
          throw new SqlError(
            "With SELECT DISTINCT, you can only ORDER BY columns that are in the SELECT list.",
            o.expr.span,
          );
        }
        return (r: { values: CellValue[] }) => r.values[idx];
      }
      checkExpr(env, o.expr, probe, "order");
      return (r: { scope: Scope }) => evalExpr(env, o.expr, r.scope);
    });
    const input: Relation = { columns: outCols, rows: rows.map((r) => ({ key: r.key, values: r.values })) };
    const keys = rows.map((r) => resolvers.map((fn) => fn(r)));
    const order = rows.map((_, i) => i);
    order.sort((a, b) => compareKeys(keys[a], keys[b], stmt.orderBy) || a - b);
    rows = order.map((i) => rows[i]);
    trace?.push({
      kind: "sort",
      clauseId: clauseId(stmt.clauses, "order"),
      keys: stmt.orderBy.map((o) => ({ text: text(env, o.expr), dir: o.dir })),
      input,
      order,
      output: { columns: outCols, rows: rows.map((r) => ({ key: r.key, values: r.values })) },
    });
  }

  // LIMIT / OFFSET
  if (stmt.limit || stmt.offset) {
    const empty = scopeFor([], [], null);
    const num = (e: Expr | null, what: string) => {
      if (!e) return null;
      checkExpr(env, e, empty, "limit");
      const v = evalExpr(env, e, empty);
      if (v === null) return null;
      const n = toNumber(env, v, e);
      if (!Number.isInteger(n) || n < 0)
        throw new SqlError(`${what} needs a whole number that isn't negative.`, e.span);
      return n;
    };
    const limit = num(stmt.limit, "LIMIT");
    const offset = num(stmt.offset, "OFFSET") ?? 0;
    const input: Relation = { columns: outCols, rows: rows.map((r) => ({ key: r.key, values: r.values })) };
    rows = rows.slice(offset, limit === null ? undefined : offset + limit);
    trace?.push({
      kind: "limit",
      clauseId: clauseId(stmt.clauses, "limit"),
      limit,
      offset,
      input,
      output: { columns: outCols, rows: rows.map((r) => ({ key: r.key, values: r.values })) },
    });
  }

  return { columns: outCols, rows: rows.map((r) => ({ key: r.key, values: r.values })) };
}

function truthyCheck(env: Env, cond: Expr, probe: Scope) {
  const t = typeOf(env, cond, probe);
  if (t !== "bool" && t !== "unknown") {
    throw new SqlError(
      `"${text(env, cond)}" isn't a condition: it should compare something, e.g. age > 18.`,
      cond.span,
    );
  }
}

function compareKeys(
  a: CellValue[],
  b: CellValue[],
  order: { dir: "asc" | "desc"; nulls: "first" | "last" | null }[],
): number {
  for (let i = 0; i < order.length; i++) {
    const { dir, nulls } = order[i];
    const x = a[i];
    const y = b[i];
    if (x === null || y === null) {
      if (x === y) continue;
      const nullsFirst = nulls ? nulls === "first" : dir === "desc";
      return (x === null ? -1 : 1) * (nullsFirst ? 1 : -1);
    }
    const c = compareValues(x, y);
    if (c !== 0) return dir === "asc" ? c : -c;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// INSERT / UPDATE / DELETE
// ---------------------------------------------------------------------------

function tableForWrite(env: Env, db: DatabaseData, name: string, span: { start: number; end: number }): TableData {
  const table = db[name];
  if (!table) {
    const alt = suggest(name, Object.keys(db));
    throw new SqlError(`There's no table called "${name}".`, span, alt ? `Did you mean ${alt}?` : null);
  }
  return table;
}

function coerce(env: Env, v: CellValue, col: ColumnDef, e: Expr | null): CellValue {
  if (v === null) {
    if (col.pk) {
      throw new SqlError(
        `${col.name} can't be empty (NULL) because it's the primary key: every row needs its own ${col.name}.`,
        e?.span ?? null,
      );
    }
    return null;
  }
  switch (col.type) {
    case "int":
    case "numeric": {
      if (typeof v === "boolean" || (typeof v === "string" && (v.trim() === "" || Number.isNaN(Number(v))))) {
        throw new SqlError(`${col.name} holds numbers, but ${formatLiteral(v)} isn't a number.`, e?.span ?? null);
      }
      const n = Number(v);
      return col.type === "int" ? Math.round(n) : n;
    }
    case "text":
      return formatCell(v);
    case "date":
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      throw new SqlError(
        `${col.name} holds dates written like '2024-03-15', not ${formatLiteral(v)}.`,
        e?.span ?? null,
      );
    case "bool":
      if (typeof v === "boolean") return v;
      if (v === "true" || v === "false") return v === "true";
      throw new SqlError(`${col.name} holds true/false values.`, e?.span ?? null);
    default:
      return v;
  }
}

function checkPrimaryKeys(table: TableData, span: { start: number; end: number }) {
  table.columns.forEach((c, ci) => {
    if (!c.pk) return;
    const seen = new Set<string>();
    for (const row of table.rows) {
      const k = valueKey([row[ci]]);
      if (seen.has(k)) {
        throw new SqlError(
          `A row with ${c.name} = ${formatLiteral(row[ci])} already exists. ${c.name} is the primary key, so every row needs a different value.`,
          span,
        );
      }
      seen.add(k);
    }
  });
}

const tableRelation = (table: TableData, keys: string[]): Relation => ({
  columns: table.columns.map((c) => ({ name: c.name, table: table.name, type: c.type })),
  rows: table.rows.map((values, i) => ({ key: keys[i], values })),
});

function execInsert(env: Env, db: DatabaseData, stmt: InsertStmt, trace: TraceStage[]): number {
  const table = tableForWrite(env, db, stmt.table, stmt.tableSpan);
  const names = table.columns.map((c) => c.name);
  const targets = (stmt.columns ?? names).map((n) => {
    const i = names.indexOf(n);
    if (i < 0) {
      const alt = suggest(n, names);
      throw new SqlError(
        `${table.name} has no column called "${n}".`,
        stmt.tableSpan,
        alt ? `Did you mean "${alt}"?` : null,
      );
    }
    return i;
  });
  if (new Set(targets).size !== targets.length) throw new SqlError("A column is listed twice.", stmt.tableSpan);
  const empty = scopeFor([], [], null);
  const newRows = stmt.rows.map((exprs) => {
    if (exprs.length !== targets.length) {
      const span = { start: exprs[0]?.span.start ?? stmt.span.start, end: exprs.at(-1)?.span.end ?? stmt.span.end };
      throw new SqlError(
        `This row has ${exprs.length} value${exprs.length === 1 ? "" : "s"} but there ${targets.length === 1 ? "is 1 column" : `are ${targets.length} columns`} to fill.`,
        span,
        stmt.columns ? null : `Without a column list, give a value for every column: ${names.join(", ")}.`,
      );
    }
    const row: CellValue[] = table.columns.map(() => null);
    exprs.forEach((e, i) => {
      checkExpr(env, e, empty, "values");
      row[targets[i]] = coerce(env, evalExpr(env, e, empty), table.columns[targets[i]], e);
    });
    table.columns.forEach((c, ci) => {
      if (c.pk && row[ci] === null) coerce(env, null, c, null);
    });
    return row;
  });
  const beforeKeys = table.rows.map((_, i) => `${table.name}#${i}`);
  const before = tableRelation(table, beforeKeys);
  const next: TableData = { ...table, rows: [...table.rows, ...newRows] };
  checkPrimaryKeys(next, stmt.span);
  db[stmt.table] = next;
  const afterKeys = [...beforeKeys, ...newRows.map((_, i) => `${table.name}#new${i}`)];
  trace.push({
    kind: "insert",
    clauseId: clauseId(stmt.clauses, "values"),
    table: table.name,
    before,
    added: newRows.map((_, i) => table.rows.length + i),
    after: tableRelation(next, afterKeys),
  });
  return newRows.length;
}

function execUpdate(env: Env, db: DatabaseData, stmt: UpdateStmt, trace: TraceStage[]): number {
  const table = tableForWrite(env, db, stmt.table, stmt.tableSpan);
  const cols: RelColumn[] = table.columns.map((c) => ({ name: c.name, table: stmt.table, type: c.type }));
  const probe = scopeFor(
    cols,
    cols.map(() => null),
    null,
  );
  const targets = stmt.sets.map((s) => {
    const i = table.columns.findIndex((c) => c.name === s.column);
    if (i < 0) {
      const alt = suggest(
        s.column,
        table.columns.map((c) => c.name),
      );
      throw new SqlError(
        `${table.name} has no column called "${s.column}".`,
        s.span,
        alt ? `Did you mean "${alt}"?` : null,
      );
    }
    checkExpr(env, s.expr, probe, "set");
    return i;
  });
  if (stmt.where) {
    checkExpr(env, stmt.where, probe, "where");
    truthyCheck(env, stmt.where, probe);
  }
  const keys = table.rows.map((_, i) => `${table.name}#${i}`);
  const before = tableRelation(table, keys);
  const checks = stmt.where ? table.rows.map((r) => explainCheck(env, stmt.where!, scopeFor(cols, r, null))) : null;
  const changes: { row: number; column: number; from: CellValue; to: CellValue }[] = [];
  let affected = 0;
  const rows = table.rows.map((r, ri) => {
    if (checks && checks[ri].pass !== true) return r;
    affected++;
    const scope = scopeFor(cols, r, null);
    const next = [...r];
    stmt.sets.forEach((s, si) => {
      const ci = targets[si];
      const v = coerce(env, evalExpr(env, s.expr, scope), table.columns[ci], s.expr);
      next[ci] = v;
      changes.push({ row: ri, column: ci, from: r[ci], to: v });
    });
    return next;
  });
  const next: TableData = { ...table, rows };
  checkPrimaryKeys(next, stmt.span);
  db[stmt.table] = next;
  trace.push({
    kind: "update",
    clauseId: clauseId(stmt.clauses, "set"),
    table: table.name,
    condition: stmt.where ? text(env, stmt.where) : null,
    before,
    checks,
    changes,
    after: tableRelation(next, keys),
  });
  return affected;
}

function execDelete(env: Env, db: DatabaseData, stmt: DeleteStmt, trace: TraceStage[]): number {
  const table = tableForWrite(env, db, stmt.table, stmt.tableSpan);
  const cols: RelColumn[] = table.columns.map((c) => ({ name: c.name, table: stmt.table, type: c.type }));
  const probe = scopeFor(
    cols,
    cols.map(() => null),
    null,
  );
  if (stmt.where) {
    checkExpr(env, stmt.where, probe, "where");
    truthyCheck(env, stmt.where, probe);
  }
  const keys = table.rows.map((_, i) => `${table.name}#${i}`);
  const before = tableRelation(table, keys);
  const checks = stmt.where ? table.rows.map((r) => explainCheck(env, stmt.where!, scopeFor(cols, r, null))) : null;
  const removed = table.rows.map((_, i) => i).filter((i) => !checks || checks[i].pass === true);
  const gone = new Set(removed);
  const next: TableData = { ...table, rows: table.rows.filter((_, i) => !gone.has(i)) };
  db[stmt.table] = next;
  trace.push({
    kind: "delete",
    clauseId: clauseId(stmt.clauses, "delete"),
    table: table.name,
    condition: stmt.where ? text(env, stmt.where) : null,
    before,
    checks,
    removed,
    after: tableRelation(
      next,
      keys.filter((_, i) => !gone.has(i)),
    ),
  });
  return removed.length;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function tablesOf(db: DatabaseData): Map<string, TableSource> {
  return new Map(
    Object.entries(db).map(([key, t]) => [
      key,
      { name: t.name, columns: t.columns.map((c) => ({ name: c.name, table: null, type: c.type })), rows: t.rows },
    ]),
  );
}

/**
 * Runs one or more statements against a copy of `db` and records what happened at every
 * stage. Throws SqlError for anything a learner could get wrong.
 */
export function runSql(sql: string, db: DatabaseData): RunResult {
  const statements: Statement[] = parseSql(sql);
  const work: DatabaseData = { ...db };
  const runs: StatementRun[] = [];
  for (const stmt of statements) {
    const env: Env = { sql, tables: tablesOf(work), warnings: [] };
    const trace: TraceStage[] = [];
    let result: Relation | null = null;
    let affected: number | null = null;
    let table: string | null = null;
    if (stmt.type === "select") {
      result = execSelect(env, stmt, null, trace);
    } else if (stmt.type === "insert") {
      affected = execInsert(env, work, stmt, trace);
      table = stmt.table;
    } else if (stmt.type === "update") {
      affected = execUpdate(env, work, stmt, trace);
      table = stmt.table;
    } else {
      affected = execDelete(env, work, stmt, trace);
      table = stmt.table;
    }
    runs.push({
      statement: stmt,
      sql: sql.slice(stmt.span.start, stmt.span.end),
      offset: stmt.span.start,
      clauses: stmt.clauses,
      trace,
      result,
      affected,
      table,
      ordered: stmt.type === "select" && stmt.orderBy.length > 0,
      warnings: env.warnings,
    });
  }
  return { runs, db: work };
}
