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
      <div className="clay-inset mb-4 flex gap-1 rounded-2xl p-1.5 text-xs sm:w-fit" role="tablist">
        {(["all", "unlocked", "locked"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 rounded-xl px-3.5 py-1.5 font-bold capitalize transition-all",
              filter === f ? "bg-white text-ink-900 shadow-clay-sm" : "text-ink-600 hover:text-ink-900",
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
                  "flex items-center gap-3 rounded-3xl p-3.5 transition-transform",
                  at
                    ? "clay bg-amber-50 shadow-[10px_14px_28px_-10px_rgb(245_158_11/0.45),inset_-6px_-8px_14px_rgb(146_64_14/0.08),inset_6px_8px_14px_rgb(255_255_255/0.9)] ring-2 ring-amber-200 hover:-translate-y-0.5"
                    : "bg-white/45 shadow-clay-pressed",
                )}
              >
                <span
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-2xl",
                    at
                      ? "bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-clay-btn"
                      : "clay-inset text-ink-400",
                  )}
                >
                  {at ? (
                    <AchievementIcon name={a.icon} className="size-6" />
                  ) : (
                    <Lock className="size-5" aria-label="Locked" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block font-extrabold", at ? "text-ink-900" : "text-ink-700")}>{a.title}</span>
                  <span className="block text-xs text-ink-600">{a.description}</span>
                  {at ? (
                    <span className="mt-1 block text-[11px] font-bold text-amber-700">
                      Unlocked {new Date(at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="mt-1.5 flex items-center gap-2">
                      <ProgressBar value={value / a.threshold} className="h-1.5" label={`${a.title} progress`} />
                      <span
                        className="shrink-0 font-mono text-[10px] font-semibold text-ink-500"
                        title={METRICS[a.metric].label}
                      >
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
          <li className="col-span-full py-8 text-center text-sm font-semibold text-ink-500">
            Nothing here yet — keep playing!
          </li>
        )}
      </ul>
    </>
  );
}
