import type { TypedSupabaseClient } from "@/lib/supabase/client";
import type { UserAnswer } from "@/lib/validation";
import type { Json } from "@/types/database";
import type { AnswerResult, PlayQuestion, RunConfig, RunSummary, SessionState } from "@/types/game";
import { unwrap } from "./errors";

/** Opens a run (or resumes today's daily challenge). */
export async function startGame(client: TypedSupabaseClient, config: RunConfig): Promise<SessionState> {
  const data = unwrap(
    await client.rpc("start_game", {
      p_mode: config.mode,
      p_difficulty: config.difficulty,
      p_types: config.types.length ? config.types : null,
    }),
    "Couldn't start the game.",
  );
  return data as unknown as SessionState;
}

/** Serves the next question and starts its clock on the server. */
export async function nextQuestion(client: TypedSupabaseClient, sessionId: string): Promise<PlayQuestion> {
  const data = unwrap(
    await client.rpc("next_question", { p_session_id: sessionId }),
    "Couldn't load the next question.",
  );
  return data as unknown as PlayQuestion;
}

export async function submitAnswer(
  client: TypedSupabaseClient,
  input: { sessionId: string; answer: UserAnswer; pausedMs: number; reveal?: boolean; timedOut?: boolean },
): Promise<AnswerResult> {
  const data = unwrap(
    await client.rpc("submit_answer", {
      p_session_id: input.sessionId,
      p_answer: input.answer as unknown as Json,
      p_paused_ms: Math.max(0, Math.round(input.pausedMs)),
      p_reveal: input.reveal ?? false,
      p_timed_out: input.timedOut ?? false,
    }),
    "Couldn't submit your answer.",
  );
  return data as unknown as AnswerResult;
}

/** Quits a run early. Runs with at least one answer are still recorded. */
export async function endGame(client: TypedSupabaseClient, sessionId: string): Promise<RunSummary> {
  const data = unwrap(await client.rpc("end_game", { p_session_id: sessionId }), "Couldn't end the game.");
  return data as unknown as RunSummary;
}
