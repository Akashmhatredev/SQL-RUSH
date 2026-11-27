/**
 * Checks Beginner Mode: the lesson content and the in-browser SQL engine.
 *
 *   npm run test:learn               every lesson
 *   npm run test:learn -- where like only these lessons
 *
 *   - every curriculum lesson has content, and every lesson is well formed (tables exist,
 *     answers are valid, challenges are solvable and not already solved by their starter…)
 *   - every query in every lesson runs in lib/learn/sql AND in real PostgreSQL (PGlite), and both
 *     give the same result, so what the animations show is what a real database would do
 *   - a set of engine checks: NULL logic, joins, grouping, windows and beginner-friendly errors
 */
import { PGlite, types } from "@electric-sql/pglite";
import { LESSONS } from "../lib/learn/curriculum";
import { LESSON_CONTENT, MISSING_LESSONS } from "../lib/learn/lessons";
import { compareRelations, compareRuns, missingKeywords } from "../lib/learn/sql/compare";
import { runSql } from "../lib/learn/sql/engine";
import { SqlError } from "../lib/learn/sql/errors";
import type { CellValue, DatabaseData, Relation } from "../lib/learn/sql/types";
import { buildSteps } from "../lib/learn/steps";
import type { Lesson, LessonTable } from "../lib/learn/types";

