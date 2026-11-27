import { LESSONS, MODULES, type LessonOutline } from "./curriculum";
import type { LearnerState } from "./progress";

/**
 * Where a lesson stands for this learner:
 *   completed: finished at least once
 *   current:   unlocked and started, not finished yet
 *   available: unlocked, not started
 *   locked:    the lesson before it isn't finished
 */
export type LessonStatus = "completed" | "current" | "available" | "locked";

export function lessonStatuses(state: LearnerState | null): Record<string, LessonStatus> {
  const out: Record<string, LessonStatus> = {};
  let prevDone = true;
  for (const l of LESSONS) {
    const p = state?.lessons[l.id];
    if (p?.status === "completed") out[l.id] = "completed";
    else if (prevDone) out[l.id] = p ? "current" : "available";
    else out[l.id] = "locked";
    prevDone = p?.status === "completed";
  }
  return out;
}

export interface ContinueTarget {
  lesson: LessonOutline;
  kind: "start" | "continue" | "review";
}

/** The lesson behind the big Continue button. */
export function continueTarget(state: LearnerState | null): ContinueTarget {
  const statuses = lessonStatuses(state);
  const last = state?.lastLessonId ? LESSONS.find((l) => l.id === state.lastLessonId) : undefined;
  if (last && statuses[last.id] === "current") return { lesson: last, kind: "continue" };
  const next = LESSONS.find((l) => statuses[l.id] === "current" || statuses[l.id] === "available");
  if (next) return { lesson: next, kind: statuses[next.id] === "current" ? "continue" : "start" };
  return { lesson: last ?? LESSONS[LESSONS.length - 1], kind: "review" };
}

export function moduleProgress(state: LearnerState | null) {
  return MODULES.map((m) => {
    const done = m.lessons.filter((l) => state?.lessons[l.id]?.status === "completed").length;
    return { module: m, done, total: m.lessons.length, complete: done === m.lessons.length };
  });
}

export function curriculumProgress(state: LearnerState | null) {
  const done = LESSONS.filter((l) => state?.lessons[l.id]?.status === "completed").length;
  return { done, total: LESSONS.length, remaining: LESSONS.length - done, ratio: done / LESSONS.length };
}

/** Where inside a lesson the learner stopped, for "Step 4 of 9" labels. */
export function lessonStepLabel(state: LearnerState | null, lesson: LessonOutline, stepCount?: number): string | null {
  const p = state?.lessons[lesson.id];
  if (!p || p.status === "completed") return null;
  if (p.challengeDone) return "Ready to finish";
  if (p.checkDone) return "On the challenge";
  if (!p.step) return "Just started";
  return stepCount ? `Step ${Math.min(p.step + 1, stepCount)} of ${stepCount}` : `Step ${p.step + 1}`;
}
