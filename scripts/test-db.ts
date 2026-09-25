/**
 * Database tests for the Supabase migrations, run in-process on PGlite (PostgreSQL in WASM).
 *
 *   npm run test:db
 *
 * A small shim recreates what Supabase provides (the auth schema, auth.uid(),
 * the anon/authenticated roles and their default grants), then every file in
 * supabase/migrations is applied and exercised:
 *
 *   - normalize_sql / normalize_text match lib/validation.ts on thousands of inputs
 *   - scoring matches lib/scoring.ts
 *   - sign-up creates a profile
 *   - RLS: players can't read answer keys, write scores or promote themselves
 *   - full classic / daily / endless / practice runs through the game RPCs
 *   - server-side timing, pause budget, leaderboards and admin functions
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { normalizeSql, normalizeText } from "../lib/validation";
import { scoreAnswer } from "../lib/scoring";
import { DIFFICULTIES, type Difficulty, type Question } from "../types/question";

type Row = Record<string, unknown>;

const db = new PGlite();
let passed = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
  } else {
    failures.push(
      detail === undefined ? name : `${name}\n      ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
    );
    console.log(`  ✗ ${name}`);
  }
}

async function rows<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
async function one<T = Row>(sql: string, params: unknown[] = []): Promise<T> {
  const r = await rows<T>(sql, params);
  if (!r.length) throw new Error(`No rows: ${sql}`);
  return r[0];
}

/** Run `fn` as a signed-in user (or anon when `userId` is null), like PostgREST does. */
async function as<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function fails(fn: () => Promise<unknown>, pattern?: RegExp): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return pattern && !pattern.test(message) ? null : message;
  }
}

const rpc = async <T = Row>(fn: string, args: Record<string, unknown> = {}) => {
  const names = Object.keys(args);
  const sql = `select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}`).join(", ")}) as result`;
  return (await one<{ result: T }>(sql, Object.values(args))).result;
};

// ---------------------------------------------------------------------------
// Supabase shim
// ---------------------------------------------------------------------------

async function bootstrap() {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create role supabase_auth_admin nologin;

    create schema auth;
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text,
      raw_user_meta_data jsonb,
      raw_app_meta_data jsonb,
      created_at timestamptz default now(),
      last_sign_in_at timestamptz
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated, supabase_auth_admin;
    grant execute on function auth.uid() to anon, authenticated;
    grant insert, select on auth.users to supabase_auth_admin;
    grant usage on schema public to anon, authenticated, service_role;

    -- Supabase's defaults: new public objects are fully granted to the API roles.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

    create publication supabase_realtime;
  `);
}

async function migrate() {
  const dir = path.join(process.cwd(), "supabase", "migrations");
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
    console.log(`  applied ${file}`);
  }
}

function loadBank(): Question[] {
  return DIFFICULTIES.flatMap((d) =>
    JSON.parse(readFileSync(path.join(process.cwd(), "data", "questions", `${d}.json`), "utf8")),
  );
}

