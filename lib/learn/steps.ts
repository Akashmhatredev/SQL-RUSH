import type { Narration } from "./types";
import type { Relation, StatementRun, TraceStage } from "./sql/types";
import { formatCell } from "./sql/values";

/**
 * Turns an execution trace into animation steps. Each trace stage becomes one or more
 * phases (e.g. a WHERE is "check every row" then "keep the rows that passed"), each with a
 * plain-language narration. Lessons can override any narration by its "<stage>.<phase>" key.
 *
 * This is the single place that decides how SQL concepts are taught visually, so a new
 * concept needs a new trace stage in the engine and a case here, not a new lesson component.
 */

export type Phase =
  | "show"
  | "check"
  | "keep"
  | "match"
  | "group"
  | "aggregate"
  | "partition"
  | "compute"
  | "pick"
  | "keys"
  | "move"
  | "cut"
  | "add"
  | "change"
  | "remove"
  | "result";

export interface VisualStep {
  id: string;
  stage: TraceStage;
  phase: Phase;
  /** Short label for the step list, e.g. "Check each row". */
  title: string;
  narration: string;
  /** The SQL clause this step comes from, for synchronized highlighting. */
  clauseId: string | null;
  /** How long autoplay lingers on this step at 1× speed, in ms. */
  duration: number;
  /** Shown above the stage, e.g. "Inside the WITH query big_spenders". */
  context?: string;
}

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

const ROW_STAGGER = 260;

function rowsDuration(rel: Relation, base = 900) {
  return base + Math.min(rel.rows.length, 14) * ROW_STAGGER;
}

