import { HomeScreen } from "@/components/home/HomeScreen";
import { getViewer } from "@/lib/auth";
import { utcDateKey } from "@/lib/date";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, type LeaderboardEntry } from "@/services/leaderboard";
import { EMPTY_STATS, getMyStats, type PlayerStats } from "@/services/profile";
import type { ScoreRow } from "@/types/database";

export default async function HomePage() {
  let preview: LeaderboardEntry[] = [];
  let stats: PlayerStats = EMPTY_STATS;
  let todayDaily: ScoreRow | null = null;
  const achievements = { unlocked: 0, total: 0 };

  if (isSupabaseConfigured) {
    const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
    const [board, myStats, daily, defs, mine] = await Promise.all([
      getLeaderboard(supabase, "global", 5).catch(() => []),
      viewer ? getMyStats(supabase).catch(() => EMPTY_STATS) : EMPTY_STATS,
      viewer
        ? supabase
            .from("scores")
            .select("*")
            .eq("user_id", viewer.userId)
            .eq("mode", "daily")
            .eq("challenge_date", utcDateKey())
            .maybeSingle()
        : null,
      supabase.from("achievements").select("id", { count: "exact", head: true }).eq("is_active", true),
      viewer
        ? supabase
            .from("user_achievements")
            .select("achievement_id", { count: "exact", head: true })
            .eq("user_id", viewer.userId)
        : null,
    ]);
    preview = board;
    stats = myStats;
    todayDaily = daily?.data ?? null;
    achievements.total = defs.count ?? 0;
    achievements.unlocked = mine?.count ?? 0;
  }

  return <HomeScreen stats={stats} preview={preview} todayDaily={todayDaily} achievements={achievements} />;
}
