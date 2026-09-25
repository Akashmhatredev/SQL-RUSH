"use client";

import { m } from "framer-motion";
import { Crown } from "lucide-react";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { LEVELS } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/services/leaderboard";

const MEDALS: Record<number, string> = {
  1: "border-amber-300/60 bg-gradient-to-br from-amber-300 to-orange-500 text-ink-950",
  2: "border-slate-200/60 bg-gradient-to-br from-slate-100 to-slate-400 text-ink-950",
  3: "border-orange-300/60 bg-gradient-to-br from-orange-300 to-amber-700 text-ink-950",
};

export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg border font-mono text-sm font-bold",
        MEDALS[rank] ?? "border-white/10 bg-white/5 text-slate-300",
        className,
      )}
    >
      {rank === 1 ? <Crown className="size-4" aria-label="1st" /> : rank}
    </span>
  );
}

export function LeaderboardRow({
  entry,
  metric,
  highlight,
  index = 0,
  compact = false,
}: {
  entry: LeaderboardEntry;
  metric: string;
  highlight?: boolean;
  index?: number;
  compact?: boolean;
}) {
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, entry.level - 1))];
  const name = entry.displayName ?? entry.username;
  return (
    <m.li
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 12) * 0.03 }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 transition-colors",
        compact ? "py-2" : "py-2.5",
        highlight
          ? "border-sky-400/50 bg-sky-400/[0.08] shadow-[0_0_30px_-14px_rgba(60,201,255,0.9)]"
          : "border-white/5 bg-white/[0.02] hover:border-white/10",
      )}
    >
      <RankBadge rank={entry.rank} />
      <PlayerAvatar name={name} src={entry.avatarUrl} className={compact ? "size-8" : "size-9"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {name}
          {highlight && (
            <span className="ml-2 rounded-full bg-sky-400/20 px-1.5 py-0.5 text-[10px] text-sky-200">You</span>
          )}
        </p>
        <p className="truncate text-xs text-slate-500">
          @{entry.username} · {level.emoji} Lv {entry.level}
          {!compact && ` · ${entry.games.toLocaleString()} ${entry.games === 1 ? "game" : "games"}`}
        </p>
      </div>
      <p className="shrink-0 text-right font-mono text-sm font-bold tabular-nums text-white">
        {entry.value.toLocaleString()} <span className="text-[10px] font-medium text-slate-500">{metric}</span>
      </p>
    </m.li>
  );
}
