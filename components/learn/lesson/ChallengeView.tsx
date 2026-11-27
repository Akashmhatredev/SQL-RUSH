"use client";

import { AnimatePresence, m } from "framer-motion";
import { Check, Eye, Lightbulb, Play, RotateCcw, Target, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DragDropBuilder } from "@/components/game/DragDropBuilder";
import { SqlCode } from "@/components/game/SqlCode";
import { SqlEditor } from "@/components/game/SqlEditor";
import { DatabaseVisualizer } from "@/components/learn/engine/DatabaseVisualizer";
import { QueryExecutionVisualizer } from "@/components/learn/engine/QueryExecutionVisualizer";
import { RelationTable, TableChip } from "@/components/learn/engine/RelationTable";
import { InlineText, RichText } from "@/components/learn/engine/RichText";
import { TableVisualizer } from "@/components/learn/engine/TableVisualizer";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useSound } from "@/hooks/useSound";
import { compareRuns, missingKeywords } from "@/lib/learn/sql/compare";
import { runSql } from "@/lib/learn/sql/engine";
import { SqlError } from "@/lib/learn/sql/errors";
import type { CellValue, DatabaseData, Relation, RunResult } from "@/lib/learn/sql/types";
import { formatCell } from "@/lib/learn/sql/values";
import type { Challenge, Lesson, TaskGoal } from "@/lib/learn/types";
import { cn } from "@/lib/utils";
import type { PoolToken } from "@/types/game";
import { seededShuffle } from "./KnowledgeCheck";
import { sourceRows, SqlErrorView, tableRelation } from "./shared";

export interface ChallengeSaved {
  draft?: string;
  placed?: string[];
  attempts: number;
  hints: number;
  revealed: boolean;
  passed: boolean;
}

type Feedback = { ok: boolean; message: string; result?: Relation | null; affectedTable?: Relation | null } | null;

function Hints({ hints, shown, onMore }: { hints: string[]; shown: number; onMore: () => void }) {
  return (
    <div className="space-y-2">
      {hints.slice(0, shown).map((h, i) => (
        <m.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-ink-800 ring-1 ring-amber-200"
        >
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <InlineText text={h} />
        </m.p>
      ))}
      {shown < hints.length && (
        <Button size="sm" variant="ghost" onClick={onMore}>
          <Lightbulb aria-hidden /> {shown ? "Another hint" : "Show a hint"}
        </Button>
      )}
    </div>
  );
}

function FeedbackBox({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <m.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "rounded-3xl p-4 ring-2",
        feedback.ok ? "bg-emerald-50 ring-emerald-300" : "bg-rose-50 ring-rose-200",
      )}
      role="status"
    >
      <p className={cn("flex items-center gap-2 font-black", feedback.ok ? "text-emerald-800" : "text-rose-800")}>
        {feedback.ok ? <Trophy className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}
        {feedback.ok ? "Challenge complete!" : "Not yet"}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink-700">
        {feedback.ok ? "Your query gives exactly the right result." : feedback.message}
      </p>
      {(feedback.result || feedback.affectedTable) && (
        <RelationTable
          relation={(feedback.result ?? feedback.affectedTable)!}
          scope="challenge-result"
          size="sm"
          className="mt-3"
          ariaLabel="Your result"
          caption={
            <TableChip
              name={feedback.result ? "Your result" : "The table after your change"}
              tone={feedback.ok ? "emerald" : "rose"}
            />
          }
        />
      )}
    </m.div>
  );
}

/** Checks a table task against what the learner did. */
function taskDone(
  goal: TaskGoal,
  ctx: {
    table?: { columns: string[]; rows: CellValue[][]; initial: CellValue[][] };
    pickedRows: Set<number>;
    expectedRows: Set<number>;
    pickedColumn: string | null;
    pickedCell: { row: number; column: string } | null;
    pickedTable: string | null;
  },
): boolean {
  const t = ctx.table;
  const col = (name: string) => t?.columns.indexOf(name) ?? -1;
  const same = (a: CellValue, b: CellValue) => formatCell(a) === formatCell(b);
  switch (goal.type) {
    case "pick-rows":
      return ctx.pickedRows.size === ctx.expectedRows.size && [...ctx.pickedRows].every((r) => ctx.expectedRows.has(r));
    case "pick-column":
      return ctx.pickedColumn === goal.column;
    case "pick-cell": {
      if (!t || !ctx.pickedCell || ctx.pickedCell.column !== goal.column) return false;
      return same(t.rows[ctx.pickedCell.row]?.[col(goal.row.column)] ?? null, goal.row.value);
    }
    case "add-row":
      return !!t?.rows.some((r) => Object.entries(goal.values).every(([c, v]) => same(r[col(c)] ?? null, v)));
    case "edit-cell": {
      const row = t?.rows.find((r) => same(r[col(goal.row.column)] ?? null, goal.row.value));
      return !!row && same(row[col(goal.column)] ?? null, goal.value);
    }
    case "delete-row":
      return (
        !!t &&
        t.rows.length === t.initial.length - 1 &&
        !t.rows.some((r) => same(r[col(goal.row.column)] ?? null, goal.row.value))
      );
    case "pick-table":
      return ctx.pickedTable === goal.table;
  }
}

