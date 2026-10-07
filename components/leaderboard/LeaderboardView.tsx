"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  CalendarDays,
  Globe,
  LoaderCircle,
  Play,
  RefreshCw,
  Sparkles,
  Sun,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useLeaderboard, type BoardData, type LiveStatus } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";
import { BOARD_INFO, BOARDS, type Board, type LeaderboardEntry } from "@/services/leaderboard";
import { LeaderboardRow, RankBadge } from "./LeaderboardRow";

const BOARD_ICONS: Record<Board, LucideIcon> = {
  global: Globe,
  daily: Sun,
  weekly: CalendarDays,
  highest: Trophy,
  challenge: Sparkles,
};

function LiveBadge({ status, pulse }: { status: LiveStatus; pulse: number }) {
  const label = status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Auto-refresh";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-clay-sm",
        status === "live" ? "bg-emerald-100 text-emerald-800" : "bg-white/80 text-ink-600",
      )}
      aria-live="polite"
    >
      <span className="relative flex size-2">
        {status === "live" && (
          <span
            key={pulse}
            className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"
          />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            status === "live" ? "bg-emerald-500" : "bg-ink-400",
          )}
        />
      </span>
      {label}
    </span>
  );
}

const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHT = ["h-28", "h-20", "h-16"];
/** Pastel clay blocks matching the gold, silver and bronze rank badges. */
const PODIUM_BLOCK = ["bg-amber-100 ring-2 ring-amber-300", "bg-slate-100", "bg-orange-100"];

function Podium({ top, metric, me }: { top: LeaderboardEntry[]; metric: string; me?: string | null }) {
  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {PODIUM_ORDER.map((i) => {
        const e = top[i];
        if (!e) return <div key={i} />;
        const name = e.displayName ?? e.username;
        return (
          <m.div
            key={e.userId}
            layout
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.1 + (i === 0 ? 0.15 : i * 0.05) }}
            className="flex min-w-0 flex-col items-center"
          >
            <div className="relative">
              {i === 0 && <div aria-hidden className="absolute -inset-4 rounded-full bg-amber-300/45 blur-2xl" />}
              <PlayerAvatar
                name={name}
                src={e.avatarUrl}
                className={cn(
                  "relative",
                  i === 0
                    ? "size-16 shadow-clay ring-4 ring-amber-300 sm:size-20"
                    : "size-12 ring-4 ring-white sm:size-14",
                  e.userId === me && "ring-sky-400",
                )}
              />
              <RankBadge rank={e.rank} className="absolute -bottom-2 left-1/2 size-7 -translate-x-1/2" />
            </div>
            <p className="mt-4 w-full truncate text-center text-sm font-extrabold text-ink-900">{name}</p>
            <p className="font-mono text-xs font-semibold text-ink-600 tabular-nums">
              {e.value.toLocaleString()} {metric}
            </p>
            <div
              className={cn(
                "clay mt-2 w-full rounded-t-3xl rounded-b-none border-b-0",
                PODIUM_HEIGHT[i],
                PODIUM_BLOCK[i],
              )}
            />
          </m.div>
        );
      })}
    </div>
  );
}

export function LeaderboardView({ initialBoard, initialData }: { initialBoard: Board; initialData: BoardData }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userId } = useAuth();
  const [board, setBoard] = useState<Board>(initialBoard);
  const { data, loading, error, live, pulse, refresh } = useLeaderboard({
    board,
    initial: { board: initialBoard, data: initialData },
  });
  const info = BOARD_INFO[board];
  const entries = data?.entries ?? [];
  const me = data?.me ?? null;
  const meVisible = !!me && entries.some((e) => e.userId === me.userId);

  const select = (b: string) => {
    setBoard(b as Board);
    router.replace(`${pathname}?board=${b}`, { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-ink-900 sm:text-5xl">
            Leader<span className="text-gradient">boards</span>
          </h1>
          <p className="mt-2 text-ink-600">{info.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge status={live} pulse={pulse} />
          <Button variant="ghost" size="icon-sm" onClick={() => void refresh()} aria-label="Refresh" disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Tabs value={board} onValueChange={select} className="mt-6">
        <TabsList className="grid h-auto w-full grid-cols-5 gap-1.5 rounded-3xl p-1.5">
          {BOARDS.map((b) => {
            const Icon = BOARD_ICONS[b];
            return (
              <TabsTrigger
                key={b}
                value={b}
                className="h-auto flex-col gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-bold text-ink-600 hover:text-ink-900 data-[state=active]:bg-white data-[state=active]:text-ink-900 data-[state=active]:shadow-clay-sm sm:h-10 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm"
              >
                <Icon className="size-4" aria-hidden />
                <span className="md:hidden">{BOARD_INFO[b].short}</span>
                <span className="hidden md:inline">{BOARD_INFO[b].label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <section className="mt-6" aria-live="polite" aria-busy={loading}>
        {error && !data ? (
          <div className="clay rounded-[2rem] bg-rose-50 p-6 text-center ring-2 ring-rose-300" role="alert">
            <p className="text-sm font-semibold text-rose-800">{error}</p>
            <Button className="mt-4" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        ) : !data ? (
          <div className="clay grid h-64 place-items-center rounded-[2rem]" role="status">
            <LoaderCircle className="size-7 animate-spin text-violet-500" aria-label="Loading leaderboard" />
          </div>
        ) : entries.length === 0 ? (
          <div className="clay rounded-[2rem] p-8 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-amber-100 shadow-clay-sm">
              <Trophy className="size-9 text-amber-500" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-extrabold text-ink-900">
              {board === "challenge" ? "No one has finished today's challenge yet" : "No scores here yet"}
            </p>
            <p className="mt-1 text-sm text-ink-600">Be the first name on the board.</p>
            <Button variant="primary" className="mt-5" asChild>
              <Link href={board === "challenge" ? "/play?mode=daily" : "/"}>
                <Play aria-hidden /> Play now
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="clay overflow-hidden rounded-[2rem] px-4 pt-6 sm:px-8">
              <Podium top={entries.slice(0, 3)} metric={info.metric} me={userId} />
            </div>
            <ol className="mt-4 space-y-1.5" aria-label={`${info.label} leaderboard`}>
              <AnimatePresence initial={false}>
                {entries.slice(3).map((e, i) => (
                  <LeaderboardRow
                    key={e.userId}
                    entry={e}
                    metric={info.metric}
                    index={i}
                    highlight={e.userId === userId}
                  />
                ))}
              </AnimatePresence>
            </ol>
          </>
        )}

        {me && !meVisible && (
          <div className="sticky bottom-3 mt-4">
            <p className="mb-1.5 px-1 text-xs font-bold uppercase tracking-[0.16em] text-ink-500">Your rank</p>
            <ol>
              <LeaderboardRow entry={me} metric={info.metric} highlight />
            </ol>
          </div>
        )}
        {userId && data && !me && entries.length > 0 && (
          <p className="mt-4 text-center text-sm text-ink-500">
            You&apos;re not on this board yet.{" "}
            <Link href="/" className="font-bold text-violet-700 hover:text-violet-900">
              Play a ranked game
            </Link>{" "}
            to get on it.
          </p>
        )}
      </section>
    </div>
  );
}
