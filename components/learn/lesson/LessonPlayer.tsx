"use client";

import { AnimatePresence, m } from "framer-motion";
import { ArrowLeft, ArrowRight, Flame, Lock, LogIn, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLearn } from "@/components/learn/LearnProvider";
import { RichText } from "@/components/learn/engine/RichText";
import { useToasts } from "@/components/providers/ToastProvider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { LessonOutline, ModuleOutline } from "@/lib/learn/curriculum";
import type { CompleteResult, LessonPart } from "@/lib/learn/progress";
import { learnLevelFor, STREAK_MILESTONES } from "@/lib/learn/rules";
import type { Lesson, LessonStep } from "@/lib/learn/types";
import { cn } from "@/lib/utils";
import { ChallengeView, type ChallengeSaved } from "./ChallengeView";
import { KnowledgeCheck, type CheckSaved } from "./KnowledgeCheck";
import { LessonComplete } from "./LessonComplete";
import { lessonDb } from "./shared";
import { LessonStepView } from "./StepViews";

const KIND_LABELS: Record<LessonStep["kind"], { label: string; tone: string }> = {
  story: { label: "Story", tone: "bg-sky-100 text-sky-800" },
  explore: { label: "Explore", tone: "bg-emerald-100 text-emerald-800" },
  database: { label: "Explore", tone: "bg-emerald-100 text-emerald-800" },
  predict: { label: "Your guess", tone: "bg-amber-100 text-amber-800" },
  animate: { label: "Watch", tone: "bg-violet-100 text-violet-800" },
  concept: { label: "The idea", tone: "bg-fuchsia-100 text-fuchsia-800" },
  syntax: { label: "SQL", tone: "bg-violet-600 text-white" },
  playground: { label: "Try it", tone: "bg-rose-100 text-rose-800" },
};

interface Saved {
  v: 1;
  steps: Record<string, Record<string, unknown>>;
  check: CheckSaved | null;
  challenge: ChallengeSaved | null;
}

const EMPTY: Saved = { v: 1, steps: {}, check: null, challenge: null };

function asSaved(raw: unknown): Saved {
  const s = raw as Partial<Saved> | null;
  if (!s || s.v !== 1) return EMPTY;
  return { v: 1, steps: s.steps ?? {}, check: s.check ?? null, challenge: s.challenge ?? null };
}

/**
 * One lesson, start to finish: the visual steps, the knowledge check, the challenge and the
 * celebration. The learner's place and unfinished work are saved as they go, so a refresh or
 * a different device picks up exactly where they left off.
 */
