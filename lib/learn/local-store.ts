import { LEARN_BADGES, LESSONS, MODULES } from "./curriculum";
import {
  EMPTY_LEARNER,
  type CompleteResult,
  type LearnerState,
  type LessonPart,
  type LessonProgress,
  type LessonSavedState,
  type UnlockedBadge,
} from "./progress";
import { dayDiff, DEFAULT_DAILY_GOAL, LEARN_XP, liveStreak, localDateKey, nextStreak, type XpKind } from "./rules";

/**
 * Guest progress, kept in this browser only. It follows the same rules as the database
 * (supabase/migrations/20261127000001_beginner_mode.sql): XP once per activity, unlocks in order,
 * streaks by the learner's own calendar day. When the guest signs in, LearnProvider replays it
 * into their account and clears it.
 */

const KEY = "sql-rush:learn:guest:v1";

interface LocalData {
  v: 1;
  xp: number;
  streak: number;
  bestStreak: number;
  lastActiveDay: string | null;
  dailyGoal: number;
  timeZone: string;
  lastLessonId: string | null;
  lastCompletedLessonId: string | null;
  lessons: Record<string, LessonProgress>;
  ledger: { kind: XpKind; ref: string; xp: number; at: string }[];
  activity: Record<string, { xp: number; lessonIds: string[]; goalMet: boolean }>;
  badges: string[];
}

const blank = (tz: string): LocalData => ({
  v: 1,
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDay: null,
  dailyGoal: DEFAULT_DAILY_GOAL,
  timeZone: tz,
  lastLessonId: null,
  lastCompletedLessonId: null,
  lessons: {},
  ledger: [],
  activity: {},
  badges: [],
});

function read(tz: string): LocalData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as LocalData;
      if (data && data.v === 1) return data;
    }
  } catch {
    // Unreadable or blocked storage: start fresh for this session.
  }
  return blank(tz);
}

function write(data: LocalData) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or disabled: progress lasts for this session only.
  }
}

export function hasGuestProgress(): boolean {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as LocalData;
    return Object.keys(data.lessons ?? {}).length > 0;
  } catch {
    return false;
  }
}

export function readGuestData(): LocalData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalData) : null;
  } catch {
    return null;
  }
}

export function clearGuestProgress() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

const position = (id: string) => LESSONS.find((l) => l.id === id)?.position ?? 0;

function isUnlocked(data: LocalData, id: string): boolean {
  const p = position(id);
  if (p <= 1) return p === 1;
  return data.lessons[LESSONS[p - 2].id]?.status === "completed";
}

/** Today in the learner's zone, never earlier than the last day they learned (no replaying a day by travelling west). */
function today(data: LocalData, tz: string): string {
  const local = localDateKey(tz);
  return data.lastActiveDay && dayDiff(local, data.lastActiveDay) > 0 ? data.lastActiveDay : local;
}

function award(data: LocalData, kind: XpKind, ref: string, day: string): number {
  if (data.ledger.some((e) => e.kind === kind && e.ref === ref)) return 0;
  const xp = LEARN_XP[kind];
  data.ledger.push({ kind, ref, xp, at: new Date().toISOString() });
  data.xp += xp;
  const a = (data.activity[day] ??= { xp: 0, lessonIds: [], goalMet: false });
  a.xp += xp;
  return xp;
}

function completedIds(data: LocalData) {
  return Object.values(data.lessons)
    .filter((l) => l.status === "completed")
    .map((l) => l.lessonId);
}

function modulesCompleted(data: LocalData) {
  const done = new Set(completedIds(data));
  return MODULES.filter((m) => m.lessons.every((l) => done.has(l.id))).length;
}

function awardBadges(data: LocalData): UnlockedBadge[] {
  const done = new Set(completedIds(data));
  const metrics: Record<string, number> = {
    lessons_completed: done.size,
    modules_completed: modulesCompleted(data),
    learn_best_streak: data.bestStreak,
    learn_xp: data.xp,
  };
  const unlocked: UnlockedBadge[] = [];
  for (const b of LEARN_BADGES) {
    if (data.badges.includes(b.id)) continue;
    const value =
      b.metric === "lessons" ? (b.lessonIds ?? []).filter((id) => done.has(id)).length : (metrics[b.metric] ?? 0);
    if (value >= b.threshold) {
      data.badges.push(b.id);
      unlocked.push({ id: b.id, title: b.title, description: b.description, icon: b.icon });
    }
  }
  return unlocked;
}

