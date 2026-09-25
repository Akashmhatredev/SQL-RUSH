/**
 * Validates the question datasets in data/questions/*.json.
 *
 *   npm run validate:questions            # all four files
 *   npm run validate:questions -- expert  # a single file
 *
 * Besides structural checks, every SQL answer is executed against a real
 * PostgreSQL engine (PGlite, in-process WASM) built from data/schema.ts, and
 * every predict-output query is run against its sample tables so the marked
 * answer is proven to be the actual result.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { SCHEMA } from "../data/schema";
import { normalizeSql, normalizeText } from "../lib/validation";
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  type CellValue,
  type Difficulty,
  type Question,
  type SampleTable,
} from "../types/question";

const ID_RANGES: Record<Difficulty, [number, number]> = {
  easy: [1, 100],
  medium: [101, 200],
  hard: [201, 300],
  expert: [301, 400],
};
const EXPECTED_COUNT = 100;
const RAW_TYPES = { 1082: (x: string) => x, 1114: (x: string) => x, 1184: (x: string) => x, 1700: (x: string) => x };
const IDENT = /^[a-z_][a-z0-9_]*$/;

type Issue = { id: number | string; level: "error" | "warn"; message: string };

const issues: Issue[] = [];
const error = (id: number | string, message: string) => issues.push({ id, level: "error", message });
const warn = (id: number | string, message: string) => issues.push({ id, level: "warn", message });

const nonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "string") {
    if (/^-?\d+(\.\d+)?$/.test(value)) return String(Number(value));
    return value;
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return JSON.stringify(value);
}

function cellsEqual(expected: string, actual: string): boolean {
  if (expected === actual) return true;
  const a = Number(expected);
  const b = Number(actual);
  if (expected !== "" && actual !== "" && Number.isFinite(a) && Number.isFinite(b)) {
    return Math.abs(a - b) <= 0.005 + 1e-9;
  }
  return false;
}

function parseOutput(text: string): string[][] {
  const trimmed = text.trim();
  if (trimmed === "(no rows)") return [];
  return trimmed.split("\n").map((line) => line.split(" | ").map((c) => c.trim()));
}

function rowsEqual(expected: string[][], actual: string[][], ordered: boolean): boolean {
  if (expected.length !== actual.length) return false;
  const key = (r: string[]) => r.join("\u0001");
  const e = ordered ? expected : [...expected].sort((x, y) => key(x).localeCompare(key(y)));
  const a = ordered ? actual : [...actual].sort((x, y) => key(x).localeCompare(key(y)));
  return e.every((row, i) => row.length === a[i].length && row.every((cell, j) => cellsEqual(cell, a[i][j])));
}

function inferType(values: CellValue[]): string {
  const present = values.filter((v) => v !== null);
  if (present.length === 0) return "text";
  if (present.every((v) => typeof v === "boolean")) return "boolean";
  if (present.every((v) => typeof v === "number")) {
    return present.every((v) => Number.isInteger(v)) ? "integer" : "numeric";
  }
  if (present.every((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v))) return "date";
  if (present.every((v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(v))) {
    return "timestamp";
  }
  return "text";
}

/** Top-level ORDER BY (not one inside OVER(...) or a subquery). */
function hasOuterOrderBy(sql: string): boolean {
  let depth = 0;
  const lower = sql.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (
      depth === 0 &&
      lower.startsWith("order", i) &&
      /^order\s+by\b/.test(lower.slice(i)) &&
      !/[a-z0-9_]/.test(lower[i - 1] ?? " ")
    ) {
      return true;
    }
  }
  return false;
}

async function runInRollback<T>(db: PGlite, fn: () => Promise<T>): Promise<T> {
  await db.exec("BEGIN");
  try {
    return await fn();
  } finally {
    await db.exec("ROLLBACK");
  }
}

