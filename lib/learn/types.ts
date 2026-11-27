import type { CellValue, TableData } from "./sql/types";

/**
 * Lesson configuration. A lesson is pure data: the visual engine (components/learn/engine)
 * renders every step from it, and the SQL engine (lib/learn/sql) works out what each
 * animation shows by actually running the queries against `tables`.
 *
 * Every lesson follows the same arc, visual first:
 *   story → explore the data → animate → explain → (only then) syntax → try it → check → challenge
 *
 * Text fields are "rich text": paragraphs separated by a blank line, lines starting with "- "
 * become a bullet list, **bold**, and `code` (shown as highlighted SQL).
 */
export type RichText = string;

/** A sample table plus the words the explorer uses to talk about it. */
export interface LessonTable extends TableData {
  /** What one row is, singular: "student", "product", "order". */
  entity: string;
  /** The column that names a row in explanations ("Rahul's row"), e.g. "name". */
  labelColumn?: string;
}

export interface Lesson {
  /** Must match an id in lib/learn/curriculum.ts. */
  id: string;
  /** One sentence shown on the roadmap and at the top of the lesson. */
  summary: string;
  /** Rough time to finish, in minutes. */
  minutes: number;
  tables: LessonTable[];
  steps: LessonStep[];
  /** The knowledge check: 2–4 questions, shown after the steps. */
  check: CheckQuestion[];
  challenge: Challenge;
  /** 2–4 short sentences shown on the completion screen. */
  takeaways: string[];
  /** Optional SQL cheat sheet shown with the takeaways. */
  cheatsheet?: { sql: string; meaning: string }[];
}

interface StepBase {
  /** Short heading, e.g. "Meet the student register". */
  title: string;
  body: RichText;
}

/** A real-world situation, told before any database words. */
export interface StoryStep extends StepBase {
  kind: "story";
  /** A big friendly emoji for the scene, e.g. "🏫". */
  emoji: string;
  /** Show this table drawn as a paper register (no database chrome). */
  paper?: string;
  /** Little cards, e.g. examples of data around us. */
  cards?: { emoji: string; label: string; text?: string }[];
  /** A question to think about; the answer is revealed on tap. */
  think?: { question: string; answer: RichText };
}

export type ExploreTask =
  | { type: "click-row"; prompt: string; match?: { column: string; value: CellValue } }
  | { type: "click-column"; prompt: string; column?: string }
  | { type: "hover-cell"; prompt: string; match?: { column: string; row: { column: string; value: CellValue } } }
  | { type: "select-rows"; prompt: string; count: number }
  | { type: "add-row"; prompt: string }
  | { type: "edit-cell"; prompt: string; column?: string }
  | { type: "delete-row"; prompt: string }
  | { type: "sort"; prompt: string; column?: string }
  | { type: "reset"; prompt: string };

/** Hands-on time with a table: click rows and columns, and (optionally) edit the sample data. */
export interface ExploreStep extends StepBase {
  kind: "explore";
  table: string;
  /** Allow adding, editing and deleting rows. */
  editable?: boolean;
  /** Guided tasks; Continue unlocks when they are all done. */
  tasks?: ExploreTask[];
}

/** Several tables and how they connect. */
export interface DatabaseStep extends StepBase {
  kind: "database";
  tables: string[];
  tasks?: ({ type: "open-table"; prompt: string; table?: string } | { type: "find-link"; prompt: string })[];
}

/** Guess which rows an operation will return, by tapping them, before seeing it happen. */
export interface PredictStep extends StepBase {
  kind: "predict";
  table: string;
  /** Hidden: the rows this query returns are the right answer. */
  query: string;
  prompt: string;
  /** Shown after checking. */
  explain: RichText;
}

/** Narration overrides, keyed by "<stage>.<phase>", e.g. "filter.check" or "source.show". */
export type Narration = Partial<Record<string, string>>;

/** Watch the database carry out a query, one step at a time. */
export interface AnimateStep extends StepBase {
  kind: "animate";
  query: string;
  /** Show the SQL next to the animation. Leave off the first time a concept appears (visual first). */
  showSql?: boolean;
  narration?: Narration;
  /** Offer buttons to re-run the same query as a different join type. */
  joinTypes?: ("INNER JOIN" | "LEFT JOIN" | "RIGHT JOIN" | "FULL JOIN")[];
}

/** Plain-language explanation, optionally with a before/after comparison. */
export interface ConceptStep extends StepBase {
  kind: "concept";
  points?: { emoji: string; title: string; text: RichText }[];
  compare?: { before: { label: string; table: string }; after: { label: string; query: string } };
}

/** The SQL, finally: every clause linked to the animation it produces. */
export interface SyntaxStep extends StepBase {
  kind: "syntax";
  query: string;
  /** Plain-language meaning of each clause, keyed by clause kind ("select", "from", "where", …). */
  explain?: Partial<Record<string, string>>;
  narration?: Narration;
}

/** Free practice: write any query against the lesson's tables and watch it run. */
export interface PlaygroundStep extends StepBase {
  kind: "playground";
  starter: string;
  /** Example queries to try, shown as chips. */
  suggestions?: string[];
  /** Tables to list in the schema panel (defaults to all of the lesson's tables). */
  tables?: string[];
}

export type LessonStep =
  StoryStep | ExploreStep | DatabaseStep | PredictStep | AnimateStep | ConceptStep | SyntaxStep | PlaygroundStep;

export type CheckQuestion =
  | {
      kind: "choice";
      prompt: RichText;
      /** Optional SQL shown with the question. */
      code?: string;
      /** Optional table shown with the question. */
      table?: string;
      options: string[];
      /** Index of the correct option. */
      answer: number;
      /** Why the answer is right (shown after answering). */
      explain: RichText;
    }
  | { kind: "pick-rows"; prompt: RichText; table: string; query: string; explain: RichText }
  | { kind: "pick-column"; prompt: RichText; table: string; column: string; explain: RichText }
  | {
      kind: "order";
      prompt: RichText;
      /** The query's pieces in the right order. */
      tokens: string[];
      distractors?: string[];
      explain: RichText;
    };

export type TaskGoal =
  | { type: "pick-rows"; query: string }
  | { type: "pick-column"; column: string }
  | { type: "pick-cell"; row: { column: string; value: CellValue }; column: string }
  | { type: "add-row"; values: Record<string, CellValue> }
  | { type: "edit-cell"; row: { column: string; value: CellValue }; column: string; value: CellValue }
  | { type: "delete-row"; row: { column: string; value: CellValue } }
  | { type: "pick-table"; table: string };

export type Challenge =
  | {
      /** Write a query. It passes when its result matches the solution's result. */
      kind: "sql";
      prompt: RichText;
      tables: string[];
      starter?: string;
      solution: string;
      hints: string[];
      /** Keywords the answer must use, e.g. ["WHERE"], so the lesson's idea is practised. */
      requires?: string[];
    }
  | {
      /** Build the query from word tiles. Passes when the built query's result matches. */
      kind: "build";
      prompt: RichText;
      tables: string[];
      tokens: string[];
      distractors: string[];
      hints: string[];
    }
  | {
      /** A hands-on task in the table or database explorer (for lessons before SQL). */
      kind: "task";
      prompt: RichText;
      /** "table": one table (needs `table`); "database": all of `tables`. */
      view: "table" | "database";
      table?: string;
      tables?: string[];
      goal: TaskGoal;
      hints: string[];
    };
