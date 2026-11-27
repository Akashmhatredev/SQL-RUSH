/**
 * The Beginner Mode roadmap: modules, the lessons in each (in unlock order) and the
 * learning badges. This is the source of truth for ids and order; the database keeps a
 * copy in public.learn_modules / public.learn_lessons / public.achievements so it can
 * check unlocks and award XP. `npm run test:db` fails if the two drift apart.
 *
 * Lesson content (stories, tables, animations, checks, challenges) lives in
 * lib/learn/lessons/, one file per module.
 */

export interface ModuleOutline {
  id: string;
  /** 1-based, shown as "Module 1". */
  number: number;
  title: string;
  tagline: string;
  emoji: string;
  /** Tailwind colour family used for the module's path and badges. */
  color: "sky" | "violet" | "emerald" | "amber" | "rose" | "fuchsia";
  lessons: { id: string; title: string; concept: string }[];
}

export const MODULES: ModuleOutline[] = [
  {
    id: "database-explorer",
    number: 1,
    title: "Database Explorer",
    tagline: "What data is, and how databases keep it tidy.",
    emoji: "🗂️",
    color: "sky",
    lessons: [
      { id: "what-is-data", title: "What is data?", concept: "Data" },
      { id: "what-is-a-database", title: "What is a database?", concept: "Databases" },
      { id: "what-is-a-table", title: "What is a table?", concept: "Tables" },
      { id: "rows-and-columns", title: "Rows and columns", concept: "Rows & columns" },
      { id: "primary-keys", title: "Primary keys", concept: "Primary keys" },
    ],
  },
  {
    id: "sql-beginner",
    number: 2,
    title: "SQL Beginner",
    tagline: "Ask a database your first questions.",
    emoji: "💬",
    color: "violet",
    lessons: [
      { id: "what-is-sql", title: "What is SQL?", concept: "SQL" },
      { id: "first-query", title: "Your first query", concept: "SELECT *" },
      { id: "select", title: "Choosing columns", concept: "SELECT" },
      { id: "where", title: "Filtering rows", concept: "WHERE" },
      { id: "order-by", title: "Sorting results", concept: "ORDER BY" },
    ],
  },
  {
    id: "data-explorer",
    number: 3,
    title: "Data Explorer",
    tagline: "Sharper questions: unique values, top-N and patterns.",
    emoji: "🔭",
    color: "emerald",
    lessons: [
      { id: "distinct", title: "Removing duplicates", concept: "DISTINCT" },
      { id: "limit", title: "Just the first few", concept: "LIMIT" },
      { id: "and-or", title: "Combining conditions", concept: "AND / OR" },
      { id: "in-between", title: "Lists and ranges", concept: "IN / BETWEEN" },
      { id: "like", title: "Matching patterns", concept: "LIKE" },
    ],
  },
  {
    id: "data-manager",
    number: 4,
    title: "Data Manager",
    tagline: "Add, change and remove data safely.",
    emoji: "🧰",
    color: "amber",
    lessons: [
      { id: "insert", title: "Adding rows", concept: "INSERT" },
      { id: "update", title: "Changing values", concept: "UPDATE" },
      { id: "delete", title: "Removing rows", concept: "DELETE" },
      { id: "null-values", title: "Missing values", concept: "NULL" },
    ],
  },
  {
    id: "data-analyst",
    number: 5,
    title: "Data Analyst",
    tagline: "Summarise data and connect tables.",
    emoji: "📊",
    color: "rose",
    lessons: [
      { id: "aggregates", title: "Counting and totals", concept: "COUNT / SUM / AVG" },
      { id: "group-by", title: "Grouping rows", concept: "GROUP BY" },
      { id: "having", title: "Filtering groups", concept: "HAVING" },
      { id: "inner-join", title: "Joining tables", concept: "INNER JOIN" },
      { id: "outer-joins", title: "Keeping unmatched rows", concept: "LEFT / RIGHT / FULL JOIN" },
    ],
  },
  {
    id: "sql-champion",
    number: 6,
    title: "SQL Champion",
    tagline: "Queries inside queries, labels and rankings.",
    emoji: "🏆",
    color: "fuchsia",
    lessons: [
      { id: "subqueries", title: "Queries inside queries", concept: "Subqueries" },
      { id: "ctes", title: "Naming a step", concept: "WITH (CTEs)" },
      { id: "case-when", title: "Labelling with conditions", concept: "CASE WHEN" },
      { id: "window-functions", title: "Ranking and running totals", concept: "Window functions" },
    ],
  },
];

