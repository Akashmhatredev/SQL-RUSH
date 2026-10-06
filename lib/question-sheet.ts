/**
 * The spreadsheet (.xlsx) format for bulk-uploading questions: one question per
 * row, one field per column. Rows are converted into the same shape as
 * data/questions/*.json, which questionInputSchema then validates.
 *
 * Shared by the admin bulk upload and scripts/generate-question-template.ts,
 * so the template, the column guide and the parser can't drift apart.
 */
import { DIFFICULTIES, QUESTION_TYPES, type CellValue, type Question, type SampleTable } from "@/types/question";

/** The sheet read from an uploaded workbook; the first sheet is used if there's none by this name. */
export const QUESTIONS_SHEET = "Questions";
export const TEMPLATE_PATH = "/templates/sql-rush-questions-template.xlsx";

export interface SheetField {
  name: string;
  /** Spread over numbered columns: option_1 … option_6. */
  repeat?: number;
  usedBy: string;
  description: string;
  /** Column width in the template, in characters. */
  width: number;
}

export const SHEET_FIELDS: SheetField[] = [
  {
    name: "difficulty",
    usedBy: "Every question (required)",
    description: `One of: ${DIFFICULTIES.join(", ")}.`,
    width: 12,
  },
  {
    name: "type",
    usedBy: "Every question (required)",
    description: `One of: ${QUESTION_TYPES.join(", ")}.`,
    width: 17,
  },
  { name: "topic", usedBy: "Every question (required)", description: "A short label, e.g. WHERE or JOIN.", width: 14 },
  {
    name: "question",
    usedBy: "Every question (required)",
    description: "What the player is asked (5–2,000 characters).",
    width: 46,
  },
  {
    name: "answer",
    usedBy: "Every type except drag-drop",
    description:
      "write-sql and fix-query: the correct SQL. multiple-choice and predict-output: exactly the text of the correct option. drag-drop: leave empty, it's the pieces joined by spaces.",
    width: 44,
  },
  {
    name: "explanation",
    usedBy: "Every question (required)",
    description: "Shown after answering.",
    width: 40,
  },
  { name: "hint", usedBy: "Optional", description: "Shown in practice mode.", width: 26 },
  {
    name: "option",
    repeat: 6,
    usedBy: "multiple-choice, predict-output",
    description:
      'Fill 2 to 6 of them; the answer must equal one exactly. predict-output: one result row per line, columns separated by " | ", an empty result as (no rows).',
    width: 22,
  },
  {
    name: "query",
    usedBy: "fix-query, predict-output (required); multiple-choice (optional)",
    description: "fix-query: the broken SQL. predict-output: the query to evaluate.",
    width: 40,
  },
  {
    name: "sample_tables",
    usedBy: "predict-output (required)",
    description:
      'The data the query runs on. First line: the table name. Second line: column names separated by |. Then one row per line. Put a blank line between tables. NULL, TRUE/FALSE and numbers are typed automatically; wrap a value in double quotes to keep it as text ("007").',
    width: 34,
  },
  {
    name: "tokens",
    usedBy: "drag-drop (required)",
    description: "The query pieces in the correct order, one per line (at least 2).",
    width: 30,
  },
  { name: "distractors", usedBy: "drag-drop (optional)", description: "Decoy pieces, one per line.", width: 26 },
  {
    name: "alternative",
    repeat: 3,
    usedBy: "write-sql, fix-query (optional)",
    description: "Other SQL that should also count as correct.",
    width: 34,
  },
  {
    name: "active",
    usedBy: "Optional",
    description: "TRUE (the default) or FALSE to upload the question hidden from games.",
    width: 9,
  },
  {
    name: "id",
    usedBy: "Optional",
    description:
      "Leave empty to create new questions. A row whose id already exists is skipped, so re-uploading never overwrites edits.",
    width: 7,
  },
];

const columnsOf = (f: SheetField) =>
  f.repeat ? Array.from({ length: f.repeat }, (_, i) => `${f.name}_${i + 1}`) : [f.name];

/** The header row, in template order. */
export const SHEET_HEADERS: string[] = SHEET_FIELDS.flatMap(columnsOf);

/** How a field is named in the column guide: "option_1 … option_6". */
export const fieldLabel = (f: SheetField) => (f.repeat ? `${f.name}_1 … ${f.name}_${f.repeat}` : f.name);

const REQUIRED = ["difficulty", "type", "topic", "question", "explanation"];

/** Question fields → the column(s) they come from, for error messages. */
const FIELD_COLUMNS: Record<string, string> = {
  options: "option_1…6",
  alternatives: "alternative_1…3",
  sampleTables: "sample_tables",
  isActive: "active",
};
export const columnFor = (field: string) => FIELD_COLUMNS[field] ?? field;

