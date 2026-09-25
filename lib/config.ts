import type { GameMode } from "@/types/game";
import type { Difficulty, QuestionType } from "@/types/question";

export interface DifficultyConfig {
  label: string;
  timer: number;
  points: number;
  /** Multiplier applied to remaining seconds for the time bonus. */
  multiplier: number;
  topics: string[];
  /** Tailwind classes for accents. Written out in full so Tailwind can see them. */
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
    text: "text-emerald-300",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/40",
    ring: "ring-emerald-400/60",
    glow: "shadow-[0_0_30px_-6px_rgba(52,211,153,0.55)]",
    hex: "#34d399",
  },
  medium: {
    label: "Medium",
    timer: 45,
    points: 20,
    multiplier: 2,
    topics: ["GROUP BY", "HAVING", "COUNT", "SUM", "AVG", "JOIN basics"],
    text: "text-sky-300",
    bg: "bg-sky-400/10",
    border: "border-sky-400/40",
    ring: "ring-sky-400/60",
    glow: "shadow-[0_0_30px_-6px_rgba(56,189,248,0.6)]",
    hex: "#38bdf8",
  },
  hard: {
    label: "Hard",
    timer: 60,
    points: 40,
    multiplier: 3,
    topics: ["Joins", "Subqueries", "UNION", "CASE", "Window Functions"],
    text: "text-violet-300",
    bg: "bg-violet-400/10",
    border: "border-violet-400/40",
    ring: "ring-violet-400/60",
    glow: "shadow-[0_0_30px_-6px_rgba(167,139,250,0.6)]",
    hex: "#a78bfa",
  },
  expert: {
    label: "Expert",
    timer: 90,
    points: 80,
    multiplier: 4,
    topics: ["CTEs", "Recursive CTEs", "Ranking", "Data Warehouse", "Business Scenarios"],
    text: "text-fuchsia-300",
    bg: "bg-fuchsia-400/10",
    border: "border-fuchsia-400/40",
    ring: "ring-fuchsia-400/60",
    glow: "shadow-[0_0_30px_-6px_rgba(232,121,249,0.6)]",
    hex: "#e879f9",
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
