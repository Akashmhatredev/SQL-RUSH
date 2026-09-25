"use client";

import { m } from "framer-motion";
import {
  Check,
  Copy,
  Flame,
  House,
  ListChecks,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AchievementIcon } from "@/components/AchievementIcon";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useCountUp } from "@/hooks/useCountUp";
import type { GameState } from "@/hooks/useGameSession";
import { useHotkeys } from "@/hooks/useHotkeys";
import { DIFFICULTY_CONFIG, MODE_CONFIG } from "@/lib/config";
import { dailyNumber, msUntilUtcMidnight, utcDateKey } from "@/lib/date";
import { levelProgress } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { RunConfig, UnlockedAchievement } from "@/types/game";

const ReviewList = dynamic(() => import("./ReviewList").then((mod) => mod.ReviewList));

function Countdown() {
  const [ms, setMs] = useState(() => msUntilUtcMidnight());
  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilUtcMidnight()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return (
    <span className="font-mono tabular-nums">
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <div className={cn("mx-auto mb-1 grid size-8 place-items-center rounded-lg", accent)}>{icon}</div>
      <p className="font-mono text-lg font-bold text-white">{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function XpProgress({ from, to }: { from: number; to: number }) {
  const [xp, setXp] = useState(from);
  useEffect(() => {
    const id = window.setTimeout(() => setXp(to), 400);
    return () => window.clearTimeout(id);
  }, [to]);
  const shownXp = useCountUp(xp, { duration: 1.2 });
  const p = levelProgress(xp);
  const leveled = levelProgress(from).level.index < levelProgress(to).level.index;
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-white">
          {p.level.emoji} {p.level.name}
          {leveled && xp === to && (
            <m.span
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-[11px] font-bold text-violet-200"
            >
              LEVEL UP!
            </m.span>
          )}
        </span>
        <span className="font-mono text-xs text-slate-400">
          {shownXp.toLocaleString()} XP{p.next && ` / ${p.next.minXp.toLocaleString()}`}
        </span>
      </div>
      <ProgressBar value={p.progress} shimmer className="h-2.5" label="Level progress" />
      <p className="mt-1.5 text-right text-[11px] text-slate-500">
        {p.next ? `${(p.next.minXp - xp).toLocaleString()} XP to ${p.next.name}` : "Max level reached"}
      </p>
    </div>
  );
}

export function GameOver({
  config,
  state,
  unlocked,
  onRestart,
}: {
  config: RunConfig;
  state: GameState;
  unlocked: UnlockedAchievement[];
  /** Omitted for the daily challenge. */
  onRestart?: () => void;
}) {
  const [showReview, setShowReview] = useState(false);
  const [copied, setCopied] = useState(false);
  const mode = MODE_CONFIG[config.mode];
  const { session, summary, history } = state;
  const endReason = summary?.endReason ?? "quit";
  const answered = session.answered;
  const accuracy = answered ? Math.round((session.correct / answered) * 100) : 0;
  const score = useCountUp(session.score, { from: 0, duration: 1.4 });
  const perfect = endReason === "complete" && session.wrong === 0 && answered > 0;
  const challengeDate = summary?.challengeDate ?? session.challengeDate ?? utcDateKey();
  const xpAfter = summary?.profileXp ?? state.last?.xpAfter ?? null;
  const xpBefore = xpAfter !== null ? xpAfter - session.xp : null;
  const ranked = summary?.ranked ?? config.mode !== "practice";

  useHotkeys({ r: () => onRestart?.() });

  const title =
    endReason === "lives"
      ? "Game Over"
      : endReason === "quit"
        ? config.mode === "practice"
          ? "Session complete"
          : "Run ended"
        : perfect
          ? "Flawless!"
          : "Run complete!";

  const subtitle =
    config.mode === "daily"
      ? `Daily Challenge #${dailyNumber(challengeDate)}`
      : config.mode === "practice"
        ? `${DIFFICULTY_CONFIG[config.difficulty].label} practice`
        : `${mode.label} · ${DIFFICULTY_CONFIG[config.difficulty].label}`;

  const share = async () => {
    const squares = history.map((h) => (h.correct ? "🟩" : "🟥")).join("");
    const text =
      config.mode === "daily"
        ? `SQL Rush Daily #${dailyNumber(challengeDate)} (${challengeDate})\n${squares}\n${session.correct}/${history.length} · ${session.score.toLocaleString()} pts`
        : `SQL Rush · ${subtitle}\n${squares}\n${session.score.toLocaleString()} pts · best streak ${session.bestStreak}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; nothing else to do.
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:pt-12">
      <m.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="glass-strong relative overflow-hidden rounded-3xl p-6 text-center sm:p-8"
      >
        <div
          aria-hidden
          className={cn(
            "absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full blur-3xl",
            endReason === "lives" ? "bg-rose-500/25" : "bg-sky-400/25",
          )}
        />
        <p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">{subtitle}</p>
        <h1
          className={cn(
            "relative mt-2 text-4xl font-black sm:text-5xl",
            endReason === "lives" ? "text-rose-300" : "text-gradient animate-gradient",
          )}
        >
          {title}
        </h1>

        <div className="relative mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Final score</p>
          <p className="font-mono text-6xl font-black tabular-nums text-white drop-shadow-[0_0_24px_rgba(60,201,255,0.5)] sm:text-7xl">
            {score.toLocaleString()}
          </p>
          {summary?.newHighScore && (
            <m.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, type: "spring", stiffness: 400, damping: 12 }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-3 py-1 text-sm font-bold text-ink-950"
            >
              <Trophy className="size-4" aria-hidden /> New high score!
            </m.p>
          )}
          {summary && !summary.newHighScore && mode.highScores && (summary.previousHighScore ?? 0) > 0 && (
            <p className="mt-2 text-sm text-slate-500">Best: {summary.previousHighScore?.toLocaleString()}</p>
          )}
          {!ranked && <p className="mt-2 text-sm text-slate-500">Practice runs earn XP but aren&apos;t ranked.</p>}
          {summary && !summary.recorded && (
            <p className="mt-2 text-sm text-slate-500">Nothing was answered, so this run wasn&apos;t recorded.</p>
          )}
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile
            icon={<Check className="size-4 text-emerald-300" />}
            accent="bg-emerald-400/15"
            label="Correct"
            value={`${session.correct}/${answered}`}
          />
          <StatTile
            icon={<Target className="size-4 text-sky-300" />}
            accent="bg-sky-400/15"
            label="Accuracy"
            value={`${accuracy}%`}
          />
          <StatTile
            icon={<Flame className="size-4 text-orange-300" />}
            accent="bg-orange-400/15"
            label="Best streak"
            value={String(session.bestStreak)}
          />
          <StatTile
            icon={<Zap className="size-4 text-amber-200" />}
            accent="bg-amber-300/15"
            label="XP earned"
            value={`+${session.xp}`}
          />
        </div>
      </m.div>

      {xpBefore !== null && xpAfter !== null && (
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4"
        >
          <XpProgress from={xpBefore} to={xpAfter} />
        </m.div>
      )}

      {unlocked.length > 0 && (
        <m.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass mt-4 rounded-2xl p-4"
        >
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-200">
            <Sparkles className="size-4" aria-hidden /> Achievements unlocked
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {unlocked.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-2.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 text-ink-950">
                  <AchievementIcon name={a.icon} className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{a.title}</span>
                  <span className="block text-xs text-slate-400">{a.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </m.section>
      )}

      {config.mode === "daily" && (
        <p className="mt-4 text-center text-sm text-slate-400">
          Next daily challenge in <Countdown />
        </p>
      )}

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {onRestart ? (
          <Button variant="primary" size="lg" onClick={onRestart} autoFocus>
            <RotateCcw className="size-5" aria-hidden /> Play again
            <Kbd className="border-ink-950/30 bg-ink-950/15 text-ink-950">R</Kbd>
          </Button>
        ) : (
          <Button variant="primary" size="lg" asChild>
            <Link href="/leaderboard?board=challenge" autoFocus>
              <TrendingUp className="size-5" aria-hidden /> Today&apos;s standings
            </Link>
          </Button>
        )}
        <Button size="lg" asChild>
          <Link href="/">
            <House className="size-5" aria-hidden /> Home
          </Link>
        </Button>
        {onRestart && ranked && (
          <Button asChild className="sm:col-span-2">
            <Link href="/leaderboard">
              <TrendingUp aria-hidden /> Leaderboards
            </Link>
          </Button>
        )}
        {history.length > 0 && (
          <Button onClick={() => setShowReview((v) => !v)} aria-expanded={showReview}>
            <ListChecks className="size-4" aria-hidden /> {showReview ? "Hide review" : "Review answers"}
          </Button>
        )}
        {history.length > 0 && (
          <Button onClick={share}>
            {copied ? (
              <Check className="size-4 text-emerald-300" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            {copied ? "Copied!" : "Copy result"}
          </Button>
        )}
      </div>

      {showReview && <ReviewList history={history} />}
    </div>
  );
}
