"use client";

import { m } from "framer-motion";
import {
  Award,
  CalendarDays,
  Flame,
  Gamepad2,
  Gauge,
  Play,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { Section, StatCard } from "@/components/common/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAuth } from "@/hooks/useAuth";
import { DIFFICULTY_CONFIG, MODE_CONFIG, QUESTION_TYPE_LABELS } from "@/lib/config";
import { formatDateKey, formatDuration, liveDayStreak, timeAgo, utcDateKey } from "@/lib/date";
import { levelProgress } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/services/leaderboard";
import type { AchievementCollection, PlayerStats } from "@/services/profile";
import type { Profile, ScoreRow } from "@/types/database";
import { DIFFICULTIES, QUESTION_TYPES } from "@/types/question";
import { AchievementGrid } from "./AchievementGrid";
import { EditProfileDialog } from "./EditProfileDialog";
import { LevelCard } from "./LevelCard";

export function DashboardView({
  profile: serverProfile,
  stats,
  collection,
  recent,
  daily,
  rank,
  denied,
}: {
  profile: Profile;
  stats: PlayerStats;
  collection: AchievementCollection;
  recent: ScoreRow[];
  daily: ScoreRow[];
  rank: LeaderboardEntry | null;
  denied?: boolean;
}) {
  // Prefer the client copy: it updates straight after edits and games.
  const { profile: liveProfile } = useAuth();
  const p = liveProfile?.id === serverProfile.id ? liveProfile : serverProfile;
  const name = p.display_name ?? p.username;
  const accuracy = p.questions_answered ? Math.round((p.questions_correct / p.questions_answered) * 100) : 0;
  const streak = liveDayStreak(p.day_streak, p.last_played_on);
  const lp = levelProgress(p.xp);
  const unlockedCount = collection.achievements.filter((a) => collection.unlocked[a.id]).length;
  const byDifficulty = new Map(stats.byDifficulty.map((t) => [t.key, t]));
  const byType = new Map(stats.byType.map((t) => [t.key, t]));
  const dailyByDate = new Map(daily.map((d) => [d.challenge_date, d]));

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const key = utcDateKey(new Date(Date.now() - (13 - i) * 86_400_000));
    return { key, result: dailyByDate.get(key) };
  });

  const cards: Parameters<typeof StatCard>[0][] = [
    {
      icon: Award,
      label: "Current level",
      value: lp.level.index + 1,
      display: `${lp.level.emoji} ${lp.level.index + 1}`,
      accent: "bg-fuchsia-500",
    },
    { icon: Sparkles, label: "Total XP", value: p.xp, accent: "bg-violet-500" },
    { icon: Gauge, label: "Accuracy", value: accuracy, suffix: "%", accent: "bg-cyan-500" },
    { icon: Gamepad2, label: "Total games", value: p.games_played, accent: "bg-sky-500" },
    {
      icon: Zap,
      label: "Total score",
      value: Number(p.total_score),
      accent: "bg-amber-500",
      hint: "Ranked games only",
    },
    { icon: Trophy, label: "High score", value: p.high_score, accent: "bg-orange-500" },
    { icon: Flame, label: "Day streak", value: streak, accent: "bg-rose-500", hint: `Best ${p.best_day_streak}` },
    { icon: Target, label: "Best answer streak", value: p.best_streak, accent: "bg-emerald-500" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
      {denied && (
        <p
          className="mb-6 flex items-center gap-2 rounded-2xl bg-amber-100 p-3 text-sm font-semibold text-amber-800 shadow-clay-sm"
          role="alert"
        >
          <ShieldAlert className="size-4 shrink-0 text-amber-600" aria-hidden /> The admin panel is only available to
          admins.
        </p>
      )}

      {/* Profile */}
      <m.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-4"
        aria-label="Profile"
      >
        <PlayerAvatar name={name} src={p.avatar_url} className="size-20 shadow-clay ring-4 ring-white" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">{name}</h1>
            {p.role === "admin" && (
              <Badge className="bg-violet-100 font-bold text-violet-800 shadow-clay-sm">
                <ShieldCheck aria-hidden /> Admin
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-ink-500">
            @{p.username} · joined{" "}
            {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            {rank && (
              <>
                {" · "}
                <Link href="/leaderboard" className="font-bold text-violet-700 hover:text-violet-900">
                  #{rank.rank} globally
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <EditProfileDialog profile={p} />
          <Button variant="primary" size="sm" asChild>
            <Link href="/">
              <Play aria-hidden /> Play
            </Link>
          </Button>
        </div>
      </m.section>

      <div className="mt-6">
        <LevelCard xp={p.xp} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {cards.map((c, i) => (
          <StatCard key={c.label} {...c} index={i} />
        ))}
      </div>

      <Section
        id="achievements"
        title={`Achievements · ${unlockedCount}/${collection.achievements.length}`}
        delay={0.1}
      >
        <AchievementGrid achievements={collection.achievements} unlocked={collection.unlocked} profile={p} />
      </Section>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <Section title="Accuracy by difficulty" delay={0.15}>
          <div className="clay space-y-3.5 rounded-3xl p-5">
            {DIFFICULTIES.map((d) => {
              const cfg = DIFFICULTY_CONFIG[d];
              const t = byDifficulty.get(d) ?? { answered: 0, correct: 0 };
              const acc = t.answered ? t.correct / t.answered : 0;
              return (
                <div key={d}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className={cn("font-bold", cfg.text)}>{cfg.label}</span>
                    <span className="font-mono text-xs font-semibold text-ink-500">
                      {t.correct}/{t.answered} · {Math.round(acc * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={acc} color={cfg.hex} label={`${cfg.label} accuracy`} />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Accuracy by question type" delay={0.18}>
          <div className="clay space-y-3.5 rounded-3xl p-5">
            {QUESTION_TYPES.map((t) => {
              const tally = byType.get(t) ?? { answered: 0, correct: 0 };
              const acc = tally.answered ? tally.correct / tally.answered : 0;
              return (
                <div key={t}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-bold text-ink-800">{QUESTION_TYPE_LABELS[t].label}</span>
                    <span className="font-mono text-xs font-semibold text-ink-500">
                      {tally.correct}/{tally.answered} · {Math.round(acc * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={acc} label={`${QUESTION_TYPE_LABELS[t].label} accuracy`} />
                </div>
              );
            })}
            <p className="flex items-center gap-1.5 border-t border-ink-100 pt-3 text-xs font-semibold text-ink-500">
              <Timer className="size-3.5 text-violet-500" aria-hidden /> Fastest correct answer:{" "}
              <span className="font-mono font-bold text-ink-800">
                {p.fastest_answer_ms !== null ? `${(p.fastest_answer_ms / 1000).toFixed(1)}s` : "—"}
              </span>
              <span className="ml-auto">
                Perfect runs <span className="font-mono font-bold text-ink-800">{p.perfect_runs}</span>
              </span>
            </p>
          </div>
        </Section>
      </div>

      <Section
        title="Daily challenges · last 14 days"
        delay={0.2}
        action={
          <Link href="/leaderboard?board=challenge" className="text-sm font-bold text-violet-700 hover:text-violet-900">
            Today&apos;s standings →
          </Link>
        }
      >
        <div className="clay rounded-3xl p-5">
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
            {last14.map(({ key, result }) => {
              const ratio = result && result.answered ? result.correct / result.answered : 0;
              return (
                <div
                  key={key}
                  title={
                    result
                      ? `${formatDateKey(key)}: ${result.correct}/${result.answered}, ${result.score} pts`
                      : `${formatDateKey(key)}: not played`
                  }
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-xl text-[10px] transition-transform",
                    result
                      ? ratio >= 0.8
                        ? "bg-emerald-200 text-emerald-900 shadow-clay-sm hover:-translate-y-0.5"
                        : ratio >= 0.5
                          ? "bg-emerald-100 text-emerald-800 shadow-clay-sm hover:-translate-y-0.5"
                          : "bg-amber-100 text-amber-800 shadow-clay-sm hover:-translate-y-0.5"
                      : "clay-inset text-ink-500",
                  )}
                >
                  <span className="font-mono">{Number(key.slice(-2))}</span>
                  {result && <span className="font-bold">{result.correct}</span>}
                </div>
              );
            })}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
            <CalendarDays className="size-3.5 text-sky-500" aria-hidden /> Challenges completed:{" "}
            <span className="font-mono font-bold text-ink-800">{p.daily_completed}</span>
          </p>
        </div>
      </Section>

      <Section title="Recent games" delay={0.25}>
        {recent.length ? (
          <ul className="clay divide-y divide-ink-100 overflow-hidden rounded-3xl">
            {recent.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-white/70"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold text-ink-900">
                    {MODE_CONFIG[g.mode].label}
                    {g.difficulty && (
                      <span className={cn("ml-2 text-xs font-bold", DIFFICULTY_CONFIG[g.difficulty].text)}>
                        {DIFFICULTY_CONFIG[g.difficulty].label}
                      </span>
                    )}
                    {!g.ranked && <span className="ml-2 text-xs font-semibold text-ink-500">unranked</span>}
                  </p>
                  <p className="text-xs text-ink-500">
                    {timeAgo(g.created_at)} · {g.correct}/{g.answered} correct · {formatDuration(g.duration_seconds)}
                    {g.end_reason === "lives" ? " · out of lives" : g.end_reason === "quit" ? " · ended early" : ""}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold text-ink-600">{Math.round(g.accuracy)}%</p>
                <p className="w-20 text-right font-mono text-base font-bold text-ink-900">{g.score.toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="clay rounded-3xl p-8 text-center">
            <p className="font-semibold text-ink-700">No games yet.</p>
            <Button variant="primary" className="mt-4" asChild>
              <Link href="/">
                <Play aria-hidden /> Play your first game
              </Link>
            </Button>
          </div>
        )}
      </Section>
    </div>
  );
}
