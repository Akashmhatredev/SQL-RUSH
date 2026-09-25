import type { Metadata } from "next";
import { ConfigNotice } from "@/components/layout/ConfigNotice";
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getPlayerRank, isBoard } from "@/services/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboards",
  description: "Global, daily, weekly and all-time high score rankings for SQL Rush, updated live.",
};

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  if (!isSupabaseConfigured) return <ConfigNotice className="mt-16" />;
  const { board: requested } = await searchParams;
  const board = isBoard(requested) ? requested : "global";
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  const [entries, me] = await Promise.all([
    getLeaderboard(supabase, board, 50).catch(() => []),
    viewer ? getPlayerRank(supabase, board, viewer.userId).catch(() => null) : null,
  ]);
  return <LeaderboardView key={board} initialBoard={board} initialData={{ entries, me, fetchedAt: Date.now() }} />;
}
