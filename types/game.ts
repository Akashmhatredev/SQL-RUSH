import type { UserAnswer } from "@/lib/validation";
import type { Difficulty, QuestionType, SampleTable } from "./question";

export const GAME_MODES = ["classic", "endless", "practice", "daily"] as const;
export type GameMode = (typeof GAME_MODES)[number];
export type EndReason = "lives" | "complete" | "quit";

export interface RunConfig {
  mode: GameMode;
  /** Starting difficulty. The daily challenge ignores it and mixes all four. */
  difficulty: Difficulty;
  types: QuestionType[];
}

export interface PoolToken {
  key: string;
  text: string;
}

/** Authoritative run state, as returned by start_game / submit_answer. */
export interface SessionState {
  sessionId: string;
  mode: GameMode;
  difficulty: Difficulty;
  status: "active" | "finished" | "abandoned";
  tier: number;
  lives: number;
  score: number;
  xp: number;
  streak: number;
  bestStreak: number;
  answered: number;
  correct: number;
  wrong: number;
  fastCorrect: number;
  served: number;
  /** Planned length (classic, daily) or null (endless, practice). */
  total: number | null;
  pauseBudgetMs: number;
  challengeDate: string | null;
  startedAt: string;
  resumed?: boolean;
}

/** A question as served by next_question(): no answer, options already shuffled. */
export interface PlayQuestion {
  id: number;
  /** 1-based position in the run. */
  index: number;
  total: number | null;
  difficulty: Difficulty;
  type: QuestionType;
  topic: string;
  question: string;
  options: string[];
  query: string | null;
  sampleTables: SampleTable[] | null;
  tokenPool: PoolToken[];
  schemaTables: string[];
  hint: string | null;
  timer: number;
  /** Time left on the server clock, or null in practice mode. */
  secondsLeft: number | null;
}

/** Client-side view of a question: a unique key for React and animations. */
export interface PreparedQuestion extends PlayQuestion {
  uid: string;
}

export interface Solution {
  answer: string;
  alternatives: string[];
  tokens: string[] | null;
  explanation: string;
}

export interface UnlockedAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface RunSummary {
  recorded: boolean;
  ranked?: boolean;
  endReason: EndReason;
  score: number;
  xp: number;
  answered?: number;
  correct?: number;
  wrong?: number;
  bestStreak?: number;
  fastCorrect?: number;
  newHighScore?: boolean;
  previousHighScore?: number;
  dayStreak?: number;
  /** The player's lifetime XP after this run. */
  profileXp?: number;
  pattern?: string | null;
  challengeDate?: string | null;
  unlocked?: UnlockedAchievement[];
}

/** Response of submit_answer(). */
export interface AnswerResult {
  correct: boolean;
  timedOut: boolean;
  revealed: boolean;
  basePoints: number;
  combo: number;
  timeBonus: number;
  points: number;
  xp: number;
  secondsTaken: number;
  secondsLeft: number;
  streak: number;
  tierUp: boolean;
  xpBefore: number;
  xpAfter: number;
  solution: Solution;
  state: SessionState;
  unlocked: UnlockedAchievement[];
  gameOver: boolean;
  summary: RunSummary | null;
}

/** One answered question, kept for the feedback panel and the end-of-run review. */
export interface AnswerRecord {
  question: PreparedQuestion;
  answer: UserAnswer;
  correct: boolean;
  timedOut: boolean;
  revealed: boolean;
  secondsTaken: number;
  secondsLeft: number;
  basePoints: number;
  combo: number;
  timeBonus: number;
  points: number;
  xp: number;
  streakAfter: number;
  solution: Solution;
}
