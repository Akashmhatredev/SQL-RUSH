"use client";

import { m } from "framer-motion";
import { ArrowRight, CircleCheck, CircleX, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { describeAnswer } from "@/lib/validation";
import type { AnswerRecord } from "@/types/game";
import { SqlCode } from "./SqlCode";

function correctAnswerText(record: AnswerRecord): string {
  const { solution } = record;
  return record.question.type === "drag-drop" ? (solution.tokens ?? []).join("\n") : solution.answer;
}

export function FeedbackPanel({
  record,
  onNext,
  nextLabel,
}: {
  record: AnswerRecord;
  onNext: () => void;
  nextLabel: string;
}) {
  const q = record.question;
  const sqlAnswer = q.type === "write-sql" || q.type === "fix-query" || q.type === "drag-drop";
  const choice = q.type === "multiple-choice" || q.type === "predict-output";
  const title = record.revealed
    ? "Answer revealed"
    : record.correct
      ? ["Nailed it!", "Correct!", "Clean query!", "Perfect!"][q.id % 4]
      : record.timedOut
        ? "Time's up!"
        : "Not quite";
  const tone = record.correct ? "success" : record.revealed ? "info" : "error";

  return (
    <m.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={cn(
        "glass-strong rounded-2xl border p-4 sm:p-5",
        tone === "success" && "border-emerald-400/40 shadow-[0_0_40px_-16px_rgba(52,211,153,0.8)]",
        tone === "error" && "border-rose-400/40 shadow-[0_0_40px_-16px_rgba(244,63,94,0.8)]",
        tone === "info" && "border-amber-300/30",
      )}
      aria-live="assertive"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {tone === "success" ? (
            <CircleCheck className="size-7 text-emerald-400" aria-hidden />
          ) : tone === "info" ? (
            <Eye className="size-7 text-amber-300" aria-hidden />
          ) : record.timedOut ? (
            <Clock className="size-7 text-rose-400" aria-hidden />
          ) : (
            <CircleX className="size-7 text-rose-400" aria-hidden />
          )}
          <div>
            <h3
              className={cn(
                "text-lg font-bold",
                tone === "success" ? "text-emerald-300" : tone === "info" ? "text-amber-200" : "text-rose-300",
              )}
            >
              {title}
            </h3>
            {record.correct && record.points > 0 && (
              <p className="text-xs text-slate-400">
                +{record.basePoints}
                {record.combo > 1 && <span className="text-violet-300"> ×{record.combo} combo</span>}
                {record.timeBonus > 0 && <span className="text-sky-300"> +{record.timeBonus} time bonus</span>}
                {record.xp > 0 && <span className="text-amber-200"> · +{record.xp} XP</span>}
              </p>
            )}
          </div>
        </div>
        {record.correct && record.points > 0 && (
          <m.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.1 }}
            className="font-mono text-2xl font-black text-emerald-300"
          >
            +{record.points}
          </m.span>
        )}
      </div>

      {!record.correct && (
        <div className="mt-4 space-y-3">
          {sqlAnswer && !record.revealed && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400">Your answer</p>
              <SqlCode code={describeAnswer(record.answer)} className="border-rose-400/20 text-[13px]" />
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-medium text-slate-400">Correct answer</p>
            {sqlAnswer ? (
              <SqlCode code={correctAnswerText(record)} className="border-emerald-400/30" />
            ) : choice ? (
              <p className="whitespace-pre-wrap rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3 font-mono text-sm text-emerald-100">
                {record.solution.answer}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        <span className="font-semibold text-sky-300">Why: </span>
        {record.solution.explanation}
      </p>

      <div className="mt-4 flex items-center justify-end gap-3">
        <span className="hidden text-xs text-slate-500 sm:inline">
          Press <Kbd>Enter</Kbd>
        </span>
        <Button variant={record.correct ? "success" : "primary"} onClick={onNext} autoFocus>
          {nextLabel} <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </m.section>
  );
}