function stageSteps(stage: TraceStage, plain: boolean): Omit<VisualStep, "id">[] {
  /** Plain wording (no SQL keywords) for animations shown before the SQL is introduced. */
  const t = (plainText: string, sqlText: string) => (plain ? plainText : sqlText);
  const clauseId = "clauseId" in stage ? stage.clauseId : null;
  const step = (phase: Phase, title: string, narration: string, duration = 1800): Omit<VisualStep, "id"> => ({
    stage,
    phase,
    title,
    narration,
    clauseId,
    duration,
  });

  switch (stage.kind) {
    case "source":
      return [
        step(
          "show",
          `Start with ${stage.table}`,
          `Here are all ${plural(stage.relation.rows.length, "row")} in the ${stage.table} table.`,
          1600,
        ),
      ];
    case "cte":
      return [
        step(
          "show",
          `Name the result "${stage.name}"`,
          t(
            `This result is saved under the name ${stage.name}, so the next step can use it like a table. It has ${plural(stage.output.rows.length, "row")}.`,
            `WITH saves this result under the name ${stage.name}, so the rest of the query can use it like a table. It has ${plural(stage.output.rows.length, "row")}.`,
          ),
          2000,
        ),
      ];
    case "join": {
      const matched = stage.pairs.filter((p) => p.left !== null && p.right !== null).length;
      const unmatchedLeft = stage.pairs.filter((p) => p.right === null).length;
      const unmatchedRight = stage.pairs.filter((p) => p.left === null).length;
      const leftName = stage.left.columns[0]?.table ?? "the first table";
      const extra =
        stage.joinKind === "inner"
          ? "Rows that found no partner are left out."
          : stage.joinKind === "left"
            ? `Every row from ${leftName} stays: ${plural(unmatchedLeft, "row")} with no match ${unmatchedLeft === 1 ? "gets" : "get"} NULLs on the ${stage.rightName} side.`
            : stage.joinKind === "right"
              ? `Every row from ${stage.rightName} stays: ${plural(unmatchedRight, "row")} with no match ${unmatchedRight === 1 ? "gets" : "get"} NULLs on the ${leftName} side.`
              : stage.joinKind === "full"
                ? `Every row from both tables stays. Rows with no partner get NULLs on the other side (${unmatchedLeft} + ${unmatchedRight}).`
                : "Every row is paired with every other row.";
      return [
        step("show", "Two tables", `We have two tables: ${leftName} and ${stage.rightName}.`, 1500),
        step(
          "match",
          "Find matching rows",
          stage.on
            ? t(
                `For each row on the left, we look for rows on the right that belong with it (${stage.on}). ${plural(matched, "pair")} match.`,
                `For each row on the left, we look for rows on the right where ${stage.on}. ${plural(matched, "pair")} match.`,
              )
            : "Every row on the left is paired with every row on the right.",
          rowsDuration(stage.left, 1200),
        ),
        step(
          "result",
          t("Combine the pairs", `${stage.keyword} result`),
          t(
            `Each matching pair becomes one combined row. ${extra}`,
            `${stage.keyword} puts each matching pair side by side as one row. ${extra}`,
          ),
          2200,
        ),
      ];
    }
    case "filter": {
      const passed = stage.output.rows.length;
      const total = stage.input.rows.length;
      const unit = stage.target === "having" ? "group" : "row";
      return [
        step(
          "check",
          stage.target === "having" ? "Check each group" : "Check each row",
          t(
            `We ask one question of every ${unit}: is ${stage.condition} true?`,
            `${stage.target === "having" ? "HAVING" : "WHERE"} asks one question of every ${unit}: is ${stage.condition} true?`,
          ),
          rowsDuration(stage.input),
        ),
        step(
          "keep",
          stage.target === "having" ? "Keep matching groups" : "Keep matching rows",
          passed === total
            ? `Every ${unit} passed, so all ${plural(total, unit)} stay.`
            : passed === 0
              ? `No ${unit} passed, so nothing is left.`
              : `${plural(passed, unit)} passed and stay. The other ${plural(total - passed, unit)} ${total - passed === 1 ? "is" : "are"} set aside.`,
          1600,
        ),
      ];
    }
    case "group": {
      const g = stage.groups.length;
      return [
        step(
          "group",
          stage.keys.length ? "Make groups" : "One big group",
          stage.keys.length
            ? t(
                `Rows with the same ${list(stage.keys)} are put together: ${plural(g, "group")}.`,
                `GROUP BY ${list(stage.keys)} puts rows with the same ${list(stage.keys)} together: ${plural(g, "group")}.`,
              )
            : t(
                `All ${plural(stage.input.rows.length, "row")} go into one big group.`,
                `With no GROUP BY, all ${plural(stage.input.rows.length, "row")} form one group.`,
              ),
          rowsDuration(stage.input, 1200),
        ),
        step(
          "aggregate",
          "Sum up each group",
          stage.aggregates.length && !plain
            ? `Now ${list(stage.aggregates)} ${stage.aggregates.length === 1 ? "is" : "are"} worked out for each group, squashing it into a single row.`
            : "Each group is summed up and squashed into a single row.",
          2200,
        ),
      ];
    }
    case "window":
      return [
        step(
          "partition",
          "Line up the rows",
          stage.partitions.length > 1
            ? `The window splits the rows into ${plural(stage.partitions.length, "partition")} and lines each one up in order.`
            : "The window looks at all the rows together, in order.",
          1800,
        ),
        step(
          "compute",
          "Add the new column",
          t(
            "A new value is worked out for every row. No rows are squashed together.",
            `${list(stage.functions)} adds a value to every row. Unlike GROUP BY, no rows are squashed together.`,
          ),
          2200,
        ),
      ];
    case "project": {
      if (stage.star && stage.output.columns.length === stage.input.columns.length) {
        return [
          step(
            "pick",
            t("Keep every column", "SELECT *"),
            t(
              `We keep every column: ${list(stage.output.columns.map((c) => c.name))}.`,
              `SELECT * keeps every column: ${list(stage.output.columns.map((c) => c.name))}.`,
            ),
            1600,
          ),
        ];
      }
      const computed = stage.picked.filter((p) => p === null).length;
      return [
        step(
          "pick",
          "Pick the columns",
          `${t("We choose what to show", "SELECT chooses what to show")}: ${list(stage.output.columns.map((c) => c.name))}.${computed ? ` ${computed === 1 ? "One is" : `${computed} are`} worked out for every row.` : ""}`,
          1800,
        ),
        step("result", "Keep only those", "Everything else is left out of the result.", 1400),
      ];
    }
    case "distinct": {
      const removed = stage.duplicateOf.filter((d) => d !== null).length;
      return [
        step(
          "check",
          "Spot duplicates",
          removed
            ? `${t("We look for", "DISTINCT looks for")} rows that are exactly the same. ${plural(removed, "row")} ${removed === 1 ? "is a repeat" : "are repeats"}.`
            : `${t("We look for", "DISTINCT looks for")} repeated rows, but every row is already different.`,
          rowsDuration(stage.input, 800),
        ),
        step(
          "keep",
          "Remove repeats",
          `Only one copy of each is kept: ${plural(stage.output.rows.length, "row")} remain.`,
          1500,
        ),
      ];
    }
    case "sort":
      return [
        step(
          "keys",
          "Look at the sort column",
          `${t("We look at", "ORDER BY looks at")} ${list(stage.keys.map((k) => k.text))}.`,
          1400,
        ),
        step(
          "move",
          "Sort the rows",
          `The rows move into ${list(stage.keys.map((k) => `${k.dir === "desc" ? "descending (biggest first)" : "ascending (smallest first)"} order of ${k.text}`))}.`,
          2000,
        ),
      ];
    case "limit":
      return [
        step(
          "cut",
          "Count off the rows",
          stage.offset
            ? t(
                `We skip the first ${plural(stage.offset, "row")}, then count off the next ${stage.limit ?? "ones"}.`,
                `OFFSET ${stage.offset} skips the first ${plural(stage.offset, "row")}, then LIMIT ${stage.limit ?? "ALL"} counts off the next ones.`,
              )
            : t(
                `We count off the first ${plural(stage.limit ?? 0, "row")}.`,
                `LIMIT ${stage.limit} counts off the first ${plural(stage.limit ?? 0, "row")}.`,
              ),
          rowsDuration(stage.input, 700),
        ),
        step(
          "keep",
          "Keep just those",
          `The rest are dropped: ${plural(stage.output.rows.length, "row")} remain.`,
          1400,
        ),
      ];
    case "insert":
      return [
        step(
          "show",
          `The ${stage.table} table`,
          `Here is ${stage.table} before the change: ${plural(stage.before.rows.length, "row")}.`,
          1400,
        ),
        step(
          "add",
          "Add the new rows",
          `${t("We add", "INSERT adds")} ${plural(stage.added.length, "new row")} at the bottom. Nothing else changes.`,
          2000,
        ),
      ];
    case "update": {
      const rows = new Set(stage.changes.map((c) => c.row)).size;
      const out = [step("show", `The ${stage.table} table`, `Here is ${stage.table} before the change.`, 1300)];
      if (stage.checks) {
        out.push(
          step(
            "check",
            "Find the rows",
            `${t("First we find the rows to change", "WHERE picks which rows to change")}: is ${stage.condition} true?`,
            rowsDuration(stage.before),
          ),
        );
      }
      const cols = [...new Set(stage.changes.map((c) => stage.before.columns[c.column]?.name))];
      out.push(
        step(
          "change",
          "Change the values",
          rows
            ? `${t("The new", "SET writes the new")} ${list(cols)} ${t("is written into", "into")} ${plural(rows, "row")}.${stage.checks ? "" : t(" Every row changes!", " There's no WHERE, so every row changes!")}`
            : "No rows matched, so nothing changed.",
          2000,
        ),
      );
      return out;
    }
    case "delete": {
      const out = [step("show", `The ${stage.table} table`, `Here is ${stage.table} before the change.`, 1300)];
      if (stage.checks) {
        out.push(
          step(
            "check",
            "Find the rows",
            `${t("First we find the rows to remove", "WHERE picks which rows to delete")}: is ${stage.condition} true?`,
            rowsDuration(stage.before),
          ),
        );
      }
      out.push(
        step(
          "remove",
          "Remove them",
          stage.removed.length
            ? `${t("We remove", "DELETE removes")} ${plural(stage.removed.length, "row")}.${stage.checks ? "" : t(" Every row is gone!", " There's no WHERE, so every row is gone!")}`
            : "No rows matched, so nothing was deleted.",
          1800,
        ),
      );
      return out;
    }
  }
}

