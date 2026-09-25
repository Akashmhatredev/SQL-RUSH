"use client";

import { m } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { looksLikeSql } from "@/lib/sql-highlight";
import { normalizeText } from "@/lib/validation";
import { OutputView } from "./DataTable";
import { SqlCode } from "./SqlCode";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function ChoiceList({
  options,
  selected,
  correctAnswer,
  locked,
  variant,
  onPick,
}: {
  options: string[];
  selected: string | null;
  /** Revealed after answering. */
  correctAnswer: string | null;
  locked: boolean;
  variant: "text" | "output";
  onPick: (option: string) => void;
}) {
  const anySql = variant === "text" && options.some(looksLikeSql);
  const compact = variant === "text" && !anySql && options.every((o) => o.length <= 48);

  return (
    <div className={cn("grid gap-2.5", compact || variant === "output" ? "sm:grid-cols-2" : "grid-cols-1")} role="list">
      {options.map((option, i) => {
        const isCorrect = correctAnswer !== null && normalizeText(option) === normalizeText(correctAnswer);
        const isPicked = selected !== null && normalizeText(option) === normalizeText(selected);
        const revealed = correctAnswer !== null;
        return (
          <m.button
            key={option}
            type="button"
            role="listitem"
            disabled={locked}
            onClick={() => onPick(option)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            whileTap={locked ? undefined : { scale: 0.98 }}
            className={cn(
              "group relative flex min-h-14 items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 disabled:cursor-default",
              !revealed &&
                "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-sky-400/50 hover:bg-sky-400/[0.06]",
              revealed &&
                isCorrect &&
                "border-emerald-400/70 bg-emerald-400/10 shadow-[0_0_24px_-8px_rgba(52,211,153,0.8)]",
              revealed && isPicked && !isCorrect && "border-rose-400/70 bg-rose-500/10",
              revealed && !isPicked && !isCorrect && "border-white/5 bg-white/[0.02] opacity-50",
            )}
            aria-label={`Option ${LETTERS[i]}${revealed && isCorrect ? " (correct answer)" : ""}`}
          >
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-lg border font-mono text-xs font-bold transition-colors",
                !revealed &&
                  "border-white/15 bg-white/5 text-slate-300 group-hover:border-sky-400/60 group-hover:text-sky-200",
                revealed && isCorrect && "border-emerald-300 bg-emerald-400 text-ink-950",
                revealed && isPicked && !isCorrect && "border-rose-300 bg-rose-400 text-ink-950",
                revealed && !isPicked && !isCorrect && "border-white/10 text-slate-500",
              )}
            >
              {revealed && isCorrect ? (
                <Check className="size-4" />
              ) : revealed && isPicked ? (
                <X className="size-4" />
              ) : (
                LETTERS[i]
              )}
            </span>
            <span className="min-w-0 flex-1 self-center">
              {variant === "output" ? (
                <OutputView text={option} />
              ) : looksLikeSql(option) ? (
                <SqlCode
                  code={option}
                  inline
                  className="block whitespace-pre-wrap break-words text-[13px] leading-6 sm:text-sm"
                />
              ) : (
                <span className="text-sm text-slate-100 sm:text-[15px]">{option}</span>
              )}
            </span>
            <span className="hidden self-center font-mono text-[10px] text-slate-600 sm:block">{i + 1}</span>
          </m.button>
        );
      })}
    </div>
  );
}