function TaskChallenge({
  challenge,
  lesson,
  db,
  onResult,
}: {
  challenge: Extract<Challenge, { kind: "task" }>;
  lesson: Lesson;
  db: DatabaseData;
  onResult: (ok: boolean, message: string) => void;
}) {
  const table = challenge.table ? lesson.tables.find((t) => t.name === challenge.table) : undefined;
  const [rows, setRows] = useState<CellValue[][]>(table?.rows ?? []);
  const [pickedRows, setPickedRows] = useState<Set<number>>(new Set());
  const [pickedColumn, setPickedColumn] = useState<string | null>(null);
  const [pickedCell, setPickedCell] = useState<{ row: number; column: string } | null>(null);
  const [pickedTable, setPickedTable] = useState<string | null>(null);
  const goal = challenge.goal;
  const expectedRows = useMemo(
    () => (goal.type === "pick-rows" ? sourceRows(runSql(goal.query, db).runs.at(-1)!.result!) : new Set<number>()),
    [goal, db],
  );
  const autoCheck = goal.type === "add-row" || goal.type === "edit-cell" || goal.type === "delete-row";

  const check = useCallback(
    (override?: Partial<{ rows: CellValue[][] }>) => {
      const ok = taskDone(goal, {
        table: table
          ? { columns: table.columns.map((c) => c.name), rows: override?.rows ?? rows, initial: table.rows }
          : undefined,
        pickedRows,
        expectedRows,
        pickedColumn,
        pickedCell,
        pickedTable,
      });
      onResult(
        ok,
        ok
          ? "Done!"
          : goal.type === "add-row"
            ? "That row doesn't match yet: check every value, including capital letters."
            : goal.type === "pick-rows"
              ? `Not quite: ${pickedRows.size} picked, but the answer has ${expectedRows.size}.`
              : "Not quite. Have another look.",
      );
    },
    [goal, table, rows, pickedRows, expectedRows, pickedColumn, pickedCell, pickedTable, onResult],
  );

  if (challenge.view === "database") {
    const tables = (challenge.tables ?? lesson.tables.map((t) => t.name)).map((n) =>
      lesson.tables.find((t) => t.name === n)!,
    );
    return (
      <div className="space-y-3">
        <DatabaseVisualizer tables={tables} pickMode picked={pickedTable} onOpenTable={setPickedTable} />
        <Button variant="primary" onClick={() => check()} disabled={!pickedTable}>
          <Target aria-hidden /> Check: {pickedTable ?? "pick a table"}
        </Button>
      </div>
    );
  }

  if (!table) return null;
  if (goal.type === "pick-column" || goal.type === "pick-cell" || goal.type === "pick-rows") {
    return (
      <div className="space-y-3">
        <RelationTable
          relation={tableRelation(table, "task")}
          scope="task"
          ariaLabel={`${table.name} table`}
          caption={<TableChip name={table.name} tone="sky" />}
          defs={table.columns}
          onColumnClick={goal.type === "pick-column" ? (c) => setPickedColumn(table.columns[c].name) : undefined}
          onCellClick={
            goal.type === "pick-cell" ? (r, c) => setPickedCell({ row: r, column: table.columns[c].name }) : undefined
          }
          onRowClick={
            goal.type === "pick-rows"
              ? (r) =>
                  setPickedRows((s) => {
                    const next = new Set(s);
                    if (next.has(r)) next.delete(r);
                    else next.add(r);
                    return next;
                  })
              : goal.type === "pick-cell"
                ? () => undefined
                : undefined
          }
          selectedRows={pickedRows}
          colTone={(c) => (pickedColumn === table.columns[c].name ? "focus" : null)}
          cellTone={(r, c) =>
            pickedCell && pickedCell.row === r && pickedCell.column === table.columns[c].name ? "focus" : null
          }
        />
        <Button
          variant="primary"
          onClick={() => check()}
          disabled={!pickedColumn && !pickedCell && pickedRows.size === 0}
        >
          <Target aria-hidden /> Check my answer
        </Button>
      </div>
    );
  }

  return (
    <TableVisualizer
      table={table}
      rows={rows}
      onRowsChange={(next) => {
        setRows(next);
        if (autoCheck) {
          const ok = taskDone(goal, {
            table: { columns: table.columns.map((c) => c.name), rows: next, initial: table.rows },
            pickedRows,
            expectedRows,
            pickedColumn,
            pickedCell,
            pickedTable,
          });
          if (ok) onResult(true, "Done!");
        }
      }}
      editable
      showExplainer={false}
    />
  );
}

