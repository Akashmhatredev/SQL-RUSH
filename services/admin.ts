import type { TypedSupabaseClient } from "@/lib/supabase/client";
import type { AchievementRow, QuestionRow, ScoreRow, TablesInsert, TablesUpdate, UserRoleEnum } from "@/types/database";
import type { GameMode } from "@/types/game";
import type { Difficulty, QuestionType } from "@/types/question";
import { unwrap } from "./errors";

export const ADMIN_PAGE_SIZE = 25;

export interface Page<T> {
  rows: T[];
  count: number;
  page: number;
  pageCount: number;
}

const range = (page: number, size = ADMIN_PAGE_SIZE) => {
  const from = (Math.max(1, page) - 1) * size;
  return [from, from + size - 1] as const;
};
const toPage = <T>(rows: T[], count: number, page: number, size = ADMIN_PAGE_SIZE): Page<T> => ({
  rows,
  count,
  page,
  pageCount: Math.max(1, Math.ceil(count / size)),
});
/** PostgREST `or` filters use , ( ) as syntax; strip them from free-text search. */
const searchTerm = (s: string | undefined) => (s ?? "").replace(/[,()"\\]/g, " ").trim();

// --- overview ---------------------------------------------------------------

export interface AdminOverview {
  users: number;
  admins: number;
  newUsersToday: number;
  questions: number;
  activeQuestions: number;
  games: number;
  gamesToday: number;
  answersToday: number;
  activeRuns: number;
  questionsByDifficulty: Partial<Record<Difficulty, number>>;
  questionsByType: Partial<Record<QuestionType, number>>;
}

export async function getOverview(client: TypedSupabaseClient): Promise<AdminOverview> {
  return unwrap(await client.rpc("admin_overview")) as unknown as AdminOverview;
}

// --- questions --------------------------------------------------------------

export interface QuestionFilters {
  search?: string;
  difficulty?: Difficulty;
  type?: QuestionType;
  status?: "active" | "inactive";
  page?: number;
}

export async function listQuestions(client: TypedSupabaseClient, f: QuestionFilters): Promise<Page<QuestionRow>> {
  const page = f.page ?? 1;
  let query = client.from("questions").select("*", { count: "exact" });
  if (f.difficulty) query = query.eq("difficulty", f.difficulty);
  if (f.type) query = query.eq("type", f.type);
  if (f.status) query = query.eq("is_active", f.status === "active");
  const term = searchTerm(f.search);
  if (term) {
    query = /^\d+$/.test(term)
      ? query.eq("id", Number(term))
      : query.or(`question.ilike.%${term}%,topic.ilike.%${term}%,answer.ilike.%${term}%`);
  }
  const [from, to] = range(page);
  const { data, error, count } = await query.order("id", { ascending: true }).range(from, to);
  return toPage(unwrap({ data, error }), count ?? 0, page);
}

export async function getQuestion(client: TypedSupabaseClient, id: number): Promise<QuestionRow | null> {
  return unwrap(await client.from("questions").select("*").eq("id", id).maybeSingle());
}

export async function createQuestion(
  client: TypedSupabaseClient,
  row: TablesInsert<"questions">,
): Promise<QuestionRow> {
  return unwrap(await client.from("questions").insert(row).select("*").single(), "Couldn't create the question.");
}

export async function updateQuestion(
  client: TypedSupabaseClient,
  id: number,
  patch: TablesUpdate<"questions">,
): Promise<QuestionRow> {
  return unwrap(
    await client.from("questions").update(patch).eq("id", id).select("*").single(),
    "Couldn't update the question.",
  );
}

export async function deleteQuestion(client: TypedSupabaseClient, id: number): Promise<void> {
  unwrap(await client.from("questions").delete().eq("id", id), "Couldn't delete the question.");
}

/**
 * Inserts in batches. Rows that carry an id are upserted with "ignore duplicates",
 * so re-importing a file never overwrites questions edited in the admin panel.
 */
export async function bulkInsertQuestions(
  client: TypedSupabaseClient,
  rows: TablesInsert<"questions">[],
  batchSize = 100,
): Promise<number> {
  const withId = rows.filter((r) => r.id != null);
  const withoutId = rows.filter((r) => r.id == null);
  let inserted = 0;
  for (let i = 0; i < withId.length; i += batchSize) {
    const batch = withId.slice(i, i + batchSize);
    const result = await client
      .from("questions")
      .upsert(batch, { onConflict: "id", ignoreDuplicates: true })
      .select("id");
    inserted += unwrap(result, "Part of the import failed.").length;
  }
  for (let i = 0; i < withoutId.length; i += batchSize) {
    const batch = withoutId.slice(i, i + batchSize);
    const result = await client.from("questions").insert(batch, { defaultToNull: false }).select("id");
    inserted += unwrap(result, "Part of the import failed.").length;
  }
  return inserted;
}

// --- users ------------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRoleEnum;
  xp: number;
  level: number;
  gamesPlayed: number;
  totalScore: number;
  highScore: number;
  questionsAnswered: number;
  questionsCorrect: number;
  provider: string;
  createdAt: string;
  lastSignInAt: string | null;
}

export async function listUsers(
  client: TypedSupabaseClient,
  { search, page = 1 }: { search?: string; page?: number },
): Promise<Page<AdminUser>> {
  const [from] = range(page);
  const rows = unwrap(
    await client.rpc("admin_list_users", {
      p_search: search?.trim() || null,
      p_limit: ADMIN_PAGE_SIZE,
      p_offset: from,
    }),
  );
  return toPage(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      role: r.role,
      xp: r.xp,
      level: r.level,
      gamesPlayed: r.games_played,
      totalScore: Number(r.total_score),
      highScore: r.high_score,
      questionsAnswered: r.questions_answered,
      questionsCorrect: r.questions_correct,
      provider: r.provider,
      createdAt: r.created_at,
      lastSignInAt: r.last_sign_in_at,
    })),
    Number(rows[0]?.total_count ?? 0),
    page,
  );
}