/** Example questions, one of each type: the JSON template and the rows of the Excel template. */
export const EXAMPLE_QUESTIONS: Omit<Question, "id">[] = [
  {
    difficulty: "easy",
    type: "write-sql",
    topic: "WHERE",
    question: "Show all employees from the Sales department.",
    answer: "SELECT * FROM employees WHERE department = 'Sales';",
    alternatives: ["SELECT * FROM employees WHERE department IN ('Sales');"],
    hint: "Filter rows with WHERE.",
    explanation: "WHERE keeps only the rows where the condition is true.",
  },
  {
    difficulty: "easy",
    type: "multiple-choice",
    topic: "SELECT",
    question: "Which query returns every column of the products table?",
    options: ["SELECT * FROM products", "SELECT % FROM products", "SELECT ALL FROM products", "GET * FROM products"],
    answer: "SELECT * FROM products",
    explanation: "The asterisk * means all columns.",
  },
  {
    difficulty: "easy",
    type: "fix-query",
    topic: "SELECT",
    question: "This query should list every employee, but it won't run. Fix it.",
    query: "SELEC * FORM employees;",
    answer: "SELECT * FROM employees;",
    explanation: "SELECT and FROM must be spelled exactly.",
  },
  {
    difficulty: "medium",
    type: "predict-output",
    topic: "WHERE",
    question: "What does this query return?",
    query: "SELECT name, salary FROM employees WHERE salary > 55000 ORDER BY name;",
    sampleTables: [
      {
        name: "employees",
        columns: ["name", "department", "salary"],
        rows: [
          ["Ana", "Sales", 50000],
          ["Ben", "HR", 62000],
          ["Cara", "Sales", 58000],
        ],
      },
    ],
    options: ["Ben | 62000\nCara | 58000", "Cara | 58000\nBen | 62000", "Ana | 50000", "(no rows)"],
    answer: "Ben | 62000\nCara | 58000",
    explanation: "WHERE keeps the two salaries above 55000, and ORDER BY name puts Ben before Cara.",
  },
  {
    difficulty: "easy",
    type: "drag-drop",
    topic: "WHERE",
    question: "Arrange the pieces to list all Gold-tier customers.",
    answer: "SELECT * FROM customers WHERE tier = 'Gold'",
    tokens: ["SELECT *", "FROM customers", "WHERE tier = 'Gold'"],
    distractors: ["HAVING tier = 'Gold'"],
    explanation: "A query reads SELECT → FROM → WHERE.",
  },
];

// --- sample tables as text ----------------------------------------------------

const NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?$/;

function parseCell(s: string): CellValue {
  if (/^null$/i.test(s)) return null;
  if (/^true$/i.test(s)) return true;
  if (/^false$/i.test(s)) return false;
  if (NUMBER.test(s)) return Number(s);
  const quoted = /^"(.*)"$/.exec(s);
  return quoted ? quoted[1] : s;
}

const splitRow = (line: string) => line.split("|").map((s) => s.trim());

/**
 * Parses the sample_tables cell:
 *
 *   employees
 *   name | salary
 *   Ana | 50000
 *
 *   departments
 *   …
 *
 * A JSON array in the data/questions/*.json shape is accepted too.
 */
export function parseSampleTables(source: string): { tables: SampleTable[] } | { error: string } {
  const src = source.replace(/\r\n?/g, "\n").trim();
  if (!src) return { tables: [] };
  if (src.startsWith("[")) {
    try {
      const value: unknown = JSON.parse(src);
      return Array.isArray(value)
        ? { tables: value as SampleTable[] }
        : { error: "The JSON must be an array of tables." };
    } catch (e) {
      return { error: `Invalid JSON: ${(e as Error).message}` };
    }
  }
  const tables: SampleTable[] = [];
  for (const [i, block] of src.split(/\n[ \t]*\n/).entries()) {
    const [name, header, ...body] = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!name || !header) return { error: `Table ${i + 1} needs a name line, then a line of column names.` };
    tables.push({ name, columns: splitRow(header), rows: body.map((line) => splitRow(line).map(parseCell)) });
  }
  return { tables };
}

/** The inverse of parseSampleTables. Falls back to JSON for values the text format can't hold. */
export function formatSampleTables(tables: SampleTable[]): string {
  const plain = (s: string) => !/[|\n]/.test(s) && s.trim() === s;
  const fits = tables.every(
    (t) =>
      plain(t.name) &&
      t.columns.every(plain) &&
      t.rows.every((r) =>
        r.every((v) =>
          typeof v === "string" ? plain(v) && !v.includes('"') : typeof v !== "number" || NUMBER.test(String(v)),
        ),
      ),
  );
  if (!fits) return JSON.stringify(tables);
  const cell = (v: CellValue) =>
    v === null ? "NULL" : typeof v === "string" && parseCell(v) !== v ? `"${v}"` : String(v);
  return tables
    .map((t) => [t.name, t.columns.join(" | "), ...t.rows.map((r) => r.map(cell).join(" | "))].join("\n"))
    .join("\n\n");
}

// --- rows → questions -----------------------------------------------------------

