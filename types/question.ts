export const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUESTION_TYPES = ["write-sql", "multiple-choice", "fix-query", "predict-output", "drag-drop"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export type CellValue = string | number | boolean | null;

/** A small inline table shown with predict-output questions. */
export interface SampleTable {
  name: string;
  columns: string[];
  rows: CellValue[][];
}

export interface Question {
  /** Globally unique. The seed bank uses easy 1-100, medium 101-200, hard 201-300, expert 301-400. */
  id: number;
  difficulty: Difficulty;
  type: QuestionType;
  /** Short topic label, e.g. "WHERE", "GROUP BY", "Window Functions". */
  topic: string;
  question: string;
  /**
   * write-sql / fix-query: the canonical SQL.
   * multiple-choice / predict-output: the exact text of the correct option.
   * drag-drop: tokens.join(" ").
   */
  answer: string;
  explanation: string;
  /** write-sql / fix-query: other accepted SQL answers. */
  alternatives?: string[];
  /** multiple-choice / predict-output: exactly 4 options, one equal to `answer`. */
  options?: string[];
  /** fix-query: the broken SQL. predict-output: the query to evaluate. */
  query?: string;
  /** predict-output: the data the query runs against. */
  sampleTables?: SampleTable[];
  /** drag-drop: the tokens in their correct order. */
  tokens?: string[];
  /** drag-drop: extra tokens that do not belong in the answer. */
  distractors?: string[];
  hint?: string;
}
