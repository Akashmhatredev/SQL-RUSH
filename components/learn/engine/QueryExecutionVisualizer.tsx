"use client";

import { AnimatePresence, LayoutGroup, m, MotionConfig } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { runSql } from "@/lib/learn/sql/engine";
import { SqlError } from "@/lib/learn/sql/errors";
import type { ColumnDef, DatabaseData, Relation, StatementRun } from "@/lib/learn/sql/types";
import { buildSteps } from "@/lib/learn/steps";
import type { Narration } from "@/lib/learn/types";
import { cn } from "@/lib/utils";
import { AnimationControls } from "./AnimationControls";
import { CLAUSE_LABELS, defaultClauseMeaning, SQLCodeHighlighter } from "./SQLCodeHighlighter";
import { StageView, type DefsFor } from "./StageView";
import { AnimationSpeedContext } from "./timing";
import { useStepPlayer } from "./useStepPlayer";

const JOIN_PATTERN =
  /\b(INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|JOIN)\b/i;

/** Column metadata (primary / foreign keys) for a relation, looked up through the query's table aliases. */
function makeDefsFor(db: DatabaseData, run: StatementRun | null): DefsFor {
  const aliases = new Map<string, string>();
  for (const s of run?.trace ?? []) {
    if (s.kind === "source") aliases.set(s.alias, s.table.toLowerCase());
    if (s.kind === "join") {
      const alias = s.right.columns[0]?.table;
      if (alias) aliases.set(alias, s.rightName.toLowerCase());
    }
  }
  return (rel: Relation) =>
    rel.columns.map((c): ColumnDef | undefined => {
      const table = c.table ? (db[aliases.get(c.table) ?? c.table.toLowerCase()] ?? null) : null;
      return table?.columns.find((d) => d.name === c.name);
    });
}

export interface QueryExecutionVisualizerProps {
  sql: string;
  db: DatabaseData;
  /** Show the SQL with clause-by-clause highlighting. Off = visual only, with plain-language narration. */
  showSql?: boolean;
  narration?: Narration;
  /** Offer buttons that re-run the query as another join type. */
  joinTypes?: string[];
  autoPlay?: boolean;
  className?: string;
  /** Which statement of a multi-statement script to animate (defaults to the last). */
  statement?: number;
  /**
   * List what each clause means under the SQL (keyed by clause kind, e.g. "where"); tapping one
   * jumps the animation to it. Pass {} to use the default meanings.
   */
  clauseNotes?: Partial<Record<string, string>>;
}

/**
 * The visual engine's main component: runs a query on sample data and plays back what the
 * database did, step by step, with narration, playback controls and (optionally) the SQL
 * highlighted in sync. Every SQL concept in the course goes through this one component.
 */
