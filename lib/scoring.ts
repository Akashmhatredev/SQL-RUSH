import { DIFFICULTY_CONFIG } from "@/lib/config";
import type { Difficulty } from "@/types/question";

/** 3 in a row → x2, 5 → x3, 10 → x5. */
export function comboMultiplier(streak: number): number {
  if (streak >= 10) return 5;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

/** The streak needed for the next combo tier, or null at the top tier. */
export function nextComboAt(streak: number): number | null {
  if (streak < 3) return 3;
  if (streak < 5) return 5;
  if (streak < 10) return 10;
  return null;
}

export interface ScoreBreakdown {
  basePoints: number;
  combo: number;
  timeBonus: number;
  points: number;
  xp: number;
}

export function scoreAnswer(opts: {
  difficulty: Difficulty;
  correct: boolean;
  /** Streak including this answer. */
  streak: number;
  secondsLeft: number;
  timed: boolean;
  practice: boolean;
}): ScoreBreakdown {
  const cfg = DIFFICULTY_CONFIG[opts.difficulty];
  if (!opts.correct) return { basePoints: cfg.points, combo: 1, timeBonus: 0, points: 0, xp: 0 };
  if (opts.practice) {
    return { basePoints: cfg.points, combo: 1, timeBonus: 0, points: cfg.points, xp: Math.round(cfg.points / 2) };
  }
  const combo = comboMultiplier(opts.streak);
  const timeBonus = opts.timed ? Math.floor(Math.max(0, opts.secondsLeft)) * cfg.multiplier : 0;
  return {
    basePoints: cfg.points,
    combo,
    timeBonus,
    points: cfg.points * combo + timeBonus,
    xp: cfg.points * combo,
  };
}
