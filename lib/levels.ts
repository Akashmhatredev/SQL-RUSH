export interface Level {
  index: number;
  name: string;
  minXp: number;
  emoji: string;
}

export const LEVELS: Level[] = [
  { index: 0, name: "SQL Rookie", minXp: 0, emoji: "🌱" },
  { index: 1, name: "SQL Explorer", minXp: 300, emoji: "🧭" },
  { index: 2, name: "SQL Analyst", minXp: 1000, emoji: "📊" },
  { index: 3, name: "SQL Engineer", minXp: 2500, emoji: "⚙️" },
  { index: 4, name: "SQL Architect", minXp: 5000, emoji: "🏛️" },
  { index: 5, name: "SQL Master", minXp: 10000, emoji: "👑" },
];

export interface LevelProgress {
  level: Level;
  next: Level | null;
  /** 0..1 progress towards the next level (1 at max level). */
  progress: number;
  xpIntoLevel: number;
  xpForLevel: number;
}

export function levelForXp(xp: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) if (xp >= level.minXp) current = level;
  return current;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelForXp(xp);
  const next = LEVELS[level.index + 1] ?? null;
  if (!next) return { level, next, progress: 1, xpIntoLevel: xp - level.minXp, xpForLevel: 0 };
  const xpForLevel = next.minXp - level.minXp;
  const xpIntoLevel = xp - level.minXp;
  return { level, next, progress: Math.min(1, xpIntoLevel / xpForLevel), xpIntoLevel, xpForLevel };
}
