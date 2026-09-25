import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { ConfigNotice } from "@/components/layout/ConfigNotice";
import { requireViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getPlayerRank } from "@/services/leaderboard";
import {
  EMPTY_STATS,
  getAchievementCollection,
  getDailyHistory,
  getMyStats,
  getRecentScores,
} from "@/services/profile";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your SQL Rush level, XP, accuracy, games, scores and achievements.",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  if (!isSupabaseConfigured) return <ConfigNotice className="mt-16" />;
  const viewer = await requireViewer("/dashboard");
  const supabase = await createClient();
  const [stats, collection, recent, daily, rank, { denied }] = await Promise.all([
    getMyStats(supabase).catch(() => EMPTY_STATS),
    getAchievementCollection(supabase, viewer.userId).catch(() => ({ achievements: [], unlocked: {} })),
    getRecentScores(supabase, viewer.userId, 8).catch(() => []),
    getDailyHistory(supabase, viewer.userId, 14).catch(() => []),
    getPlayerRank(supabase, "global", viewer.userId).catch(() => null),
    searchParams,
  ]);

  return (
    <DashboardView
      profile={viewer.profile}
      stats={stats}
      collection={collection}
      recent={recent}
      daily={daily}
      rank={rank}
      denied={denied === "admin"}
    />
  );
}
