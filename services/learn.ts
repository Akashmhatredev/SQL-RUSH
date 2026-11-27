import type { TypedSupabaseClient } from "@/lib/supabase/client";
import type { CompleteResult, LearnerState, LessonPart, LessonProgress, LessonSavedState } from "@/lib/learn/progress";
import type { Json } from "@/types/database";
import { unwrap } from "./errors";

/**
 * Beginner Mode progress, through the learn_* RPCs in
 * supabase/migrations/20261127000001_beginner_mode.sql. Every call acts as the
 * signed-in learner; `tz` is their IANA time zone (lib/learn/rules.ts learnerTimeZone()),
 * so "today", streaks and the daily goal follow their own midnight.
 */

export async function getLearnerState(client: TypedSupabaseClient, tz: string): Promise<LearnerState> {
  const data = unwrap(await client.rpc("learn_get_state", { p_tz: tz }), "Couldn't load your learning progress.");
  return data as unknown as LearnerState;
}

/** Starts, resumes or reviews a lesson. Throws a ServiceError (P0001) when the lesson is still locked. */
export async function openLesson(client: TypedSupabaseClient, lessonId: string, tz: string): Promise<LessonProgress> {
  const data = unwrap(
    await client.rpc("learn_open_lesson", { p_lesson: lessonId, p_tz: tz }),
    "Couldn't open this lesson.",
  );
  return data as unknown as LessonProgress;
}

/** Remembers the step the learner is on and any unfinished work. */
export async function saveLessonProgress(
  client: TypedSupabaseClient,
  lessonId: string,
  step: number,
  state: LessonSavedState | null,
): Promise<void> {
  unwrap(
    await client.rpc("learn_save_progress", {
      p_lesson: lessonId,
      p_step: step,
      p_state: (state ?? null) as Json | null,
    }),
    "Couldn't save your place in this lesson.",
  );
}

/** Records the knowledge check, the challenge or the whole lesson, and returns what it earned. */
export async function completeLessonPart(
  client: TypedSupabaseClient,
  lessonId: string,
  part: LessonPart,
  perfect: boolean,
  tz: string,
): Promise<CompleteResult> {
  const data = unwrap(
    await client.rpc("learn_complete", { p_lesson: lessonId, p_part: part, p_perfect: perfect, p_tz: tz }),
    "Couldn't save your progress.",
  );
  return data as unknown as CompleteResult;
}

export async function setDailyGoal(client: TypedSupabaseClient, goal: number): Promise<void> {
  unwrap(await client.rpc("learn_set_goal", { p_goal: goal }), "Couldn't change your daily goal.");
}