export function buildSteps(run: StatementRun, narration: Narration = {}, { plain = false } = {}): VisualStep[] {
  const out: VisualStep[] = [];
  const push = (s: Omit<VisualStep, "id">, context?: string, key?: string) => {
    const k = key ?? `${s.stage.kind}.${s.phase}`;
    const override =
      key !== undefined
        ? narration[key]
        : s.stage.kind === "filter"
          ? (narration[`${s.stage.target}.${s.phase}`] ?? narration[k])
          : narration[k];
    out.push({ ...s, narration: override ?? s.narration, id: `${out.length}`, context });
  };

  run.trace.forEach((stage, i) => {
    if (stage.kind === "cte") {
      for (const inner of stage.trace) {
        for (const s of stageSteps(inner, plain)) push({ ...s, clauseId: stage.clauseId }, `Inside ${stage.name}`);
      }
    }
    // When choosing columns is the last thing a SELECT does, the final "result" step shows the same table.
    const lastProject = stage.kind === "project" && i === run.trace.length - 1 && !!run.result;
    for (const s of stageSteps(stage, plain)) if (!(lastProject && s.phase === "result")) push(s);
  });

  if (run.result) {
    const n = run.result.rows.length;
    const last = run.trace.at(-1);
    const resultStage: TraceStage = last ?? {
      kind: "project",
      clauseId: run.clauses[0]?.id ?? "select",
      input: run.result,
      picked: [],
      star: false,
      output: run.result,
    };
    push(
      {
        stage: resultStage,
        phase: "result",
        title: "The result",
        narration:
          n === 0
            ? "The result is empty: no rows matched."
            : n === 1 && run.result.columns.length === 1
              ? `The answer is ${formatCell(run.result.rows[0].values[0])}.`
              : `Here is the result: ${plural(n, "row")}.`,
        clauseId: null,
        duration: 2200,
      },
      undefined,
      "result",
    );
  }
  return out;
}

/** The relation to draw at the end of a stage (what the stage produced). */
export function stageOutput(stage: TraceStage): Relation {
  switch (stage.kind) {
    case "source":
      return stage.relation;
    case "insert":
    case "update":
    case "delete":
      return stage.after;
    default:
      return stage.output;
  }
}
