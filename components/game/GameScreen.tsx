"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  Eye,
  Lightbulb,
  LoaderCircle,
  Pause,
  RotateCcw,
  Send,
  SkipForward,
  TriangleAlert,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToasts } from "@/components/providers/ToastProvider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SCHEMA_BY_NAME, type SchemaTable } from "@/data/schema";
import { useAuth } from "@/hooks/useAuth";
import { useCountdown } from "@/hooks/useCountdown";
import { useCountUp } from "@/hooks/useCountUp";
import { useGameSession, type SubmitOptions } from "@/hooks/useGameSession";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useSound } from "@/hooks/useSound";
import { DIFFICULTY_CONFIG, MODE_CONFIG, WARNING_SECONDS } from "@/lib/config";
import { levelForXp } from "@/lib/levels";
import { comboMultiplier } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { UserAnswer } from "@/lib/validation";
import type {
  AnswerRecord,
  AnswerResult,
  PreparedQuestion,
  RunConfig,
  SessionState,
  UnlockedAchievement,
} from "@/types/game";
import { DIFFICULTIES } from "@/types/question";
import { ComboBurst, ComboMeter } from "./ComboMeter";
import { FeedbackPanel } from "./FeedbackPanel";
import { Lives } from "./Lives";
import { PauseMenu } from "./PauseMenu";
import { emptyDraft, QuestionMeta, QuestionView, type Draft } from "./QuestionView";
import { SchemaPanel } from "./SchemaPanel";
import { TimerRing } from "./TimerRing";

// Only needed at the end of a run, or on demand.
const GameOver = dynamic(() => import("./GameOver").then((mod) => mod.GameOver), {
  loading: () => (
    <div className="grid min-h-dvh place-items-center">
      <LoaderCircle className="size-8 animate-spin text-violet-500" aria-label="Loading results" />
    </div>
  ),
});
const ShortcutsModal = dynamic(() => import("@/components/ShortcutsModal").then((mod) => mod.ShortcutsModal));

const BLANK_DRAFT: Draft = { text: "", choice: null, order: [] };

function toUserAnswer(q: PreparedQuestion, draft: Draft): UserAnswer {
  switch (q.type) {
    case "write-sql":
    case "fix-query":
      return { kind: "text", value: draft.text };
    case "multiple-choice":
    case "predict-output":
      return { kind: "choice", value: draft.choice };
    case "drag-drop": {
      const byKey = new Map(q.tokenPool.map((t) => [t.key, t.text]));
      return { kind: "order", value: draft.order.map((k) => byKey.get(k) ?? "") };
    }
  }
}

function hasInput(q: PreparedQuestion, draft: Draft): boolean {
  if (q.type === "write-sql" || q.type === "fix-query") return draft.text.trim().length > 0;
  if (q.type === "drag-drop") return draft.order.length > 0;
  return draft.choice !== null;
}

function Score({ value }: { value: number }) {
  const shown = useCountUp(value, { duration: 0.6 });
  return <span className="tabular-nums">{shown.toLocaleString()}</span>;
}

