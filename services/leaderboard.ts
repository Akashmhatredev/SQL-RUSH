import type { TypedSupabaseClient } from "@/lib/supabase/client";
import { unwrap } from "./errors";

export const BOARDS = ["global", "daily", "weekly", "highest", "challenge"] as const;
export type Board = (typeof BOARDS)[number];

export const BOARD_INFO: Record<Board, { label: string; short: string; metric: string; description: string }> = {
  global: { label: "Global", short: "Global", metric: "XP", description: "Lifetime XP across every game." },
  daily: { label: "Today", short: "Today", metric: "pts", description: "Points scored today (UTC) in ranked games." },
  weekly: {
    label: "This week",
    short: "Week",
    metric: "pts",
    description: "Points scored this week (UTC, from Monday).",
  },
  highest: { label: "High scores", short: "Best", metric: "pts", description: "Best single run of all time." },
  challenge: {
    label: "Daily Challenge",
    short: "Daily",
    metric: "pts",
    description: "Today's daily challenge: one attempt each.",
  },
};

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  value: number;
  games: number;
}

type Row = Awaited<ReturnType<typeof fetchRows>>[number];

async function fetchRows(client: TypedSupabaseClient, board: Board, limit: number, userId?: string) {
  return unwrap(
    await client.rpc("get_leaderboard", { p_board: board, p_limit: limit, p_user: userId ?? null }),
    "Couldn't load the leaderboard.",
  );
}

const toEntry = (r: Row): LeaderboardEntry => ({
  rank: Number(r.rank),
  userId: r.user_id,
  username: r.username,
  displayName: r.display_name,
  avatarUrl: r.avatar_url,
  level: r.level,
  value: Number(r.value),
  games: Number(r.games),
});

export function isBoard(value: unknown): value is Board {
  return typeof value === "string" && (BOARDS as readonly string[]).includes(value);
}

export async function getLeaderboard(
  client: TypedSupabaseClient,
  board: Board,
  limit = 50,
): Promise<LeaderboardEntry[]> {
  return (await fetchRows(client, board, limit)).map(toEntry);
}

/** One player's position on a board, or null if they aren't on it yet. */
export async function getPlayerRank(
  client: TypedSupabaseClient,
  board: Board,
  userId: string,
): Promise<LeaderboardEntry | null> {
  const rows = await fetchRows(client, board, 1, userId);
  return rows[0] ? toEntry(rows[0]) : null;
}
