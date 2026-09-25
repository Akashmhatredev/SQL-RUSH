import type { TypedSupabaseClient } from "@/lib/supabase/client";
import type { AchievementRow, Profile, ScoreRow } from "@/types/database";
import type { GameMode } from "@/types/game";
import type { Difficulty, QuestionType } from "@/types/question";
import { unwrap } from "./errors";

export interface Tally<K extends string> {
  key: K;
  answered: number;
  correct: number;
}

export interface PlayerStats {
  byDifficulty: Tally<Difficulty>[];
  byType: Tally<QuestionType>[];
  bests: { mode: GameMode; difficulty: Difficulty | null; score: number }[];
}

export const EMPTY_STATS: PlayerStats = { byDifficulty: [], byType: [], bests: [] };

export async function getProfile(client: TypedSupabaseClient, userId: string): Promise<Profile | null> {
  return unwrap(await client.from("profiles").select("*").eq("id", userId).maybeSingle());
}

export async function updateProfile(
  client: TypedSupabaseClient,
  userId: string,
  patch: { username?: string; display_name?: string | null },
): Promise<Profile> {
  return unwrap(
    await client.from("profiles").update(patch).eq("id", userId).select("*").single(),
    "Couldn't save your profile.",
  );
}

/** Accuracy by difficulty and question type, and personal bests per mode. */
export async function getMyStats(client: TypedSupabaseClient): Promise<PlayerStats> {
  const data = unwrap(await client.rpc("get_my_stats"));
  return { ...EMPTY_STATS, ...(data as unknown as PlayerStats) };
}

export async function getRecentScores(client: TypedSupabaseClient, userId: string, limit = 10): Promise<ScoreRow[]> {
  return unwrap(
    await client
      .from("scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
  );
}

/** Daily-challenge results from the last `days` days (UTC dates). */
export async function getDailyHistory(client: TypedSupabaseClient, userId: string, days = 14): Promise<ScoreRow[]> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  return unwrap(
    await client
      .from("scores")
      .select("*")
      .eq("user_id", userId)
      .eq("mode", "daily")
      .gte("challenge_date", since)
      .order("challenge_date", { ascending: true }),
  );
}

export interface AchievementCollection {
  achievements: AchievementRow[];
  /** achievement id → unlock time */
  unlocked: Record<string, string>;
}

export async function getAchievementCollection(
  client: TypedSupabaseClient,
  userId: string | null,
): Promise<AchievementCollection> {
  const [defs, mine] = await Promise.all([
    client.from("achievements").select("*").eq("is_active", true).order("sort_order"),
    userId
      ? client.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const achievements = unwrap(defs);
  const unlocked = Object.fromEntries(
    (unwrap(mine) as { achievement_id: string; unlocked_at: string }[]).map((u) => [u.achievement_id, u.unlocked_at]),
  );
  return { achievements, unlocked };
}