function toState(data: LocalData, tz: string): LearnerState {
  const day = today(data, tz);
  const done = completedIds(data);
  const activity = Object.entries(data.activity)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 60)
    .map(([d, a]) => ({ day: d, xp: a.xp, lessons: a.lessonIds.length, goalMet: a.goalMet }));
  return {
    ...EMPTY_LEARNER(day, tz),
    xp: data.xp,
    lessonsCompleted: done.length,
    modulesCompleted: modulesCompleted(data),
    streak: liveStreak(data.streak, data.lastActiveDay, day),
    bestStreak: data.bestStreak,
    lastActiveDay: data.lastActiveDay,
    dailyGoal: data.dailyGoal,
    todayLessons: data.activity[day]?.lessonIds.length ?? 0,
    goalMetToday: data.activity[day]?.goalMet ?? false,
    lastLessonId: data.lastLessonId,
    lastCompletedLessonId: data.lastCompletedLessonId,
    lessons: data.lessons,
    activity,
    recentXp: [...data.ledger].reverse().slice(0, 20),
  };
}

export const localLearnStore = {
  load(tz: string): LearnerState {
    return toState(read(tz), tz);
  },

  openLesson(id: string, tz: string): LessonProgress {
    const data = read(tz);
    if (!position(id)) throw new Error("That lesson doesn't exist.");
    if (!isUnlocked(data, id)) throw new Error("Finish the previous lesson to unlock this one.");
    const now = new Date().toISOString();
    data.lessons[id] ??= {
      lessonId: id,
      status: "started",
      step: 0,
      state: null,
      checkDone: false,
      challengeDone: false,
      perfect: false,
      startedAt: now,
      completedAt: null,
      updatedAt: now,
    };
    data.lastLessonId = id;
    data.timeZone = tz;
    write(data);
    return data.lessons[id];
  },

  saveProgress(id: string, step: number, state: LessonSavedState | null, tz: string) {
    const data = read(tz);
    const p = data.lessons[id];
    if (!p) return;
    p.step = step;
    p.state = state;
    p.updatedAt = new Date().toISOString();
    write(data);
  },

  complete(id: string, part: LessonPart, perfect: boolean, tz: string): CompleteResult {
    const data = read(tz);
    const p = data.lessons[id];
    if (!p) throw new Error("Open the lesson first.");
    if (!isUnlocked(data, id)) throw new Error("Finish the previous lesson to unlock this one.");
    const day = today(data, tz);
    const xpBefore = data.xp;
    const awards: CompleteResult["awards"] = [];
    const give = (kind: XpKind, ref: string) => {
      const xp = award(data, kind, ref, day);
      if (xp) awards.push({ kind, ref, xp });
    };
    let moduleCompleted: string | null = null;

    if (part === "check") {
      p.checkDone = true;
      give("check", id);
    } else if (part === "challenge") {
      p.challengeDone = true;
      give("challenge", id);
    } else {
      if (!p.checkDone || !p.challengeDone) throw new Error("Finish the knowledge check and the challenge first.");
      if (p.status !== "completed") {
        p.status = "completed";
        p.completedAt = new Date().toISOString();
        p.perfect = perfect;
        give("lesson", id);
        if (perfect) give("perfect", id);
        data.lastCompletedLessonId = id;
        const mod = MODULES.find((m) => m.lessons.some((l) => l.id === id));
        if (mod && mod.lessons.every((l) => data.lessons[l.id]?.status === "completed")) {
          const before = awards.length;
          give("module", mod.id);
          if (awards.length > before) moduleCompleted = mod.id;
        }
      }
    }
    p.updatedAt = new Date().toISOString();

    const firstToday = data.lastActiveDay !== day;
    data.streak = nextStreak(data.streak, data.lastActiveDay, day);
    data.bestStreak = Math.max(data.bestStreak, data.streak);
    data.lastActiveDay = day;
    data.timeZone = tz;
    const a = (data.activity[day] ??= { xp: 0, lessonIds: [], goalMet: false });
    if (part === "lesson" && !a.lessonIds.includes(id)) a.lessonIds.push(id);
    let goalMetNow = false;
    if (!a.goalMet && a.lessonIds.length >= data.dailyGoal) {
      a.goalMet = true;
      goalMetNow = true;
      give("daily_goal", day);
    }
    const unlocked = awardBadges(data);
    write(data);

    return {
      xpGained: data.xp - xpBefore,
      awards,
      xpBefore,
      xpAfter: data.xp,
      streak: data.streak,
      bestStreak: data.bestStreak,
      streakExtended: firstToday,
      todayLessons: a.lessonIds.length,
      dailyGoal: data.dailyGoal,
      goalMetNow,
      moduleCompleted,
      unlocked,
      lesson: p,
    };
  },

  setGoal(goal: number, tz: string) {
    const data = read(tz);
    data.dailyGoal = goal;
    write(data);
  },
};
