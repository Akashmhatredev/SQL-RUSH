"use client";

import { AnimatePresence, m } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { comboMultiplier, nextComboAt } from "@/lib/scoring";

const TIER_STYLE: Record<number, string> = {
  1: "bg-white text-ink-500 shadow-clay-sm",
  2: "bg-sky-100 text-sky-800 shadow-clay-sm ring-2 ring-sky-300",
  3: "bg-violet-200 text-violet-800 shadow-clay-btn ring-2 ring-violet-300",
  5: "bg-gradient-to-r from-fuchsia-200 via-pink-200 to-orange-200 text-fuchsia-800 shadow-clay-btn ring-2 ring-fuchsia-300",
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
        className={cn("flex h-8 items-center gap-1 rounded-full px-3 text-sm font-extrabold", TIER_STYLE[multiplier])}
      >
        <Flame className={cn("size-4", multiplier > 1 && "fill-current")} aria-hidden />
        <span className="tabular-nums">×{multiplier}</span>
      </m.div>
      {next !== null && streak > 0 && (
        <span className="hidden text-xs font-semibold text-ink-500 md:inline">
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
            <p className="text-gradient animate-gradient text-6xl font-black italic tracking-tight drop-shadow-[3px_4px_0_rgb(255_255_255)] sm:text-8xl">
              COMBO ×{multiplier}
            </p>
            <p className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-extrabold uppercase tracking-[0.3em] text-violet-700 shadow-clay-sm">
              {multiplier === 5 ? "Unstoppable!" : multiplier === 3 ? "On fire!" : "Heating up!"}
            </p>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