async function createUser(email: string, meta: Row, provider = "github"): Promise<string> {
  await db.exec("set role supabase_auth_admin");
  try {
    const { id } = await one<{ id: string }>(
      "insert into auth.users (email, raw_user_meta_data, raw_app_meta_data) values ($1, $2, $3) returning id",
      [email, meta, { provider }],
    );
    return id;
  } finally {
    await db.exec("reset role");
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testNormalizationParity(bank: Question[]) {
  console.log("\n▸ normalize_sql / normalize_text parity with lib/validation.ts");
  const inputs = new Set<string>();
  const variants = (sql: string) => [
    sql,
    sql.toUpperCase(),
    sql.toLowerCase(),
    sql.replace(/\s+/g, "\n   "),
    `${sql} -- trailing comment`,
    `/* leading\n comment */ ${sql}`,
    sql.replace(/'/g, '"'),
    sql.replace(/'/g, "’"),
    sql.replace(/ = /g, "="),
    sql.replace(/,/g, " , "),
    sql.replace(/\(/g, " ( ").replace(/\)/g, " ) "),
    sql.replace(/ JOIN /gi, " INNER JOIN "),
    sql.replace(/ LEFT JOIN /gi, " LEFT OUTER JOIN "),
    sql.replace(/ != /g, " <> "),
    `${sql};;`,
    `\`${sql}\``,
    sql.replace(/ AS /gi, " "),
    sql.replace(/ DESC/gi, " desc").replace(/ ORDER BY ([a-z_.]+)/gi, " ORDER BY $1 ASC"),
    `  \t${sql}\t\n`,
  ];
  for (const q of bank) {
    for (const sql of [q.answer, ...(q.alternatives ?? []), q.query ?? "", ...(q.options ?? [])]) {
      if (sql) for (const v of variants(sql)) inputs.add(v);
    }
  }
  const all = [...inputs];
  const got = await rows<{ v: string }>(
    "select public.normalize_sql(x) as v from unnest($1::text[]) with ordinality as t(x, i) order by i",
    [all],
  );
  let mismatches = 0;
  all.forEach((input, i) => {
    const expected = normalizeSql(input);
    if (got[i].v !== expected) {
      mismatches++;
      if (mismatches <= 5) check(`normalize_sql(${JSON.stringify(input)})`, false, { ts: expected, sql: got[i].v });
    }
  });
  check(`normalize_sql matches on ${all.length} inputs`, mismatches === 0, `${mismatches} mismatches`);

  const texts = bank.flatMap((q) => [...(q.options ?? []), q.answer, ` ${q.answer}\n\n `]);
  const gotText = await rows<{ v: string }>(
    "select public.normalize_text(x) as v from unnest($1::text[]) with ordinality as t(x, i) order by i",
    [texts],
  );
  const textMismatches = texts.filter((t, i) => gotText[i].v !== normalizeText(t)).length;
  check(`normalize_text matches on ${texts.length} inputs`, textMismatches === 0, `${textMismatches} mismatches`);
}

async function testSignup() {
  console.log("\n▸ sign-up trigger");
  const a = await createUser("ada@example.com", {
    user_name: "Ada-Lovelace",
    full_name: "Ada Lovelace",
    avatar_url: "https://avatars.example.com/ada.png",
  });
  const b = await createUser("ada.l@example.com", { user_name: "ada_lovelace", name: "Ada L" }, "google");
  const c = await createUser("x@example.com", { name: "张伟", picture: "http://insecure.example.com/p.png" }, "google");
  const pa = await one<Row>("select * from public.profiles where id = $1", [a]);
  const pb = await one<Row>("select * from public.profiles where id = $1", [b]);
  const pc = await one<Row>("select * from public.profiles where id = $1", [c]);
  check("GitHub username becomes the profile username", pa.username === "ada_lovelace", pa.username);
  check(
    "display name and avatar come from OAuth metadata",
    pa.display_name === "Ada Lovelace" && pa.avatar_url === "https://avatars.example.com/ada.png",
  );
  check("duplicate usernames get a numeric suffix", /^ada_lovelace_\d{4}$/.test(String(pb.username)), pb.username);
  check(
    "non-ASCII names fall back to the email prefix or 'player'",
    /^[a-z0-9_]{3,24}$/.test(String(pc.username)),
    pc.username,
  );
  check("non-https avatars are dropped instead of failing sign-up", pc.avatar_url === null);
  check("new players start as 'player' at level 1", pa.role === "player" && pa.level === 1 && pa.xp === 0);
  return { a, b, c };
}

async function testRls(users: { a: string; b: string }) {
  console.log("\n▸ row level security & grants");
  const { a, b } = users;

  const visible = await as(a, () => rows("select id from public.questions limit 5"));
  check("players cannot read the questions table (answer key)", visible.length === 0);
  const anonQuestions = await fails(() => as(null, () => rows("select id from public.questions")));
  check("anon has no access to questions at all", anonQuestions !== null);

  const profiles = await as(null, () => rows("select username, xp from public.profiles"));
  check("profiles are publicly readable (leaderboards)", profiles.length >= 2);

  await as(a, () => rows("update public.profiles set display_name = 'Countess' where id = $1", [a]));
  const updated = await one<Row>(
    "select display_name, updated_at > created_at as touched from public.profiles where id = $1",
    [a],
  );
  check("players can edit their own display name", updated.display_name === "Countess");
  check("updated_at trigger runs for players", updated.touched === true);

  const roleEscalation = await fails(() =>
    as(a, () => rows("update public.profiles set role = 'admin' where id = $1", [a])),
  );
  check("players cannot change their own role", roleEscalation !== null, "update succeeded");
  const xpEdit = await fails(() => as(a, () => rows("update public.profiles set xp = 999999 where id = $1", [a])));
  check("players cannot set their own XP", xpEdit !== null);

  await as(a, () => rows("update public.profiles set display_name = 'Hacked' where id = $1", [b]));
  const other = await one<Row>("select display_name from public.profiles where id = $1", [b]);
  check("players cannot edit other profiles", other.display_name !== "Hacked");

  const scoreInsert = await fails(() =>
    as(a, () =>
      rows(
        "insert into public.scores (user_id, session_id, mode, ranked, score, xp_earned, answered, correct, wrong, end_reason) values ($1, gen_random_uuid(), 'classic', true, 999999, 0, 1, 1, 0, 'complete')",
        [a],
      ),
    ),
  );
  check("players cannot insert scores directly", scoreInsert !== null);
  const sessionInsert = await fails(() =>
    as(a, () =>
      rows("insert into public.game_sessions (user_id, mode, difficulty, types) values ($1, 'classic', 'easy', '{}')", [
        a,
      ]),
    ),
  );
  check("players cannot create sessions directly", sessionInsert !== null);
  const achievementInsert = await fails(() =>
    as(a, () => rows("insert into public.user_achievements (user_id, achievement_id) values ($1, 'sql-master')", [a])),
  );
  check("players cannot award themselves achievements", achievementInsert !== null);
  const daily = await fails(() => as(a, () => rows("select * from public.daily_challenges")));
  check("daily challenge plans are not readable", daily !== null);

  const anonStart = await fails(() => as(null, () => rpc("start_game", { p_mode: "classic" })));
  check("anon cannot start games", anonStart !== null);
  const privateCall = await fails(() => as(a, () => rows("select private.finish_session(gen_random_uuid(), 'quit')")));
  check("private schema functions are not callable by players", privateCall !== null);
  const adminCall = await fails(() => as(a, () => rows("select * from public.admin_list_users()")), /Admins only/);
  check("admin functions reject players", adminCall !== null);
  const achievementEdit = await as(a, () => rows("update public.achievements set threshold = 1 returning id"));
  check("players cannot edit achievement definitions", achievementEdit.length === 0);
}

interface Payload {
  id: number;
  index: number;
  total: number | null;
  difficulty: Difficulty;
  type: Question["type"];
  options: string[];
  tokenPool: { key: string; text: string }[];
  hint: string | null;
  timer: number;
  secondsLeft: number | null;
  schemaTables: string[];
  [key: string]: unknown;
}

interface Result {
  correct: boolean;
  timedOut: boolean;
  points: number;
  xp: number;
  combo: number;
  timeBonus: number;
  basePoints: number;
  secondsLeft: number;
  streak: number;
  tierUp: boolean;
  gameOver: boolean;
  unlocked: { id: string }[];
  solution: { answer: string; tokens: string[] | null; explanation: string };
  state: { lives: number; score: number; tier: number; answered: number; pauseBudgetMs: number };
  summary: Row | null;
}

function rightAnswer(q: Question) {
  if (q.type === "write-sql" || q.type === "fix-query") return { kind: "text", value: q.answer.toLowerCase() };
  if (q.type === "drag-drop") return { kind: "order", value: q.tokens };
  return { kind: "choice", value: q.answer };
}
function wrongAnswer(q: Question) {
  if (q.type === "write-sql" || q.type === "fix-query") return { kind: "text", value: "SELECT 'nope'" };
  if (q.type === "drag-drop") return { kind: "order", value: [...(q.tokens ?? [])].reverse() };
  return { kind: "choice", value: (q.options ?? []).find((o) => o !== q.answer) ?? "x" };
}

async function testGameplay(users: { a: string; b: string }, bank: Map<number, Question>) {
  console.log("\n▸ classic run through the game RPCs");
  const { a, b } = users;

  const start = await as(a, () => rpc<Row>("start_game", { p_mode: "classic", p_difficulty: "easy", p_types: null }));
  check("classic run plans 15 questions", start.total === 15 && start.lives === 3, start);
  const sessionId = start.sessionId as string;

  const leak = await as(b, () => fails(() => rpc("next_question", { p_session_id: sessionId })));
  check("another player cannot draw questions from my run", leak !== null);

  let streak = 0;
  let totalPoints = 0;
  const unlocked: string[] = [];
  for (let i = 0; i < 15; i++) {
    const q = await as(a, () => rpc<Payload>("next_question", { p_session_id: sessionId }));
    if (i === 0) {
      const again = await as(a, () => rpc<Payload>("next_question", { p_session_id: sessionId }));
      check("reloading returns the question already in play", again.id === q.id);
      check("payload never includes the answer", !("answer" in q) && !("explanation" in q) && !("tokens" in q));
      check("payload has a timer and schema tables", q.timer === 30 && Array.isArray(q.schemaTables));
      check("hints are hidden outside practice", q.hint === null);
    }
    const src = bank.get(q.id)!;
    if (q.type === "drag-drop") {
      check(
        "builder pool keys are neutral",
        q.tokenPool.every((t, k) => t.key === `p${k}`),
      );
    }
    const correct = i !== 5 && i !== 9; // two deliberate mistakes
    const res = await as(a, () =>
      rpc<Result>("submit_answer", {
        p_session_id: sessionId,
        p_answer: correct ? rightAnswer(src) : wrongAnswer(src),
        p_paused_ms: 0,
        p_reveal: false,
        p_timed_out: false,
      }),
    );
    check(`Q${i + 1} (${src.type}) judged ${correct ? "correct" : "wrong"}`, res.correct === correct, res);
    streak = correct ? streak + 1 : 0;
    const expected = scoreAnswer({
      difficulty: src.difficulty,
      correct,
      streak,
      secondsLeft: res.secondsLeft,
      timed: true,
      practice: false,
    });
    check(`Q${i + 1} score matches lib/scoring.ts`, res.points === expected.points && res.xp === expected.xp, {
      sql: [res.points, res.xp],
      ts: [expected.points, expected.xp],
    });
    check(`Q${i + 1} returns the solution`, res.solution.answer === src.answer && !!res.solution.explanation);
    totalPoints += res.points;
    unlocked.push(...res.unlocked.map((u) => u.id));
    if (i === 0)
      check("first-query unlocks on the first correct answer", unlocked.includes("first-query"), res.unlocked);
    if (i === 14) {
      check("last answer finishes the run", res.gameOver && res.summary?.recorded === true, res.summary);
      check("run score matches the sum of answers", res.state.score === totalPoints);
      check("correct-10 unlocked during the run", unlocked.includes("correct-10"), unlocked);
    } else {
      check(`Q${i + 1} does not end the run`, !res.gameOver);
    }
  }
  const score = await one<Row>("select * from public.scores where session_id = $1", [sessionId]);
  check(
    "score row written",
    score.score === totalPoints && score.correct === 13 && score.wrong === 2 && score.ranked === true,
  );
  check("accuracy is generated", Number(score.accuracy) === 86.67, score.accuracy);
  const p = await one<Row>("select * from public.profiles where id = $1", [a]);
  check(
    "profile aggregates updated",
    p.games_played === 1 && p.questions_answered === 15 && p.questions_correct === 13,
  );
  check("profile high score and total score", p.high_score === totalPoints && Number(p.total_score) === totalPoints);
  check("day streak started", p.day_streak === 1 && p.last_played_on !== null);
  check("level recomputed from XP", p.level === (Number(p.xp) >= 300 ? 2 : 1), p);
  const answers = await one<{ n: number }>("select count(*)::int as n from public.game_answers where session_id = $1", [
    sessionId,
  ]);
  check("every answer stored", answers.n === 15);
  const ended = await as(a, () => fails(() => rpc("next_question", { p_session_id: sessionId })));
  check("finished runs refuse more questions", ended !== null);
}

async function testLivesAndTiming(userId: string, bank: Map<number, Question>) {
  console.log("\n▸ lives, server clock and pause budget");
  const start = await as(userId, () => rpc<Row>("start_game", { p_mode: "classic", p_difficulty: "hard" }));
  const sessionId = start.sessionId as string;

  // Answer late: the server clock says 200s passed.
  let q = await as(userId, () => rpc<Payload>("next_question", { p_session_id: sessionId }));
  await db.query("update public.game_sessions set current_served_at = now() - interval '200 seconds' where id = $1", [
    sessionId,
  ]);
  let res = await as(userId, () =>
    rpc<Result>("submit_answer", { p_session_id: sessionId, p_answer: rightAnswer(bank.get(q.id)!) }),
  );
  check("right answers after the timer are rejected", !res.correct && res.timedOut && res.state.lives === 2, res);

  // Paused for 15s of a 20s wait: 5s - 1.5s grace ≈ 3.5s effective.
  q = await as(userId, () => rpc<Payload>("next_question", { p_session_id: sessionId }));
  await db.query("update public.game_sessions set current_served_at = now() - interval '20 seconds' where id = $1", [
    sessionId,
  ]);
  res = await as(userId, () =>
    rpc<Result>("submit_answer", {
      p_session_id: sessionId,
      p_answer: rightAnswer(bank.get(q.id)!),
      p_paused_ms: 15000,
    }),
  );
  check("reported pause time is forgiven", res.correct && Math.floor(res.secondsLeft) === 56, res.secondsLeft);
  check("pause budget is spent", res.state.pauseBudgetMs === 105000, res.state.pauseBudgetMs);

  // Claiming a huge pause only forgives what's left of the budget.
  q = await as(userId, () => rpc<Payload>("next_question", { p_session_id: sessionId }));
  await db.query("update public.game_sessions set current_served_at = now() - interval '170 seconds' where id = $1", [
    sessionId,
  ]);
  res = await as(userId, () =>
    rpc<Result>("submit_answer", {
      p_session_id: sessionId,
      p_answer: rightAnswer(bank.get(q.id)!),
      p_paused_ms: 999999,
    }),
  );
  check("pause claims beyond the budget don't help", !res.correct && res.state.pauseBudgetMs === 0, res);

  q = await as(userId, () => rpc<Payload>("next_question", { p_session_id: sessionId }));
  res = await as(userId, () =>
    rpc<Result>("submit_answer", { p_session_id: sessionId, p_answer: wrongAnswer(bank.get(q.id)!) }),
  );
  check(
    "losing the last life ends the run",
    res.gameOver && res.summary?.endReason === "lives" && res.state.lives === 0,
    res,
  );

  const revealInClassic = await as(userId, async () => {
    const s = await rpc<Row>("start_game", { p_mode: "classic", p_difficulty: "easy" });
    await rpc("next_question", { p_session_id: s.sessionId });
    return fails(() =>
      rpc("submit_answer", { p_session_id: s.sessionId, p_answer: { kind: "text", value: "" }, p_reveal: true }),
    );
  });
  check("reveal is refused outside practice", revealInClassic !== null);
}

async function testOtherModes(users: { a: string; b: string; c: string }, bank: Map<number, Question>) {
  console.log("\n▸ daily, endless, practice and quitting");
  const { a, b, c } = users;

  // Daily: same questions for everyone, one attempt.
  const da = await as(a, () => rpc<Row>("start_game", { p_mode: "daily" }));
  const db2 = await as(b, () => rpc<Row>("start_game", { p_mode: "daily" }));
  const plans = await rows<{ planned_ids: number[] }>(
    "select planned_ids from public.game_sessions where id in ($1, $2)",
    [da.sessionId, db2.sessionId],
  );
  check("daily challenge has 10 questions", da.total === 10);
  check(
    "everyone gets the same daily questions",
    JSON.stringify(plans[0].planned_ids) === JSON.stringify(plans[1].planned_ids),
  );
  const diffs = await rows<{ difficulty: string }>(
    "select q.difficulty from unnest($1::bigint[]) with ordinality as p(id, i) join public.questions q on q.id = p.id order by i",
    [plans[0].planned_ids],
  );
  check(
    "daily mix is 3 easy, 3 medium, 2 hard, 2 expert",
    diffs.map((d) => d.difficulty).join(",") === "easy,easy,easy,medium,medium,medium,hard,hard,expert,expert",
  );
  const resumed = await as(a, () => rpc<Row>("start_game", { p_mode: "daily" }));
  check(
    "starting the daily again resumes the same run",
    resumed.sessionId === da.sessionId && resumed.resumed === true,
  );
  for (let i = 0; i < 10; i++) {
    const q = await as(a, () => rpc<Payload>("next_question", { p_session_id: da.sessionId }));
    await as(a, () => rpc("submit_answer", { p_session_id: da.sessionId, p_answer: rightAnswer(bank.get(q.id)!) }));
  }
  const dailyScore = await one<Row>("select * from public.scores where session_id = $1", [da.sessionId]);
  check(
    "daily score stores the pattern and date",
    dailyScore.pattern === "1111111111" && dailyScore.challenge_date !== null && dailyScore.difficulty === null,
  );
  const again = await as(a, () => fails(() => rpc("start_game", { p_mode: "daily" }), /already played/));
  check("the daily challenge can only be played once", again !== null);
  const pa = await one<Row>("select daily_completed, perfect_runs from public.profiles where id = $1", [a]);
  check("daily completion and perfect run counted", pa.daily_completed === 1 && Number(pa.perfect_runs) >= 1, pa);
  const badges = await rows<{ achievement_id: string }>(
    "select achievement_id from public.user_achievements where user_id = $1",
    [a],
  );
  check(
    "daily-challenger and no-mistakes unlocked",
    ["daily-challenger", "no-mistakes"].every((id) => badges.some((x) => x.achievement_id === id)),
    badges,
  );

  // Player B abandons the daily without answering: starting something else closes it.
  await as(b, () => rpc("next_question", { p_session_id: db2.sessionId }));

  // Endless: difficulty climbs every 8 correct answers.
  const en = await as(b, () => rpc<Row>("start_game", { p_mode: "endless", p_difficulty: "easy" }));
  const closed = await one<Row>("select status from public.game_sessions where id = $1", [db2.sessionId]);
  check("starting a new run closes the previous one", closed.status === "abandoned", closed);
  const blockedDaily = await as(b, () => fails(() => rpc("start_game", { p_mode: "daily" }), /already played/));
  check("a daily you've seen a question of counts as your attempt", blockedDaily !== null);
  let tierUps = 0;
  let lastDifficulty = "";
  for (let i = 0; i < 9; i++) {
    const q = await as(b, () => rpc<Payload>("next_question", { p_session_id: en.sessionId }));
    lastDifficulty = q.difficulty;
    const res = await as(b, () =>
      rpc<Result>("submit_answer", { p_session_id: en.sessionId, p_answer: rightAnswer(bank.get(q.id)!) }),
    );
    if (res.tierUp) tierUps++;
  }
  check("endless moves up a tier after 8 correct", tierUps === 1 && lastDifficulty === "medium", {
    tierUps,
    lastDifficulty,
  });
  const quit = await as(b, () => rpc<Row>("end_game", { p_session_id: en.sessionId }));
  check("quitting records the run", quit.recorded === true && quit.endReason === "quit", quit);

  // Practice: hints, reveals, no lives, unranked.
  const pr = await as(c, () =>
    rpc<Row>("start_game", { p_mode: "practice", p_difficulty: "medium", p_types: "{drag-drop}" }),
  );
  let q = await as(c, () => rpc<Payload>("next_question", { p_session_id: pr.sessionId }));
  check("practice respects the chosen types", q.type === "drag-drop");
  check("practice is untimed", q.secondsLeft === null);
  const revealed = await as(c, () =>
    rpc<Result>("submit_answer", {
      p_session_id: pr.sessionId,
      p_answer: { kind: "order", value: [] },
      p_reveal: true,
    }),
  );
  check(
    "practice reveal returns the solution without cost",
    revealed.solution.tokens !== null && revealed.state.lives === 3 && revealed.points === 0,
  );
  for (let i = 0; i < 4; i++) {
    q = await as(c, () => rpc<Payload>("next_question", { p_session_id: pr.sessionId }));
    const res = await as(c, () =>
      rpc<Result>("submit_answer", { p_session_id: pr.sessionId, p_answer: wrongAnswer(bank.get(q.id)!) }),
    );
    check("practice never ends on mistakes", !res.gameOver && res.state.lives === 3);
  }
  q = await as(c, () => rpc<Payload>("next_question", { p_session_id: pr.sessionId }));
  const good = await as(c, () =>
    rpc<Result>("submit_answer", { p_session_id: pr.sessionId, p_answer: rightAnswer(bank.get(q.id)!) }),
  );
  const expected = scoreAnswer({
    difficulty: "medium",
    correct: true,
    streak: 1,
    secondsLeft: 0,
    timed: false,
    practice: true,
  });
  check("practice scoring matches lib/scoring.ts", good.points === expected.points && good.xp === expected.xp, good);
  await as(c, () => rpc("end_game", { p_session_id: pr.sessionId }));
  const practiceScore = await one<Row>("select ranked from public.scores where session_id = $1", [pr.sessionId]);
  check("practice runs are unranked", practiceScore.ranked === false);
}

async function testLeaderboards(users: { a: string; b: string; c: string }) {
  console.log("\n▸ leaderboards & stats");
  for (const board of ["global", "daily", "weekly", "highest", "challenge"]) {
    const list = await as(null, () =>
      rows<{ rank: string; value: string; username: string }>("select * from public.get_leaderboard($1, 10)", [board]),
    );
    const values = list.map((r) => Number(r.value));
    check(
      `${board} leaderboard is readable by anon and sorted`,
      list.length > 0 && values.every((v, i) => i === 0 || values[i - 1] >= v),
      list,
    );
  }
  const challenge = await rows("select * from public.get_leaderboard('challenge', 10)");
  check("challenge board only has today's daily players", challenge.length === 1);
  const mine = await as(users.c, () =>
    rows<{ user_id: string }>("select * from public.get_leaderboard('global', 1, $1)", [users.c]),
  );
  check("a player's own rank can be looked up", mine.length === 1 && mine[0].user_id === users.c);
  const best = await rows<{ value: string }>("select * from public.get_leaderboard('highest', 10, $1)", [users.c]);
  const ranked = await one<{ best: number }>(
    "select coalesce(max(score), 0)::int as best from public.scores where user_id = $1 and ranked",
    [users.c],
  );
  const practice = await one<{ best: number }>(
    "select coalesce(max(score), 0)::int as best from public.scores where user_id = $1 and not ranked",
    [users.c],
  );
  check(
    "practice scores never count on score boards",
    practice.best > 0 && Number(best[0]?.value ?? 0) === ranked.best,
    { board: best[0]?.value, ranked: ranked.best, practice: practice.best },
  );
  const stats = await as(users.a, () => rpc<{ byDifficulty: Row[]; byType: Row[]; bests: Row[] }>("get_my_stats"));
  check(
    "get_my_stats returns breakdowns",
    stats.byDifficulty.length > 0 && stats.byType.length > 0 && stats.bests.length > 0,
    stats,
  );
}

async function testAdmin(users: { a: string; b: string }) {
  console.log("\n▸ admin");
  const { a, b } = users;
  await db.query("update public.profiles set role = 'admin' where id = $1", [a]);

  const count = await as(a, () => one<{ n: number }>("select count(*)::int as n from public.questions"));
  check("admins can read the question bank", count.n === 400);

  const bad = await as(a, () =>
    fails(() =>
      rows(
        "insert into public.questions (difficulty, type, topic, question, answer, explanation, options) values ('easy', 'multiple-choice', 'SELECT', 'Pick one of these', 'D', 'because', array['A','B','C'])",
      ),
    ),
  );
  check("DB rejects malformed questions", bad !== null);
  const created = await as(a, () =>
    one<{ id: number }>(
      "insert into public.questions (difficulty, type, topic, question, answer, explanation, tokens) values ('easy', 'drag-drop', 'SELECT', 'Build the query', 'SELECT * FROM products', 'Because.', array['SELECT *', 'FROM products']) returning id",
    ),
  );
  check("admins can create questions and ids continue after the seed", created.id > 400, created);
  const edited = await as(a, () =>
    rows("update public.questions set is_active = false where id = $1 returning id", [created.id]),
  );
  check("admins can edit questions", edited.length === 1);
  const deleted = await as(a, () => rows("delete from public.questions where id = $1 returning id", [created.id]));
  check("admins can delete questions", deleted.length === 1);

  const users2 = await as(a, () => rows<Row>("select * from public.admin_list_users('ada', 10, 0)"));
  check(
    "admin_list_users searches and includes emails",
    users2.length === 2 && users2.every((u) => String(u.email).includes("@")),
    users2,
  );
  const selfDemote = await as(a, () =>
    fails(() => rpc("admin_set_role", { p_user: a, p_role: "player" }), /own admin/),
  );
  check("admins cannot demote themselves", selfDemote !== null);
  await as(a, () => rpc("admin_set_role", { p_user: b, p_role: "admin" }));
  const promoted = await one<Row>("select role from public.profiles where id = $1", [b]);
  check("admins can promote users", promoted.role === "admin");
  await as(a, () => rpc("admin_set_role", { p_user: b, p_role: "player" }));
  const overview = await as(a, () => rpc<Row>("admin_overview"));
  check("admin_overview reports counts", overview.questions === 400 && Number(overview.users) === 3, overview);
  const achievement = await as(a, () =>
    rows(
      "insert into public.achievements (id, title, description, icon, metric, threshold) values ('marathon', 'Marathon', 'Play 50 games.', 'timer', 'games_played', 50) returning id",
    ),
  );
  check("admins can create achievements", achievement.length === 1);
  const allScores = await as(a, () => one<{ n: number }>("select count(*)::int as n from public.game_answers"));
  check("admins can read everyone's answers", allScores.n > 30);
}

async function main() {
  console.log("Setting up PGlite with a Supabase shim…");
  await bootstrap();
  await migrate();
  const bank = loadBank();
  const byId = new Map(bank.map((q) => [q.id, q]));

  await testNormalizationParity(bank);
  const users = await testSignup();
  await testRls(users);
  await testGameplay(users, byId);
  await testLivesAndTiming(users.c, byId);
  await testOtherModes(users, byId);
  await testLeaderboards(users);
  await testAdmin(users);

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
