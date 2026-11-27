"use client";

import { m } from "framer-motion";
import { Award, BookCheck, BookOpen, Flame, Lock, Sparkles, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AchievementIcon } from "@/components/AchievementIcon";
import { Section, StatCard } from "@/components/common/StatCard";
import { useLearn } from "@/components/learn/LearnProvider";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAuth } from "@/hooks/useAuth";
import { metricValue, type LearnerMetrics } from "@/lib/achievements";
import { timeAgo } from "@/lib/date";
import { LEARN_BADGES, LEARN_METRICS, LESSONS, MODULES } from "@/lib/learn/curriculum";
import type { LearnerState } from "@/lib/learn/progress";
import { curriculumProgress, moduleProgress } from "@/lib/learn/roadmap";
import { LEARN_LEVELS, learnLevelProgress, XP_LABELS } from "@/lib/learn/rules";
import { cn } from "@/lib/utils";
import type { AchievementMetric } from "@/types/database";
import { ContinueLearningCard } from "./ContinueLearningCard";
import { GoalRing } from "./LearnerSummary";

interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: string;
  threshold: number;
  lessonIds: string[] | null;
  unlockedAt: string | null;
  unlocked: boolean;
}

function learnerMetrics(state: LearnerState | null): LearnerMetrics {
  return {
    xp: state?.xp ?? 0,
    lessonsCompleted: state?.lessonsCompleted ?? 0,
    modulesCompleted: state?.modulesCompleted ?? 0,
    bestStreak: state?.bestStreak ?? 0,
    completedLessonIds: Object.values(state?.lessons ?? {})
      .filter((l) => l.status === "completed")
      .map((l) => l.lessonId),
  };
}

