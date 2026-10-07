"use client";

import { m } from "framer-motion";
import {
  CalendarDays,
  Check,
  Dumbbell,
  Flame,
  Infinity as InfinityIcon,
  LogIn,
  Play,
  Timer,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LeaderboardPreview } from "@/components/leaderboard/LeaderboardPreview";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useAuth } from "@/hooks/useAuth";
import { useCountUp } from "@/hooks/useCountUp";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useSettings } from "@/hooks/useSettings";
import { useSound } from "@/hooks/useSound";
import { DAILY_MIX, DIFFICULTY_CONFIG, MODE_CONFIG, QUESTION_TYPE_LABELS } from "@/lib/config";
import { dailyNumber, liveDayStreak, msUntilUtcMidnight, utcDateKey } from "@/lib/date";
import { levelProgress } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/services/leaderboard";
import type { PlayerStats } from "@/services/profile";
import type { ScoreRow } from "@/types/database";
import { GAME_MODES, type GameMode } from "@/types/game";
import { DIFFICULTIES, QUESTION_TYPES, type Difficulty, type QuestionType } from "@/types/question";
import { HowToPlay } from "./HowToPlay";

const ShortcutsModal = dynamic(() => import("@/components/ShortcutsModal").then((mod) => mod.ShortcutsModal));

const MODE_ICONS: Record<GameMode, LucideIcon> = {
  classic: Zap,
  endless: InfinityIcon,
  practice: Dumbbell,
  daily: CalendarDays,
};

function Num({ value }: { value: number }) {
  return <>{useCountUp(value).toLocaleString()}</>;
}

