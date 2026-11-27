"use client";

import { m } from "framer-motion";
import { ArrowRight, Flame, Map as MapIcon, RotateCcw, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { AchievementIcon } from "@/components/AchievementIcon";
import { SqlCode } from "@/components/game/SqlCode";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useCountUp } from "@/hooks/useCountUp";
import { moduleOutline, type LessonOutline } from "@/lib/learn/curriculum";
import type { CompleteResult } from "@/lib/learn/progress";
import { learnLevelFor, learnLevelProgress, XP_LABELS } from "@/lib/learn/rules";
import type { Lesson } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

const BURST = ["🎉", "⭐", "✨", "🎊", "💜", "⭐", "✨", "🎉"];

/** The end-of-lesson celebration: what was earned, where the learner stands, and what's next. */
export function LessonComplete({
  lesson,
  outline,
  results,
  next,
  review,
  onReview,
}: {
  lesson: Lesson;
  outline: LessonOutline;
  results: CompleteResult[];
  next: LessonOutline | null;
  review: boolean;
  onReview: () => void;
}) {
  const awards = results.flatMap((r) => r.awards);
  const gained = awards.reduce((t, a) => t + a.xp, 0);
  const first = results[0];
  const last = results.at(-1);
  const xpAfter = last?.xpAfter ?? 0;
  const xpBefore = first ? first.xpBefore : xpAfter;
  const shown = useCountUp(gained, { from: 0, duration: 1.2 });
  const lp = learnLevelProgress(xpAfter);
  const levelledUp = learnLevelFor(xpBefore).index < lp.level.index;
  const unlocked = results.flatMap((r) => r.unlocked);
  const moduleDone = results.map((r) => r.moduleCompleted).find(Boolean);
  const mod = moduleDone ? moduleOutline(moduleDone) : null;
  const streakExtended = results.some((r) => r.streakExtended);
  const goalMet = results.some((r) => r.goalMetNow);

  return (
    <div className="space-y-5">
      <div className="clay relative overflow-hidden rounded-[2rem] p-6 text-center sm:p-8">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {BURST.map((e, i) => (
            <m.span
              key={i}
              className="absolute left-1/2 top-16 text-2xl"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 0],
                x: Math.cos((i / BURST.length) * Math.PI * 2) * 150,
                y: Math.sin((i / BURST.length) * Math.PI * 2) * 90 - 20,
                scale: 1,
              }}
              transition={{ duration: 1.4, delay: 0.1 + i * 0.03, ease: "easeOut" }}
            >
              {e}
            </m.span>
          ))}
        </div>
        <m.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 12 }}
          className="mx-auto grid size-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-amber-200 to-orange-300 text-5xl shadow-clay-btn"
        >
          🏆
        </m.div>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
          {review ? "Lesson reviewed!" : "Lesson complete!"}
        </h2>
        <p className="mt-1 font-semibold text-ink-600">{outline.title}</p>
        <p className="mt-4 font-mono text-5xl font-black text-violet-700">+{shown} XP</p>
        {gained === 0 && (
          <p className="mt-1 text-sm font-semibold text-ink-500">
            You already earned this lesson&apos;s XP. Reviewing still counts for your streak and daily goal.
          </p>
        )}
      </div>

      {mod && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-gradient-to-r from-violet-500 to-fuchsia-500 p-5 text-white shadow-clay-btn"
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Module complete</p>
          <p className="mt-1 text-2xl font-black">
            {mod.emoji} {mod.title}
          </p>
          <p className="text-sm font-semibold text-white/85">
            You finished every lesson in Module {mod.number}. +100 XP bonus.
          </p>
        </m.div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {awards.length > 0 && (
          <div className="clay rounded-3xl p-5 sm:col-span-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-500">XP earned</p>
            <ul className="divide-y divide-ink-100">
              {awards.map((a) => (
                <li
                  key={`${a.kind}-${a.ref}`}
                  className="flex items-center justify-between py-2 text-sm font-semibold text-ink-700"
                >
                  {XP_LABELS[a.kind]}
                  <span className="font-mono font-black text-violet-700">+{a.xp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="clay rounded-3xl p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-500">
            {levelledUp ? "Level up!" : "Your level"}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xl font-black text-ink-900">
            <span className={cn("text-2xl", levelledUp && "animate-squish")}>{lp.level.emoji}</span> {lp.level.name}
          </p>
          <ProgressBar value={lp.progress} shimmer className="mt-3 h-2.5" label="Level progress" />
          <p className="mt-1.5 text-xs font-semibold text-ink-500">
            <span className="font-mono font-bold text-ink-800">{xpAfter.toLocaleString()}</span> XP
            {lp.next ? ` · ${lp.xpToNext} to ${lp.next.name}` : " · top level"}
          </p>
        </div>

        <div className="clay rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-orange-100 shadow-clay-sm">
              <Flame className="size-7 fill-orange-400 text-orange-500" aria-hidden />
            </span>
            <div>
              <p className="text-xl font-black text-ink-900">
                {last?.streak ?? 0}-day streak{" "}
                {streakExtended && <span className="text-sm text-orange-600">+1 today</span>}
              </p>
              <p className="text-xs font-semibold text-ink-500">Best: {last?.bestStreak ?? 0} days</p>
            </div>
          </div>
          {last && (
            <p
              className={cn(
                "mt-3 flex items-center gap-2 text-sm font-bold",
                goalMet || last.todayLessons >= last.dailyGoal ? "text-emerald-700" : "text-ink-600",
              )}
            >
              <Target className="size-4" aria-hidden />
              Daily goal: {Math.min(last.todayLessons, last.dailyGoal)}/{last.dailyGoal} lesson
              {last.dailyGoal === 1 ? "" : "s"}
              {goalMet && " · reached! +25 XP"}
            </p>
          )}
        </div>
      </div>

      {unlocked.length > 0 && (
        <div className="clay rounded-3xl p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-500">Badges unlocked</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {unlocked.map((b, i) => (
              <m.li
                key={b.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3 ring-2 ring-amber-200"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-clay-btn">
                  <AchievementIcon name={b.icon} className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block font-extrabold text-ink-900">{b.title}</span>
                  <span className="block text-xs text-ink-600">{b.description}</span>
                </span>
              </m.li>
            ))}
          </ul>
        </div>
      )}

      <div className="clay rounded-3xl p-5">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-500">
          <Sparkles className="size-4 text-violet-500" aria-hidden /> Remember
        </p>
        <ul className="space-y-1.5">
          {lesson.takeaways.map((t) => (
            <li key={t} className="flex gap-2 text-sm font-semibold text-ink-700">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-violet-400" />
              {t}
            </li>
          ))}
        </ul>
        {lesson.cheatsheet && (
          <div className="mt-4 space-y-2">
            {lesson.cheatsheet.map((c) => (
              <div key={c.sql}>
                <SqlCode code={c.sql} />
                <p className="mt-1 pl-1 text-xs font-semibold text-ink-500">{c.meaning}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {next ? (
          <Button variant="primary" size="lg" className="sm:flex-1" asChild>
            <Link href={`/learn/${next.id}`}>
              Next: {next.title} <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="primary" size="lg" className="sm:flex-1" asChild>
            <Link href="/learn/progress">
              See your progress <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
        <Button variant="secondary" size="lg" asChild>
          <Link href="/learn">
            <MapIcon aria-hidden /> Roadmap
          </Link>
        </Button>
        <Button variant="ghost" size="lg" onClick={onReview}>
          <RotateCcw aria-hidden /> Review
        </Button>
      </div>
    </div>
  );
}
