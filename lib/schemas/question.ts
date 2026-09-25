import { z } from "zod";
import { schemaTablesFor } from "@/data/schema";
import type { QuestionRow, TablesInsert } from "@/types/database";
import { DIFFICULTIES, QUESTION_TYPES, type Question } from "@/types/question";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(min, min <= 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be at most ${max} characters.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : null));

const stringList = (max: number) =>
  z
    .array(z.string())
    .nullish()
    .transform((v) => (v ?? []).map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(max)));

const cell = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const sampleTable = z
  .object({
    name: z.string().trim().min(1, "Every sample table needs a name."),
    columns: z.array(z.string().trim().min(1)).min(1, "Every sample table needs columns."),
    rows: z.array(z.array(cell)),
  })
  .superRefine((t, ctx) => {
    t.rows.forEach((row, i) => {
      if (row.length !== t.columns.length) {
        ctx.addIssue({
          code: "custom",
          message: `Table "${t.name}" row ${i + 1} has ${row.length} values but ${t.columns.length} columns.`,
        });
      }
    });
  });

/**
 * A question as admins write it: the same shape as data/questions/*.json.
 * The rules mirror the CHECK constraints on public.questions.
 */
export const questionInputSchema = z
  .object({
    id: z.number().int().positive().optional(),
    difficulty: z.enum(DIFFICULTIES, { error: "Pick a difficulty." }),
    type: z.enum(QUESTION_TYPES, { error: "Pick a question type." }),
    topic: trimmed(1, 60, "Topic"),
    question: trimmed(5, 2000, "Question"),
    answer: z.string().trim().max(4000).optional().default(""),
    explanation: trimmed(1, 4000, "Explanation"),
    hint: optionalText(500),
    alternatives: stringList(4000),
    options: stringList(1000),
    query: optionalText(4000),
    sampleTables: z.array(sampleTable).nullish(),
    tokens: stringList(500),
    distractors: stringList(500),
    isActive: z.boolean().optional().default(true),
  })
  .transform((q) => (q.type === "drag-drop" && !q.answer ? { ...q, answer: q.tokens.join(" ") } : q))
  .superRefine((q, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (!q.answer) issue("answer", "Answer is required.");

    if (q.type === "multiple-choice" || q.type === "predict-output") {
      if (q.options.length < 2 || q.options.length > 6) issue("options", "Give between 2 and 6 options.");
      if (new Set(q.options).size !== q.options.length) issue("options", "Options must be unique.");
      if (q.answer && !q.options.includes(q.answer))
        issue("answer", "The answer must exactly match one of the options.");
    }
    if ((q.type === "fix-query" || q.type === "predict-output") && !q.query) {
      issue("query", q.type === "fix-query" ? "Add the broken query." : "Add the query to evaluate.");
    }
    if (q.type === "predict-output" && !q.sampleTables?.length) {
      issue("sampleTables", "Predict-output questions need at least one sample table.");
    }
    if (q.type === "drag-drop") {
      if (q.tokens.length < 2) issue("tokens", "Give at least 2 pieces.");
      if (q.answer !== q.tokens.join(" ")) issue("answer", "The answer must be the pieces joined by single spaces.");
    }
  });

export type QuestionInput = z.output<typeof questionInputSchema>;

/** The DB row for an input. Fields that don't apply to the question type are cleared. */
export function toQuestionRow(q: QuestionInput): TablesInsert<"questions"> {
  const choice = q.type === "multiple-choice" || q.type === "predict-output";
  const sql = q.type === "write-sql" || q.type === "fix-query";
  const builder = q.type === "drag-drop";
  const row: TablesInsert<"questions"> = {
    difficulty: q.difficulty,
    type: q.type,
    topic: q.topic,
    question: q.question,
    answer: q.answer,
    explanation: q.explanation,
    hint: q.hint,
    alternatives: sql ? q.alternatives : [],
    options: choice ? q.options : null,
    // Multiple-choice questions may show a query too.
    query: q.type === "write-sql" || builder ? null : q.query,
    sample_tables: q.type === "predict-output" ? (q.sampleTables ?? null) : null,
    tokens: builder ? q.tokens : null,
    distractors: builder ? q.distractors : [],
    is_active: q.isActive,
    schema_tables: schemaTablesFor({
      answer: q.answer,
      query: q.query,
      tokens: builder ? q.tokens : null,
      question: q.question,
    }),
  };
  if (q.id) row.id = q.id;
  return row;
}

/** A DB row in the admin/JSON shape, e.g. to prefill the edit form. */
export function fromQuestionRow(row: QuestionRow): Question & { isActive: boolean } {
  return {
    id: row.id,
    difficulty: row.difficulty,
    type: row.type,
    topic: row.topic,
    question: row.question,
    answer: row.answer,
    explanation: row.explanation,
    hint: row.hint ?? undefined,
    alternatives: row.alternatives,
    options: row.options ?? undefined,
    query: row.query ?? undefined,
    sampleTables: (row.sample_tables as unknown as Question["sampleTables"]) ?? undefined,
    tokens: row.tokens ?? undefined,
    distractors: row.distractors,
    isActive: row.is_active,
  };
}
