import { LESSONS } from "../curriculum";
import type { Lesson } from "../types";
import { databaseExplorer } from "./m1-database-explorer";
import { sqlBeginner } from "./m2-sql-beginner";
import { dataExplorer } from "./m3-data-explorer";
import { dataManager } from "./m4-data-manager";
import { dataAnalyst } from "./m5-data-analyst";
import { sqlChampion } from "./m6-sql-champion";

/** Every lesson's content, keyed by lesson id. Server-only: pages pass a single lesson to the client. */
export const LESSON_CONTENT: Record<string, Lesson> = Object.fromEntries(
  [...databaseExplorer, ...sqlBeginner, ...dataExplorer, ...dataManager, ...dataAnalyst, ...sqlChampion].map((l) => [
    l.id,
    l,
  ]),
);

export function getLesson(id: string): Lesson | null {
  return LESSON_CONTENT[id] ?? null;
}

/** Lesson ids in the curriculum that don't have content yet (should be none). */
export const MISSING_LESSONS = LESSONS.map((l) => l.id).filter((id) => !LESSON_CONTENT[id]);