export function LessonPlayer({
  lesson,
  outline,
  module,
  next,
  prev,
}: {
  lesson: Lesson;
  outline: LessonOutline;
  module: ModuleOutline;
  next: LessonOutline | null;
  prev: LessonOutline | null;
}) {
  const learn = useLearn();
  const { profile } = useAuth();
  const { push } = useToasts();
  const db = useMemo(() => lessonDb(lesson.tables), [lesson.tables]);
  const stepCount = lesson.steps.length;
  const CHECK = stepCount;
  const CHALLENGE = stepCount + 1;
  const DONE = stepCount + 2;

  const [status, setStatus] = useState<"loading" | "ready" | "locked" | "error">("loading");
  const [message, setMessage] = useState("");
  const [at, setAt] = useState(0);
  const [saved, setSaved] = useState<Saved>(EMPTY);
  const [ready, setReady] = useState(false);
  const [review, setReview] = useState(false);
  const [parts, setParts] = useState({ check: false, challenge: false });
  const [results, setResults] = useState<CompleteResult[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [saving, setSaving] = useState<LessonPart | null>(null);
  const top = useRef<HTMLDivElement>(null);
  const loadedFor = useRef<string | null>(null);

  // Open (or resume) the lesson.
  useEffect(() => {
    const owner = `${learn.mode}:${profile?.id ?? "guest"}:${lesson.id}`;
    if (loadedFor.current === owner) return;
    loadedFor.current = owner;
    let cancelled = false;
    (async () => {
      try {
        const p = await learn.openLesson(lesson.id);
        if (cancelled) return;
        const local = learn.localPlace(lesson.id);
        const useLocal = local && new Date(local.at).getTime() > new Date(p.updatedAt).getTime() + 1000;
        const place = useLocal ? { step: local.step, state: local.state } : { step: p.step, state: p.state };
        setParts({ check: p.checkDone, challenge: p.challengeDone });
        if (p.status === "completed" && place.step >= DONE) {
          setReview(true);
          setAt(0);
          setSaved(EMPTY);
        } else {
          setReview(p.status === "completed");
          setAt(Math.max(0, Math.min(place.step, DONE)));
          setSaved(asSaved(place.state));
        }
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Couldn't open this lesson.";
        setMessage(msg);
        setStatus(/unlock|previous lesson/i.test(msg) ? "locked" : "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [learn, lesson.id, profile?.id, DONE]);

  // Save the place (and unfinished work) whenever it changes.
  useEffect(() => {
    if (status !== "ready") return;
    learn.saveProgress(lesson.id, at, saved as unknown as Record<string, unknown>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, saved, status, lesson.id]);

  useEffect(() => {
    setReady(at >= CHECK);
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [at, CHECK]);

  const celebrate = useCallback(
    (r: CompleteResult) => {
      for (const b of r.unlocked) push({ kind: "achievement", achievement: b });
      const before = learnLevelFor(r.xpBefore);
      const after = learnLevelFor(r.xpAfter);
      if (after.index > before.index) push({ kind: "level", level: after });
      if (r.streakExtended && STREAK_MILESTONES.includes(r.streak)) {
        push({
          kind: "success",
          title: `🔥 ${r.streak}-day streak!`,
          description: "You've learned every day. Keep it going!",
        });
      }
    },
    [push],
  );

  const record = useCallback(
    async (part: LessonPart, perfect = false) => {
      setSaving(part);
      try {
        const r = await learn.complete(lesson.id, part, perfect);
        setResults((all) => [...all, r]);
        celebrate(r);
        if (part !== "lesson") setParts((p) => ({ ...p, [part]: true }));
        return r;
      } catch (e) {
        push({ kind: "error", title: "Couldn't save that", description: e instanceof Error ? e.message : undefined });
        return null;
      } finally {
        setSaving(null);
      }
    },
    [learn, lesson.id, celebrate, push],
  );

  const perfect = (saved.check?.missed.length ?? 1) === 0 && saved.challenge?.revealed === false;

  const finish = async () => {
    setFinishing(true);
    const r = await record("lesson", perfect);
    setFinishing(false);
    if (r) setAt(DONE);
  };

  const onStepSave = useCallback(
    (value: Record<string, unknown>) =>
      setSaved((s) => ({ ...s, steps: { ...s.steps, [String(at)]: { ...s.steps[String(at)], ...value } } })),
    [at],
  );
  const onCheckSave = useCallback((c: CheckSaved) => setSaved((s) => ({ ...s, check: c })), []);
  const onChallengeSave = useCallback((c: ChallengeSaved) => setSaved((s) => ({ ...s, challenge: c })), []);
  const onReady = useCallback((r: boolean) => setReady(r), []);

  const restart = () => {
    setReview(true);
    setResults([]);
    setSaved(EMPTY);
    setAt(0);
  };

  if (status === "loading") {
    return (
      <div className="mx-auto grid min-h-[60dvh] max-w-3xl place-items-center px-4">
        <div className="text-center">
          <span className="text-5xl" aria-hidden>
            {module.emoji}
          </span>
          <p className="mt-3 animate-pulse font-bold text-ink-600">Opening {outline.title}…</p>
        </div>
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="clay rounded-[2rem] p-8">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-ink-100 text-ink-500 shadow-clay-sm">
            <Lock className="size-7" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-black text-ink-900">
            {status === "locked" ? "This lesson is still locked" : "Something went wrong"}
          </h1>
          <p className="mt-2 text-ink-600">
            {status === "locked" ? `Finish “${prev?.title}” first: each lesson builds on the one before.` : message}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {status === "locked" && prev && (
              <Button variant="primary" asChild>
                <Link href={`/learn/${prev.id}`}>Go to {prev.title}</Link>
              </Button>
            )}
            <Button variant="secondary" asChild>
              <Link href="/learn">Back to the roadmap</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const step = at < stepCount ? lesson.steps[at] : null;
  const segments = [...lesson.steps.map((s) => s.title), "Knowledge check", "Challenge"];
  const streak = learn.state?.streak ?? 0;

  return (
    <div className="pb-28">
      <div ref={top} className="scroll-mt-0" />
      <header className="sticky top-0 z-30 border-b border-white/60 bg-background/85 px-3 py-2.5 backdrop-blur-md sm:px-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link
            href="/learn"
            onClick={() => void learn.flush()}
            className="grid size-10 shrink-0 place-items-center rounded-2xl text-ink-500 transition-all hover:bg-white hover:text-ink-900 hover:shadow-clay-sm"
            aria-label="Close the lesson and go back to the roadmap"
          >
            <X className="size-5" />
          </Link>
          <ol className="flex flex-1 items-center gap-1" aria-label="Lesson progress">
            {segments.map((title, i) => (
              <li key={i} className="flex-1" title={title}>
                <span
                  className={cn(
                    "block h-2.5 rounded-full transition-colors duration-500",
                    i < at || at === DONE
                      ? "bg-gradient-to-r from-violet-400 to-fuchsia-400"
                      : i === at
                        ? "bg-violet-300"
                        : "bg-ink-200/80",
                  )}
                />
                <span className="sr-only">
                  {title}
                  {i < at ? " (done)" : i === at ? " (current)" : ""}
                </span>
              </li>
            ))}
          </ol>
          <span
            className="hidden items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-black text-orange-700 shadow-clay-sm sm:flex"
            title="Learning streak"
          >
            <Flame className={cn("size-4", streak ? "fill-orange-400 text-orange-500" : "text-ink-300")} aria-hidden />{" "}
            {streak}
          </span>
          <span
            className="rounded-full bg-violet-100 px-2.5 py-1 font-mono text-xs font-black text-violet-800 shadow-clay-sm"
            title="Learning XP"
          >
            {(learn.state?.xp ?? 0).toLocaleString()} XP
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-6">
        {at === 0 && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
              {module.emoji} Module {module.number} · Lesson {outline.number} · {lesson.minutes} min
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">{outline.title}</h1>
            <p className="mt-1 text-ink-600">{lesson.summary}</p>
            {review && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 shadow-clay-sm">
                <RotateCcw className="size-3.5" aria-hidden /> Review mode: you&apos;ve completed this lesson
              </p>
            )}
            {learn.mode === "local" && !profile && (
              <p className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-sky-50 p-3 text-sm font-semibold text-sky-900 ring-1 ring-sky-200">
                You&apos;re learning as a guest, so progress is saved in this browser only.
                <Link
                  href={`/login?next=${encodeURIComponent(`/learn/${lesson.id}`)}`}
                  className="inline-flex items-center gap-1 font-bold text-violet-700 hover:underline"
                >
                  <LogIn className="size-4" aria-hidden /> Sign in to keep it everywhere
                </Link>
              </p>
            )}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <m.section
            key={`${at}-${review}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            aria-labelledby="step-title"
          >
            {step && (
              <>
                <div className="mb-4">
                  <p className="flex items-center gap-2 text-xs font-bold text-ink-500">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-clay-sm",
                        KIND_LABELS[step.kind].tone,
                      )}
                    >
                      {KIND_LABELS[step.kind].label}
                    </span>
                    Step {at + 1} of {stepCount}
                  </p>
                  <h2 id="step-title" className="mt-2 text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
                    {step.kind === "story" && (
                      <span className="mr-2" aria-hidden>
                        {step.emoji}
                      </span>
                    )}
                    {step.title}
                  </h2>
                  <RichText text={step.body} className="mt-2" />
                </div>
                <LessonStepView
                  step={step}
                  lesson={lesson}
                  db={db}
                  saved={saved.steps[String(at)]}
                  onSave={onStepSave}
                  onReady={onReady}
                />
              </>
            )}

            {at === CHECK && (
              <>
                <h2 id="step-title" className="mb-1 text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
                  Knowledge check
                </h2>
                <p className="mb-5 text-ink-600">
                  A few quick questions to make sure it clicked. Wrong answers are fine: try again.
                </p>
                <KnowledgeCheck
                  lesson={lesson}
                  db={db}
                  saved={saved.check}
                  onSave={onCheckSave}
                  onPassed={() => {
                    if (!parts.check) void record("check");
                  }}
                />
              </>
            )}

            {at === CHALLENGE && (
              <>
                <h2 id="step-title" className="mb-4 text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
                  Practical challenge
                </h2>
                <ChallengeView
                  lesson={lesson}
                  db={db}
                  saved={saved.challenge}
                  onSave={onChallengeSave}
                  onPassed={() => {
                    if (!parts.challenge) void record("challenge");
                  }}
                />
              </>
            )}

            {at === DONE && (
              <>
                <h2 id="step-title" className="sr-only">
                  Lesson complete
                </h2>
                <LessonComplete
                  lesson={lesson}
                  outline={outline}
                  results={results}
                  next={next}
                  review={review && results.every((r) => r.xpGained === 0)}
                  onReview={restart}
                />
              </>
            )}
          </m.section>
        </AnimatePresence>
      </main>

      {at < DONE && (
        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-background/90 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <Button variant="ghost" onClick={() => setAt((a) => Math.max(0, a - 1))} disabled={at === 0}>
              <ArrowLeft aria-hidden /> Back
            </Button>
            <div className="ml-auto">
              {at < CHECK && (
                <Button variant="primary" size="md" onClick={() => setAt((a) => a + 1)} disabled={!ready}>
                  {at === CHECK - 1 ? "Start the knowledge check" : "Continue"} <ArrowRight aria-hidden />
                </Button>
              )}
              {at === CHECK && (
                <Button
                  variant="primary"
                  onClick={() => setAt(CHALLENGE)}
                  disabled={!parts.check || saving === "check"}
                >
                  {saving === "check" ? "Saving…" : "On to the challenge"} <ArrowRight aria-hidden />
                </Button>
              )}
              {at === CHALLENGE && (
                <Button
                  variant="success"
                  onClick={finish}
                  disabled={!parts.challenge || !parts.check || finishing || saving !== null}
                >
                  {finishing ? "Saving…" : "Finish the lesson"} <ArrowRight aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