export interface SheetQuestion {
  /** 1-based row number in the spreadsheet. */
  row: number;
  /** The question in the JSON upload shape, ready for questionInputSchema. */
  raw: Record<string, unknown>;
  /** Cells that couldn't be converted, by question field (e.g. sampleTables). */
  errors: Record<string, string>;
}

export interface SheetParseResult {
  questions: SheetQuestion[];
  /** Header cells that aren't template columns. */
  ignoredColumns: string[];
  error?: string;
}

/** "Sample Tables", "sampleTables" and "sample_tables" are all the same column. */
const headerKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const HEADER_ALIASES: Record<string, string> = {
  isactive: "active",
  sampletable: "sample_tables",
  token: "tokens",
  distractor: "distractors",
};

const TYPE_ALIASES: Record<string, string> = {
  "fix-the-query": "fix-query",
  "query-builder": "drag-drop",
  builder: "drag-drop",
  "drag-and-drop": "drag-drop",
  mcq: "multiple-choice",
};

/** A cell as text. Excel turns typed numbers and TRUE/FALSE into typed values. */
function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value).replace(/\r\n?/g, "\n").trim();
}

const lines = (value: unknown) =>
  text(value)
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

/** Converts sheet rows (the first row holds the column names) into questions. */
export function sheetToQuestions(data: unknown[][]): SheetParseResult {
  const [header = [], ...body] = data;
  const columns = new Map<string, number>();
  const ignoredColumns: string[] = [];
  const known = new Map(SHEET_HEADERS.map((h) => [headerKey(h), h]));
  header.forEach((cell, i) => {
    const label = text(cell);
    if (!label) return;
    const key = headerKey(label);
    const name = known.get(key) ?? HEADER_ALIASES[key];
    if (name && !columns.has(name)) columns.set(name, i);
    else ignoredColumns.push(label);
  });

  const missing = REQUIRED.filter((c) => !columns.has(c));
  if (missing.length) {
    return {
      questions: [],
      ignoredColumns,
      error: `Missing column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}. The first row must hold the column names; download the Excel template to see them.`,
    };
  }

  const questions: SheetQuestion[] = [];
  body.forEach((cells, i) => {
    if (!cells.some((c) => text(c))) return;
    const get = (name: string) => {
      const index = columns.get(name);
      return index === undefined ? null : cells[index];
    };
    const many = (name: string, count: number) =>
      Array.from({ length: count }, (_, j) => text(get(`${name}_${j + 1}`))).filter(Boolean);
    const errors: Record<string, string> = {};
    const type = text(get("type"))
      .toLowerCase()
      .replace(/[\s_]+/g, "-");

    const raw: Record<string, unknown> = {
      difficulty: text(get("difficulty")).toLowerCase(),
      type: TYPE_ALIASES[type] ?? type,
      topic: text(get("topic")),
      question: text(get("question")),
      answer: text(get("answer")),
      explanation: text(get("explanation")),
      hint: text(get("hint")) || null,
      options: many("option", 6),
      query: text(get("query")) || null,
      tokens: lines(get("tokens")),
      distractors: lines(get("distractors")),
      alternatives: many("alternative", 3),
    };

    const tables = parseSampleTables(text(get("sample_tables")));
    if ("error" in tables) errors.sampleTables = tables.error;
    else if (tables.tables.length) raw.sampleTables = tables.tables;

    const active = text(get("active")).toLowerCase();
    if (["true", "yes", "y", "1"].includes(active)) raw.isActive = true;
    else if (["false", "no", "n", "0"].includes(active)) raw.isActive = false;
    else if (active) errors.isActive = "Use TRUE or FALSE, or leave it empty.";

    const id = text(get("id"));
    if (/^\d+$/.test(id) && Number(id) > 0) raw.id = Number(id);
    else if (id) errors.id = "Use a positive whole number, or leave it empty.";

    questions.push({ row: i + 2, raw, errors });
  });
  return { questions, ignoredColumns };
}

/** A question as a template row, keyed by column name. */
export function questionToSheetRow(q: Omit<Question, "id"> & { id?: number; isActive?: boolean }) {
  const row: Record<string, string | number | boolean | null> = {
    difficulty: q.difficulty,
    type: q.type,
    topic: q.topic,
    question: q.question,
    answer: q.type === "drag-drop" ? null : q.answer,
    explanation: q.explanation,
    hint: q.hint ?? null,
    query: q.query ?? null,
    sample_tables: q.sampleTables?.length ? formatSampleTables(q.sampleTables) : null,
    tokens: q.tokens?.join("\n") ?? null,
    distractors: q.distractors?.length ? q.distractors.join("\n") : null,
    active: q.isActive ?? true,
    id: q.id ?? null,
  };
  (q.options ?? []).forEach((o, i) => (row[`option_${i + 1}`] = o));
  (q.alternatives ?? []).forEach((a, i) => (row[`alternative_${i + 1}`] = a));
  return row;
}
