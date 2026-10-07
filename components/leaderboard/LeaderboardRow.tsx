"use client";

import { m } from "framer-motion";
import { Crown } from "lucide-react";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { LEVELS } from "@/lib/levels";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/services/leaderboard";

const MEDALS: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-200 to-amber-400 text-amber-950 shadow-clay-btn",
  2: "bg-gradient-to-br from-slate-100 to-slate-300 text-slate-800 shadow-clay-btn",
  3: "bg-gradient-to-br from-orange-200 to-orange-400 text-orange-950 shadow-clay-btn",
};

export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold",
        MEDALS[rank] ?? "bg-white text-ink-600 shadow-clay-sm",
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
        "flex items-center gap-3 rounded-2xl px-3 transition-all",
        compact ? "py-2" : "py-2.5",
        highlight ? "bg-sky-100 shadow-clay-sm ring-2 ring-sky-300" : "bg-white/50 hover:bg-white hover:shadow-clay-sm",
      )}
    >
      <RankBadge rank={entry.rank} />
      <PlayerAvatar name={name} src={entry.avatarUrl} className={compact ? "size-8" : "size-9"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink-900">
          {name}
          {highlight && (
            <span className="ml-2 rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">You</span>
          )}
        </p>
        <p className="truncate text-xs text-ink-500">
          @{entry.username} · {level.emoji} Lv {entry.level}
          {!compact && ` · ${entry.games.toLocaleString()} ${entry.games === 1 ? "game" : "games"}`}
        </p>
      </div>
      <p className="shrink-0 text-right font-mono text-sm font-bold tabular-nums text-ink-900">
        {entry.value.toLocaleString()} <span className="text-[10px] font-medium text-ink-500">{metric}</span>
      </p>
    </m.li>
  );
}
