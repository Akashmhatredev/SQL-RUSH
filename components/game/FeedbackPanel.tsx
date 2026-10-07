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
        "clay rounded-3xl p-4 sm:p-5",
        tone === "success" &&
          "bg-emerald-50 shadow-[10px_14px_28px_-10px_rgb(16_185_129/0.5),inset_-6px_-8px_14px_rgb(6_95_70/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)] ring-2 ring-emerald-300",
        tone === "error" &&
          "bg-rose-50 shadow-[10px_14px_28px_-10px_rgb(244_63_94/0.45),inset_-6px_-8px_14px_rgb(159_18_57/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)] ring-2 ring-rose-300",
        tone === "info" && "bg-amber-50 ring-2 ring-amber-300",
      )}
      aria-live="assertive"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white shadow-clay-sm">
            {tone === "success" ? (
              <CircleCheck className="size-7 text-emerald-500" aria-hidden />
            ) : tone === "info" ? (
              <Eye className="size-7 text-amber-500" aria-hidden />
            ) : record.timedOut ? (
              <Clock className="size-7 text-rose-500" aria-hidden />
            ) : (
              <CircleX className="size-7 text-rose-500" aria-hidden />
            )}
          </span>
          <div>
            <h3
              className={cn(
                "text-lg font-extrabold",
                tone === "success" ? "text-emerald-700" : tone === "info" ? "text-amber-700" : "text-rose-700",
              )}
            >
              {title}
            </h3>
            {record.correct && record.points > 0 && (
              <p className="text-xs font-semibold text-ink-600">
                +{record.basePoints}
                {record.combo > 1 && <span className="text-violet-700"> ×{record.combo} combo</span>}
                {record.timeBonus > 0 && <span className="text-sky-700"> +{record.timeBonus} time bonus</span>}
                {record.xp > 0 && <span className="text-amber-700"> · +{record.xp} XP</span>}
              </p>
            )}
          </div>
        </div>
        {record.correct && record.points > 0 && (
          <m.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 14, delay: 0.1 }}
            className="font-mono text-2xl font-black text-emerald-600 drop-shadow-[2px_3px_0_rgb(255_255_255)]"
          >
            +{record.points}
          </m.span>
        )}
      </div>

      {!record.correct && (
        <div className="mt-4 space-y-3">
          {sqlAnswer && !record.revealed && (
            <div>
              <p className="mb-1 text-xs font-bold text-ink-600">Your answer</p>
              <SqlCode code={describeAnswer(record.answer)} className="border-rose-200 bg-rose-100/70 text-[13px]" />
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-bold text-ink-600">Correct answer</p>
            {sqlAnswer ? (
              <SqlCode code={correctAnswerText(record)} className="border-emerald-300 bg-emerald-100/70" />
            ) : choice ? (
              <p className="clay-inset whitespace-pre-wrap rounded-2xl border-emerald-300 bg-emerald-100/70 p-3 font-mono text-sm font-semibold text-emerald-800">
                {record.solution.answer}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-ink-700">
        <span className="font-extrabold text-violet-700">Why: </span>
        {record.solution.explanation}
      </p>

      <div className="mt-4 flex items-center justify-end gap-3">
        <span className="hidden text-xs font-semibold text-ink-500 sm:inline">
          Press <Kbd>Enter</Kbd>
        </span>
        <Button variant={record.correct ? "success" : "primary"} onClick={onNext} autoFocus>
          {nextLabel} <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </m.section>
  );
}
