"use client";

import { m } from "framer-motion";
import { ChevronDown, CircleCheck, CircleX, Clock, Eye } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { describeAnswer } from "@/lib/validation";
import type { AnswerRecord } from "@/types/game";
import { DataTable } from "./DataTable";
import { QuestionMeta } from "./QuestionView";
import { SqlCode } from "./SqlCode";

type Filter = "all" | "wrong" | "correct";

function ReviewItem({ record, index }: { record: AnswerRecord; index: number }) {
  const [open, setOpen] = useState(!record.correct);
  const q = record.question;
  const sql = q.type === "write-sql" || q.type === "fix-query" || q.type === "drag-drop";
  const { solution } = record;
  const correct = q.type === "drag-drop" ? (solution.tokens ?? []).join("\n") : solution.answer;

  return (
    <li className={cn("glass rounded-2xl", record.correct ? "border-emerald-400/20" : "border-rose-400/20")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span className="mt-0.5 shrink-0">
          {record.correct ? (
            <CircleCheck className="size-5 text-emerald-400" aria-label="Correct" />
          ) : record.revealed ? (
            <Eye className="size-5 text-amber-300" aria-label="Revealed" />
          ) : record.timedOut ? (
            <Clock className="size-5 text-rose-400" aria-label="Timed out" />
          ) : (
            <CircleX className="size-5 text-rose-400" aria-label="Wrong" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1 block text-[11px] font-mono text-slate-500">
            Q{index + 1} · {record.secondsTaken.toFixed(1)}s{record.points > 0 && ` · +${record.points}`}
          </span>
          <span className="block text-sm font-medium text-slate-100">{q.question}</span>
        </span>
        <ChevronDown
          className={cn("mt-1 size-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-white/5 px-4 pb-4 pt-3">
          <QuestionMeta question={q} />
          {q.query && (q.type === "predict-output" || q.type === "fix-query" || q.type === "multiple-choice") && (
            <div>
              <p className="mb-1 text-xs text-slate-500">{q.type === "fix-query" ? "Broken query" : "Query"}</p>
              <SqlCode code={q.query} />
            </div>
          )}
          {q.sampleTables && (
            <div className="grid gap-3 sm:grid-cols-2">
              {q.sampleTables.map((t) => (
                <DataTable key={t.name} table={t} />
              ))}
            </div>
          )}
          {!record.correct && !record.revealed && (
            <div>
              <p className="mb-1 text-xs text-slate-500">Your answer</p>
              {sql ? (
                <SqlCode code={describeAnswer(record.answer)} className="border-rose-400/20" />
              ) : (
                <p className="whitespace-pre-wrap rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 font-mono text-sm text-rose-100">
                  {describeAnswer(record.answer)}
                </p>
              )}
            </div>
          )}
          <div>
            <p className="mb-1 text-xs text-slate-500">Correct answer</p>
            {sql ? (
              <SqlCode code={correct} className="border-emerald-400/30" />
            ) : (
              <p className="whitespace-pre-wrap rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3 font-mono text-sm text-emerald-100">
                {correct}
              </p>
            )}
          </div>
          {solution.alternatives.length > 0 && (
            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer select-none">Also accepted ({solution.alternatives.length})</summary>
              <div className="mt-2 space-y-2">
                {solution.alternatives.map((alt) => (
                  <SqlCode key={alt} code={alt} className="text-xs" />
                ))}
              </div>
            </details>
          )}
          <p className="text-sm leading-relaxed text-slate-300">
            <span className="font-semibold text-sky-300">Why: </span>
            {solution.explanation}
          </p>
        </div>
      )}
    </li>
  );
}

export function ReviewList({ history }: { history: AnswerRecord[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const counts = {
    all: history.length,
    wrong: history.filter((h) => !h.correct).length,
    correct: history.filter((h) => h.correct).length,
  };
  const shown = history
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => filter === "all" || (filter === "wrong" ? !record.correct : record.correct));

  return (
    <m.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6"
      aria-label="Question review"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-white">Question review</h2>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs" role="tablist">
          {(["all", "wrong", "correct"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium capitalize transition-colors",
                filter === f ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
              )}
            >
              {f} <span className="text-slate-500">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-2.5">
        {shown.map(({ record, index }) => (
          <ReviewItem key={record.question.uid + index} record={record} index={index} />
        ))}
        {shown.length === 0 && <li className="py-8 text-center text-sm text-slate-500">Nothing here.</li>}
      </ul>
    </m.section>
  );
}
