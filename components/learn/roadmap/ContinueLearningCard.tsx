"use client";

import { ArrowRight, CheckCircle2, GraduationCap, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useLearn } from "@/components/learn/LearnProvider";
import { ProgressBar } from "@/components/ui/progress-bar";
import { LESSONS, moduleOutline } from "@/lib/learn/curriculum";
import { continueTarget, curriculumProgress, lessonStepLabel } from "@/lib/learn/roadmap";
import { learnLevelFor } from "@/lib/learn/rules";
import { cn } from "@/lib/utils";

/**
 * The returning learner's way back in: their level, overall progress, the last lesson they
 * opened and finished, and one big button that resumes exactly where they stopped.
 */
export function ContinueLearningCard({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { state, loading } = useLearn();
  const target = continueTarget(state);
  const progress = curriculumProgress(state);
  const mod = moduleOutline(target.lesson.moduleId)!;
  const level = learnLevelFor(state?.xp ?? 0);
  const where = lessonStepLabel(state, target.lesson);
  const lastDone = state?.lastCompletedLessonId ? LESSONS.find((l) => l.id === state.lastCompletedLessonId) : null;
  const fresh = !state || (progress.done === 0 && !state.lastLessonId);
  const Icon = target.kind === "review" ? RotateCcw : fresh ? Play : ArrowRight;
  const label = target.kind === "review" ? "Review" : fresh ? "Start learning" : "Continue learning";

  return (
    <div
      className={cn(
        "clay relative overflow-hidden rounded-[2rem] p-5 sm:p-6",
        loading && !state && "animate-pulse",
        className,
      )}
    >
      <div aria-hidden className="absolute -left-12 -top-20 size-56 rounded-full bg-sky-300/35 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
            <GraduationCap className="size-4" aria-hidden /> Beginner Mode
            {!fresh && (
              <span className="whitespace-nowrap rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-ink-600 shadow-clay-sm">
                {level.emoji} {level.name}
              </span>
            )}
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-500">
            {fresh
              ? "New to databases? Start here."
              : target.kind === "review"
                ? "You finished the whole course!"
                : target.kind === "continue"
                  ? "Pick up where you left off"
                  : "Up next"}
          </p>
          <p className="mt-0.5 truncate text-2xl font-black text-ink-900">
            {mod.emoji} {target.lesson.title}
          </p>
          <p className="text-sm font-semibold text-ink-600">
            Module {mod.number} · {mod.title} · Lesson {target.lesson.number}
            {where && <span className="text-violet-700"> · {where}</span>}
          </p>
        </div>
        <Link
          href={`/learn/${target.lesson.id}`}
          className="group inline-flex h-14 shrink-0 items-center gap-2.5 rounded-3xl bg-[linear-gradient(145deg,#8a6dff,#6a4cf5_55%,#5b3ee6)] px-6 text-base font-black text-white shadow-clay-btn transition-all hover:-translate-y-0.5 active:translate-y-px active:shadow-clay-pressed"
        >
          <Icon className="size-5" aria-hidden /> {label}
        </Link>
      </div>
      {!compact && (
        <div className="relative mt-5">
          <div className="mb-1 flex justify-between text-xs font-bold text-ink-500">
            <span>
              {progress.done} of {progress.total} lessons
            </span>
            <span>{Math.round(progress.ratio * 100)}%</span>
          </div>
          <ProgressBar value={progress.ratio} label="Course progress" className="h-2.5" />
          {lastDone && (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
              <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden /> Last completed:{" "}
              <Link href={`/learn/${lastDone.id}`} className="font-bold text-ink-700 hover:text-violet-700">
                {lastDone.title}
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
