"use client";

import { Flame, Target } from "lucide-react";
import { useState } from "react";
import { useLearn } from "@/components/learn/LearnProvider";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useCountUp } from "@/hooks/useCountUp";
import { DAILY_GOALS, learnLevelProgress } from "@/lib/learn/rules";
import { cn } from "@/lib/utils";

/** A ring that fills as today's lessons add up to the daily goal. */
export function GoalRing({ value, goal, size = 64 }: { value: number; goal: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(1, goal ? value / goal : 0);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={7} className="stroke-ink-100" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ratio)}
        className={cn(
          "transition-[stroke-dashoffset] duration-1000 ease-out",
          ratio >= 1 ? "stroke-emerald-500" : "stroke-violet-500",
        )}
      />
    </svg>
  );
}

/** Level, XP to the next level, streak and today's goal (which the learner can change). */
export function LearnerSummary({ className }: { className?: string }) {
  const { state, setGoal } = useLearn();
  const [picking, setPicking] = useState(false);
  const xp = state?.xp ?? 0;
  const shownXp = useCountUp(xp);
  const lp = learnLevelProgress(xp);
  const goal = state?.dailyGoal ?? 1;
  const today = state?.todayLessons ?? 0;
  const met = state?.goalMetToday || today >= goal;
  const streak = state?.streak ?? 0;

  return (
    <div className={cn("clay relative overflow-hidden rounded-[2rem] p-5 sm:p-6", className)}>
      <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-violet-300/40 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-amber-100 to-violet-200 text-4xl shadow-clay-btn">
          {lp.level.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
            Learning level {lp.level.index + 1} of 6
          </p>
          <p className="truncate text-xl font-extrabold text-ink-900">{lp.level.name}</p>
          <ProgressBar value={lp.progress} shimmer className="mt-2 h-2.5" label="Progress to the next learning level" />
          <p className="mt-1 text-xs text-ink-500">
            <span className="font-mono font-semibold text-ink-800">{shownXp.toLocaleString()}</span> XP
            {lp.next ? ` · ${lp.xpToNext.toLocaleString()} to ${lp.next.name}` : " · top level reached"}
          </p>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-2.5">
        <div className="rounded-3xl bg-orange-100 p-3 shadow-clay-sm">
          <div className="flex items-center gap-2">
            <Flame
              className={cn("size-7", streak > 0 ? "fill-orange-400 text-orange-500" : "text-ink-300")}
              aria-hidden
            />
            <div>
              <p className="font-mono text-2xl font-black leading-none text-ink-900">{streak}</p>
              <p className="text-[11px] font-semibold text-ink-600">day streak</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-ink-500">Best: {state?.bestStreak ?? 0} days</p>
        </div>
        <div className="rounded-3xl bg-violet-100 p-3 shadow-clay-sm">
          <div className="flex items-center gap-2">
            <div className="relative grid place-items-center">
              <GoalRing value={today} goal={goal} size={44} />
              <Target className={cn("absolute size-4", met ? "text-emerald-600" : "text-violet-600")} aria-hidden />
            </div>
            <div>
              <p className="font-mono text-2xl font-black leading-none text-ink-900">
                {Math.min(today, goal)}/{goal}
              </p>
              <p className="text-[11px] font-semibold text-ink-600">{met ? "goal reached!" : "today's goal"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPicking((p) => !p)}
            className="mt-2 text-[11px] font-bold text-violet-700 hover:underline"
            aria-expanded={picking}
          >
            Change goal
          </button>
        </div>
      </div>

      {picking && (
        <div className="relative mt-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Daily goal">
          {DAILY_GOALS.map((g) => (
            <button
              key={g.lessons}
              type="button"
              role="radio"
              aria-checked={goal === g.lessons}
              onClick={() => {
                void setGoal(g.lessons);
                setPicking(false);
              }}
              className={cn(
                "rounded-2xl p-2 text-center transition-all",
                goal === g.lessons
                  ? "bg-violet-600 text-white shadow-clay-btn"
                  : "bg-white/70 text-ink-700 shadow-clay-sm hover:-translate-y-px",
              )}
            >
              <span className="block font-mono text-lg font-black">{g.lessons}</span>
              <span className="block text-[10px] font-bold">{g.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
