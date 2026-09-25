"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import type { UserAnswer } from "@/lib/validation";
import { toServiceError } from "@/services/errors";
import { endGame, nextQuestion, submitAnswer } from "@/services/game";
import type { AnswerRecord, AnswerResult, PreparedQuestion, RunSummary, SessionState } from "@/types/game";

/**
 * loading → question → checking → feedback → loading … → over
 *
 * The server owns the run: it serves each question, judges each answer with
 * its own clock and ends the run. This hook mirrors that state for the UI.
 */
export type Phase = "loading" | "question" | "checking" | "feedback" | "over";

export interface GameState {
  session: SessionState;
  phase: Phase;
  paused: boolean;
  question: PreparedQuestion | null;
  history: AnswerRecord[];
  /** Result of the most recent answer. */
  last: AnswerResult | null;
  summary: RunSummary | null;
  /** A question couldn't be loaded; the run can't continue without a retry. */
  error: string | null;
}

type Action =
  | { type: "loading" }
  | { type: "loaded"; question: PreparedQuestion }
  | { type: "checking" }
  | { type: "answered"; record: AnswerRecord; result: AnswerResult }
  | { type: "submit-failed" }
  | { type: "over"; summary: RunSummary }
  | { type: "failed"; error: string }
  | { type: "pause" }
  | { type: "resume" };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "loading":
      return { ...state, phase: "loading", error: null };
    case "loaded":
      return { ...state, phase: "question", question: action.question, paused: false, error: null };
    case "checking":
      return state.phase === "question" ? { ...state, phase: "checking", paused: false } : state;
    case "answered":
      return {
        ...state,
        phase: "feedback",
        session: action.result.state,
        history: [...state.history, action.record],
        last: action.result,
      };
    case "submit-failed":
      return state.phase === "checking" ? { ...state, phase: "question" } : state;
    case "over":
      return { ...state, phase: "over", paused: false, summary: action.summary };
    case "failed":
      return { ...state, phase: "loading", error: action.error };
    case "pause":
      return state.phase === "question" ? { ...state, paused: true } : state;
    case "resume":
      return { ...state, paused: false };
  }
}

export interface SubmitOptions {
  timedOut?: boolean;
  revealed?: boolean;
}

export function useGameSession({
  session,
  timed,
  onAnswered,
  onSubmitError,
}: {
  session: SessionState;
  timed: boolean;
  onAnswered?: (record: AnswerRecord, result: AnswerResult) => void;
  onSubmitError?: (message: string) => void;
}) {
  const supabase = useSupabase();
  const sessionId = session.sessionId;
  const [state, dispatch] = useReducer(reducer, session, (s) => ({
    session: s,
    phase: "loading" as Phase,
    paused: false,
    question: null,
    history: [],
    last: null,
    summary: null,
    error: null,
  }));
  const stateRef = useRef(state);
  stateRef.current = state;
  const callbacks = useRef({ onAnswered, onSubmitError });
  callbacks.current = { onAnswered, onSubmitError };

  // Pause accounting, mirroring the server's budget (game_sessions.pause_budget_ms).
  const budgetMs = useRef(session.pauseBudgetMs);
  const pausedThisQuestion = useRef(0);
  const pausedAt = useRef<number | null>(null);

  const load = useCallback(async () => {
    dispatch({ type: "loading" });
    try {
      const q = await nextQuestion(supabase, sessionId);
      pausedThisQuestion.current = 0;
      dispatch({ type: "loaded", question: { ...q, uid: `${q.id}-${q.index}` } });
    } catch (e) {
      dispatch({ type: "failed", error: toServiceError(e).message });
    }
  }, [supabase, sessionId]);

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void load();
  }, [load]);

  /** Close an open pause, charging it to this question and the run's budget. */
  const settlePause = useCallback(() => {
    if (pausedAt.current === null) return;
    const spent = Math.min(performance.now() - pausedAt.current, budgetMs.current);
    pausedThisQuestion.current += spent;
    budgetMs.current -= spent;
    pausedAt.current = null;
  }, []);

  const submit = useCallback(
    async (answer: UserAnswer, opts: SubmitOptions = {}) => {
      const s = stateRef.current;
      if (s.phase !== "question" || !s.question) return;
      if (s.paused && !opts.timedOut) return;
      settlePause();
      const question = s.question;
      dispatch({ type: "checking" });
      try {
        const result = await submitAnswer(supabase, {
          sessionId,
          answer,
          pausedMs: pausedThisQuestion.current,
          reveal: opts.revealed,
          timedOut: opts.timedOut,
        });
        budgetMs.current = result.state.pauseBudgetMs;
        const record: AnswerRecord = {
          question,
          answer,
          correct: result.correct,
          timedOut: result.timedOut,
          revealed: result.revealed,
          secondsTaken: result.secondsTaken,
          secondsLeft: result.secondsLeft,
          basePoints: result.basePoints,
          combo: result.combo,
          timeBonus: result.timeBonus,
          points: result.points,
          xp: result.xp,
          streakAfter: result.streak,
          solution: result.solution,
        };
        dispatch({ type: "answered", record, result });
        callbacks.current.onAnswered?.(record, result);
      } catch (e) {
        dispatch({ type: "submit-failed" });
        callbacks.current.onSubmitError?.(toServiceError(e).message);
      }
    },
    [supabase, sessionId, settlePause],
  );

  const next = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "feedback") return;
    if (s.last?.gameOver && s.last.summary) {
      dispatch({ type: "over", summary: s.last.summary });
      return;
    }
    void load();
  }, [load]);

  /** Quit early. The server records the run if anything was answered. */
  const quit = useCallback(async (): Promise<RunSummary | null> => {
    const s = stateRef.current;
    if (s.phase === "over") return s.summary;
    try {
      const summary = await endGame(supabase, sessionId);
      dispatch({ type: "over", summary });
      return summary;
    } catch (e) {
      callbacks.current.onSubmitError?.(toServiceError(e).message);
      return null;
    }
  }, [supabase, sessionId]);

  const pause = useCallback((): boolean => {
    const s = stateRef.current;
    if (!timed || s.phase !== "question" || s.paused || budgetMs.current <= 0) return false;
    pausedAt.current = performance.now();
    dispatch({ type: "pause" });
    return true;
  }, [timed]);

  const resume = useCallback(() => {
    settlePause();
    dispatch({ type: "resume" });
  }, [settlePause]);

  /** Pause time left in ms, live while paused. */
  const pauseBudgetLeft = useCallback(() => {
    const running = pausedAt.current === null ? 0 : performance.now() - pausedAt.current;
    return Math.max(0, budgetMs.current - running);
  }, []);

  // When the budget runs out mid-pause, the clock starts again on its own.
  useEffect(() => {
    if (!state.paused) return;
    const id = window.setTimeout(resume, pauseBudgetLeft() + 50);
    return () => window.clearTimeout(id);
  }, [state.paused, resume, pauseBudgetLeft]);

  return { state, submit, next, quit, pause, resume, retry: load, pauseBudgetLeft };
}
