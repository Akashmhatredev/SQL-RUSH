"use client";

import { AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import type { LeaderboardEntry } from "@/services/leaderboard";
import { LeaderboardRow } from "./LeaderboardRow";

/** Top 5 by lifetime XP, kept live. */
export function LeaderboardPreview({ entries, highlightId }: { entries: LeaderboardEntry[]; highlightId?: string }) {
  const { data } = useLeaderboard({
    board: "global",
    limit: 5,
    initial: { board: "global", data: { entries, me: null, fetchedAt: Date.now() } },
  });
  const rows = data?.entries ?? entries;

  return (
    <section className="glass rounded-3xl p-4 sm:p-5" aria-labelledby="top-players">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="top-players" className="flex items-center gap-2 text-lg font-bold text-white">
          <Trophy className="size-5 text-amber-300" aria-hidden /> Top players
        </h2>
        <Link href="/leaderboard" className="text-sm font-medium text-sky-300 hover:text-sky-200">
          All boards →
        </Link>
      </div>
      {rows.length ? (
        <ol className="space-y-1.5">
          <AnimatePresence initial={false}>
            {rows.map((e, i) => (
              <LeaderboardRow
                key={e.userId}
                entry={e}
                metric="XP"
                index={i}
                highlight={e.userId === highlightId}
                compact
              />
            ))}
          </AnimatePresence>
        </ol>
      ) : (
        <p className="py-6 text-center text-sm text-slate-500">No one on the board yet. Be the first!</p>
      )}
    </section>
  );
}
