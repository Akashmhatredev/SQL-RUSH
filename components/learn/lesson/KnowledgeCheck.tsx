"use client";

import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DragDropBuilder } from "@/components/game/DragDropBuilder";
import { SqlCode } from "@/components/game/SqlCode";
import { RelationTable, TableChip } from "@/components/learn/engine/RelationTable";
import { InlineText, RichText } from "@/components/learn/engine/RichText";
import { Button } from "@/components/ui/button";
import { useSound } from "@/hooks/useSound";
import { runSql } from "@/lib/learn/sql/engine";
import type { DatabaseData } from "@/lib/learn/sql/types";
import type { CheckQuestion, Lesson } from "@/lib/learn/types";
import { cn } from "@/lib/utils";
import type { PoolToken } from "@/types/game";
import { sourceRows, tableRelation } from "./shared";

export interface CheckSaved {
  /** Index of the current question. */
  index: number;
  /** Questions answered wrongly at least once. */
  missed: number[];
  passed: boolean;
}

/** A deterministic shuffle so the order is stable across re-renders and reloads. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Outcome = "correct" | "wrong" | null;

function Question({
  q,
  qKey,
  lesson,
  db,
  onAnswer,
  outcome,
  onRetry,
}: {
  q: CheckQuestion;
  qKey: string;
  lesson: Lesson;
  db: DatabaseData;
  onAnswer: (correct: boolean) => void;
  outcome: Outcome;
  onRetry: () => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [rows, setRows] = useState<Set<number>>(new Set());
  const [column, setColumn] = useState<number | null>(null);
  const [placed, setPlaced] = useState<string[]>([]);
  const locked = outcome !== null;

  const table = "table" in q && q.table ? lesson.tables.find((t) => t.name === q.table) : undefined;
  const expectedRows = useMemo(
    () => (q.kind === "pick-rows" ? sourceRows(runSql(q.query, db).runs.at(-1)!.result!) : new Set<number>()),
    [q, db],
  );
  const pool: PoolToken[] = useMemo(
    () =>
      q.kind === "order"
        ? seededShuffle([...q.tokens, ...(q.distractors ?? [])], qKey).map((text, i) => ({ key: `t${i}`, text }))
        : [],
    [q, qKey],
  );

  const reset = () => {
    setChoice(null);
    setRows(new Set());
    setColumn(null);
    setPlaced([]);
    onRetry();
  };

  const submit = () => {
    switch (q.kind) {
      case "choice":
        return choice !== null && onAnswer(choice === q.answer);
      case "pick-rows":
        return onAnswer(rows.size === expectedRows.size && [...rows].every((r) => expectedRows.has(r)));
      case "pick-column":
        return column !== null && onAnswer(table?.columns[column]?.name === q.column);
      case "order": {
        const built = placed.map((k) => pool.find((p) => p.key === k)?.text ?? "");
        return onAnswer(built.join(" ") === q.tokens.join(" "));
      }
    }
  };

  const canSubmit =
    (q.kind === "choice" && choice !== null) ||
    (q.kind === "pick-rows" && rows.size > 0) ||
    (q.kind === "pick-column" && column !== null) ||
    (q.kind === "order" && placed.length > 0);

  return (
    <div className="space-y-4">
      <div className="text-lg font-extrabold leading-snug text-ink-900 sm:text-xl">
        <RichText text={q.prompt} className="text-lg font-extrabold text-ink-900 sm:text-xl [&_p]:text-inherit" />
      </div>
      {q.kind === "choice" && q.code && <SqlCode code={q.code} />}

      {table && (q.kind === "choice" || q.kind === "pick-rows" || q.kind === "pick-column") && (
        <RelationTable
          relation={tableRelation(table, `check-${qKey}`)}
          scope={`check-${qKey}`}
          ariaLabel={`${table.name} table`}
          caption={<TableChip name={table.name} tone="sky" />}
          defs={table.columns}
          size="sm"
          onRowClick={
            q.kind === "pick-rows" && !locked
              ? (i) => {
                  const next = new Set(rows);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  setRows(next);
                }
              : undefined
          }
          onColumnClick={q.kind === "pick-column" && !locked ? (c) => setColumn(c) : undefined}
          selectedRows={q.kind === "pick-rows" ? rows : undefined}
          rowTone={
            q.kind === "pick-rows"
              ? (i) =>
                  !locked
                    ? rows.has(i)
                      ? "selected"
                      : null
                    : rows.has(i)
                      ? expectedRows.has(i)
                        ? "pass"
                        : "wrong"
                      : expectedRows.has(i)
                        ? "missed"
                        : "dim"
              : undefined
          }
          colTone={
            q.kind === "pick-column"
              ? (c) => (column === c ? "focus" : locked && table.columns[c].name === q.column ? "key" : null)
              : undefined
          }
        />
      )}

      {q.kind === "choice" && (
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Answers">
          {q.options.map((o, i) => {
            const picked = choice === i;
            const isAnswer = i === q.answer;
            const looksSql = /^\s*(select|where|from|order|insert|update|delete|group|having|with)\b/i.test(o);
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={picked}
                disabled={locked}
                onClick={() => setChoice(i)}
                className={cn(
                  "clay flex items-center gap-3 rounded-2xl p-3.5 text-left text-sm font-bold text-ink-800 transition-all disabled:cursor-default",
                  !locked && "hover:-translate-y-0.5 hover:bg-white",
                  picked && !locked && "bg-violet-100 ring-2 ring-violet-400",
                  locked && isAnswer && "bg-emerald-50 ring-2 ring-emerald-400",
                  locked && picked && !isAnswer && "bg-rose-50 ring-2 ring-rose-400",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-xl font-mono text-xs font-black shadow-clay-sm",
                    locked && isAnswer
                      ? "bg-emerald-500 text-white"
                      : locked && picked
                        ? "bg-rose-500 text-white"
                        : "bg-white text-ink-600",
                  )}
                >
                  {locked && isAnswer ? (
                    <Check className="size-4" />
                  ) : locked && picked ? (
                    <X className="size-4" />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </span>
                {looksSql ? <SqlCode code={o} inline /> : <InlineText text={o} />}
              </button>
            );
          })}
        </div>
      )}

      {q.kind === "pick-column" && !locked && (
        <p className="text-sm font-semibold text-ink-500">Tap a column name in the table header.</p>
      )}

      {q.kind === "order" && (
        <DragDropBuilder
          pool={pool}
          placed={placed}
          onChange={setPlaced}
          locked={locked}
          expected={locked ? q.tokens : null}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {outcome ? (
          <m.div
            key="feedback"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-3xl p-4 ring-2",
              outcome === "correct" ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200",
            )}
            role="status"
          >
            <p
              className={cn(
                "flex items-center gap-2 font-black",
                outcome === "correct" ? "text-emerald-800" : "text-rose-800",
              )}
            >
              {outcome === "correct" ? <Check className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}
              {outcome === "correct" ? "Correct!" : "Not quite."}
            </p>
            {outcome === "correct" ? (
              <RichText text={q.explain} className="mt-1 text-sm sm:text-[15px]" />
            ) : (
              <Button size="sm" variant="secondary" className="mt-2" onClick={reset}>
                <RotateCcw aria-hidden /> Try again
              </Button>
            )}
          </m.div>
        ) : (
          <m.div key="submit" exit={{ opacity: 0 }}>
            <Button variant="primary" onClick={submit} disabled={!canSubmit}>
              Check answer
            </Button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The knowledge check: one question at a time, with an explanation after each. A wrong answer
 * can be retried; any miss means the lesson won't count as perfect.
 */
