import type { GameMode } from "@/types/game";
import type { Difficulty, QuestionType } from "@/types/question";

export interface DifficultyConfig {
  label: string;
  timer: number;
  points: number;
  /** Multiplier applied to remaining seconds for the time bonus. */
  multiplier: number;
  topics: string[];
  /** Tailwind classes for accents (pastel clay). Written out in full so Tailwind can see them. */
  text: string;
  bg: string;
  border: string;
  ring: string;
  glow: string;
  hex: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: "Easy",
    timer: 30,
    points: 10,
    multiplier: 1,
    topics: ["SELECT", "WHERE", "ORDER BY", "LIMIT", "DISTINCT"],
    text: "text-emerald-700",
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    ring: "ring-emerald-400",
    glow: "shadow-[10px_14px_28px_-10px_rgb(16_185_129/0.5),inset_-6px_-8px_14px_rgb(6_95_70/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)]",
    hex: "#10b981",
  },
  medium: {
    label: "Medium",
    timer: 45,
    points: 20,
    multiplier: 2,
    topics: ["GROUP BY", "HAVING", "COUNT", "SUM", "AVG", "JOIN basics"],
    text: "text-sky-700",
    bg: "bg-sky-100",
    border: "border-sky-300",
    ring: "ring-sky-400",
    glow: "shadow-[10px_14px_28px_-10px_rgb(14_165_233/0.5),inset_-6px_-8px_14px_rgb(7_89_133/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)]",
    hex: "#0ea5e9",
  },
  hard: {
    label: "Hard",
    timer: 60,
    points: 40,
    multiplier: 3,
    topics: ["Joins", "Subqueries", "UNION", "CASE", "Window Functions"],
    text: "text-violet-700",
    bg: "bg-violet-100",
    border: "border-violet-300",
    ring: "ring-violet-400",
    glow: "shadow-[10px_14px_28px_-10px_rgb(139_92_246/0.5),inset_-6px_-8px_14px_rgb(91_33_182/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)]",
    hex: "#8b5cf6",
  },
  expert: {
    label: "Expert",
    timer: 90,
    points: 80,
    multiplier: 4,
    topics: ["CTEs", "Recursive CTEs", "Ranking", "Data Warehouse", "Business Scenarios"],
    text: "text-fuchsia-700",
    bg: "bg-fuchsia-100",
    border: "border-fuchsia-300",
    ring: "ring-fuchsia-400",
    glow: "shadow-[10px_14px_28px_-10px_rgb(217_70_239/0.5),inset_-6px_-8px_14px_rgb(134_25_143/0.1),inset_6px_8px_14px_rgb(255_255_255/0.9)]",
    hex: "#d946ef",
  },
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, { label: string; short: string }> = {
  "write-sql": { label: "Write SQL", short: "Write" },
  "multiple-choice": { label: "Multiple Choice", short: "Choice" },
  "fix-query": { label: "Fix the Query", short: "Fix" },
  "predict-output": { label: "Predict Output", short: "Predict" },
  "drag-drop": { label: "Query Builder", short: "Build" },
};

export interface ModeConfig {
  label: string;
  tagline: string;
  timed: boolean;
  lives: boolean;
  /** Number of questions, or null for "until you stop / run out of lives". */
  length: number | null;
  highScores: boolean;
}

export const MODE_CONFIG: Record<GameMode, ModeConfig> = {
  classic: {
    label: "Classic Rush",
    tagline: "15 questions · timer · 3 lives",
    timed: true,
    lives: true,
    length: 15,
    highScores: true,
  },
  endless: {
    label: "Endless",
    tagline: "Survive as long as you can · difficulty ramps up",
    timed: true,
    lives: true,
    length: null,
    highScores: true,
  },
  practice: {
    label: "Practice",
    tagline: "No timer · no lives · hints & reveals · unranked",
    timed: false,
    lives: false,
    length: null,
    highScores: false,
  },
  daily: {
    label: "Daily Challenge",
    tagline: "10 mixed questions · same for everyone · one attempt",
    timed: true,
    lives: true,
    length: 10,
    highScores: true,
  },
};

export const STARTING_LIVES = 3;
/** Endless mode moves up one difficulty every N correct answers. */
export const ENDLESS_STEP = 8;
/** Daily challenge composition, easiest first. */
export const DAILY_MIX: [Difficulty, number][] = [
  ["easy", 3],
  ["medium", 3],
  ["hard", 2],
  ["expert", 2],
];
/** A correct answer within this many seconds counts towards Speed Demon. */
export const FAST_ANSWER_SECONDS = 5;
export const WARNING_SECONDS = 10;
/**
 * Timed runs may be paused for this many seconds in total. The server keeps the
 * same budget (see game_sessions.pause_budget_ms), so the clocks never disagree.
 */
export const PAUSE_BUDGET_SECONDS = 120;