let passed = 0;
const failures: string[] = [];
const warnings: string[] = [];

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) passed++;
  else {
    failures.push(
      detail === undefined ? name : `${name}\n      ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
    );
    console.log(`  ✗ ${name}`);
  }
}

const PG_TYPES: Record<string, string> = {
  int: "integer",
  numeric: "numeric",
  text: "text",
  date: "date",
  bool: "boolean",
};

function dbOf(tables: LessonTable[]): DatabaseData {
  return Object.fromEntries(tables.map((t) => [t.name.toLowerCase(), t]));
}

const pgCache = new Map<string, Promise<PGlite>>();

/** One PostgreSQL per lesson; every query runs in a transaction that is rolled back. */
function lessonPg(lesson: Lesson): Promise<PGlite> {
  let pg = pgCache.get(lesson.id);
  if (!pg) {
    pg = freshPg(lesson.tables);
    pgCache.set(lesson.id, pg);
  }
  return pg;
}

async function freshPg(tables: LessonTable[]): Promise<PGlite> {
  const pg = new PGlite({
    parsers: {
      [types.NUMERIC]: (v: string) => Number(v),
      [types.INT8]: (v: string) => Number(v),
      [types.DATE]: (v: string) => v,
    },
  });
  for (const t of tables) {
    const cols = t.columns.map((c) => `"${c.name}" ${PG_TYPES[c.type] ?? "text"}${c.pk ? " primary key" : ""}`);
    await pg.exec(`create table "${t.name}" (${cols.join(", ")})`);
    for (const row of t.rows) {
      await pg.query(`insert into "${t.name}" values (${row.map((_, i) => `$${i + 1}`).join(", ")})`, row as unknown[]);
    }
  }
  return pg;
}

const normalize = (v: unknown): CellValue => {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v as CellValue;
};

async function pgSelect(pg: PGlite, sql: string): Promise<Relation> {
  const res = await pg.query<Record<string, unknown>>(sql, [], { rowMode: "array" });
  return {
    columns: res.fields.map((f) => ({ name: f.name, table: null, type: "unknown" })),
    rows: (res.rows as unknown as unknown[][]).map((r, i) => ({ key: String(i), values: r.map(normalize) })),
  };
}

async function pgTable(pg: PGlite, table: LessonTable): Promise<CellValue[][]> {
  const res = await pg.query(`select * from "${table.name}"`, [], { rowMode: "array" });
  return (res.rows as unknown as unknown[][]).map((r) => r.map(normalize));
}

/** Runs `sql` in the engine and in PostgreSQL and checks both agree. */
async function parity(label: string, sql: string, lesson: Lesson, opts: { mutates?: boolean } = {}) {
  const db = dbOf(lesson.tables);
  let ours;
  try {
    ours = runSql(sql, db);
  } catch (e) {
    check(`${label}: runs in the engine`, false, `${sql}\n      ${e instanceof Error ? e.message : e}`);
    return;
  }
  for (const r of ours.runs) {
    if (r.warnings.length) warnings.push(`${label}: ${r.warnings.map((w) => w.message).join(" ")}  (${sql})`);
    const steps = buildSteps(r);
    check(`${label}: produces animation steps`, steps.length > 0 && steps.every((s) => s.narration.length > 0));
  }
  const pg = await lessonPg(lesson);
  await pg.exec("begin");
  try {
    const statements = sql.split(/;\s*(?=\S)/).filter((s) => s.trim());
    let last: Relation | null = null;
    for (const s of statements) {
      if (/^\s*(select|with)\b/i.test(s)) last = await pgSelect(pg, s);
      else await pg.query(s);
    }
    const lastRun = ours.runs.at(-1)!;
    if (lastRun.result && last) {
      const v = compareRelations(lastRun.result, last, lastRun.ordered);
      check(
        `${label}: matches PostgreSQL`,
        v.ok,
        `${sql}\n      ${v.message}\n      engine: ${JSON.stringify(lastRun.result.rows.map((r) => r.values))}\n      postgres: ${JSON.stringify(last.rows.map((r) => r.values))}`,
      );
      check(
        `${label}: same column names as PostgreSQL`,
        lastRun.result.columns.map((c) => c.name).join(",") === last.columns.map((c) => c.name).join(","),
        { engine: lastRun.result.columns.map((c) => c.name), postgres: last.columns.map((c) => c.name) },
      );
    }
    if (opts.mutates || ours.runs.some((r) => r.statement.type !== "select")) {
      for (const t of lesson.tables) {
        const expected = await pgTable(pg, t);
        const got = ours.db[t.name.toLowerCase()].rows;
        const key = (rows: CellValue[][]) =>
          rows
            .map((r) => JSON.stringify(r))
            .sort()
            .join("\n");
        check(`${label}: ${t.name} ends up the same as in PostgreSQL`, key(got) === key(expected), { got, expected });
      }
    }
  } catch (e) {
    check(`${label}: runs in PostgreSQL`, false, `${sql}\n      ${e instanceof Error ? e.message : e}`);
  } finally {
    await pg.exec("rollback");
  }
}

const tableNames = (l: Lesson) => new Set(l.tables.map((t) => t.name.toLowerCase()));

async function testLesson(lesson: Lesson) {
  const outline = LESSONS.find((l) => l.id === lesson.id);
  const at = `[${lesson.id}]`;
  check(`${at} is in the curriculum`, !!outline);
  check(`${at} has a summary`, lesson.summary.length >= 20 && lesson.summary.length <= 160, lesson.summary.length);
  check(`${at} has 4–10 steps`, lesson.steps.length >= 4 && lesson.steps.length <= 10, lesson.steps.length);
  check(`${at} has 2–4 check questions`, lesson.check.length >= 2 && lesson.check.length <= 4, lesson.check.length);
  check(`${at} has 2–4 takeaways`, lesson.takeaways.length >= 2 && lesson.takeaways.length <= 4);
  check(`${at} starts with a story`, lesson.steps[0]?.kind === "story");

  const names = tableNames(lesson);
  const hasTable = (t: string | undefined, where: string) => {
    if (t === undefined) return;
    check(`${at} ${where}: table "${t}" exists in the lesson`, names.has(t.toLowerCase()));
  };
  for (const t of lesson.tables) {
    check(
      `${at} table ${t.name}: rows match columns`,
      t.rows.every((r) => r.length === t.columns.length),
    );
    check(`${at} table ${t.name}: ≤ 12 rows`, t.rows.length <= 12, t.rows.length);
    if (t.labelColumn)
      check(
        `${at} table ${t.name}: labelColumn exists`,
        t.columns.some((c) => c.name === t.labelColumn),
      );
  }

  // SQL must not appear before the lesson has explained the idea visually.
  const firstSql = lesson.steps.findIndex(
    (s) => s.kind === "syntax" || s.kind === "playground" || (s.kind === "animate" && s.showSql),
  );
  const firstVisual = lesson.steps.findIndex(
    (s) =>
      s.kind === "animate" ||
      s.kind === "explore" ||
      s.kind === "predict" ||
      s.kind === "database" ||
      (s.kind === "concept" && !!s.compare),
  );
  if (firstSql >= 0) {
    check(`${at} shows the idea visually before any SQL`, firstVisual >= 0 && firstVisual < firstSql, {
      firstVisual,
      firstSql,
    });
  }

  for (const [i, step] of lesson.steps.entries()) {
    const where = `step ${i + 1} (${step.kind})`;
    check(`${at} ${where} has a title and body`, step.title.trim().length > 0 && step.body.trim().length > 0);
    switch (step.kind) {
      case "story":
        hasTable(step.paper, where);
        break;
      case "explore":
        hasTable(step.table, where);
        for (const task of step.tasks ?? []) {
          const t = lesson.tables.find((x) => x.name === step.table);
          if ((task.type === "click-row" || task.type === "hover-cell") && task.type === "click-row" && task.match) {
            const ci = t?.columns.findIndex((c) => c.name === task.match!.column) ?? -1;
            check(`${at} ${where}: task row exists`, ci >= 0 && !!t?.rows.some((r) => r[ci] === task.match!.value));
          }
          if (task.type === "click-column" && task.column) {
            check(`${at} ${where}: task column exists`, !!t?.columns.some((c) => c.name === task.column));
          }
          if (
            (task.type === "add-row" ||
              task.type === "edit-cell" ||
              task.type === "delete-row" ||
              task.type === "reset") &&
            !step.editable
          ) {
            check(`${at} ${where}: editing tasks need editable: true`, false);
          }
        }
        break;
      case "database":
        for (const t of step.tables) hasTable(t, where);
        break;
      case "predict":
        hasTable(step.table, where);
        await parity(`${at} ${where}`, step.query, lesson);
        break;
      case "animate":
        await parity(`${at} ${where}`, step.query, lesson);
        if (step.joinTypes) {
          for (const jt of step.joinTypes) {
            const q = step.query.replace(
              /\b(INNER\s+JOIN|LEFT\s+(OUTER\s+)?JOIN|RIGHT\s+(OUTER\s+)?JOIN|FULL\s+(OUTER\s+)?JOIN|JOIN)\b/i,
              jt,
            );
            await parity(`${at} ${where} as ${jt}`, q, lesson);
          }
        }
        break;
      case "syntax":
        await parity(`${at} ${where}`, step.query, lesson);
        break;
      case "concept":
        if (step.compare) {
          hasTable(step.compare.before.table, where);
          await parity(`${at} ${where} compare`, step.compare.after.query, lesson);
        }
        break;
      case "playground":
        await parity(`${at} ${where} starter`, step.starter, lesson);
        for (const s of step.suggestions ?? []) await parity(`${at} ${where} suggestion`, s, lesson);
        for (const t of step.tables ?? []) hasTable(t, where);
        break;
    }
  }

  for (const [i, q] of lesson.check.entries()) {
    const where = `check ${i + 1} (${q.kind})`;
    switch (q.kind) {
      case "choice":
        check(`${at} ${where}: 2–5 options`, q.options.length >= 2 && q.options.length <= 5);
        check(`${at} ${where}: answer index is valid`, q.answer >= 0 && q.answer < q.options.length);
        check(`${at} ${where}: options are different`, new Set(q.options).size === q.options.length);
        hasTable(q.table, where);
        if (q.code) await parity(`${at} ${where} code`, q.code, lesson);
        break;
      case "pick-rows": {
        hasTable(q.table, where);
        await parity(`${at} ${where}`, q.query, lesson);
        break;
      }
      case "pick-column": {
        hasTable(q.table, where);
        const t = lesson.tables.find((x) => x.name === q.table);
        check(`${at} ${where}: column exists`, !!t?.columns.some((c) => c.name === q.column));
        break;
      }
      case "order":
        check(`${at} ${where}: has tokens`, q.tokens.length >= 3);
        if (/^(select|with|insert|update|delete)\b/i.test(q.tokens.join(" "))) {
          await parity(`${at} ${where}`, q.tokens.join(" "), lesson);
        }
        break;
    }
  }

  const c = lesson.challenge;
  const where = `challenge (${c.kind})`;
  check(`${at} ${where}: has hints`, c.hints.length >= 1);
  if (c.kind === "sql" || c.kind === "build") {
    for (const t of c.tables) hasTable(t, where);
    const solution = c.kind === "sql" ? c.solution : c.tokens.join(" ");
    await parity(`${at} ${where} solution`, solution, lesson);
    const db = dbOf(lesson.tables);
    try {
      const expected = runSql(solution, db);
      const last = expected.runs.at(-1)!;
      if (last.result && last.result.rows.length === 0) warnings.push(`${at} ${where}: the solution returns no rows`);
      if (c.kind === "sql") {
        if (c.requires)
          check(
            `${at} ${where}: solution uses the required keywords`,
            missingKeywords(c.solution, c.requires).length === 0,
          );
        if (c.starter) {
          let solved = false;
          try {
            solved = compareRuns(runSql(c.starter, db), expected).ok;
          } catch {
            solved = false;
          }
          check(`${at} ${where}: the starter doesn't already solve it`, !solved);
        }
      }
    } catch (e) {
      check(`${at} ${where}: solution runs`, false, e instanceof Error ? e.message : e);
    }
  } else {
    if (c.view === "table") hasTable(c.table, where);
    for (const t of c.tables ?? []) hasTable(t, where);
    const t = lesson.tables.find((x) => x.name === c.table);
    const g = c.goal;
    if (g.type === "pick-rows") await parity(`${at} ${where}`, g.query, lesson);
    if (g.type === "pick-column")
      check(`${at} ${where}: column exists`, !!t?.columns.some((col) => col.name === g.column));
    if (g.type === "pick-table") check(`${at} ${where}: table exists`, names.has(g.table));
    if (g.type === "add-row") {
      check(`${at} ${where}: add-row names every column`, !!t && t.columns.every((col) => col.name in g.values));
    }
    if (g.type === "pick-cell" || g.type === "edit-cell" || g.type === "delete-row") {
      const ci = t?.columns.findIndex((col) => col.name === g.row.column) ?? -1;
      check(`${at} ${where}: target row exists`, ci >= 0 && t!.rows.filter((r) => r[ci] === g.row.value).length === 1);
    }
  }
  if (lesson.cheatsheet) {
    for (const s of lesson.cheatsheet) await parity(`${at} cheatsheet`, s.sql, lesson);
  }
}