export async function setUserRole(client: TypedSupabaseClient, userId: string, role: UserRoleEnum): Promise<void> {
  unwrap(await client.rpc("admin_set_role", { p_user: userId, p_role: role }), "Couldn't change the role.");
}

// --- score history ----------------------------------------------------------

export type ScoreWithPlayer = ScoreRow & {
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export async function listScores(
  client: TypedSupabaseClient,
  { mode, userId, page = 1 }: { mode?: GameMode; userId?: string; page?: number },
): Promise<Page<ScoreWithPlayer>> {
  let query = client
    .from("scores")
    .select("*, profiles(username, display_name, avatar_url)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (mode) query = query.eq("mode", mode);
  if (userId) query = query.eq("user_id", userId);
  const [from, to] = range(page);
  const { data, error, count } = await query.range(from, to);
  return toPage(unwrap({ data, error }) as ScoreWithPlayer[], count ?? 0, page);
}

/** Resolves a username to a user id for score-history filtering. */
export async function findUserId(client: TypedSupabaseClient, username: string): Promise<string | null> {
  const { data } = await client
    .from("profiles")
    .select("id")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();
  return data?.id ?? null;
}

// --- achievements -----------------------------------------------------------

export type AchievementWithCount = AchievementRow & { unlocks: number };

/** Definitions plus how many players have unlocked each one. */
export async function listAchievements(client: TypedSupabaseClient): Promise<AchievementWithCount[]> {
  const rows = unwrap(
    await client.from("achievements").select("*, user_achievements(count)").order("sort_order").order("id"),
  ) as (AchievementRow & { user_achievements: { count: number }[] })[];
  return rows.map(({ user_achievements, ...a }) => ({ ...a, unlocks: user_achievements?.[0]?.count ?? 0 }));
}

export async function upsertAchievement(
  client: TypedSupabaseClient,
  row: TablesInsert<"achievements">,
  mode: "create" | "update",
): Promise<AchievementRow> {
  if (mode === "create") {
    return unwrap(
      await client.from("achievements").insert(row).select("*").single(),
      "Couldn't create the achievement.",
    );
  }
  const { id, ...patch } = row;
  return unwrap(
    await client.from("achievements").update(patch).eq("id", id).select("*").single(),
    "Couldn't update the achievement.",
  );
}

export async function deleteAchievement(client: TypedSupabaseClient, id: string): Promise<void> {
  unwrap(await client.from("achievements").delete().eq("id", id), "Couldn't delete the achievement.");
}