export function KnowledgeCheck({
  lesson,
  db,
  saved,
  onSave,
  onPassed,
}: {
  lesson: Lesson;
  db: DatabaseData;
  saved: CheckSaved | null;
  onSave: (s: CheckSaved) => void;
  onPassed: (mistakes: number) => void;
}) {
  const [state, setState] = useState<CheckSaved>(saved ?? { index: 0, missed: [], passed: false });
  const [outcome, setOutcome] = useState<Outcome>(state.passed ? "correct" : null);
  const [attempt, setAttempt] = useState(0);
  const { play } = useSound();
  const total = lesson.check.length;
  const index = Math.min(state.index, total - 1);
  const q = lesson.check[index];
  const last = index === total - 1;

  useEffect(() => onSave(state), [state, onSave]);

  const answer = (correct: boolean) => {
    play(correct ? "correct" : "wrong");
    setOutcome(correct ? "correct" : "wrong");
    if (!correct && !state.missed.includes(index)) setState((s) => ({ ...s, missed: [...s.missed, index] }));
    if (correct && last) {
      setState((s) => ({ ...s, passed: true }));
      onPassed(state.missed.length);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2" aria-label={`Question ${index + 1} of ${total}`}>
        {lesson.check.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              i < index || (i === index && outcome === "correct")
                ? state.missed.includes(i)
                  ? "bg-amber-400"
                  : "bg-emerald-400"
                : i === index
                  ? "bg-violet-500"
                  : "bg-ink-200",
            )}
          />
        ))}
        <span className="ml-1 font-mono text-xs font-bold text-ink-500">
          {index + 1}/{total}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={`${index}-${attempt}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
        >
          <Question
            q={q}
            qKey={`${lesson.id}-${index}`}
            lesson={lesson}
            db={db}
            outcome={outcome}
            onAnswer={answer}
            onRetry={() => {
              setOutcome(null);
              setAttempt((a) => a + 1);
            }}
          />
        </m.div>
      </AnimatePresence>

      {outcome === "correct" && !last && (
        <Button
          variant="primary"
          onClick={() => {
            setState((s) => ({ ...s, index: s.index + 1 }));
            setOutcome(null);
          }}
        >
          Next question <ArrowRight aria-hidden />
        </Button>
      )}
    </div>
  );
}