export function GameScreen({
  config,
  session,
  onRestart,
}: {
  config: RunConfig;
  session: SessionState;
  /** Start a fresh run. Not offered for the daily challenge (one attempt a day). */
  onRestart?: () => void;
}) {
  const mode = MODE_CONFIG[config.mode];
  const practice = config.mode === "practice";
  const router = useRouter();
  const { push } = useToasts();
  const { play, muted, toggleMute } = useSound();
  const { refreshProfile } = useAuth();

  const [draft, setDraft] = useState<Draft>(BLANK_DRAFT);
  const [showHint, setShowHint] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [burst, setBurst] = useState<number | null>(null);
  const [runUnlocked, setRunUnlocked] = useState<UnlockedAchievement[]>([]);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const celebrate = useCallback(
    (unlocked: UnlockedAchievement[] | undefined) => {
      if (!unlocked?.length) return;
      setRunUnlocked((all) => [...all, ...unlocked.filter((u) => !all.some((a) => a.id === u.id))]);
      for (const a of unlocked) push({ kind: "achievement", achievement: a });
    },
    [push],
  );

  const onAnswered = useCallback(
    (record: AnswerRecord, result: AnswerResult) => {
      if (record.correct) {
        play("correct");
        const before = comboMultiplier(record.streakAfter - 1);
        const after = comboMultiplier(record.streakAfter);
        if (after > before && !practice) {
          setBurst(after);
          window.setTimeout(() => play("combo"), 180);
          window.setTimeout(() => setBurst(null), 1100);
        }
      } else if (!record.revealed) {
        play("wrong");
        if ("vibrate" in navigator) navigator.vibrate?.(120);
      }
      celebrate(result.unlocked);
      const levelBefore = levelForXp(result.xpBefore);
      const levelAfter = levelForXp(result.xpAfter);
      if (levelAfter.index > levelBefore.index) push({ kind: "level", level: levelAfter });
    },
    [play, practice, celebrate, push],
  );

  const onSubmitError = useCallback(
    (message: string) => push({ kind: "error", title: "Something went wrong", description: message }),
    [push],
  );

  const game = useGameSession({ session, timed: mode.timed, onAnswered, onSubmitError });
  const { state } = game;
  const question = state.question;
  const stateRef = useRef(state);
  stateRef.current = state;
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const record = state.phase === "feedback" ? state.history[state.history.length - 1] : null;
  const running = mode.timed && state.phase === "question" && !state.paused;
  const submitRef = useRef<(opts?: SubmitOptions) => void>(() => {});

  const { remaining } = useCountdown({
    duration: question?.timer ?? 30,
    initial: question?.secondsLeft,
    running,
    resetKey: question?.uid ?? "none",
    onExpire: () => submitRef.current({ timedOut: true }),
    onSecond: (s) => {
      if (s === WARNING_SECONDS || (s <= 5 && s > 0)) play("warning");
    },
  });

  // Fresh input for every new question.
  useEffect(() => {
    if (!question) return;
    setDraft(emptyDraft(question));
    setShowHint(false);
  }, [question]);

  const submit = useCallback(
    (override?: Draft, opts: SubmitOptions = {}) => {
      const q = stateRef.current.question;
      if (!q) return;
      void game.submit(toUserAnswer(q, override ?? draftRef.current), opts);
    },
    [game],
  );
  submitRef.current = (opts) => submit(undefined, opts);

  const goNext = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "feedback") return;
    if (config.mode === "endless" && s.last?.tierUp) {
      const label = DIFFICULTY_CONFIG[DIFFICULTIES[s.session.tier]].label;
      push({ kind: "info", title: `Difficulty up: ${label}!`, description: "Bigger points, longer timer." });
    }
    game.next();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [config.mode, game, push]);

  const quitNow = useCallback(async () => {
    setConfirmQuit(false);
    const nothingAnswered = stateRef.current.history.length === 0;
    const summary = await game.quit();
    if (nothingAnswered) router.push("/");
    else celebrate(summary?.unlocked);
  }, [game, router, celebrate]);

  const endRun = useCallback(() => {
    // The daily challenge is one attempt: make sure quitting is deliberate.
    if (config.mode === "daily") {
      game.pause();
      setConfirmQuit(true);
    } else {
      void quitNow();
    }
  }, [config.mode, game, quitNow]);

  // Wrap up once the run is over.
  const finished = useRef(false);
  useEffect(() => {
    if (state.phase !== "over" || finished.current) return;
    finished.current = true;
    const s = state.summary;
    play(s?.endReason === "lives" ? "gameover" : s?.newHighScore ? "levelup" : "correct");
    void refreshProfile();
  }, [state.phase, state.summary, play, refreshProfile]);

  const togglePause = useCallback(() => {
    const s = stateRef.current;
    if (s.paused) {
      game.resume();
    } else if (mode.timed && s.phase === "question" && !game.pause()) {
      push({
        kind: "info",
        title: "No pause time left",
        description: "The clock keeps running for the rest of this run.",
      });
    }
  }, [game, mode.timed, push]);

  // Pause when the tab is hidden, so the timer can't run out unseen (while pause time lasts).
  useEffect(() => {
    if (!mode.timed) return;
    const onVisibility = () => {
      if (document.hidden) game.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [mode.timed, game]);

  // Bring the explanation into view on small screens.
  useEffect(() => {
    if (state.phase !== "feedback") return;
    const id = window.setTimeout(
      () => feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      60,
    );
    return () => window.clearTimeout(id);
  }, [state.phase]);

  const openShortcuts = useCallback(() => {
    game.pause();
    setShortcutsOpen(true);
  }, [game]);

  const isChoice = question?.type === "multiple-choice" || question?.type === "predict-output";
  const canAnswer = state.phase === "question" && !state.paused;

  useHotkeys(
    {
      p: togglePause,
      Escape: () => {
        if (state.phase === "question") togglePause();
      },
      m: toggleMute,
      "?": openShortcuts,
      r: () => {
        if (onRestart && state.paused) onRestart();
      },
      h: () => {
        if (practice && state.phase === "question") setShowHint(true);
      },
      s: () => {
        if (practice && state.phase === "question") submit(undefined, { revealed: true });
      },
      Enter: (e) => {
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
        if (state.paused) return;
        if (state.phase === "feedback") {
          e.preventDefault();
          goNext();
        } else if (canAnswer && question?.type === "drag-drop" && draft.order.length) {
          e.preventDefault();
          submit();
        }
      },
      "mod+Enter": (e) => {
        if (!canAnswer) return;
        e.preventDefault();
        submit();
      },
      ...Object.fromEntries(
        ["1", "2", "3", "4", "a", "b", "c", "d"].map((k, i) => [
          k,
          () => {
            if (!isChoice || !canAnswer || !question) return;
            const option = question.options[i % 4];
            if (!option) return;
            const next = { ...draft, choice: option };
            setDraft(next);
            submit(next);
          },
        ]),
      ),
    },
    { allowInInputs: ["Escape", "mod+Enter"], enabled: !shortcutsOpen && !confirmQuit && state.phase !== "over" },
  );

  const tables = useMemo<SchemaTable[]>(
    () => (question?.schemaTables ?? []).map((name) => SCHEMA_BY_NAME[name]).filter(Boolean),
    [question],
  );

  if (state.phase === "over") {
    return <GameOver config={config} state={state} unlocked={runUnlocked} onRestart={onRestart} />;
  }

  const s = state.session;
  const total = s.total;
  const showSchema = !!question && question.type !== "predict-output";
  const danger = running && remaining <= WARNING_SECONDS;
  const nextLabel = state.last?.gameOver
    ? s.lives <= 0 && mode.lives
      ? "See results"
      : "Finish run"
    : "Next question";
  const questionNumber = Math.max(question?.index ?? s.served, 1);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-3 pb-10 pt-3 sm:px-6">
      {/* Red flash when time is running out */}
      {danger && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30 animate-danger-pulse shadow-[inset_0_0_120px_20px_rgb(244_63_94/0.3)]"
        />
      )}
      <ComboBurst multiplier={burst ?? 1} show={burst !== null} />

      {/* HUD */}
      <header className="clay-strong sticky top-2 z-20 flex items-center gap-2 rounded-3xl px-2.5 py-2 sm:gap-4 sm:px-4">
        <button
          type="button"
          onClick={endRun}
          className="grid size-9 shrink-0 place-items-center rounded-2xl text-ink-500 transition-all hover:-translate-y-0.5 hover:bg-white hover:text-ink-900 hover:shadow-clay-sm active:translate-y-px active:shadow-clay-pressed"
          aria-label="End run"
        >
          <X className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-ink-800 sm:text-sm">
            {mode.label}
            <span className="ml-2 font-mono text-[11px] font-semibold text-ink-500">
              {total !== null ? `${questionNumber}/${total}` : `#${questionNumber}`}
              {config.mode === "endless" && ` · ${DIFFICULTY_CONFIG[DIFFICULTIES[s.tier]].label}`}
            </span>
          </p>
          {total !== null && (
            <ProgressBar
              value={(questionNumber - 1 + (state.phase === "feedback" ? 1 : 0)) / total}
              className="mt-1 h-1.5"
              label="Run progress"
            />
          )}
        </div>
        <Lives lives={s.lives} unlimited={!mode.lives} />
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Score</p>
          <p className="font-mono text-sm font-extrabold text-ink-900 sm:text-base">
            <Score value={s.score} />
          </p>
        </div>
        <div className="hidden sm:block">
          <ComboMeter streak={s.streak} />
        </div>
        <button
          type="button"
          onClick={toggleMute}
          className="hidden size-9 place-items-center rounded-2xl text-ink-500 transition-all hover:-translate-y-0.5 hover:bg-white hover:text-ink-900 hover:shadow-clay-sm active:translate-y-px active:shadow-clay-pressed sm:grid"
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
        {mode.timed && (
          <button
            type="button"
            onClick={togglePause}
            disabled={state.phase !== "question"}
            className="grid size-9 place-items-center rounded-2xl text-ink-500 transition-all hover:-translate-y-0.5 hover:bg-white hover:text-ink-900 hover:shadow-clay-sm active:translate-y-px active:shadow-clay-pressed disabled:pointer-events-none disabled:opacity-40"
            aria-label="Pause"
          >
            <Pause className="size-5" />
          </button>
        )}
      </header>

      <div className="mt-2 flex justify-center sm:hidden">
        <ComboMeter streak={s.streak} />
      </div>

      <main className={cn("mt-4 grid flex-1 gap-4", showSchema && "lg:grid-cols-[minmax(0,1fr)_300px]")}>
        <div className="min-w-0 space-y-4">
          {state.error ? (
            <div className="clay rounded-[2rem] p-6 text-center" role="alert">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 shadow-clay-sm">
                <TriangleAlert className="size-8 text-amber-500" aria-hidden />
              </span>
              <h2 className="mt-3 text-lg font-extrabold text-ink-900">Couldn&apos;t load the next question</h2>
              <p className="mt-1 text-sm text-ink-600">{state.error}</p>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="primary" onClick={() => void game.retry()}>
                  <RotateCcw aria-hidden /> Try again
                </Button>
                <Button onClick={endRun}>End run</Button>
              </div>
            </div>
          ) : !question || state.phase === "loading" ? (
            <div className="clay grid min-h-72 place-items-center rounded-[2rem] p-6" role="status">
              <div className="flex flex-col items-center gap-3 text-sm font-semibold text-ink-500">
                <LoaderCircle className="size-7 animate-spin text-violet-500" aria-hidden />
                {state.history.length ? "Next question…" : "Loading your first question…"}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <m.article
                key={question.uid}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={cn(
                  "clay relative rounded-[2rem] p-4 transition-[box-shadow,background-color] sm:p-6",
                  record &&
                    !record.correct &&
                    !record.revealed &&
                    "animate-shake bg-rose-50 ring-2 ring-rose-300 shadow-[10px_14px_28px_-10px_rgb(244_63_94/0.45),inset_-6px_-8px_14px_rgb(159_18_57/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)]",
                  record?.correct &&
                    "bg-emerald-50 ring-2 ring-emerald-300 shadow-[10px_14px_28px_-10px_rgb(16_185_129/0.5),inset_-6px_-8px_14px_rgb(6_95_70/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)]",
                  state.paused && "pointer-events-none select-none blur-md",
                )}
                aria-hidden={state.paused}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <QuestionMeta question={question} />
                  <TimerRing
                    remaining={remaining}
                    duration={question.timer}
                    paused={state.paused}
                    untimed={!mode.timed}
                  />
                </div>

                <QuestionView
                  question={question}
                  draft={draft}
                  onDraft={setDraft}
                  onSubmit={(override) => submit(override)}
                  result={record}
                  busy={state.phase === "checking"}
                  showHint={showHint}
                />

                {(state.phase === "question" || state.phase === "checking") && (
                  <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                    {practice && (
                      <>
                        {question.hint && !showHint && (
                          <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
                            <Lightbulb aria-hidden /> Hint <Kbd>H</Kbd>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => submit(undefined, { revealed: true })}>
                          <Eye aria-hidden /> Reveal <Kbd>S</Kbd>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={endRun}>
                          <SkipForward aria-hidden /> Finish session
                        </Button>
                      </>
                    )}
                    {state.phase === "checking" && isChoice && (
                      <span className="flex items-center gap-2 text-sm font-semibold text-ink-500" role="status">
                        <LoaderCircle className="size-4 animate-spin" aria-hidden /> Checking…
                      </span>
                    )}
                    {!isChoice && (
                      <Button
                        variant="primary"
                        onClick={() => submit()}
                        disabled={state.phase !== "question" || !hasInput(question, draft)}
                      >
                        {state.phase === "checking" ? (
                          <>
                            <LoaderCircle className="animate-spin" aria-hidden /> Checking…
                          </>
                        ) : (
                          <>
                            <Send aria-hidden /> Submit
                            <Kbd className="hidden border-white/40 bg-white/20 text-white sm:inline-flex">
                              {question.type === "drag-drop" ? "Enter" : "⌘↵"}
                            </Kbd>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </m.article>
            </AnimatePresence>
          )}

          <div ref={feedbackRef} className="scroll-mt-24">
            {record && (
              <FeedbackPanel key={record.question.uid} record={record} onNext={goNext} nextLabel={nextLabel} />
            )}
          </div>
        </div>

        {showSchema && question && (
          <SchemaPanel key={question.uid} tables={tables} className="lg:sticky lg:top-24 lg:self-start" />
        )}
      </main>

      <PauseMenu
        open={state.paused && !confirmQuit}
        onResume={game.resume}
        onRestart={onRestart}
        onQuit={endRun}
        onShortcuts={openShortcuts}
        muted={muted}
        onToggleMute={toggleMute}
        pauseTimeLeft={game.pauseBudgetLeft}
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <AlertDialog
        open={confirmQuit}
        onOpenChange={(open) => {
          setConfirmQuit(open);
          if (!open) game.resume();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End today&apos;s challenge?</AlertDialogTitle>
            <AlertDialogDescription>
              You only get one attempt at the daily challenge. Your score so far will be recorded and you won&apos;t be
              able to play it again today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep playing</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={() => void quitNow()}>
              End challenge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
