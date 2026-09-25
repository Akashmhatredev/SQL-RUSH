# SQL Rush ⚡

A competitive SQL learning game. Players answer questions against the clock across four difficulty levels (Easy, Medium, Hard, Expert) and five challenge types. They build combos, earn XP, unlock achievements, keep a daily streak and climb live leaderboards.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Framer Motion · Supabase (Auth, Postgres, Realtime, RLS) · Vercel

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Security model](#security-model)
- [Setup](#setup)
- [Deploy to Vercel](#deploy-to-vercel)
- [Project structure](#project-structure)
- [Scripts and testing](#scripts-and-testing)
- [Game rules](#game-rules)
- [Questions and bulk upload](#questions-and-bulk-upload)

## Features

**Authentication**

- Sign in with Google or GitHub (Supabase Auth, PKCE, cookie sessions via `@supabase/ssr`).
- A profile is created automatically on sign-up.
- Sign out.
- The middleware protects `/dashboard`, `/play` and `/admin`.

**Game**

- Modes:
  - Classic Rush: 15 questions and 3 lives.
  - Endless: difficulty rises every 8 correct answers.
  - Practice: untimed, with hints and answer reveals, unranked.
  - Daily Challenge: 10 questions, the same for everyone, one attempt per UTC day.
- Question types: write SQL, multiple choice, fix the query, predict the output, drag & drop query builder.
- Timer, lives, combos (×2/×3/×5), time bonus, XP and six levels, achievement pop-ups, sounds and keyboard shortcuts.

**Dashboard**

- Profile, editable username and display name.
- Current level with an animated XP bar, XP, accuracy, total games, total and high score, day streak.
- Achievement collection with progress towards each locked badge.
- Accuracy by difficulty and question type, a 14-day daily-challenge history and recent games.

**Leaderboards**, updated live over Supabase Realtime:

- Global: lifetime XP.
- Today: points earned today (UTC).
- This week: points earned since Monday (UTC).
- High scores: best single run.
- Daily Challenge: today's challenge scores.

**Admin panel** (role `admin`)

- Overview.
- Create, edit, hide and delete questions.
- Bulk upload from JSON, with per-row validation and a preview.
- View users and change roles.
- Score history with filters.
- Manage achievements.

**UI**

- Dark neon gaming theme with glassmorphism cards.
- Responsive down to 360px.
- Animated leaderboard podium and rows, animated XP progress.
- Respects `prefers-reduced-motion`.

## How it works

The game is **server-authoritative**. Clients never see an answer before answering and never write a score, so a leaderboard entry can't be faked with a single REST call. The whole game engine is a set of Postgres functions in `supabase/migrations/20260925000000_init.sql`:

```text
Browser                           Postgres (Supabase RPC, SECURITY DEFINER)
───────                           ──────────────────────────────────────────
start_game(mode, difficulty) ───▶ opens a game_sessions row and plans the questions
next_question(session)       ───▶ returns ONE question without its answer and starts its clock
submit_answer(session, …)    ───▶ checks the answer, scores it with the server clock and
                                  returns the solution, the explanation and any achievements
          … repeat …              the last answer, or losing the last life, finishes the run:
                                  a scores row is written, profile totals update, badges unlock
end_game(session)            ───▶ quit early (still recorded if anything was answered)
```

- **Answer checking** (`normalize_sql`) is a port of `lib/validation.ts`, so case, whitespace, comments, quote style and optional keywords don't matter. `npm run test:db` checks that the SQL and TypeScript versions agree on about 30,000 inputs.
- **Timing uses the server clock.**
  - Each question's clock starts when it is served. The server forgives 1.5s of network latency and up to 120s of pause time per run; the client shows the same budget in the pause menu.
  - Answers that arrive after the timer has run out never count.
  - Reloading during the daily challenge resumes the question in play, with its original clock. In other modes a reload starts a fresh run, and the interrupted run is still recorded if anything was answered.
- **Daily challenge**: ten questions are chosen deterministically on the first request of each UTC day and stored in `daily_challenges`, so every player gets the same set.

## Security model

| Table                           | Anyone                 | Signed-in player                                                             | Admin                               |
| ------------------------------- | ---------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| `profiles`                      | read (public profiles) | update **own** `username`, `display_name`, `avatar_url` only (column grants) | change roles via `admin_set_role()` |
| `questions`                     | –                      | – (questions arrive through `next_question()` without answers)               | full CRUD                           |
| `scores`                        | read (leaderboards)    | – (written only by the game functions, for the caller's own session)         | read                                |
| `achievements`                  | read                   | –                                                                            | full CRUD                           |
| `user_achievements`             | read                   | – (awarded by the game functions)                                            | read                                |
| `game_sessions`, `game_answers` | –                      | read **own**                                                                 | read all                            |
| `daily_challenges`              | –                      | –                                                                            | –                                   |

- RLS is enabled on every table.
- Supabase's default grants to `anon` and `authenticated` are revoked, then only the privileges in the table above are granted back.
- Players can never set their own XP, stats or role.
- Internal functions live in a `private` schema that the API doesn't expose.
- Admin routes are protected three times: by the middleware (role lookup), the `/admin` layout (`requireAdmin()`) and every Server Action (`assertAdmin()`). RLS is the final guard.
- Post-login redirects only accept same-site paths (`lib/redirect.ts`).

> The spec asked that "users can only modify their own profile and scores". Here players can't write score rows directly at all. The server writes them from validated answers, and only ever for the caller's own session. That is stricter than the spec, and it's what makes the leaderboards trustworthy.

## Setup

**Requirements:** Node 20.9+ (`.nvmrc` pins 24) and a Supabase project.

### 1. Environment variables

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon or publishable key>
```

These are the only variables the app needs. Until they're set, pages show a "Connect Supabase" notice instead of crashing.

### 2. Database

Apply the two migrations in `supabase/migrations`, in order:

- `20260925000000_init.sql`: schema, RLS, game engine, leaderboards, admin functions and default achievements.
- `20260925000001_question_bank.sql`: the 400 seed questions.

You can apply them in either of two ways:

- **SQL editor:** paste each file into Supabase Dashboard → SQL Editor → Run.
- **CLI:** `npx supabase link --project-ref <ref>`, then `npx supabase db push`.

> **Already have `profiles` / `questions` / `scores` / `achievements` tables from an earlier setup?** The first migration stops with a clear message instead of half-applying. If those tables hold nothing you need, run `supabase/reset.sql` once in the SQL editor, then run the migrations again. The reset refuses to drop any table that still contains rows, and it removes old sign-up triggers on `auth.users` too.

Realtime is enabled for `scores` by the migration (publication `supabase_realtime`).

### 3. Google and GitHub sign-in

1. **Enable the providers** in Supabase → Authentication → Sign In / Providers:
   - **GitHub:** create an OAuth app at github.com/settings/developers.
   - **Google:** create an OAuth client ID (Web application) in Google Cloud Console.

   For both, set the callback / authorised redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`, then paste the client ID and secret into Supabase.

   The app only offers Google and GitHub. You can disable the Email provider so accounts can't be created any other way.

2. **Set the redirect URLs** in Supabase → Authentication → URL Configuration:
   - **Site URL:** your production URL, e.g. `https://sql-rush.vercel.app`.
   - **Redirect URLs:** `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`. Add `https://*-<team>.vercel.app/auth/callback` for preview deployments.

### 4. Run

```bash
nvm use
npm install
npm run dev          # http://localhost:3000
```

### 5. Make yourself an admin

Sign in once, then run this in the SQL editor:

```sql
update public.profiles set role = 'admin' where username = '<your-username>';
```

After that, you can promote other admins from **Admin → Users**.

## Deploy to Vercel

1. Import the repo in Vercel. The Next.js preset works as-is.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under Project → Settings → Environment Variables.
3. Add the deployment URL to Supabase's Site URL and Redirect URLs (step 3 above).

Pages are Server Components. Heavy client pieces are lazy-loaded:

- the query builder;
- the end-of-run screen and answer review;
- the shortcuts dialog.

`vercel.json` adds security headers and long-lived caching for `/sounds/*`.

## Project structure

```text
app/
  (site)/              Pages with the site header: / (home + game setup), /leaderboard, /dashboard, /login
  play/                The game (protected)
  admin/               Overview, questions (list/new/[id]/upload), users, scores, achievements + actions.ts
  auth/callback        OAuth code exchange          auth/signout   POST sign-out
components/
  ui/                  shadcn/ui primitives (button, dialog, tabs, table, select…) themed for the game
  game/                GameLauncher → GameScreen, QuestionView, SqlEditor, DragDropBuilder, TimerRing, GameOver…
  home/ dashboard/ leaderboard/ admin/ layout/ auth/ common/ providers/
hooks/                 useGameSession (server-driven game loop), useLeaderboard (realtime), useAuth,
                       useSettings, useCountdown, useHotkeys, useSound, useCountUp
services/              Typed data access over supabase-js: game, leaderboard, profile, admin
lib/
  supabase/            Browser, server and middleware clients (+ env)
  schemas/             zod schemas for questions, achievements, profiles
  auth.ts              getViewer / requireViewer / requireAdmin
  validation.ts scoring.ts levels.ts config.ts date.ts achievements.ts …
types/                 database.ts (Supabase types), game.ts, question.ts
middleware.ts          Session refresh + route protection
supabase/
  migrations/          Schema, RLS, game engine, question bank
  reset.sql            Opt-in removal of an older schema
  config.toml          Supabase CLI config for local development
data/questions/*.json  The seed question bank (source of the question-bank migration)
scripts/               test-db.ts, validate-questions.ts, generate-question-bank.ts, generate-sounds.mjs
```

## Scripts and testing

| Script                            | What it does                                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Develop, build and serve                                                                             |
| `npm run lint` / `typecheck`      | ESLint / TypeScript                                                                                  |
| `npm run test:db`                 | Runs the migrations on PGlite (Postgres in WASM) with a Supabase shim and exercises everything below |
| `npm run validate:questions`      | Checks the JSON question bank and runs every SQL answer against real Postgres                        |
| `npm run db:questions`            | Regenerates the question-bank migration from `data/questions/*.json`                                 |
| `npm run format`                  | Prettier                                                                                             |

`npm run test:db` makes about 150 checks (the exact count depends on which questions the random runs draw), covering:

- SQL/TypeScript parity for answer checking and scoring;
- profile creation on sign-up;
- RLS: players can't read answer keys, write scores, edit other profiles or promote themselves;
- full Classic, Daily, Endless and Practice runs;
- server-clock timing and the pause budget;
- the one-attempt daily rule;
- leaderboards and the admin functions.

After changing the schema, regenerate the TypeScript types:

```bash
npx supabase gen types typescript --project-id <ref> --schema public > types/database.ts
```

## Game rules

|             | Easy             | Medium | Hard | Expert |
| ----------- | ---------------- | ------ | ---- | ------ |
| Timer       | 30s              | 45s    | 60s  | 90s    |
| Base points | 10               | 20     | 40   | 80     |
| Time bonus  | 1 × seconds left | 2 ×    | 3 ×  | 4 ×    |

- **Combos:** 3 in a row gives ×2, 5 gives ×3 and 10 gives ×5, applied to the base points. XP is the base points × combo.
- **Practice:** base points and half XP, with no combo, time bonus or ranking.
- **Levels:** Rookie 0, Explorer 300, Analyst 1,000, Engineer 2,500, Architect 5,000, Master 10,000 XP.
- **Daily challenge:** 3 easy, 3 medium, 2 hard and 2 expert questions. A new one unlocks at 00:00 UTC.
- **Achievements:** each is a metric and a threshold, and they're checked after every answer and every run. Available metrics: correct answers, games, best streak, expert correct, perfect runs, fast answers in a run, dailies completed, best day streak, high score, total score and XP. Admins can add new ones without code changes.

## Questions and bulk upload

Questions use the same shape in `data/questions/*.json`, in the admin form and in bulk uploads:

```json
{
  "difficulty": "easy",
  "type": "write-sql",
  "topic": "WHERE",
  "question": "Show all employees from the Sales department.",
  "answer": "SELECT * FROM employees WHERE department = 'Sales';",
  "alternatives": [],
  "hint": "Filter rows with WHERE.",
  "explanation": "WHERE keeps only the rows where the condition is true."
}
```

Some fields only apply to certain types:

| Field          | Used by                         | Rule                                                 |
| -------------- | ------------------------------- | ---------------------------------------------------- |
| `options`      | multiple-choice, predict-output | 2–6 options; `answer` must equal one of them         |
| `query`        | fix-query, predict-output       | Required: the broken query, or the query to evaluate |
| `sampleTables` | predict-output                  | Required                                             |
| `tokens`       | drag-drop                       | The correct order; `answer` is `tokens.join(" ")`    |
| `distractors`  | drag-drop                       | Optional decoy pieces                                |

In predict-output options, each row is one line, columns are separated by `|`, and an empty result is `(no rows)`.

Bulk upload (**Admin → Bulk upload**) takes a JSON array of up to 1,000 questions:

- Every question is validated in the browser and again on the server.
- The database's CHECK constraints enforce the same rules.
- Questions whose `id` already exists are skipped, so re-uploading never overwrites edits.
- A downloadable template has one example of each type.

All questions are written against the practice schema in `data/schema.ts`, which is shown in game.