function hoursLeft() {
  const ms = msUntilUtcMidnight();
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

export function HomeScreen({
  stats,
  preview,
  todayDaily,
  achievements,
}: {
  stats: PlayerStats;
  preview: LeaderboardEntry[];
  todayDaily: ScoreRow | null;
  achievements: { unlocked: number; total: number };
}) {
  const router = useRouter();
  const { profile } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { unlock } = useSound();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [resetIn, setResetIn] = useState("");
  const { mode, difficulty, types } = settings;
  const signedIn = !!profile;
  const xp = profile?.xp ?? 0;
  const level = levelProgress(xp);
  const streak = profile ? liveDayStreak(profile.day_streak, profile.last_played_on) : 0;
  const accuracy = profile?.questions_answered
    ? Math.round((profile.questions_correct / profile.questions_answered) * 100)
    : 0;
  const bestFor = (gm: GameMode, d: Difficulty) =>
    stats.bests.find((b) => b.mode === gm && (gm === "daily" || b.difficulty === d))?.score ?? 0;
  const best = bestFor(mode, difficulty);

  useEffect(() => {
    router.prefetch("/play");
    setResetIn(hoursLeft());
    const id = window.setInterval(() => setResetIn(hoursLeft()), 30_000);
    return () => window.clearInterval(id);
  }, [router]);

  const play = (gm: GameMode = mode) => {
    unlock();
    if (gm !== mode) updateSettings({ mode: gm });
    const url = `/play?mode=${gm}&difficulty=${difficulty}`;
    router.push(signedIn ? url : `/login?next=${encodeURIComponent(url)}`);
  };

  const toggleType = (t: QuestionType) => {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    if (next.length) updateSettings({ types: QUESTION_TYPES.filter((x) => next.includes(x)) });
  };

  useHotkeys(
    {
      Enter: (e) => {
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
        play();
      },
      d: () => play("daily"),
      "?": () => setShortcutsOpen(true),
      ...Object.fromEntries(DIFFICULTIES.map((d, i) => [String(i + 1), () => updateSettings({ difficulty: d })])),
    },
    { enabled: !shortcutsOpen },
  );

  const ModeIcon = MODE_ICONS[mode];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-4 sm:px-6">
      <main>
        {/* Hero */}
        <section className="grid items-center gap-8 pt-8 lg:grid-cols-[1.1fr_1fr] lg:pt-14">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3.5 py-1.5 text-xs font-bold text-sky-800 shadow-clay-sm">
              <span className="size-2 animate-pulse rounded-full bg-sky-500" /> Live leaderboards · 5 challenge types
            </p>
            <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-ink-900 sm:text-7xl">
              Race the clock.
              <br />
              <span className="text-gradient animate-gradient">Master SQL.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-600 sm:text-lg">
              Write, fix, predict and build real queries before the timer runs out. Chain answers for combos, level up
              from SQL Rookie to SQL Master and fight for the top of the daily leaderboard.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => play()}
                className="group relative inline-flex h-16 items-center gap-3 overflow-hidden rounded-3xl bg-[linear-gradient(145deg,#8a6dff,#6a4cf5_55%,#5b3ee6)] px-8 text-lg font-black text-white shadow-clay-btn transition-all hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0.5 active:scale-[0.98] active:shadow-clay-pressed"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {signedIn ? (
                  <Play className="size-6 fill-current" aria-hidden />
                ) : (
                  <LogIn className="size-6" aria-hidden />
                )}
                {signedIn ? `Play ${MODE_CONFIG[mode].label}` : "Sign in to play"}
                <Kbd className="border-white/40 bg-white/20 text-white">Enter</Kbd>
              </button>
              {signedIn && mode !== "daily" && (
                <p className="text-sm font-semibold text-ink-500">
                  <span className={DIFFICULTY_CONFIG[difficulty].text}>{DIFFICULTY_CONFIG[difficulty].label}</span>
                  {MODE_CONFIG[mode].highScores && <> · best {best.toLocaleString()}</>}
                </p>
              )}
            </div>
          </div>

          {/* Player card */}
          {profile ? (
            <div className="clay relative overflow-hidden rounded-[2rem] p-5 sm:p-6">
              <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-violet-300/40 blur-3xl" />
              <div className="relative flex items-center gap-4">
                <div className="grid size-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-sky-200 to-violet-300 text-4xl shadow-clay-btn">
                  {level.level.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">
                    Level {level.level.index + 1} · @{profile.username}
                  </p>
                  <p className="truncate text-xl font-extrabold text-ink-900">{level.level.name}</p>
                  <ProgressBar value={level.progress} shimmer className="mt-2 h-2.5" label="XP progress" />
                  <p className="mt-1 text-xs text-ink-500">
                    <span className="font-mono font-semibold text-ink-800">
                      <Num value={xp} />
                    </span>{" "}
                    XP{" "}
                    {level.next ? `· ${(level.next.minXp - xp).toLocaleString()} to ${level.next.name}` : "· max level"}
                  </p>
                </div>
              </div>
              <div className="relative mt-5 grid grid-cols-3 gap-2.5">
                <div className="rounded-3xl bg-orange-100 p-3 text-center shadow-clay-sm">
                  <Flame
                    className={cn("mx-auto size-6", streak > 0 ? "fill-orange-400 text-orange-500" : "text-ink-300")}
                    aria-hidden
                  />
                  <p className="mt-1 font-mono text-xl font-bold text-ink-900">
                    <Num value={streak} />
                  </p>
                  <p className="text-[11px] font-semibold text-ink-500">day streak</p>
                </div>
                <div className="rounded-3xl bg-amber-100 p-3 text-center shadow-clay-sm">
                  <Trophy className="mx-auto size-6 text-amber-500" aria-hidden />
                  <p className="mt-1 font-mono text-xl font-bold text-ink-900">
                    <Num value={profile.high_score} />
                  </p>
                  <p className="text-[11px] font-semibold text-ink-500">high score</p>
                </div>
                <Link
                  href="/dashboard#achievements"
                  className="rounded-3xl bg-violet-100 p-3 text-center shadow-clay-sm transition-transform hover:-translate-y-0.5"
                >
                  <Zap className="mx-auto size-6 text-violet-500" aria-hidden />
                  <p className="mt-1 font-mono text-xl font-bold text-ink-900">
                    {achievements.unlocked}/{achievements.total}
                  </p>
                  <p className="text-[11px] font-semibold text-ink-500">badges</p>
                </Link>
              </div>
              <p className="relative mt-4 text-center text-xs font-semibold text-ink-500">
                {streak > 0
                  ? profile.last_played_on === utcDateKey()
                    ? "Streak secured for today. See you tomorrow!"
                    : "Play today to keep your streak alive!"
                  : "Play a game today to start a streak."}
              </p>
            </div>
          ) : (
            <div className="clay relative overflow-hidden rounded-[2rem] p-5 sm:p-6">
              <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-sky-300/40 blur-3xl" />
              <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Join the rush</p>
              <p className="relative mt-2 text-2xl font-extrabold text-ink-900">Your progress, on every device.</p>
              <ul className="relative mt-3 space-y-1.5 text-sm text-ink-600">
                <li>⚡ Earn XP and climb six levels</li>
                <li>🏆 Compete on global, daily and weekly leaderboards</li>
                <li>🎖️ Unlock achievements and keep a daily streak</li>
              </ul>
              <Button variant="primary" className="relative mt-5 w-full" asChild>
                <Link href="/login?next=%2F">
                  <LogIn aria-hidden /> Sign in with Google or email
                </Link>
              </Button>
            </div>
          )}
        </section>

        {/* Game setup */}
        <section className="mt-12" aria-labelledby="setup-title">
          <h2 id="setup-title" className="sr-only">
            Game setup
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Game mode">
            {GAME_MODES.map((gm) => {
              const Icon = MODE_ICONS[gm];
              const active = mode === gm;
              return (
                <button
                  key={gm}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSettings({ mode: gm })}
                  className={cn(
                    "clay group relative flex items-start gap-3 rounded-3xl p-4 text-left transition-all",
                    active ? "bg-violet-100 ring-2 ring-violet-400" : "hover:-translate-y-1 hover:bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-2xl transition-colors",
                      active
                        ? "bg-[linear-gradient(145deg,#8a6dff,#5b3ee6)] text-white shadow-clay-btn"
                        : "bg-violet-100 text-violet-600 shadow-clay-sm",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-extrabold text-ink-900">
                      {MODE_CONFIG[gm].label}
                      {gm === "daily" && todayDaily && (
                        <Check className="size-4 text-emerald-600" aria-label="Completed today" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">{MODE_CONFIG[gm].tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <m.div
            key={mode === "daily" ? "daily" : "difficulty"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4"
          >
            {mode === "daily" ? (
              <div className="clay relative overflow-hidden rounded-[2rem] p-5 sm:p-6">
                <div aria-hidden className="absolute -left-10 -top-20 size-56 rounded-full bg-sky-300/35 blur-3xl" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
                      Daily Challenge #{dailyNumber()}
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-ink-900">
                      {new Date().toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">
                      {DAILY_MIX.map(([d, n]) => `${n} ${DIFFICULTY_CONFIG[d].label.toLowerCase()}`).join(" · ")}. Same
                      questions for every player, one attempt each.
                    </p>
                    <Link
                      href="/leaderboard?board=challenge"
                      className="mt-2 inline-block text-sm font-bold text-violet-700 hover:text-violet-900"
                    >
                      Today&apos;s standings →
                    </Link>
                  </div>
                  <div className="text-right">
                    {todayDaily ? (
                      <>
                        <p className="text-xs font-semibold text-ink-500">Your score today</p>
                        <p className="font-mono text-3xl font-black text-ink-900">
                          {todayDaily.score.toLocaleString()}
                        </p>
                        {todayDaily.pattern && (
                          <p
                            className="mt-1 text-lg tracking-[0.15em]"
                            aria-label={`${todayDaily.correct} of ${todayDaily.pattern.length} correct`}
                          >
                            {todayDaily.pattern
                              .split("")
                              .map((c) => (c === "1" ? "🟩" : "🟥"))
                              .join("")}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 shadow-clay-sm">
                        Not played yet
                      </p>
                    )}
                    <p className="mt-2 text-xs font-semibold text-ink-500">New challenge in {resetIn}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Difficulty">
                {DIFFICULTIES.map((d, i) => {
                  const cfg = DIFFICULTY_CONFIG[d];
                  const active = difficulty === d;
                  const hs = bestFor(mode, d);
                  return (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => updateSettings({ difficulty: d })}
                      className={cn(
                        "clay relative rounded-3xl p-4 text-left transition-all",
                        active ? cn(cfg.bg, cfg.border, cfg.glow) : "hover:-translate-y-1 hover:bg-white",
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span className={cn("text-lg font-extrabold", cfg.text)}>{cfg.label}</span>
                        <Kbd>{i + 1}</Kbd>
                      </span>
                      <span className="mt-2 flex items-center gap-3 text-xs font-semibold text-ink-500">
                        <span className="flex items-center gap-1">
                          <Timer className="size-3.5" aria-hidden />
                          {mode === "practice" ? "No timer" : `${cfg.timer}s`}
                        </span>
                        <span>{cfg.points} pts</span>
                        {MODE_CONFIG[mode].highScores && hs ? (
                          <span className="ml-auto flex items-center gap-1 text-amber-700">
                            <Trophy className="size-3.5" aria-hidden />
                            {hs.toLocaleString()}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-3 flex flex-wrap gap-1">
                        {cfg.topics.map((t) => (
                          <span
                            key={t}
                            className="rounded-lg bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-ink-600 shadow-[inset_0_-1px_0_rgb(80_60_150/0.12)]"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </m.div>

          {mode !== "daily" && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold uppercase tracking-[0.16em] text-ink-500">Question types</span>
              {QUESTION_TYPES.map((t) => {
                const on = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                      on
                        ? "bg-sky-100 text-sky-800 shadow-clay-sm hover:-translate-y-px"
                        : "bg-transparent text-ink-500 line-through shadow-clay-pressed hover:text-ink-700",
                    )}
                  >
                    {QUESTION_TYPE_LABELS[t].label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex justify-center sm:hidden">
            <button
              type="button"
              onClick={() => play()}
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-3xl bg-[linear-gradient(145deg,#8a6dff,#6a4cf5_55%,#5b3ee6)] text-base font-black text-white shadow-clay-btn active:translate-y-px active:shadow-clay-pressed"
            >
              <ModeIcon className="size-5" aria-hidden />{" "}
              {signedIn ? `Start ${MODE_CONFIG[mode].label}` : "Sign in to play"}
            </button>
          </div>
        </section>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_380px]">
          {/* Quick stats */}
          <section aria-labelledby="stats-title">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="stats-title" className="text-lg font-extrabold text-ink-900">
                Your progress
              </h2>
              {signedIn && (
                <Link href="/dashboard" className="text-sm font-bold text-violet-700 hover:text-violet-900">
                  Dashboard →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Games played", value: profile?.games_played ?? 0, suffix: "" },
                { label: "Questions solved", value: profile?.questions_correct ?? 0, suffix: "" },
                { label: "Accuracy", value: accuracy, suffix: "%" },
                { label: "Total score", value: Number(profile?.total_score ?? 0), suffix: "" },
              ].map((s, i) => (
                <m.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  className="clay rounded-3xl p-4"
                >
                  <p className="font-mono text-2xl font-bold text-ink-900 sm:text-3xl">
                    <Num value={s.value} />
                    {s.suffix}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink-500">{s.label}</p>
                </m.div>
              ))}
            </div>
            {!signedIn && (
              <p className="mt-3 text-sm text-ink-500">Sign in to save progress and appear on the leaderboards.</p>
            )}
          </section>

          <LeaderboardPreview entries={preview} highlightId={profile?.id} />
        </div>

        <HowToPlay />
      </main>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
