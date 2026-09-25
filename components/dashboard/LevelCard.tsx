"use client";

import { m } from "framer-motion";
import { useEffect, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { LEVELS, levelProgress } from "@/lib/levels";
import { cn } from "@/lib/utils";

/** Level, animated XP bar and the six-level track. The bar fills from zero on mount. */
export function LevelCard({ xp }: { xp: number }) {
  const lp = levelProgress(xp);
  const [filled, setFilled] = useState(0);
  const shownXp = useCountUp(xp, { from: 0, duration: 1.4 });

  useEffect(() => {
    const id = window.setTimeout(() => setFilled(lp.progress), 150);
    return () => window.clearTimeout(id);
  }, [lp.progress]);

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass relative overflow-hidden rounded-3xl p-5 sm:p-6"
    >
      <div aria-hidden className="absolute -right-10 -top-24 size-64 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-4">
        <m.div
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.1 }}
          className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-400/30 to-violet-500/30 text-4xl ring-1 ring-white/10"
        >
          {lp.level.emoji}
        </m.div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Level {lp.level.index + 1} of {LEVELS.length}
          </p>
          <p className="text-2xl font-bold text-white">{lp.level.name}</p>
          <p className="text-sm text-slate-400">
            <span className="font-mono text-slate-200">{shownXp.toLocaleString()}</span> XP
            {lp.next && ` · ${(lp.next.minXp - xp).toLocaleString()} XP to ${lp.next.name}`}
          </p>
        </div>
      </div>

      <div
        className="relative mt-4 h-3 overflow-hidden rounded-full bg-white/[0.07]"
        role="progressbar"
        aria-label="Level progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(lp.progress * 100)}
      >
        <m.div
          className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500"
          initial={{ width: 0 }}
          animate={{ width: `${filled * 100}%` }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </m.div>
      </div>

      <ol className="relative mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {LEVELS.map((l, i) => {
          const reached = xp >= l.minXp;
          const current = l.index === lp.level.index;
          return (
            <m.li
              key={l.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className={cn(
                "rounded-xl border p-2 text-center text-[11px] transition-colors",
                current
                  ? "border-violet-400/60 bg-violet-400/10 text-white shadow-[0_0_24px_-10px_rgba(167,139,250,0.9)]"
                  : reached
                    ? "border-white/10 text-slate-300"
                    : "border-white/5 text-slate-600",
              )}
            >
              <span className={cn("block text-xl", !reached && "grayscale")}>{l.emoji}</span>
              <span className="block font-semibold">{l.name.replace("SQL ", "")}</span>
              <span className="block font-mono text-[10px] opacity-70">{l.minXp.toLocaleString()} XP</span>
            </m.li>
          );
        })}
      </ol>
    </m.div>
  );
}