export function QueryExecutionVisualizer({
  sql,
  db,
  showSql = false,
  narration,
  joinTypes,
  autoPlay = false,
  className,
  statement,
  clauseNotes,
}: QueryExecutionVisualizerProps) {
  const scope = useId().replace(/:/g, "");
  const [joinType, setJoinType] = useState<string | null>(null);
  const activeSql = joinType ? sql.replace(JOIN_PATTERN, joinType) : sql;

  const { run, error } = useMemo(() => {
    try {
      const result = runSql(activeSql, db);
      return { run: result.runs[statement ?? result.runs.length - 1] ?? null, error: null };
    } catch (e) {
      return { run: null, error: e instanceof SqlError ? e : new SqlError(e instanceof Error ? e.message : String(e)) };
    }
  }, [activeSql, db, statement]);

  const steps = useMemo(() => (run ? buildSteps(run, narration, { plain: !showSql }) : []), [run, narration, showSql]);
  const durations = useMemo(() => steps.map((s) => s.duration), [steps]);
  const player = useStepPlayer(durations, { autoPlay, resetKey: activeSql });
  const defsFor = useMemo(() => makeDefsFor(db, run), [db, run]);
  const step = steps[player.index];

  if (error || !run || !step) {
    return (
      <div className={cn("clay rounded-3xl p-4 text-sm text-rose-800", className)} role="alert">
        <p className="flex items-center gap-2 font-bold">
          <TriangleAlert className="size-4" aria-hidden /> This query can&apos;t run
        </p>
        <p className="mt-1">{error?.message ?? "There is nothing to show."}</p>
      </div>
    );
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, [role='button'][aria-pressed]")) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      player.toggle();
    } else if (e.key === "ArrowRight") player.next();
    else if (e.key === "ArrowLeft") player.prev();
    else if (e.key === "Home") player.reset();
    else if (e.key === "End") player.skip();
  };

  const firstStepOf = (clauseId: string) => steps.findIndex((s) => s.clauseId === clauseId);

  return (
    <AnimationSpeedContext.Provider value={player.speed}>
      <MotionConfig reducedMotion="user">
        <section
          className={cn("clay relative min-w-0 rounded-[1.75rem] p-3 sm:p-4", className)}
          aria-label="Query animation"
          onKeyDown={onKeyDown}
        >
          {joinTypes && joinTypes.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Join type">
              <span className="mr-1 text-xs font-bold uppercase tracking-wider text-ink-500">Join type</span>
              {joinTypes.map((jt) => {
                const current =
                  (joinType ?? (sql.match(JOIN_PATTERN)?.[0] ?? "").replace(/\s+/g, " ").toUpperCase()) === jt;
                return (
                  <button
                    key={jt}
                    type="button"
                    role="radio"
                    aria-checked={current}
                    onClick={() => setJoinType(jt)}
                    className={cn(
                      "rounded-full px-3 py-1 font-mono text-xs font-bold transition-all",
                      current
                        ? "bg-violet-600 text-white shadow-clay-btn"
                        : "bg-white/70 text-ink-700 shadow-clay-sm hover:-translate-y-px",
                    )}
                  >
                    {jt}
                  </button>
                );
              })}
            </div>
          )}

          {showSql && (
            <SQLCodeHighlighter
              sql={activeSql}
              clauses={run.clauses}
              activeClauseId={step.clauseId}
              onSelect={(id) => {
                const i = firstStepOf(id);
                if (i >= 0) player.goTo(i);
              }}
              className="mb-3"
            />
          )}

          {showSql && clauseNotes && (
            <ul className="mb-3 grid gap-1.5" aria-label="What each part of the query does">
              {run.clauses.map((c) => {
                const active = step.clauseId === c.id;
                const i = firstStepOf(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => i >= 0 && player.goTo(i)}
                      disabled={i < 0}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-2xl px-3 py-2 text-left text-sm transition-all",
                        active ? "bg-amber-100 shadow-clay-sm ring-2 ring-amber-300" : "bg-white/60 hover:bg-white",
                      )}
                    >
                      <span className="mt-0.5 shrink-0 rounded-lg bg-violet-100 px-1.5 py-0.5 font-mono text-[11px] font-black text-violet-800">
                        {CLAUSE_LABELS[c.kind] ?? c.kind}
                      </span>
                      <span className="font-semibold text-ink-700">
                        {clauseNotes[c.kind] ?? defaultClauseMeaning(c, activeSql)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div
            className="mb-3 flex items-start gap-3 rounded-2xl bg-violet-50/80 p-3 shadow-[inset_0_0_0_1.5px_rgb(139_108_255/0.18)]"
            aria-live="polite"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-violet-600 font-mono text-sm font-black text-white shadow-clay-btn">
              {player.index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
                {step.context ? `${step.context} · ` : ""}
                {step.title}
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <m.p
                  key={step.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-semibold leading-snug text-ink-800 sm:text-[15px]"
                >
                  {step.narration}
                </m.p>
              </AnimatePresence>
            </div>
          </div>

          {run.warnings.length > 0 && (
            <p className="mb-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-2.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
              <TriangleAlert className="mt-px size-4 shrink-0 text-amber-600" aria-hidden />
              {run.warnings[0].message}
            </p>
          )}

          <LayoutGroup id={scope}>
            <div className="min-h-40">
              <StageView
                key={step.context ? `${step.context}:${step.stage.kind}` : String(run.trace.indexOf(step.stage))}
                step={step}
                scope={scope}
                defsFor={defsFor}
              />
            </div>
          </LayoutGroup>

          <AnimationControls
            player={player}
            titles={steps.map((s) => s.title)}
            className="mt-3 border-t border-ink-100 pt-3"
          />
        </section>
      </MotionConfig>
    </AnimationSpeedContext.Provider>
  );
}