/**
 * The lesson's practical challenge: write (or build) a query, or do a hands-on task. Answers
 * are checked by running them on the lesson's data and comparing with the solution's result,
 * so any correct query passes, not just the one in the answer key.
 */
export function ChallengeView({
  lesson,
  db,
  saved,
  onSave,
  onPassed,
}: {
  lesson: Lesson;
  db: DatabaseData;
  saved: ChallengeSaved | null;
  onSave: (s: ChallengeSaved) => void;
  onPassed: (revealed: boolean) => void;
}) {
  const challenge = lesson.challenge;
  const [state, setState] = useState<ChallengeSaved>(
    saved ?? {
      draft: challenge.kind === "sql" ? (challenge.starter ?? "") : undefined,
      placed: [],
      attempts: 0,
      hints: 0,
      revealed: false,
      passed: false,
    },
  );
  const [feedback, setFeedback] = useState<Feedback>(state.passed ? { ok: true, message: "" } : null);
  const [error, setError] = useState<{ error: SqlError; sql: string } | null>(null);
  const [watch, setWatch] = useState<string | null>(null);
  const { play } = useSound();

  useEffect(() => onSave(state), [state, onSave]);

  const expected: RunResult | null = useMemo(() => {
    if (challenge.kind === "sql") return runSql(challenge.solution, db);
    if (challenge.kind === "build") return runSql(challenge.tokens.join(" "), db);
    return null;
  }, [challenge, db]);

  const pool: PoolToken[] = useMemo(
    () =>
      challenge.kind === "build"
        ? seededShuffle([...challenge.tokens, ...challenge.distractors], lesson.id).map((text, i) => ({
            key: `b${i}`,
            text,
          }))
        : [],
    [challenge, lesson.id],
  );
  const builtSql =
    challenge.kind === "build"
      ? (state.placed ?? []).map((k) => pool.find((p) => p.key === k)?.text ?? "").join(" ")
      : "";
  const solutionSql =
    challenge.kind === "sql" ? challenge.solution : challenge.kind === "build" ? challenge.tokens.join(" ") : null;

  const pass = (revealed: boolean) => {
    play("correct");
    setState((s) => ({ ...s, passed: true }));
    onPassed(revealed);
  };

  const submit = (sqlText: string) => {
    if (!expected || state.passed) return;
    setWatch(null);
    let got: RunResult;
    try {
      got = runSql(sqlText, db);
    } catch (e) {
      play("wrong");
      setError({ error: e instanceof SqlError ? e : new SqlError(String(e)), sql: sqlText });
      setFeedback(null);
      setState((s) => ({ ...s, attempts: s.attempts + 1 }));
      return;
    }
    setError(null);
    const verdict = compareRuns(got, expected);
    const missing = challenge.kind === "sql" && challenge.requires ? missingKeywords(sqlText, challenge.requires) : [];
    const ok = verdict.ok && missing.length === 0;
    const last = got.runs.at(-1)!;
    const changedTable = last.table ? got.db[last.table] : null;
    setFeedback({
      ok,
      message:
        verdict.ok && missing.length
          ? `The result is right, but this challenge is about ${missing.join(" and ")}: use it in your query.`
          : verdict.message,
      result: last.result,
      affectedTable: changedTable ? tableRelation(changedTable, "after") : null,
    });
    setState((s) => ({ ...s, attempts: s.attempts + 1 }));
    if (ok) pass(state.revealed);
    else play("wrong");
  };

  const canReveal = solutionSql !== null && (state.attempts >= 2 || state.hints >= challenge.hints.length);

  return (
    <div className="space-y-4">
      <div className="clay rounded-3xl p-4 sm:p-5">
        <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
          <Target className="size-4" aria-hidden /> Challenge
        </p>
        <RichText text={challenge.prompt} className="text-base font-semibold text-ink-800 sm:text-lg" />
      </div>

      {challenge.kind !== "task" && (
        <div className="space-y-2">
          {challenge.tables.map((n) => {
            const t = lesson.tables.find((x) => x.name === n);
            return t ? (
              <details key={n} className="group" open={challenge.tables.length === 1}>
                <summary className="cursor-pointer list-none text-sm font-bold text-ink-600 marker:hidden">
                  <TableChip name={t.name} tone="sky">
                    <span className="font-sans text-[10px] group-open:hidden">show data</span>
                  </TableChip>
                </summary>
                <RelationTable
                  relation={tableRelation(t, `ch-${n}`)}
                  scope={`ch-${n}`}
                  size="sm"
                  className="mt-2"
                  ariaLabel={`${t.name} table`}
                  defs={t.columns}
                />
              </details>
            ) : null;
          })}
        </div>
      )}

      {challenge.kind === "sql" && (
        <>
          <SqlEditor
            value={state.draft ?? ""}
            onChange={(v) => setState((s) => ({ ...s, draft: v }))}
            onSubmit={() => submit(state.draft ?? "")}
            label="Your answer"
            placeholder="Write your query here"
            disabled={state.passed}
            state={feedback?.ok ? "correct" : feedback && !feedback.ok ? "wrong" : "idle"}
          />
          {!state.passed && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => submit(state.draft ?? "")}
                disabled={!(state.draft ?? "").trim()}
              >
                <Play className="fill-current" aria-hidden /> Run and check{" "}
                <Kbd className="hidden border-white/40 bg-white/20 text-white sm:inline-flex">⌘ Enter</Kbd>
              </Button>
              {(state.draft ?? "").trim() && (
                <Button variant="ghost" onClick={() => setWatch(state.draft ?? "")}>
                  <Eye aria-hidden /> Watch my query run
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {challenge.kind === "build" && (
        <>
          <DragDropBuilder
            pool={pool}
            placed={state.placed ?? []}
            onChange={(placed) => setState((s) => ({ ...s, placed }))}
            locked={state.passed}
            expected={state.passed ? challenge.tokens : null}
          />
          {builtSql && <SqlCode code={builtSql} />}
          {!state.passed && (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => submit(builtSql)} disabled={!builtSql}>
                <Play className="fill-current" aria-hidden /> Run and check
              </Button>
              <Button
                variant="ghost"
                onClick={() => setState((s) => ({ ...s, placed: [] }))}
                disabled={!state.placed?.length}
              >
                <RotateCcw aria-hidden /> Clear
              </Button>
            </div>
          )}
        </>
      )}

      {challenge.kind === "task" && !state.passed && (
        <TaskChallenge
          challenge={challenge}
          lesson={lesson}
          db={db}
          onResult={(ok, message) => {
            setFeedback(ok ? { ok, message } : { ok, message });
            setState((s) => ({ ...s, attempts: s.attempts + 1 }));
            if (ok) pass(state.revealed);
            else play("wrong");
          }}
        />
      )}

      {error && <SqlErrorView error={error.error} sql={error.sql} />}
      <AnimatePresence>{feedback && <FeedbackBox feedback={feedback} />}</AnimatePresence>

      {watch && <QueryExecutionVisualizer sql={watch} db={db} showSql autoPlay />}

      {!state.passed && (
        <div className="space-y-2">
          <Hints
            hints={challenge.hints}
            shown={state.hints}
            onMore={() => setState((s) => ({ ...s, hints: s.hints + 1 }))}
          />
          {canReveal && !state.revealed && (
            <Button size="sm" variant="ghost" onClick={() => setState((s) => ({ ...s, revealed: true }))}>
              <Eye aria-hidden /> Show the answer
            </Button>
          )}
          {state.revealed && solutionSql && (
            <div className="rounded-3xl bg-white/70 p-4 shadow-clay-sm">
              <p className="mb-2 text-sm font-bold text-ink-700">One answer that works (yours can look different):</p>
              <SqlCode code={solutionSql} />
              {challenge.kind === "sql" && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => setState((s) => ({ ...s, draft: solutionSql }))}
                >
                  <Check aria-hidden /> Use it, then run it
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
