"use client";

import { AnimatePresence, m } from "framer-motion";
import { Eye, Lightbulb, Play, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SqlEditor } from "@/components/game/SqlEditor";
import { DatabaseVisualizer } from "@/components/learn/engine/DatabaseVisualizer";
import { QueryExecutionVisualizer } from "@/components/learn/engine/QueryExecutionVisualizer";
import { RelationTable, TableChip } from "@/components/learn/engine/RelationTable";
import { InlineText, RichText } from "@/components/learn/engine/RichText";
import { TableVisualizer, type TableEvent } from "@/components/learn/engine/TableVisualizer";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { runSql } from "@/lib/learn/sql/engine";
import { SqlError } from "@/lib/learn/sql/errors";
import type { CellValue, DatabaseData } from "@/lib/learn/sql/types";
import { formatCell } from "@/lib/learn/sql/values";
import type {
  AnimateStep,
  ConceptStep,
  DatabaseStep,
  ExploreStep,
  ExploreTask,
  Lesson,
  LessonStep,
  PlaygroundStep,
  PredictStep,
  StoryStep,
  SyntaxStep,
} from "@/lib/learn/types";
import { cn } from "@/lib/utils";
import { BeforeAfter, lessonDb, SqlErrorView, sourceRows, tableRelation, TaskChecklist } from "./shared";

export interface StepViewProps<S extends LessonStep> {
  step: S;
  lesson: Lesson;
  db: DatabaseData;
  saved: Record<string, unknown> | undefined;
  onSave: (value: Record<string, unknown>) => void;
  /** Tell the player whether Continue can be pressed yet. */
  onReady: (ready: boolean) => void;
}

const tableOf = (lesson: Lesson, name: string) =>
  lesson.tables.find((t) => t.name.toLowerCase() === name.toLowerCase())!;

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

