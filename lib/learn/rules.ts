/**
 * Beginner Mode progression rules. The database enforces the same numbers in
 * supabase/migrations/20261127000001_beginner_mode.sql (private.learn_xp_for,
 * private.learn_level_for_xp); `npm run test:db` checks they stay in sync.
 *
 * Learning XP is its own pool, separate from the competitive XP on the leaderboards:
 * lessons are checked in the browser, so they must not be able to inflate ranked XP.
 */

/** XP for each activity. Every award is recorded once per learner, so repeating a lesson earns nothing more. */
export const LEARN_XP = {
  lesson: 20,
  check: 10,
  challenge: 30,
  perfect: 15,
  module: 100,
  daily_goal: 25,
} as const;

export type XpKind = keyof typeof LEARN_XP;

export const XP_LABELS: Record<XpKind, string> = {
  lesson: "Lesson complete",
  check: "Knowledge check",
  challenge: "Practical challenge",
  perfect: "Perfect lesson bonus",
  module: "Module complete",
  daily_goal: "Daily goal reached",
};

export interface LearnLevel {
  index: number;
  name: string;
  minXp: number;
  emoji: string;
  /** What reaching this level means. */
  milestone: string;
}

export const LEARN_LEVELS: LearnLevel[] = [
  { index: 0, name: "Curious Beginner", minXp: 0, emoji: "🐣", milestone: "Everyone starts here." },
  {
    index: 1,
    name: "Database Explorer",
    minXp: 150,
    emoji: "🧭",
    milestone: "You know what data, databases and tables are.",
  },
  {
    index: 2,
    name: "Query Apprentice",
    minXp: 450,
    emoji: "🔎",
    milestone: "You can read how a database is organised.",
  },
  {
    index: 3,
    name: "Data Detective",
    minXp: 900,
    emoji: "🕵️",
    milestone: "You can ask a database questions with SELECT.",
  },
  {
    index: 4,
    name: "SQL Practitioner",
    minXp: 1500,
    emoji: "🛠️",
    milestone: "You filter, add, change and remove data.",
  },
  {
    index: 5,
    name: "SQL Master",
    minXp: 2450,
    emoji: "👑",
    milestone: "You summarise, join and analyse data with confidence.",
  },
];

export function learnLevelFor(xp: number): LearnLevel {
  let current = LEARN_LEVELS[0];
  for (const level of LEARN_LEVELS) if (xp >= level.minXp) current = level;
  return current;
}

export function learnLevelProgress(xp: number) {
  const level = learnLevelFor(xp);
  const next = LEARN_LEVELS[level.index + 1] ?? null;
  if (!next) return { level, next, progress: 1, xpToNext: 0 };
  return {
    level,
    next,
    progress: Math.min(1, (xp - level.minXp) / (next.minXp - level.minXp)),
    xpToNext: next.minXp - xp,
  };
}

/** Lessons per day a learner can aim for. */
export const DAILY_GOALS = [
  { lessons: 1, label: "Casual" },
  { lessons: 2, label: "Regular" },
  { lessons: 3, label: "Serious" },
  { lessons: 5, label: "Intense" },
] as const;

export const DEFAULT_DAILY_GOAL = 1;

/** Streak milestones that get a celebration. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

/** The learner's IANA time zone, used so "today" and streaks follow their own midnight. */
export function learnerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** YYYY-MM-DD in the given time zone. */
export function localDateKey(timeZone: string, date: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function dayDiff(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** The next streak value after learning on `today`. Several lessons on one day count once. */
export function nextStreak(streak: number, lastDay: string | null, today: string): number {
  if (!lastDay) return 1;
  const gap = dayDiff(lastDay, today);
  if (gap <= 0) return Math.max(streak, 1);
  if (gap === 1) return streak + 1;
  return 1;
}

/** The streak as it stands today: it silently breaks once a whole day is missed. */
export function liveStreak(streak: number, lastDay: string | null, today: string): number {
  if (!lastDay) return 0;
  return dayDiff(lastDay, today) <= 1 ? streak : 0;
}
