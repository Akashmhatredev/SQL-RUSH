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
};

export const METRIC_KEYS = Object.keys(METRICS) as AchievementMetric[];

/** The player's current value for a metric: metrics are profile columns with the same name. */
export function metricValue(profile: Profile | null, metric: AchievementMetric): number {
  return profile ? Number(profile[metric] ?? 0) : 0;
}