export function StoryStepView({ step, lesson, saved, onSave, onReady }: StepViewProps<StoryStep>) {
  const [revealed, setRevealed] = useState(saved?.revealed === true);
  useEffect(() => onReady(true), [onReady]);
  const paper = step.paper ? tableOf(lesson, step.paper) : null;

  return (
    <div className="space-y-4">
      {step.cards && (
        <ul className="grid gap-2.5 sm:grid-cols-3">
          {step.cards.map((c, i) => (
            <m.li
              key={c.label}
              initial={{ opacity: 0, y: 12, rotate: i % 2 ? 1.5 : -1.5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              className="clay rounded-3xl p-4"
            >
              <span className="text-3xl" aria-hidden>
                {c.emoji}
              </span>
              <p className="mt-1 font-extrabold text-ink-900">{c.label}</p>
              {c.text && (
                <p className="mt-0.5 text-sm text-ink-600">
                  <InlineText text={c.text} />
                </p>
              )}
            </m.li>
          ))}
        </ul>
      )}

      {paper && (
        <figure className="relative mx-auto max-w-xl rotate-[-0.6deg] rounded-2xl bg-[#fffdf3] p-4 shadow-[8px_12px_24px_-10px_rgb(80_60_40/0.35)] ring-1 ring-amber-900/10 sm:p-5">
          <figcaption className="mb-2 font-serif text-lg font-bold italic text-amber-950/80">
            {paper.description ?? paper.name}
          </figcaption>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-serif text-[15px] text-amber-950">
              <thead>
                <tr>
                  {paper.columns.map((c) => (
                    <th
                      key={c.name}
                      className="border-b-2 border-amber-900/25 px-2 py-1 text-left font-semibold capitalize"
                    >
                      {c.name.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paper.rows.map((r, i) => (
                  <tr
                    key={i}
                    className="bg-[repeating-linear-gradient(transparent_0_31px,rgb(147_197_253/0.5)_31px_32px)]"
                  >
                    {r.map((v, j) => (
                      <td key={j} className="border-b border-sky-300/50 px-2 py-1">
                        {v === null ? "—" : formatCell(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span aria-hidden className="absolute -left-2 top-6 h-[70%] w-1 rounded-full bg-rose-300/70" />
        </figure>
      )}

      {step.think && (
        <div className="clay rounded-3xl p-4">
          <p className="flex items-start gap-2 font-extrabold text-ink-900">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden />
            <InlineText text={step.think.question} />
          </p>
          <AnimatePresence initial={false} mode="wait">
            {revealed ? (
              <m.div key="a" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 pl-7">
                <RichText text={step.think.answer} />
              </m.div>
            ) : (
              <m.div key="q" exit={{ opacity: 0 }} className="mt-3 pl-7">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setRevealed(true);
                    onSave({ revealed: true });
                  }}
                >
                  <Eye aria-hidden /> Think about it, then reveal
                </Button>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Explore
// ---------------------------------------------------------------------------

function taskMatches(task: ExploreTask, e: TableEvent, columns: string[]): boolean {
  const valueOf = (row: CellValue[], col: string) => row[columns.indexOf(col)];
  switch (task.type) {
    case "click-row":
      return e.type === "click-row" && (!task.match || valueOf(e.row, task.match.column) === task.match.value);
    case "click-column":
      return e.type === "click-column" && (!task.column || e.column === task.column);
    case "hover-cell":
      return (
        e.type === "hover-cell" &&
        (!task.match ||
          (e.column === task.match.column && valueOf(e.row, task.match.row.column) === task.match.row.value))
      );
    case "select-rows":
      return e.type === "select-rows" && e.count >= task.count;
    case "add-row":
      return e.type === "add-row";
    case "edit-cell":
      return e.type === "edit-cell" && (!task.column || e.column === task.column);
    case "delete-row":
      return e.type === "delete-row";
    case "sort":
      return e.type === "sort" && (!task.column || e.column === task.column);
    case "reset":
      return e.type === "reset";
  }
}

function useTasks(
  count: number,
  saved: unknown,
  onSave: (v: Record<string, unknown>) => void,
  onReady: (r: boolean) => void,
) {
  const initial =
    Array.isArray(saved) && saved.length === count ? (saved as boolean[]) : Array<boolean>(count).fill(false);
  const [done, setDone] = useState<boolean[]>(initial);
  const doneRef = useRef(done);
  const [skipped, setSkipped] = useState(false);
  const all = done.every(Boolean);
  useEffect(() => onReady(all || skipped), [all, skipped, onReady]);
  const mark = (i: number) => {
    if (doneRef.current[i]) return;
    const next = doneRef.current.map((x, j) => (j === i ? true : x));
    doneRef.current = next;
    setDone(next);
    onSave({ done: next });
  };
  return { done, mark, all, skip: () => setSkipped(true), skipped };
}

function SkipTasks({ all, skipped, onSkip }: { all: boolean; skipped: boolean; onSkip: () => void }) {
  if (all || skipped) return null;
  return (
    <button
      type="button"
      onClick={onSkip}
      className="text-xs font-bold text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline"
    >
      Skip the tasks
    </button>
  );
}

export function ExploreStepView({ step, lesson, saved, onSave, onReady }: StepViewProps<ExploreStep>) {
  const table = tableOf(lesson, step.table);
  const tasks = step.tasks ?? [];
  const t = useTasks(tasks.length, saved?.done, onSave, onReady);
  const columns = table.columns.map((c) => c.name);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_17rem]">
      <TableVisualizer
        table={table}
        editable={step.editable}
        multiSelect={tasks.some((x) => x.type === "select-rows")}
        onEvent={(e) => tasks.forEach((task, i) => taskMatches(task, e, columns) && t.mark(i))}
      />
      <div className="space-y-2 lg:sticky lg:top-24">
        <TaskChecklist tasks={tasks.map((x) => x.prompt)} done={t.done} />
        <SkipTasks all={t.all} skipped={t.skipped} onSkip={t.skip} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export function DatabaseStepView({ step, lesson, saved, onSave, onReady }: StepViewProps<DatabaseStep>) {
  const tables = step.tables.map((n) => tableOf(lesson, n));
  const tasks = step.tasks ?? [];
  const t = useTasks(tasks.length, saved?.done, onSave, onReady);
  return (
    <div className="space-y-3">
      {tasks.length > 0 && (
        <div className="space-y-2">
          <TaskChecklist tasks={tasks.map((x) => x.prompt)} done={t.done} />
          <SkipTasks all={t.all} skipped={t.skipped} onSkip={t.skip} />
        </div>
      )}
      <DatabaseVisualizer
        tables={tables}
        onOpenTable={(name) =>
          tasks.forEach((task, i) => task.type === "open-table" && (!task.table || task.table === name) && t.mark(i))
        }
        onFindLink={() => tasks.forEach((task, i) => task.type === "find-link" && t.mark(i))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Predict
// ---------------------------------------------------------------------------

export function PredictStepView({ step, lesson, db, saved, onSave, onReady }: StepViewProps<PredictStep>) {
  const table = tableOf(lesson, step.table);
  const expected = useMemo(() => sourceRows(runSql(step.query, db).runs.at(-1)!.result!), [step.query, db]);
  const [selected, setSelected] = useState<Set<number>>(new Set((saved?.selected as number[]) ?? []));
  const [checked, setChecked] = useState(saved?.checked === true);
  useEffect(() => onReady(checked), [checked, onReady]);

  const right = [...selected].filter((i) => expected.has(i)).length;
  const wrong = [...selected].filter((i) => !expected.has(i)).length;
  const missed = [...expected].filter((i) => !selected.has(i)).length;
  const perfect = checked && wrong === 0 && missed === 0;

  const toggle = (i: number) => {
    if (checked) return;
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
    onSave({ selected: [...next], checked: false });
  };

  return (
    <div className="space-y-3">
      <p className="clay rounded-3xl p-4 text-base font-extrabold text-ink-900">
        <InlineText text={step.prompt} />
      </p>
      <RelationTable
        relation={tableRelation(table)}
        scope={`predict-${table.name}`}
        ariaLabel={`${table.name}: tap the rows you predict`}
        caption={<TableChip name={table.name} tone="sky" />}
        defs={table.columns}
        onRowClick={toggle}
        selectedRows={selected}
        rowTone={(i) =>
          !checked
            ? selected.has(i)
              ? "selected"
              : null
            : selected.has(i)
              ? expected.has(i)
                ? "pass"
                : "wrong"
              : expected.has(i)
                ? "missed"
                : "dim"
        }
      />
      {!checked ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              setChecked(true);
              onSave({ selected: [...selected], checked: true });
            }}
            disabled={selected.size === 0}
          >
            Check my prediction
          </Button>
          <span className="text-sm font-semibold text-ink-500">{selected.size} selected</span>
        </div>
      ) : (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-3xl p-4 ring-2",
            perfect ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200",
          )}
        >
          <p className="font-extrabold text-ink-900">
            {perfect ? "Spot on! " : `You got ${right} of ${expected.size} right. `}
            {!perfect && (
              <span className="font-semibold text-ink-600">
                {wrong > 0 && `${wrong} picked by mistake (red). `}
                {missed > 0 && `${missed} missed (dashed). `}
              </span>
            )}
          </p>
          <RichText text={step.explain} className="mt-1 text-sm sm:text-[15px]" />
          {!perfect && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => {
                setChecked(false);
                onSave({ selected: [...selected], checked: false });
              }}
            >
              <RotateCcw aria-hidden /> Try again
            </Button>
          )}
        </m.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animate, concept, syntax
// ---------------------------------------------------------------------------

export function AnimateStepView({ step, db, onReady }: StepViewProps<AnimateStep>) {
  useEffect(() => onReady(true), [onReady]);
  return (
    <QueryExecutionVisualizer
      sql={step.query}
      db={db}
      showSql={step.showSql}
      narration={step.narration}
      joinTypes={step.joinTypes}
    />
  );
}

export function ConceptStepView({ step, lesson, db, onReady }: StepViewProps<ConceptStep>) {
  useEffect(() => onReady(true), [onReady]);
  const compare = useMemo(() => {
    if (!step.compare) return null;
    const before = tableOf(lesson, step.compare.before.table);
    const after = runSql(step.compare.after.query, db).runs.at(-1)!.result!;
    return { before: tableRelation(before), after };
  }, [step.compare, lesson, db]);

  return (
    <div className="space-y-4">
      {step.points && (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {step.points.map((p, i) => (
            <m.li
              key={p.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              className="clay flex gap-3 rounded-3xl p-4"
            >
              <span
                className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-2xl shadow-clay-sm"
                aria-hidden
              >
                {p.emoji}
              </span>
              <span className="min-w-0">
                <span className="block font-extrabold text-ink-900">{p.title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-ink-600">
                  <InlineText text={p.text} />
                </span>
              </span>
            </m.li>
          ))}
        </ul>
      )}
      {compare && step.compare && (
        <BeforeAfter
          before={compare.before}
          after={compare.after}
          beforeLabel={step.compare.before.label}
          afterLabel={step.compare.after.label}
        />
      )}
    </div>
  );
}

export function SyntaxStepView({ step, db, onReady }: StepViewProps<SyntaxStep>) {
  useEffect(() => onReady(true), [onReady]);
  return (
    <QueryExecutionVisualizer
      sql={step.query}
      db={db}
      showSql
      narration={step.narration}
      clauseNotes={step.explain ?? {}}
    />
  );
}

// ---------------------------------------------------------------------------
// Playground
// ---------------------------------------------------------------------------

/** Free practice: run any query, watch it, and keep changes until Reset. */
export function SqlPlayground({
  lesson,
  starter,
  suggestions,
  tableNames,
  saved,
  onSave,
}: {
  lesson: Lesson;
  starter: string;
  suggestions?: string[];
  tableNames?: string[];
  saved?: Record<string, unknown>;
  onSave?: (v: Record<string, unknown>) => void;
}) {
  const initialDb = useMemo(() => lessonDb(lesson.tables), [lesson.tables]);
  const [sql, setSql] = useState(typeof saved?.sql === "string" ? (saved.sql as string) : starter);
  const [data, setData] = useState<DatabaseData>(initialDb);
  const [shown, setShown] = useState<{ sql: string; db: DatabaseData; n: number } | null>(null);
  const [error, setError] = useState<{ error: SqlError; sql: string } | null>(null);
  const runs = useRef(0);
  const tables = (tableNames ?? lesson.tables.map((t) => t.name)).map((n) => tableOf(lesson, n));
  const changed = data !== initialDb;

  const run = (text = sql) => {
    try {
      const result = runSql(text, data);
      setError(null);
      setShown({ sql: text, db: data, n: ++runs.current });
      setData(result.db);
    } catch (e) {
      setShown(null);
      setError({ error: e instanceof SqlError ? e : new SqlError(String(e)), sql: text });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tables.map((t) => (
          <span key={t.name} className="clay-inset rounded-2xl px-3 py-1.5 font-mono text-xs text-ink-600">
            <span className="font-bold text-sky-700">{t.name}</span> ({t.columns.map((c) => c.name).join(", ")})
          </span>
        ))}
      </div>
      <SqlEditor
        value={sql}
        onChange={(v) => {
          setSql(v);
          onSave?.({ sql: v });
        }}
        onSubmit={() => run()}
        label="Your SQL query"
        placeholder="SELECT * FROM …"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={() => run()}>
          <Play aria-hidden className="fill-current" /> Run{" "}
          <Kbd className="hidden border-white/40 bg-white/20 text-white sm:inline-flex">⌘ Enter</Kbd>
        </Button>
        {changed && (
          <Button
            variant="ghost"
            onClick={() => {
              setData(initialDb);
              setShown(null);
            }}
          >
            <RotateCcw aria-hidden /> Reset the data
          </Button>
        )}
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-ink-500">
            <Sparkles className="size-3.5 text-violet-500" aria-hidden /> Try
          </span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSql(s);
                onSave?.({ sql: s });
                run(s);
              }}
              className="rounded-full bg-white/80 px-3 py-1 text-left font-mono text-xs text-ink-700 shadow-clay-sm transition-all hover:-translate-y-px hover:bg-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {error && <SqlErrorView error={error.error} sql={error.sql} />}
      {shown && <QueryExecutionVisualizer key={shown.n} sql={shown.sql} db={shown.db} showSql autoPlay />}
    </div>
  );
}

export function PlaygroundStepView({ step, lesson, saved, onSave, onReady }: StepViewProps<PlaygroundStep>) {
  useEffect(() => onReady(true), [onReady]);
  return (
    <SqlPlayground
      lesson={lesson}
      starter={step.starter}
      suggestions={step.suggestions}
      tableNames={step.tables}
      saved={saved}
      onSave={onSave}
    />
  );
}

/** Renders whichever kind of step this is. */
export function LessonStepView(props: StepViewProps<LessonStep>) {
  const { step } = props;
  switch (step.kind) {
    case "story":
      return <StoryStepView {...props} step={step} />;
    case "explore":
      return <ExploreStepView {...props} step={step} />;
    case "database":
      return <DatabaseStepView {...props} step={step} />;
    case "predict":
      return <PredictStepView {...props} step={step} />;
    case "animate":
      return <AnimateStepView {...props} step={step} />;
    case "concept":
      return <ConceptStepView {...props} step={step} />;
    case "syntax":
      return <SyntaxStepView {...props} step={step} />;
    case "playground":
      return <PlaygroundStepView {...props} step={step} />;
  }
}
