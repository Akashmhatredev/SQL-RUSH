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
              "group relative flex min-h-14 items-start gap-3 rounded-2xl p-3 text-left transition-all duration-150 disabled:cursor-default",
              !revealed &&
                "clay shadow-clay-sm hover:-translate-y-0.5 hover:bg-white hover:shadow-clay active:translate-y-px active:shadow-clay-pressed",
              revealed &&
                isCorrect &&
                "clay bg-emerald-100 shadow-[10px_14px_28px_-10px_rgb(16_185_129/0.5),inset_-6px_-8px_14px_rgb(6_95_70/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)] ring-2 ring-emerald-400",
              revealed &&
                isPicked &&
                !isCorrect &&
                "clay bg-rose-100 shadow-[10px_14px_28px_-10px_rgb(244_63_94/0.45),inset_-6px_-8px_14px_rgb(159_18_57/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)] ring-2 ring-rose-400",
              // Inline opacity from the entry animation would override opacity-* on the button, so dim its content.
              revealed && !isPicked && !isCorrect && "bg-white/40 shadow-clay-pressed [&>*]:opacity-50",
            )}
            aria-label={`Option ${LETTERS[i]}${revealed && isCorrect ? " (correct answer)" : ""}`}
          >
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-xl font-mono text-xs font-extrabold transition-colors",
                !revealed &&
                  "bg-violet-100 text-violet-700 shadow-clay-sm group-hover:bg-violet-500 group-hover:text-white group-hover:shadow-clay-btn",
                revealed && isCorrect && "bg-emerald-500 text-white shadow-clay-btn",
                revealed && isPicked && !isCorrect && "bg-rose-500 text-white shadow-clay-btn",
                revealed && !isPicked && !isCorrect && "bg-white text-ink-500 shadow-clay-sm",
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
                <span className="text-sm font-semibold text-ink-800 sm:text-[15px]">{option}</span>
              )}
            </span>
            <span className="hidden self-center font-mono text-[10px] font-bold text-ink-400 sm:block">{i + 1}</span>
          </m.button>
        );
      })}
    </div>
  );
}
