"use client";

import { AnimatePresence, m } from "framer-motion";
import { CalendarCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/useSettings";
import { useSupabase } from "@/hooks/useSupabase";
import { MODE_CONFIG } from "@/lib/config";
import { msUntilUtcMidnight } from "@/lib/date";
import { toServiceError } from "@/services/errors";
import { startGame } from "@/services/game";
import { GAME_MODES, type GameMode, type RunConfig, type SessionState } from "@/types/game";
import { DIFFICULTIES, QUESTION_TYPES, type Difficulty, type QuestionType } from "@/types/question";
import { GameScreen } from "./GameScreen";

interface Run {
  id: number;
  session: SessionState;
}

function GetReady({ onDone, label }: { onDone: () => void; label: string }) {
  const [count, setCount] = useState(3);
  useEffect(() => {
    if (count === 0) {
      const id = window.setTimeout(onDone, 450);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setCount((c) => c - 1), 550);
    return () => window.clearTimeout(id);
  }, [count, onDone]);

  useEffect(() => {
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [onDone]);

  return (
    <button
      type="button"
      onClick={onDone}
      className="grid min-h-dvh w-full place-items-center"
      aria-label="Skip countdown"
    >
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">{label}</p>
        <div className="relative mt-4 h-40">
          <AnimatePresence mode="popLayout">
            <m.p
              key={count}
              initial={{ scale: 2.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="text-gradient animate-gradient text-9xl font-black italic"
            >
              {count === 0 ? "GO!" : count}
            </m.p>
          </AnimatePresence>
        </div>
        <p className="mt-2 text-xs text-slate-600">Tap or press any key to skip</p>
      </div>
    </button>
  );
}

function hoursLeft() {
  const ms = msUntilUtcMidnight();
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

export function GameLauncher() {
  const params = useSearchParams();
  const supabase = useSupabase();
  const { settings, hydrated } = useSettings();
  const [run, setRun] = useState<Run | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const runCounter = useRef(0);
  const starting = useRef(false);

  const modeParam = params.get("mode");
  const diffParam = params.get("difficulty");
  const typesParam = params.get("types");
  const typesKey = settings.types.join(",");
  const config = useMemo<RunConfig>(() => {
    const mode: GameMode = GAME_MODES.includes(modeParam as GameMode) ? (modeParam as GameMode) : "classic";
    const difficulty: Difficulty = DIFFICULTIES.includes(diffParam as Difficulty)
      ? (diffParam as Difficulty)
      : settings.difficulty;
    const fromUrl = typesParam?.split(",").filter((t): t is QuestionType => QUESTION_TYPES.includes(t as QuestionType));
    const types = fromUrl?.length ? fromUrl : (typesKey.split(",") as QuestionType[]);
    return { mode, difficulty, types };
    // settings are only a fallback, read once hydrated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeParam, diffParam, typesParam, typesKey, hydrated]);

  const start = useCallback(async () => {
    if (starting.current) return;
    starting.current = true;
    setError(null);
    setReady(false);
    try {
      const session = await startGame(supabase, config);
      setRun({ id: ++runCounter.current, session });
      // No countdown for untimed practice or for a run resumed mid-question.
      if (!MODE_CONFIG[config.mode].timed || (session.resumed && session.served > 0)) setReady(true);
    } catch (e) {
      const err = toServiceError(e, "Couldn't start the game.");
      if (config.mode === "daily" && /already played/i.test(err.message)) setAlreadyPlayed(true);
      else setError(err.message);
    } finally {
      starting.current = false;
    }
  }, [config, supabase]);

  useEffect(() => {
    if (hydrated) void start();
  }, [hydrated, start]);

  const onReady = useCallback(() => setReady(true), []);

  if (alreadyPlayed) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="glass max-w-sm rounded-3xl p-6 text-center">
          <CalendarCheck className="mx-auto size-10 text-emerald-300" aria-hidden />
          <h1 className="mt-3 text-lg font-bold text-white">You&apos;ve played today&apos;s challenge</h1>
          <p className="mt-1 text-sm text-slate-400">
            One attempt per day. The next challenge unlocks in {hoursLeft()} (midnight UTC).
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="primary" asChild>
              <Link href="/leaderboard?board=challenge">See today&apos;s standings</Link>
            </Button>
            <Button asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center p-6">
        <div className="glass max-w-sm rounded-3xl p-6 text-center">
          <TriangleAlert className="mx-auto size-10 text-amber-300" aria-hidden />
          <h1 className="mt-3 text-lg font-bold text-white">Couldn&apos;t start the game</h1>
          <p className="mt-1 text-sm text-slate-400">{error}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="primary" onClick={() => void start()}>
              Try again
            </Button>
            <Button asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status" aria-label="Starting game">
        <div className="flex flex-col items-center gap-4">
          <Logo className="size-14 animate-pulse" />
          <p className="text-sm text-slate-400">Setting up your run…</p>
        </div>
      </div>
    );
  }

  if (!ready) return <GetReady onDone={onReady} label={MODE_CONFIG[config.mode].label} />;

  return (
    <GameScreen
      key={run.id}
      config={config}
      session={run.session}
      onRestart={config.mode === "daily" ? undefined : () => void start()}
    />
  );
}