/** Learning badges: from the database when signed in (admins can edit them), else the built-in set. */
function useLearnBadges(state: LearnerState | null): Badge[] {
  const { supabase, userId } = useAuth();
  const { mode } = useLearn();
  const [server, setServer] = useState<Badge[] | null>(null);
  const metrics = useMemo(() => learnerMetrics(state), [state]);

  useEffect(() => {
    if (mode !== "server" || !supabase || !userId) return;
    let cancelled = false;
    (async () => {
      const [defs, mine] = await Promise.all([
        supabase
          .from("achievements")
          .select("*")
          .in("metric", [...LEARN_METRICS] as AchievementMetric[])
          .eq("is_active", true)
          .order("sort_order"),
        supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", userId),
      ]);
      if (cancelled || defs.error) return;
      const unlocked = new Map((mine.data ?? []).map((u) => [u.achievement_id, u.unlocked_at]));
      setServer(
        (defs.data ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.icon,
          metric: a.metric,
          threshold: a.threshold,
          lessonIds: a.lesson_ids ?? null,
          unlockedAt: unlocked.get(a.id) ?? null,
          unlocked: unlocked.has(a.id),
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, supabase, userId, state?.xp, state?.bestStreak]);

  if (mode === "server" && server) return server;
  return LEARN_BADGES.map((b) => ({
    ...b,
    unlockedAt: null,
    unlocked: metricValue(null, b.metric as AchievementMetric, metrics, b.lessonIds) >= b.threshold,
  }));
}

function shiftDay(key: string, days: number): string {
  const [y, mo, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

/** /learn/progress: everything about the learner's journey on one page. */
export function ProgressDashboard() {
  const { state, loading } = useLearn();
  const badges = useLearnBadges(state);
  const metrics = learnerMetrics(state);
  const cp = curriculumProgress(state);
  const mods = moduleProgress(state);
  const lp = learnLevelProgress(state?.xp ?? 0);
  const earned = badges.filter((b) => b.unlocked).length;
  const today = state?.today ?? new Date().toISOString().slice(0, 10);
  const activity = new Map((state?.activity ?? []).map((a) => [a.day, a]));
  const days = Array.from({ length: 28 }, (_, i) => shiftDay(today, i - 27));

  const cards: Parameters<typeof StatCard>[0][] = [
    { icon: BookCheck, label: "Lessons completed", value: cp.done, accent: "bg-emerald-500", hint: `of ${cp.total}` },
    { icon: BookOpen, label: "Lessons remaining", value: cp.remaining, accent: "bg-sky-500" },
    { icon: Sparkles, label: "Total learning XP", value: state?.xp ?? 0, accent: "bg-violet-500" },
    {
      icon: Award,
      label: "Current level",
      value: lp.level.index + 1,
      display: `${lp.level.emoji} ${lp.level.index + 1}`,
      accent: "bg-fuchsia-500",
      hint: lp.level.name,
    },
    { icon: Flame, label: "Current streak (days)", value: state?.streak ?? 0, accent: "bg-orange-500" },
    { icon: Zap, label: "Longest streak (days)", value: state?.bestStreak ?? 0, accent: "bg-amber-500" },
    { icon: Trophy, label: "Badges earned", value: earned, accent: "bg-rose-500", hint: `of ${badges.length}` },
    {
      icon: BookCheck,
      label: "Modules completed",
      value: state?.modulesCompleted ?? 0,
      accent: "bg-cyan-500",
      hint: `of ${MODULES.length}`,
    },
  ];

  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12", loading && !state && "animate-pulse")}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">Beginner Mode</p>
          <h1 className="text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">Your learning progress</h1>
        </div>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/learn">Roadmap</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="clay flex items-center gap-5 rounded-[2rem] p-5 sm:p-6">
          <div className="relative grid place-items-center">
            <GoalRing value={cp.done} goal={cp.total} size={128} />
            <span className="absolute text-center">
              <span className="block font-mono text-3xl font-black text-ink-900">{Math.round(cp.ratio * 100)}%</span>
              <span className="block text-[11px] font-bold text-ink-500">complete</span>
            </span>
          </div>
          <div>
            <p className="text-lg font-extrabold text-ink-900">
              {cp.done} of {cp.total} lessons
            </p>
            <p className="text-sm text-ink-600">
              {cp.remaining
                ? `${cp.remaining} to go. Every lesson unlocks the next one.`
                : "You finished the whole course!"}
            </p>
          </div>
        </div>
        <ContinueLearningCard compact />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cards.map((c, i) => (
          <StatCard key={c.label} {...c} index={i} />
        ))}
      </div>

      <Section title="Learning levels" delay={0.05}>
        <ol className="clay grid grid-cols-2 gap-2 rounded-3xl p-4 sm:grid-cols-3 lg:grid-cols-6">
          {LEARN_LEVELS.map((l) => {
            const reached = (state?.xp ?? 0) >= l.minXp;
            const current = l.index === lp.level.index;
            return (
              <li
                key={l.name}
                className={cn(
                  "rounded-2xl p-3 text-center",
                  current
                    ? "bg-violet-100 ring-2 ring-violet-400"
                    : reached
                      ? "bg-sky-50 shadow-clay-sm"
                      : "clay-inset",
                )}
              >
                <span className={cn("block text-2xl", !reached && "opacity-50 grayscale")} aria-hidden>
                  {l.emoji}
                </span>
                <span className="block text-sm font-extrabold text-ink-900">{l.name}</span>
                <span className="block font-mono text-[10px] font-semibold text-ink-500">
                  {l.minXp.toLocaleString()} XP
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-ink-600">{l.milestone}</span>
              </li>
            );
          })}
        </ol>
        {lp.next && (
          <p className="mt-2 text-sm font-semibold text-ink-600">
            {lp.xpToNext.toLocaleString()} XP to {lp.next.emoji} {lp.next.name}.
          </p>
        )}
      </Section>

      <Section title="Modules" delay={0.1}>
        <ul className="clay space-y-3.5 rounded-3xl p-5">
          {mods.map(({ module, done, total, complete }) => (
            <li key={module.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-bold text-ink-800">
                  {module.emoji} Module {module.number} · {module.title}
                </span>
                <span className={cn("font-mono text-xs font-bold", complete ? "text-emerald-700" : "text-ink-500")}>
                  {complete ? "✓ " : ""}
                  {done}/{total}
                </span>
              </div>
              <ProgressBar
                value={done / total}
                label={`${module.title} progress`}
                barClassName={complete ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : undefined}
              />
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <Section title="Last 4 weeks" delay={0.15}>
          <div className="clay rounded-3xl p-5">
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d) => {
                const a = activity.get(d);
                return (
                  <div
                    key={d}
                    title={
                      a
                        ? `${d}: ${a.lessons} lesson${a.lessons === 1 ? "" : "s"}, ${a.xp} XP${a.goalMet ? ", goal reached" : ""}`
                        : `${d}: no learning`
                    }
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-xl text-[10px] font-bold",
                      !a
                        ? "clay-inset text-ink-400"
                        : a.goalMet
                          ? "bg-emerald-300 text-emerald-950 shadow-clay-sm"
                          : "bg-emerald-100 text-emerald-800 shadow-clay-sm",
                      d === today && "ring-2 ring-violet-400",
                    )}
                  >
                    <span className="font-mono">{Number(d.slice(-2))}</span>
                    {a && a.lessons > 0 && <span>{a.lessons}</span>}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs font-semibold text-ink-500">
              Darker green = daily goal reached. Days follow your own time zone ({state?.timeZone ?? "UTC"}).
            </p>
          </div>
        </Section>

        <Section title="Recent activity" delay={0.18}>
          {state?.recentXp.length ? (
            <ul className="clay divide-y divide-ink-100 overflow-hidden rounded-3xl">
              {state.recentXp.slice(0, 8).map((e) => {
                const lesson = LESSONS.find((l) => l.id === e.ref);
                const mod = MODULES.find((mm) => mm.id === e.ref);
                return (
                  <li key={`${e.kind}-${e.ref}`} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink-900">{XP_LABELS[e.kind]}</p>
                      <p className="truncate text-xs text-ink-500">
                        {lesson?.title ?? (mod ? `Module ${mod.number}: ${mod.title}` : e.ref)} · {timeAgo(e.at)}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-black text-violet-700">+{e.xp}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="clay rounded-3xl p-6 text-center text-sm font-semibold text-ink-600">
              Nothing yet. Your first lesson takes about five minutes.
            </div>
          )}
        </Section>
      </div>

      <Section title={`Badges · ${earned}/${badges.length}`} delay={0.2}>
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((b, i) => {
            const value = Math.min(metricValue(null, b.metric as AchievementMetric, metrics, b.lessonIds), b.threshold);
            return (
              <m.li
                key={b.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i, 10) * 0.03 }}
                className={cn(
                  "flex items-center gap-3 rounded-3xl p-3.5",
                  b.unlocked ? "clay bg-amber-50 ring-2 ring-amber-200" : "bg-white/45 shadow-clay-pressed",
                )}
              >
                <span
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-2xl",
                    b.unlocked
                      ? "bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-clay-btn"
                      : "clay-inset text-ink-400",
                  )}
                >
                  {b.unlocked ? (
                    <AchievementIcon name={b.icon} className="size-6" />
                  ) : (
                    <Lock className="size-5" aria-label="Locked" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block font-extrabold", b.unlocked ? "text-ink-900" : "text-ink-700")}>
                    {b.title}
                  </span>
                  <span className="block text-xs text-ink-600">{b.description}</span>
                  {!b.unlocked && (
                    <span className="mt-1.5 flex items-center gap-2">
                      <ProgressBar value={value / b.threshold} className="h-1.5" label={`${b.title} progress`} />
                      <span className="shrink-0 font-mono text-[10px] font-semibold text-ink-500">
                        {value}/{b.threshold}
                      </span>
                    </span>
                  )}
                  {b.unlocked && b.unlockedAt && (
                    <span className="mt-1 block text-[11px] font-bold text-amber-700">
                      Unlocked {new Date(b.unlockedAt).toLocaleDateString()}
                    </span>
                  )}
                </span>
              </m.li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
