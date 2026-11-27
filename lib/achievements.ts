import type { AchievementMetric, Profile } from "@/types/database";

/** Icons an achievement can use (see components/AchievementIcon.tsx). */
export const ACHIEVEMENT_ICONS = [
  "sparkles",
  "target",
  "medal",
  "trophy",
  "shield",
  "zap",
  "wand",
  "flame",
  "calendar",
  "crown",
  "gem",
  "rocket",
  "star",
  "timer",
  "brain",
  "database",
  "footprints",
  "table",
  "filter",
  "sort",
  "sigma",
  "link",
  "graduation",
] as const;
export type AchievementIconName = (typeof ACHIEVEMENT_ICONS)[number];

export const METRICS: Record<AchievementMetric, { label: string; unit: string }> = {
  questions_correct: { label: "Correct answers (lifetime)", unit: "correct" },
  games_played: { label: "Games played", unit: "games" },
  best_streak: { label: "Best answer streak", unit: "in a row" },
  expert_correct: { label: "Expert questions correct", unit: "expert" },
  perfect_runs: { label: "Perfect Classic/Daily runs", unit: "runs" },
  best_fast_run: { label: "Fast answers (<5s) in one run", unit: "fast" },
  daily_completed: { label: "Daily challenges completed", unit: "days" },
  best_day_streak: { label: "Best day streak", unit: "days" },
  high_score: { label: "High score (single run)", unit: "pts" },
  total_score: { label: "Total ranked score", unit: "pts" },
  xp: { label: "Total XP", unit: "XP" },
  learn_xp: { label: "Learning XP (Beginner Mode)", unit: "XP" },
  lessons_completed: { label: "Beginner lessons completed", unit: "lessons" },
  modules_completed: { label: "Beginner modules completed", unit: "modules" },
  learn_best_streak: { label: "Best learning streak", unit: "days" },
  lessons: { label: "Complete specific lessons", unit: "lessons" },
};

/** Metrics that come from Beginner Mode progress rather than the game. */
export const LEARN_METRIC_KEYS: AchievementMetric[] = [
  "learn_xp",
  "lessons_completed",
  "modules_completed",
  "learn_best_streak",
  "lessons",
];

export const isLearnMetric = (metric: AchievementMetric) => LEARN_METRIC_KEYS.includes(metric);

/** What metricValue needs to know about a learner's Beginner Mode progress. */
export interface LearnerMetrics {
  xp: number;
  lessonsCompleted: number;
  modulesCompleted: number;
  bestStreak: number;
  completedLessonIds: string[];
}

export const METRIC_KEYS = Object.keys(METRICS) as AchievementMetric[];

/**
 * The player's current value for a metric. Game metrics are profile columns with the same
 * name; learning metrics need the learner's progress (0 without it). For the `lessons`
 * metric, pass the achievement's lesson ids: the value is how many of them are completed.
 */
export function metricValue(
  profile: Profile | null,
  metric: AchievementMetric,
  learner?: LearnerMetrics | null,
  lessonIds?: string[] | null,
): number {
  switch (metric) {
    case "learn_xp":
      return learner?.xp ?? 0;
    case "lessons_completed":
      return learner?.lessonsCompleted ?? 0;
    case "modules_completed":
      return learner?.modulesCompleted ?? 0;
    case "learn_best_streak":
      return learner?.bestStreak ?? 0;
    case "lessons": {
      if (!learner || !lessonIds?.length) return 0;
      const done = new Set(learner.completedLessonIds);
      return lessonIds.filter((id) => done.has(id)).length;
    }
    default:
      return profile ? Number(profile[metric] ?? 0) : 0;
  }
}
