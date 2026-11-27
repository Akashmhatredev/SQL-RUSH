import type { XpKind } from "./rules";

/**
 * Learning progress as the client sees it. The Supabase RPCs (services/learn.ts) and the
 * browser-only guest store (lib/learn/local-store.ts) both produce these shapes.
 */

/** Anything a lesson wants to restore on return: answers given, the SQL draft, the sandbox table. */
export type LessonSavedState = Record<string, unknown>;

export interface LessonProgress {
  lessonId: string;
  status: "started" | "completed";
  /** Index of the lesson step the learner was on. */
  step: number;
  state: LessonSavedState | null;
  checkDone: boolean;
  challengeDone: boolean;
  perfect: boolean;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface ActivityDay {
  /** YYYY-MM-DD in the learner's time zone. */
  day: string;
  xp: number;
  /** Distinct lessons finished (or reviewed) that day. */
  lessons: number;
  goalMet: boolean;
}

export interface XpEvent {
  kind: XpKind;
  ref: string;
  xp: number;
  at: string;
}

export interface LearnerState {
  xp: number;
  lessonsCompleted: number;
  modulesCompleted: number;
  /** Current streak as of today (0 once a day has been missed). */
  streak: number;
  bestStreak: number;
  lastActiveDay: string | null;
  /** Today's date in the learner's time zone. */
  today: string;
  timeZone: string;
  dailyGoal: number;
  /** Distinct lessons completed or reviewed today. */
  todayLessons: number;
  goalMetToday: boolean;
  lastLessonId: string | null;
  lastCompletedLessonId: string | null;
  lessons: Record<string, LessonProgress>;
  /** Most recent days with any learning, newest first (up to 60). */
  activity: ActivityDay[];
  /** Most recent XP awards, newest first (up to 20). */
  recentXp: XpEvent[];
}

export type LessonPart = "check" | "challenge" | "lesson";

export interface UnlockedBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface CompleteResult {
  /** XP awarded by this call (0 when everything was already earned). */
  xpGained: number;
  awards: { kind: XpKind; ref: string; xp: number }[];
  xpBefore: number;
  xpAfter: number;
  streak: number;
  bestStreak: number;
  /** True when this was the first learning activity today, so the streak grew or started. */
  streakExtended: boolean;
  todayLessons: number;
  dailyGoal: number;
  /** True when this call reached today's goal. */
  goalMetNow: boolean;
  /** The module this call completed, if any. */
  moduleCompleted: string | null;
  unlocked: UnlockedBadge[];
  lesson: LessonProgress;
}

export const EMPTY_LEARNER = (today: string, timeZone: string): LearnerState => ({
  xp: 0,
  lessonsCompleted: 0,
  modulesCompleted: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDay: null,
  today,
  timeZone,
  dailyGoal: 1,
  todayLessons: 0,
  goalMetToday: false,
  lastLessonId: null,
  lastCompletedLessonId: null,
  lessons: {},
  activity: [],
  recentXp: [],
});

/**
 * Max JSON.stringify size of a lesson's saved state on the client. The database allows 16 000
 * bytes of jsonb text, which spells JSON out more loosely, so the client stays well under it.
 */
export const MAX_SAVED_STATE_BYTES = 12_000;
