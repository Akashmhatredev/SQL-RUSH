"use client";

import { AnimatePresence, m } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { comboMultiplier, nextComboAt } from "@/lib/scoring";

const TIER_STYLE: Record<number, string> = {
  1: "border-white/10 bg-white/[0.04] text-slate-400",
  2: "border-sky-400/50 bg-sky-400/15 text-sky-200 shadow-[0_0_20px_-6px_rgba(56,189,248,0.9)]",
  3: "border-violet-400/60 bg-violet-400/15 text-violet-200 shadow-[0_0_24px_-6px_rgba(167,139,250,0.9)]",
  5: "border-fuchsia-400/70 bg-gradient-to-r from-fuchsia-500/25 to-orange-400/25 text-orange-100 shadow-[0_0_30px_-4px_rgba(244,114,182,0.9)]",
};

export function ComboMeter({ streak }: { streak: number }) {
  const multiplier = comboMultiplier(streak);
  const next = nextComboAt(streak);
  return (
    <div className="flex items-center gap-2" aria-label={`Streak ${streak}, combo times ${multiplier}`}>
      <m.div
        key={multiplier}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
        className={cn(
          "flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm font-bold",
          TIER_STYLE[multiplier],
        )}
      >
        <Flame className={cn("size-4", multiplier > 1 && "fill-current")} aria-hidden />
        <span className="tabular-nums">×{multiplier}</span>
      </m.div>
      {next !== null && streak > 0 && (
        <span className="hidden text-xs text-slate-500 md:inline">
          {next - streak} more for ×{comboMultiplier(next)}
        </span>
      )}
    </div>
  );
}

/** Big centre-screen burst when the combo tier goes up. */
export function ComboBurst({ multiplier, show }: { multiplier: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <m.div
          key={multiplier}
          className="pointer-events-none fixed inset-0 z-40 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <m.div
            initial={{ scale: 0.3, rotate: -8, opacity: 0 }}
            animate={{ scale: [0.3, 1.25, 1], rotate: [-8, 4, 0], opacity: 1 }}
            exit={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-center"
          >
            <p className="text-gradient animate-gradient text-6xl font-black italic tracking-tight drop-shadow-[0_0_30px_rgba(168,85,247,0.8)] sm:text-8xl">
              COMBO ×{multiplier}
            </p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.3em] text-white/80">
              {multiplier === 5 ? "Unstoppable!" : multiplier === 3 ? "On fire!" : "Heating up!"}
            </p>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