export interface LessonOutline {
  id: string;
  title: string;
  concept: string;
  moduleId: string;
  /** 1-based position across the whole curriculum; a lesson unlocks when the one before it is complete. */
  position: number;
  /** 1-based position inside its module. */
  number: number;
}

export const LESSONS: LessonOutline[] = MODULES.flatMap((m) =>
  m.lessons.map((l, i) => ({ ...l, moduleId: m.id, number: i + 1, position: 0 })),
).map((l, i) => ({ ...l, position: i + 1 }));

export const LESSON_IDS = LESSONS.map((l) => l.id);

const byId = new Map(LESSONS.map((l) => [l.id, l]));
const moduleById = new Map(MODULES.map((m) => [m.id, m]));

export const lessonOutline = (id: string) => byId.get(id) ?? null;
export const moduleOutline = (id: string) => moduleById.get(id) ?? null;
export const nextLessonId = (id: string) => LESSONS[byId.get(id)?.position ?? LESSONS.length]?.id ?? null;
export const previousLessonId = (id: string) => {
  const p = byId.get(id)?.position ?? 1;
  return p > 1 ? LESSONS[p - 2].id : null;
};

/**
 * Learning badges. They live in public.achievements like the game's badges, with these
 * metrics (see lib/achievements.ts): lessons_completed, modules_completed, learn_best_streak,
 * or `lessons` = complete every lesson in `lessonIds`.
 */
export interface LearnBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  metric: "lessons_completed" | "modules_completed" | "learn_best_streak" | "learn_xp" | "lessons";
  threshold: number;
  lessonIds: string[] | null;
  sortOrder: number;
}

export const LEARN_BADGES: LearnBadge[] = [
  {
    id: "learn-first-steps",
    title: "First Steps",
    description: "Complete your first lesson.",
    icon: "footprints",
    metric: "lessons_completed",
    threshold: 1,
    lessonIds: null,
    sortOrder: 200,
  },
  {
    id: "learn-table-detective",
    title: "Table Detective",
    description: "Understand rows and columns.",
    icon: "table",
    metric: "lessons",
    threshold: 1,
    lessonIds: ["rows-and-columns"],
    sortOrder: 210,
  },
  {
    id: "learn-first-select",
    title: "First SELECT",
    description: "Successfully run your first SELECT query.",
    icon: "rocket",
    metric: "lessons",
    threshold: 1,
    lessonIds: ["first-query"],
    sortOrder: 220,
  },
  {
    id: "learn-filter-master",
    title: "Filter Master",
    description: "Complete the filtering challenges: WHERE, AND/OR, IN/BETWEEN and LIKE.",
    icon: "filter",
    metric: "lessons",
    threshold: 4,
    lessonIds: ["where", "and-or", "in-between", "like"],
    sortOrder: 230,
  },
  {
    id: "learn-sorting-expert",
    title: "Sorting Expert",
    description: "Complete the ORDER BY challenge.",
    icon: "sort",
    metric: "lessons",
    threshold: 1,
    lessonIds: ["order-by"],
    sortOrder: 240,
  },
  {
    id: "learn-data-collector",
    title: "Data Collector",
    description: "Complete the aggregation lessons: COUNT/SUM/AVG, GROUP BY and HAVING.",
    icon: "sigma",
    metric: "lessons",
    threshold: 3,
    lessonIds: ["aggregates", "group-by", "having"],
    sortOrder: 250,
  },
  {
    id: "learn-table-connector",
    title: "Table Connector",
    description: "Complete the JOIN challenges.",
    icon: "link",
    metric: "lessons",
    threshold: 2,
    lessonIds: ["inner-join", "outer-joins"],
    sortOrder: 260,
  },
  {
    id: "learn-habit",
    title: "Learning Habit",
    description: "Learn on 3 days in a row.",
    icon: "flame",
    metric: "learn_best_streak",
    threshold: 3,
    lessonIds: null,
    sortOrder: 270,
  },
  {
    id: "learn-week-streak",
    title: "Week of Learning",
    description: "Learn on 7 days in a row.",
    icon: "calendar",
    metric: "learn_best_streak",
    threshold: 7,
    lessonIds: null,
    sortOrder: 280,
  },
  {
    id: "learn-sql-champion",
    title: "SQL Champion",
    description: "Complete the whole beginner curriculum.",
    icon: "graduation",
    metric: "modules_completed",
    threshold: 6,
    lessonIds: null,
    sortOrder: 290,
  },
];

export const LEARN_METRICS = new Set<string>([
  "lessons_completed",
  "modules_completed",
  "learn_best_streak",
  "learn_xp",
  "lessons",
]);