async function tryQuery(db: PGlite, sql: string): Promise<string | null> {
  try {
    await runInRollback(db, () => db.query(sql, [], { parsers: RAW_TYPES }));
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

function checkStructure(q: Question, difficulty: Difficulty) {
  const id = q.id ?? "?";
  const [lo, hi] = ID_RANGES[difficulty];
  if (!Number.isInteger(q.id) || q.id < lo || q.id > hi) error(id, `id must be an integer in ${lo}-${hi}`);
  if (q.difficulty !== difficulty) error(id, `difficulty must be "${difficulty}"`);
  if (!QUESTION_TYPES.includes(q.type)) error(id, `unknown type "${q.type}"`);
  for (const field of ["topic", "question", "answer", "explanation"] as const) {
    if (!nonEmpty(q[field])) error(id, `missing ${field}`);
  }

  const allowed: Record<string, string[]> = {
    "write-sql": ["alternatives", "hint"],
    "fix-query": ["query", "alternatives", "hint"],
    "multiple-choice": ["options", "hint", "query"],
    "predict-output": ["options", "query", "sampleTables", "hint"],
    "drag-drop": ["tokens", "distractors", "hint"],
  };
  const base = ["id", "difficulty", "type", "topic", "question", "answer", "explanation"];
  for (const key of Object.keys(q)) {
    if (!base.includes(key) && !(allowed[q.type] ?? []).includes(key))
      error(id, `field "${key}" is not used by ${q.type}`);
  }

  if (q.type === "multiple-choice" || q.type === "predict-output") {
    if (!Array.isArray(q.options) || q.options.length !== 4) error(id, "needs exactly 4 options");
    else {
      const norm = q.options.map(normalizeText);
      if (new Set(norm).size !== 4) error(id, "options must be distinct");
      if (norm.filter((o) => o === normalizeText(q.answer)).length !== 1)
        error(id, "answer must equal exactly one option");
      if (q.options.some((o) => !nonEmpty(o))) error(id, "empty option");
    }
  }

  if (q.type === "predict-output") {
    if (!nonEmpty(q.query)) error(id, "predict-output needs query");
    if (!Array.isArray(q.sampleTables) || q.sampleTables.length === 0) error(id, "predict-output needs sampleTables");
    for (const t of q.sampleTables ?? []) {
      if (!IDENT.test(t.name)) error(id, `bad table name "${t.name}"`);
      if (!Array.isArray(t.columns) || t.columns.some((c) => !IDENT.test(c))) error(id, `bad columns in ${t.name}`);
      if (!Array.isArray(t.rows) || t.rows.length === 0 || t.rows.length > 8) error(id, `${t.name} needs 1-8 rows`);
      for (const r of t.rows ?? []) {
        if (!Array.isArray(r) || r.length !== t.columns.length) error(id, `row width mismatch in ${t.name}`);
      }
    }
  }

  if (q.type === "fix-query") {
    if (!nonEmpty(q.query)) error(id, "fix-query needs the broken query");
    else if (normalizeSql(q.query) === normalizeSql(q.answer)) error(id, "broken query normalises to the answer");
  }

  if (q.type === "write-sql" || q.type === "fix-query") {
    const seen = new Set([normalizeSql(q.answer)]);
    for (const alt of q.alternatives ?? []) {
      const n = normalizeSql(alt);
      if (seen.has(n)) error(id, `alternative duplicates another accepted answer after normalisation: ${alt}`);
      seen.add(n);
    }
  }

  if (q.type === "drag-drop") {
    if (!Array.isArray(q.tokens) || q.tokens.length < 3 || q.tokens.length > 12)
      error(id, "drag-drop needs 3-12 tokens");
    else {
      if (q.answer !== q.tokens.join(" ")) error(id, 'answer must equal tokens.join(" ")');
      if (q.tokens.some((t) => !nonEmpty(t))) error(id, "empty token");
      for (const d of q.distractors ?? []) {
        if (q.tokens.some((t) => normalizeText(t) === normalizeText(d)))
          error(id, `distractor "${d}" equals a real token`);
      }
      if ((q.distractors?.length ?? 0) > 4) error(id, "at most 4 distractors");
    }
  }
}

async function checkSql(q: Question, schemaDb: PGlite, sampleDb: PGlite) {
  const id = q.id;
  if (q.type === "write-sql" || q.type === "fix-query") {
    for (const sql of [q.answer, ...(q.alternatives ?? [])]) {
      const err = await tryQuery(schemaDb, sql);
      if (err) error(id, `answer does not run: ${err}\n      ${sql}`);
    }
    if (q.type === "fix-query" && q.query) {
      const err = await tryQuery(schemaDb, q.query);
      if (!err) warn(id, "broken query actually runs (fine only if the bug is logical, not syntactic)");
    }
  }

  if (q.type === "drag-drop" && q.tokens) {
    const err = await tryQuery(schemaDb, q.tokens.join(" "));
    if (err) error(id, `assembled tokens do not run: ${err}`);
  }

  if (q.type === "predict-output" && q.query && q.sampleTables && q.options) {
    try {
      const actual = await runInRollback(sampleDb, async () => {
        for (const t of q.sampleTables as SampleTable[]) {
          const types = t.columns.map((_, i) => inferType(t.rows.map((r) => r[i])));
          await sampleDb.exec(`CREATE TABLE ${t.name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(", ")})`);
          const placeholders = t.columns.map((_, i) => `$${i + 1}`).join(", ");
          for (const row of t.rows) {
            await sampleDb.query(`INSERT INTO ${t.name} (${t.columns.join(", ")}) VALUES (${placeholders})`, row);
          }
        }
        const res = await sampleDb.query(q.query as string, [], { rowMode: "array", parsers: RAW_TYPES });
        return (res.rows as unknown[][]).map((r) => r.map(formatCell));
      });
      const ordered = hasOuterOrderBy(q.query);
      const matching = q.options.filter((o) => rowsEqual(parseOutput(o), actual, ordered));
      const shown = actual.length ? actual.map((r) => r.join(" | ")).join("\\n") : "(no rows)";
      if (!rowsEqual(parseOutput(q.answer), actual, ordered)) {
        error(
          id,
          `marked answer is wrong. Actual result: "${shown}"${matching.length ? ` (matches option "${matching[0]}")` : ""}`,
        );
      } else if (matching.length > 1) {
        error(id, `more than one option matches the actual result "${shown}"`);
      }
    } catch (e) {
      error(id, `predict-output query failed: ${(e as Error).message}`);
    }
  }
}

async function main() {
  const only = process.argv[2] as Difficulty | undefined;
  if (only && !DIFFICULTIES.includes(only)) {
    console.error(`Unknown difficulty "${only}"`);
    process.exit(2);
  }
  const levels = only ? [only] : [...DIFFICULTIES];

  const schemaDb = new PGlite();
  const sampleDb = new PGlite();
  await schemaDb.exec(
    SCHEMA.map((t) => `CREATE TABLE ${t.name} (${t.columns.map((c) => `${c.name} ${c.type}`).join(", ")});`).join("\n"),
  );

  const allIds = new Map<number, Difficulty>();
  for (const level of levels) {
    const file = path.join(process.cwd(), "data", "questions", `${level}.json`);
    if (!existsSync(file)) {
      error(level, `missing file ${file}`);
      continue;
    }
    let questions: Question[];
    try {
      questions = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      error(level, `invalid JSON: ${(e as Error).message}`);
      continue;
    }
    if (!Array.isArray(questions)) {
      error(level, "file must contain a JSON array");
      continue;
    }
    if (questions.length !== EXPECTED_COUNT)
      error(level, `expected ${EXPECTED_COUNT} questions, found ${questions.length}`);

    const texts = new Map<string, number>();
    const typeCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    for (const q of questions) {
      if (allIds.has(q.id)) error(q.id, `duplicate id (also in ${allIds.get(q.id)})`);
      allIds.set(q.id, level);
      const key = normalizeText(q.question ?? "").toLowerCase() + "|" + (q.query ?? "");
      if (texts.has(key)) error(q.id, `duplicate question text (same as id ${texts.get(key)})`);
      texts.set(key, q.id);
      typeCounts[q.type] = (typeCounts[q.type] ?? 0) + 1;
      topicCounts[q.topic] = (topicCounts[q.topic] ?? 0) + 1;
      checkStructure(q, level);
      await checkSql(q, schemaDb, sampleDb);
    }
    console.log(`\n${level}: ${questions.length} questions`);
    console.log("  types: ", typeCounts);
    console.log("  topics:", topicCounts);
  }

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warn");
  for (const i of warnings) console.log(`  warn  [${i.id}] ${i.message}`);
  for (const i of errors) console.log(`  ERROR [${i.id}] ${i.message}`);
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  await schemaDb.close();
  await sampleDb.close();
  process.exit(errors.length ? 1 : 0);
}

main();
