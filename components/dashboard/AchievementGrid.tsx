"use client";

import { AnimatePresence, m } from "framer-motion";
import { Lock } from "lucide-react";
import { useState } from "react";
import { AchievementIcon } from "@/components/AchievementIcon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { metricValue, METRICS } from "@/lib/achievements";
import { cn } from "@/lib/utils";
import type { AchievementRow, Profile } from "@/types/database";

type Filter = "all" | "unlocked" | "locked";

export function AchievementGrid({
  achievements,
  unlocked,
  profile,
}: {
  achievements: AchievementRow[];
  unlocked: Record<string, string>;
  profile: Profile;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = achievements.filter((a) =>
    filter === "all" ? true : filter === "unlocked" ? !!unlocked[a.id] : !unlocked[a.id],
  );

  return (
    <>
      <div className="mb-3 flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs sm:w-fit" role="tablist">
        {(["all", "unlocked", "locked"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1 font-medium capitalize transition-colors",
              filter === f ? "bg-white/10 text-white" : "text-slate-400 hover:text-white",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {shown.map((a, i) => {
            const at = unlocked[a.id];
            const value = Math.min(metricValue(profile, a.metric), a.threshold);
            return (
              <m.li
                key={a.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: Math.min(i, 12) * 0.03 }}
                className={cn(
                  "glass flex items-center gap-3 rounded-2xl p-3.5",
                  at ? "border-amber-300/30 shadow-[0_0_30px_-16px_rgba(251,191,36,0.9)]" : "opacity-75",
                )}
              >
                <span
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-xl",
                    at ? "bg-gradient-to-br from-amber-300 to-orange-500 text-ink-950" : "bg-white/5 text-slate-600",
                  )}
                >
                  {at ? (
                    <AchievementIcon name={a.icon} className="size-6" />
                  ) : (
                    <Lock className="size-5" aria-label="Locked" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">{a.title}</span>
                  <span className="block text-xs text-slate-400">{a.description}</span>
                  {at ? (
                    <span className="mt-1 block text-[11px] text-amber-200/80">
                      Unlocked {new Date(at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="mt-1.5 flex items-center gap-2">
                      <ProgressBar value={value / a.threshold} className="h-1.5" label={`${a.title} progress`} />
                      <span className="shrink-0 font-mono text-[10px] text-slate-500" title={METRICS[a.metric].label}>
                        {value.toLocaleString()}/{a.threshold.toLocaleString()}
                      </span>
                    </span>
                  )}
                </span>
              </m.li>
            );
          })}
        </AnimatePresence>
        {shown.length === 0 && (
          <li className="col-span-full py-8 text-center text-sm text-slate-500">Nothing here yet — keep playing!</li>
        )}
      </ul>
    </>
  );
}
