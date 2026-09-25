import { GAME_MODES, type GameMode } from "@/types/game";
import { DIFFICULTIES, QUESTION_TYPES, type Difficulty, type QuestionType } from "@/types/question";

/**
 * Per-device preferences. Progress, scores and achievements live in Supabase;
 * only these UI choices are kept in localStorage.
 */
export interface Settings {
  muted: boolean;
  mode: GameMode;
  difficulty: Difficulty;
  types: QuestionType[];
}

export const SETTINGS_KEY = "sql-rush:settings:v2";
/** The old, browser-only version kept its settings inside this blob. */
const LEGACY_KEY = "sql-rush:v1";

const LEGACY_DIFFICULTY: Record<string, Difficulty> = { beginner: "easy", intermediate: "medium", advanced: "hard" };

export function defaultSettings(): Settings {
  return { muted: false, mode: "classic", difficulty: "easy", types: [...QUESTION_TYPES] };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Merge whatever is stored over the defaults so old or partial saves never break the app. */
export function sanitizeSettings(raw: unknown): Settings {
  const base = defaultSettings();
  if (!isObject(raw)) return base;
  const difficulty = typeof raw.difficulty === "string" ? (LEGACY_DIFFICULTY[raw.difficulty] ?? raw.difficulty) : null;
  const types = Array.isArray(raw.types)
    ? (raw.types.filter((t) => QUESTION_TYPES.includes(t as QuestionType)) as QuestionType[])
    : base.types;
  return {
    muted: raw.muted === true,
    mode: GAME_MODES.includes(raw.mode as GameMode) ? (raw.mode as GameMode) : base.mode,
    difficulty: DIFFICULTIES.includes(difficulty as Difficulty) ? (difficulty as Difficulty) : base.difficulty,
    types: types.length ? types : base.types,
  };
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return defaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) return sanitizeSettings(JSON.parse(raw));
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { settings?: unknown };
      return sanitizeSettings(parsed.settings);
    }
  } catch {
    // Corrupt JSON or storage disabled: fall back to defaults.
  }
  return defaultSettings();
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or disabled (private mode): settings last for this session only.
  }
}
