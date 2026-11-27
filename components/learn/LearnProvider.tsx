"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToasts } from "@/components/providers/ToastProvider";
import { useAuth } from "@/hooks/useAuth";
import { LESSONS } from "@/lib/learn/curriculum";
import { clearGuestProgress, hasGuestProgress, localLearnStore, readGuestData } from "@/lib/learn/local-store";
import {
  MAX_SAVED_STATE_BYTES,
  type CompleteResult,
  type LearnerState,
  type LessonPart,
  type LessonProgress,
  type LessonSavedState,
} from "@/lib/learn/progress";
import { learnerTimeZone } from "@/lib/learn/rules";
import { completeLessonPart, getLearnerState, openLesson, saveLessonProgress, setDailyGoal } from "@/services/learn";

/**
 * Beginner Mode progress for the whole app. Signed-in learners are saved in Supabase (with a
 * local copy of the current lesson's place, so a refresh never loses work even before the
 * server save lands); guests are saved in this browser and moved to their account when they
 * sign in.
 */

interface LearnContextValue {
  /** "server" when signed in with Supabase configured, else "local" (guest, this browser only). */
  mode: "server" | "local";
  state: LearnerState | null;
  loading: boolean;
  error: string | null;
  timeZone: string;
  /** Load the state if nothing has asked for it yet. */
  ensureLoaded: () => void;
  refresh: () => Promise<LearnerState | null>;
  openLesson: (lessonId: string) => Promise<LessonProgress>;
  /** Remember the learner's place in a lesson. Cheap to call often: server writes are debounced. */
  saveProgress: (lessonId: string, step: number, saved: LessonSavedState | null) => void;
  /** Send any pending save now (e.g. before leaving the lesson). */
  flush: () => Promise<void>;
  complete: (lessonId: string, part: LessonPart, perfect: boolean) => Promise<CompleteResult>;
  setGoal: (goal: number) => Promise<void>;
  /** The most recent unsynced place in a lesson, from this device. */
  localPlace: (lessonId: string) => { step: number; state: LessonSavedState | null; at: string } | null;
}

const LearnContext = createContext<LearnContextValue | null>(null);

const placeKey = (owner: string, lessonId: string) => `sql-rush:learn:place:${owner}:${lessonId}`;

function fitState(saved: LessonSavedState | null): LessonSavedState | null {
  if (!saved) return null;
  try {
    return JSON.stringify(saved).length <= MAX_SAVED_STATE_BYTES ? saved : null;
  } catch {
    return null;
  }
}