// ---------------------------------------------------------------------------
// Engine checks against PostgreSQL on a shared fixture
// ---------------------------------------------------------------------------

async function testEngine() {
  console.log("\n▸ engine vs PostgreSQL");
  const { classList, customers, employees, lockers, marks, menu, orders } = await import("../lib/learn/datasets");
  const fixture: Lesson = {
    id: "fixture",
    summary: "",
    minutes: 0,
    tables: [classList, customers, employees, lockers, marks, menu, orders],
    steps: [],
    check: [],
    challenge: { kind: "sql", prompt: "", tables: [], solution: "", hints: [] },
    takeaways: [],
  };
  const queries = [
    "SELECT * FROM students",
    "SELECT name, age FROM students WHERE age >= 18 AND city != 'Pune' ORDER BY age DESC, name",
    "SELECT name FROM students WHERE city IN ('Pune', 'Delhi') OR age BETWEEN 21 AND 23 ORDER BY name",
    "SELECT name FROM students WHERE name LIKE 'R%' OR name LIKE '_e%' ORDER BY name",
    "SELECT name FROM students WHERE name NOT LIKE '%a' ORDER BY 1",
    "SELECT DISTINCT city FROM students ORDER BY city",
    "SELECT city, COUNT(*) AS students, MIN(age), MAX(age), SUM(age), AVG(age) FROM students GROUP BY city ORDER BY students DESC, city",
    "SELECT category, ROUND(AVG(price), 2) AS avg_price FROM products GROUP BY category HAVING COUNT(*) >= 2 ORDER BY avg_price DESC",
    "SELECT COUNT(*), COUNT(student_id), COUNT(DISTINCT student_id) FROM lockers",
    "SELECT c.name, o.book FROM customers c JOIN orders o ON c.customer_id = o.customer_id ORDER BY o.order_id",
    "SELECT c.name, COUNT(o.order_id) AS orders FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.name ORDER BY orders DESC, c.name",
    "SELECT s.name, l.locker_no FROM students s FULL JOIN lockers l ON s.student_id = l.student_id ORDER BY l.locker_no NULLS FIRST, s.name",
    "SELECT s.name, l.locker_no FROM students s RIGHT JOIN lockers l ON s.student_id = l.student_id ORDER BY l.locker_no",
    "SELECT name, salary, RANK() OVER (ORDER BY salary DESC) AS r, DENSE_RANK() OVER (ORDER BY salary DESC) AS d, ROW_NUMBER() OVER (ORDER BY salary DESC, name) AS n FROM employees ORDER BY n",
    "SELECT name, department, SUM(salary) OVER (PARTITION BY department ORDER BY salary) AS running FROM employees ORDER BY department, salary, name",
    "SELECT name, LAG(salary) OVER (ORDER BY employee_id) AS prev FROM employees ORDER BY employee_id",
    "WITH big AS (SELECT * FROM orders WHERE amount >= 250) SELECT customer_id, COUNT(*) AS n FROM big GROUP BY customer_id ORDER BY customer_id",
    "SELECT name FROM products WHERE price > (SELECT AVG(price) FROM products) ORDER BY price",
    "SELECT name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id) ORDER BY name",
    "SELECT name FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders) ORDER BY name",
    "SELECT name, CASE WHEN price >= 200 THEN 'Premium' WHEN price >= 100 THEN 'Regular' ELSE 'Budget' END AS band FROM products ORDER BY product_id",
    "SELECT name, price * 2 AS double_price, price / 3 AS third, price % 7 AS rem FROM products ORDER BY product_id",
    "SELECT UPPER(name), LOWER(city), LENGTH(name) FROM students ORDER BY student_id",
    "SELECT name FROM products ORDER BY price DESC LIMIT 3",
    "SELECT name FROM products ORDER BY price LIMIT 2 OFFSET 2",
    "SELECT locker_no, COALESCE(student_id, 0) AS sid FROM lockers WHERE student_id IS NULL OR floor = 1 ORDER BY locker_no",
    "SELECT name, years FROM employees WHERE NOT (department = 'Sales') ORDER BY years DESC, name",
    "SELECT department, MAX(salary) - MIN(salary) AS spread FROM employees GROUP BY department ORDER BY spread DESC",
    "SELECT 'Hello, SQL!' AS greeting",
    "SELECT 2 + 3 * 4 AS answer",
    "SELECT book, order_date FROM orders WHERE order_date >= '2024-03-08' ORDER BY order_date",
    "SELECT name FROM students WHERE city = NULL",
    "SELECT student_id, AVG(score) AS avg FROM marks GROUP BY student_id HAVING AVG(score) > 80 ORDER BY student_id",
    "SELECT s.name, m.subject, m.score FROM students s JOIN marks m ON s.student_id = m.student_id WHERE m.score >= 85 ORDER BY m.score DESC",
    "INSERT INTO students VALUES (109, 'Tara', 19, 'Goa'); SELECT COUNT(*) AS n FROM students",
    "INSERT INTO students (student_id, name) VALUES (110, 'Yash')",
    "UPDATE products SET price = price + 10 WHERE category = 'Drink'",
    "UPDATE students SET city = 'Mumbai', age = age + 1 WHERE student_id = 105",
    "DELETE FROM students WHERE age < 18",
    "DELETE FROM lockers WHERE student_id IS NULL",
  ];
  for (const q of queries) await parity("engine", q, fixture);

  const errors: [string, RegExp][] = [
    ["SELECT nme FROM students", /no column called "nme"/],
    ["SELECT * FROM student", /no table called "student"/],
    ['SELECT name FROM students WHERE city = "Pune"', /double quotes/],
    ["SELECT name FROM students WHERE city = Pune", /no column called "Pune"/],
    ["SELECT city, name FROM students GROUP BY city", /must be in GROUP BY/],
    ["SELECT name FROM students WHERE COUNT(*) > 1", /can't be used in WHERE/],
    ["SELECT * students", /forget FROM/],
    ["SELECT name, FROM students", /extra comma/],
    ["SELECT name FROM students ORDER age", /ORDER needs BY/],
    ["SELECT student_id FROM students s JOIN marks m ON s.student_id = m.student_id", /more than one table/],
    ["INSERT INTO students VALUES (101, 'Dup', 20, 'X')", /already exists/],
    ["INSERT INTO students VALUES (111, 'Short')", /2 values but there are 4 columns/],
    ["SELECT name FROM students WHERE age > 'old'", /isn't a number/],
    ["SELECT name FROM students WHERE name = 5", /text column with a number/],
    ["SELECT name FROM students WHERE age", /isn't a condition/],
    ["DROP TABLE students", /isn't allowed/],
    ["SELECT ROW_NUMBER() FROM students", /needs OVER/],
    ["SELECT * FROM students WHERE city = ‘Pune’", /curly quote/],
    ["SELEC * FROM students", /starts with SELECT/],
  ];
  const db = dbOf(fixture.tables);
  for (const [q, pattern] of errors) {
    try {
      runSql(q, db);
      check(`error for: ${q}`, false, "no error was raised");
    } catch (e) {
      check(`error for: ${q}`, e instanceof SqlError && pattern.test(e.message), e instanceof Error ? e.message : e);
    }
  }
  const warn = runSql("SELECT name age FROM students", db).runs[0].warnings;
  check(
    "warns about a missing comma between columns",
    warn.some((w) => /forget a comma/.test(w.message)),
  );
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  console.log("▸ curriculum");
  if (!only.length) {
    check(
      "every curriculum lesson has content",
      MISSING_LESSONS.length === 0,
      `missing: ${MISSING_LESSONS.join(", ")}`,
    );
    check(
      "no content for lessons outside the curriculum",
      Object.keys(LESSON_CONTENT).every((id) => LESSONS.some((l) => l.id === id)),
    );
  }
  for (const lesson of Object.values(LESSON_CONTENT)) {
    if (only.length && !only.includes(lesson.id)) continue;
    console.log(`\n▸ lesson ${lesson.id}`);
    await testLesson(lesson);
    const pg = pgCache.get(lesson.id);
    if (pg) await (await pg).close();
  }
  if (!only.length) await testEngine();

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