export function LearnProvider({ children }: { children: React.ReactNode }) {
  const { supabase, userId, configured } = useAuth();
  const { push } = useToasts();
  const mode: "server" | "local" = configured && supabase && userId ? "server" : "local";
  const owner = mode === "server" ? (userId as string) : "guest";
  const [timeZone, setTimeZone] = useState("UTC");
  const [state, setState] = useState<LearnerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wanted, setWanted] = useState(false);
  const pending = useRef(new Map<string, { step: number; state: LessonSavedState | null }>());
  const timer = useRef<number | null>(null);
  const syncing = useRef(false);

  useEffect(() => setTimeZone(learnerTimeZone()), []);

  const load = useCallback(async (): Promise<LearnerState | null> => {
    const tz = learnerTimeZone();
    if (mode === "local") {
      const s = localLearnStore.load(tz);
      setState(s);
      return s;
    }
    setLoading(true);
    try {
      const s = await getLearnerState(supabase!, tz);
      setState(s);
      setError(null);
      return s;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your learning progress.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [mode, supabase]);

  // Guest progress moves into the account the first time a guest signs in.
  const syncGuest = useCallback(async () => {
    if (mode !== "server" || syncing.current || !hasGuestProgress()) return;
    const guest = readGuestData();
    if (!guest) return;
    syncing.current = true;
    const tz = learnerTimeZone();
    try {
      for (const outline of LESSONS) {
        const p = guest.lessons[outline.id];
        if (!p) break;
        await openLesson(supabase!, outline.id, tz);
        if (p.checkDone) await completeLessonPart(supabase!, outline.id, "check", false, tz);
        if (p.challengeDone) await completeLessonPart(supabase!, outline.id, "challenge", false, tz);
        if (p.status === "completed") await completeLessonPart(supabase!, outline.id, "lesson", p.perfect, tz);
        else await saveLessonProgress(supabase!, outline.id, p.step, fitState(p.state));
      }
      clearGuestProgress();
      push({
        kind: "success",
        title: "Progress saved to your account",
        description: "Your guest lessons now follow you on every device.",
      });
    } catch {
      // Leave the guest copy in place and try again next time.
    } finally {
      syncing.current = false;
    }
  }, [mode, supabase, push]);

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    (async () => {
      await syncGuest();
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [wanted, load, syncGuest, owner]);

  const ensureLoaded = useCallback(() => setWanted(true), []);

  const writeServer = useCallback(async () => {
    if (mode !== "server") return;
    const items = [...pending.current.entries()];
    pending.current.clear();
    await Promise.all(
      items.map(([lessonId, p]) =>
        saveLessonProgress(supabase!, lessonId, p.step, fitState(p.state)).catch(() => undefined),
      ),
    );
  }, [mode, supabase]);

  const flush = useCallback(async () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    await writeServer();
  }, [writeServer]);

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [flush]);

  const saveProgress = useCallback(
    (lessonId: string, step: number, saved: LessonSavedState | null) => {
      const fitted = fitState(saved);
      try {
        window.localStorage.setItem(
          placeKey(owner, lessonId),
          JSON.stringify({ step, state: fitted, at: new Date().toISOString() }),
        );
      } catch {
        // Storage unavailable; the server copy still lands.
      }
      if (mode === "local") {
        localLearnStore.saveProgress(lessonId, step, fitted, learnerTimeZone());
        return;
      }
      pending.current.set(lessonId, { step, state: fitted });
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void writeServer(), 800);
    },
    [mode, owner, writeServer],
  );

  const localPlace = useCallback(
    (lessonId: string) => {
      try {
        const raw = window.localStorage.getItem(placeKey(owner, lessonId));
        return raw ? (JSON.parse(raw) as { step: number; state: LessonSavedState | null; at: string }) : null;
      } catch {
        return null;
      }
    },
    [owner],
  );

  const open = useCallback(
    async (lessonId: string) => {
      const tz = learnerTimeZone();
      setWanted(true);
      if (mode === "local") {
        const p = localLearnStore.openLesson(lessonId, tz);
        setState(localLearnStore.load(tz));
        return p;
      }
      const p = await openLesson(supabase!, lessonId, tz);
      setState((s) => (s ? { ...s, lastLessonId: lessonId, lessons: { ...s.lessons, [lessonId]: p } } : s));
      return p;
    },
    [mode, supabase],
  );

  const complete = useCallback(
    async (lessonId: string, part: LessonPart, perfect: boolean) => {
      const tz = learnerTimeZone();
      await flush();
      let result: CompleteResult;
      if (mode === "local") {
        result = localLearnStore.complete(lessonId, part, perfect, tz);
        setState(localLearnStore.load(tz));
      } else {
        result = await completeLessonPart(supabase!, lessonId, part, perfect, tz);
        void load();
      }
      return result;
    },
    [mode, supabase, flush, load],
  );

  const setGoal = useCallback(
    async (goal: number) => {
      const tz = learnerTimeZone();
      if (mode === "local") localLearnStore.setGoal(goal, tz);
      else await setDailyGoal(supabase!, goal);
      setState((s) => (s ? { ...s, dailyGoal: goal } : s));
    },
    [mode, supabase],
  );

  // A different learner (sign in / sign out): forget the old state.
  useEffect(() => {
    setState(null);
  }, [owner]);

  const value = useMemo<LearnContextValue>(
    () => ({
      mode,
      state,
      loading: loading || (wanted && !state && !error),
      error,
      timeZone,
      ensureLoaded,
      refresh: load,
      openLesson: open,
      saveProgress,
      flush,
      complete,
      setGoal,
      localPlace,
    }),
    [
      mode,
      state,
      loading,
      wanted,
      error,
      timeZone,
      ensureLoaded,
      load,
      open,
      saveProgress,
      flush,
      complete,
      setGoal,
      localPlace,
    ],
  );

  return <LearnContext.Provider value={value}>{children}</LearnContext.Provider>;
}

/** Learning progress; loads it on first use. */
export function useLearn(): LearnContextValue {
  const ctx = useContext(LearnContext);
  if (!ctx) throw new Error("useLearn must be used inside <LearnProvider>");
  const { ensureLoaded } = ctx;
  useEffect(() => ensureLoaded(), [ensureLoaded]);
  return ctx;
}
