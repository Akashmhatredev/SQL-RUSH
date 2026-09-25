-- ============================================================================
-- SQL Rush — schema, security and server-side game engine
-- ============================================================================
--
-- The game is server-authoritative. Clients never see answer keys before
-- answering and never write scores directly:
--
--   start_game()     opens a run (game_sessions) and plans its questions
--   next_question()  hands out one question without its answer and starts its clock
--   submit_answer()  checks the answer, scores it with the server clock and returns the solution
--   end_game()       lets the player quit a run early
--
-- The last answer of a run (or losing the last life) finishes it automatically:
-- a row is written to `scores`, the profile aggregates are updated and
-- achievements are awarded. Everything that must not be callable over the
-- API lives in the `private` schema, which PostgREST does not expose.
--
-- The scoring and answer-checking rules mirror lib/scoring.ts and
-- lib/validation.ts; `npm run test:db` checks they stay in sync.
-- ============================================================================

-- Pre-flight: stop with a clear message if an earlier, different schema is in the way.
do $$
declare
  existing text;
begin
  select string_agg(table_name, ', ' order by table_name) into existing
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('profiles', 'questions', 'scores', 'achievements', 'user_achievements', 'game_sessions', 'game_answers', 'daily_challenges');
  if existing is not null then
    raise exception 'SQL Rush: these tables already exist in the public schema: %', existing
      using hint = 'They were created by an earlier setup. If they hold nothing you need, run supabase/reset.sql once (it refuses to drop tables that contain rows), then run this migration again.';
  end if;
end;
$$;

create schema if not exists private;
revoke all on schema private from public;

-- ----------------------------------------------------------------------------
-- Types
-- ----------------------------------------------------------------------------

create type public.difficulty as enum ('easy', 'medium', 'hard', 'expert');
create type public.question_type as enum ('write-sql', 'multiple-choice', 'fix-query', 'predict-output', 'drag-drop');
create type public.game_mode as enum ('classic', 'endless', 'practice', 'daily');
create type public.user_role as enum ('player', 'admin');
create type public.game_status as enum ('active', 'finished', 'abandoned');
create type public.end_reason as enum ('lives', 'complete', 'quit');
-- Every metric is a column on public.profiles with the same name.
create type public.achievement_metric as enum (
  'questions_correct',
  'games_played',
  'best_streak',
  'expert_correct',
  'perfect_runs',
  'best_fast_run',
  'daily_completed',
  'best_day_streak',
  'high_score',
  'total_score',
  'xp'
);

-- ----------------------------------------------------------------------------
-- Pure helpers (mirrors of the TypeScript game rules)
-- ----------------------------------------------------------------------------

-- lib/config.ts DIFFICULTY_CONFIG: timer, base points and time-bonus multiplier.
create or replace function public.difficulty_rules(
  p_difficulty public.difficulty,
  out timer_seconds integer,
  out base_points integer,
  out time_multiplier integer
)
language sql immutable parallel safe set search_path = ''
as $$
  select
    case p_difficulty when 'easy' then 30 when 'medium' then 45 when 'hard' then 60 else 90 end,
    case p_difficulty when 'easy' then 10 when 'medium' then 20 when 'hard' then 40 else 80 end,
    case p_difficulty when 'easy' then 1 when 'medium' then 2 when 'hard' then 3 else 4 end;
$$;

-- lib/scoring.ts comboMultiplier: 3 in a row → ×2, 5 → ×3, 10 → ×5.
create or replace function public.combo_multiplier(p_streak integer)
returns integer
language sql immutable parallel safe set search_path = ''
as $$
  select case when p_streak >= 10 then 5 when p_streak >= 5 then 3 when p_streak >= 3 then 2 else 1 end;
$$;

-- lib/levels.ts LEVELS, 1-based.
create or replace function public.level_for_xp(p_xp integer)
returns smallint
language sql immutable parallel safe set search_path = ''
as $$
  select (case
    when p_xp >= 10000 then 6
    when p_xp >= 5000 then 5
    when p_xp >= 2500 then 4
    when p_xp >= 1000 then 3
    when p_xp >= 300 then 2
    else 1
  end)::smallint;
$$;

-- lib/validation.ts normalizeSql: ignore case, whitespace, comments, semicolons,
-- quote style, spacing around punctuation and the optional keywords AS, ASC,
-- INNER and OUTER. Must stay byte-for-byte compatible with the TypeScript version.
create or replace function public.normalize_sql(p_sql text)
returns text
language plpgsql immutable parallel safe set search_path = ''
as $$
declare
  s text := lower(coalesce(p_sql, ''));
begin
  s := regexp_replace(s, '--[^\n]*', ' ', 'g');
  s := regexp_replace(s, '/\*.*?\*/', ' ', 'g');
  s := replace(s, '`', '');
  s := translate(s, '“”‘’"', repeat(chr(39), 5));
  s := replace(s, ';', ' ');
  s := regexp_replace(s, '\s+', ' ', 'g');
  s := replace(s, '<>', '!=');
  s := regexp_replace(s, '\yinner\s+join\y', 'join', 'g');
  s := regexp_replace(s, '\y(left|right|full)\s+outer\s+join\y', '\1 join', 'g');
  s := regexp_replace(s, '\yas\y', ' ', 'g');
  s := regexp_replace(s, '\yasc\y', ' ', 'g');
  s := regexp_replace(s, '\s*([,()=<>!+*/%|:-])\s*', '\1', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  return btrim(s, ' ');
end;
$$;

-- lib/validation.ts normalizeText.
create or replace function public.normalize_text(p_text text)
returns text
language sql immutable parallel safe set search_path = ''
as $$
  select btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g'), ' ');
$$;

create or replace function private.utc_today()
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone 'utc')::date;
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (char_length(display_name) between 1 and 40),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  role public.user_role not null default 'player',
  -- Progression (written only by the game functions)
  xp integer not null default 0 check (xp >= 0),
  level smallint not null default 1,
  games_played integer not null default 0,
  total_score bigint not null default 0,
  high_score integer not null default 0,
  questions_answered integer not null default 0,
  questions_correct integer not null default 0,
  expert_correct integer not null default 0,
  best_streak integer not null default 0,
  perfect_runs integer not null default 0,
  best_fast_run integer not null default 0,
  fastest_answer_ms integer,
  daily_completed integer not null default 0,
  day_streak integer not null default 0,
  best_day_streak integer not null default 0,
  last_played_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user, created by a trigger on sign-up. Players may edit username, display_name and avatar_url only.';

create table public.questions (
  id bigint generated by default as identity primary key,
  difficulty public.difficulty not null,
  type public.question_type not null,
  topic text not null check (char_length(topic) between 1 and 60),
  question text not null check (char_length(question) between 5 and 2000),
  -- write-sql / fix-query: canonical SQL · multiple-choice / predict-output: the correct option · drag-drop: tokens joined by spaces
  answer text not null check (char_length(answer) between 1 and 4000),
  alternatives text[] not null default '{}',
  options text[],
  query text,
  sample_tables jsonb,
  tokens text[],
  distractors text[] not null default '{}',
  hint text,
  explanation text not null check (char_length(explanation) between 1 and 4000),
  -- Practice-schema tables the question uses, shown in the in-game schema panel.
  schema_tables text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_choice_shape check (
    type not in ('multiple-choice', 'predict-output')
    or (cardinality(options) between 2 and 6 and answer = any (options))
  ),
  constraint questions_query_shape check (
    type not in ('fix-query', 'predict-output') or char_length(btrim(coalesce(query, ''))) > 0
  ),
  constraint questions_predict_shape check (
    type <> 'predict-output' or jsonb_typeof(sample_tables) = 'array'
  ),
  constraint questions_builder_shape check (
    type <> 'drag-drop' or (cardinality(tokens) >= 2 and answer = array_to_string(tokens, ' '))
  )
);

create index questions_pool_idx on public.questions (difficulty, type) where is_active;

create table public.achievements (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  title text not null check (char_length(title) between 1 and 60),
  description text not null check (char_length(description) between 1 and 200),
  icon text not null default 'trophy',
  metric public.achievement_metric not null,
  threshold integer not null check (threshold > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- The fixed question list for each day's challenge, created on first request.
create table public.daily_challenges (
  challenge_date date primary key,
  question_ids bigint[] not null,
  created_at timestamptz not null default now()
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mode public.game_mode not null,
  -- Starting difficulty (the daily challenge mixes all four).
  difficulty public.difficulty not null,
  types public.question_type[] not null,
  status public.game_status not null default 'active',
  challenge_date date,
  -- classic & daily: the planned questions. endless & practice draw as they go.
  planned_ids bigint[],
  served_ids bigint[] not null default '{}',
  current_question_id bigint references public.questions (id) on delete set null,
  current_served_at timestamptz,
  -- endless: index into the difficulty enum, rises every 8 correct answers
  tier smallint not null default 0,
  lives smallint not null default 3,
  score integer not null default 0,
  xp integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  answered integer not null default 0,
  correct integer not null default 0,
  wrong integer not null default 0,
  revealed integer not null default 0,
  fast_correct integer not null default 0,
  -- lib/config.ts PAUSE_BUDGET_SECONDS: pause time the clock forgives per run.
  pause_budget_ms integer not null default 120000 check (pause_budget_ms >= 0),
  end_reason public.end_reason,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  last_activity_at timestamptz not null default now()
);

create index game_sessions_user_idx on public.game_sessions (user_id, started_at desc);
create index game_sessions_active_idx on public.game_sessions (user_id) where status = 'active';
-- One daily-challenge attempt per player per day.
create unique index game_sessions_daily_once on public.game_sessions (user_id, challenge_date) where mode = 'daily';

create table public.game_answers (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id bigint references public.questions (id) on delete set null,
  difficulty public.difficulty not null,
  type public.question_type not null,
  answer jsonb not null,
  is_correct boolean not null,
  timed_out boolean not null default false,
  revealed boolean not null default false,
  seconds_taken numeric(7, 2) not null,
  points integer not null default 0,
  xp integer not null default 0,
  created_at timestamptz not null default now()
);

create index game_answers_user_idx on public.game_answers (user_id, created_at desc);
create index game_answers_session_idx on public.game_answers (session_id);
create index game_answers_question_idx on public.game_answers (question_id);

-- One row per finished run: the game history and the source of every leaderboard.
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null unique references public.game_sessions (id) on delete cascade,
  mode public.game_mode not null,
  -- null for the daily challenge, which mixes difficulties
  difficulty public.difficulty,
  -- practice runs are recorded but never ranked
  ranked boolean not null,
  score integer not null check (score >= 0),
  xp_earned integer not null check (xp_earned >= 0),
  answered integer not null check (answered >= 0),
  correct integer not null check (correct between 0 and answered),
  wrong integer not null check (wrong >= 0),
  best_streak integer not null default 0,
  accuracy numeric(5, 2) generated always as (
    case when answered > 0 then round(correct * 100.0 / answered, 2) else 0 end
  ) stored,
  end_reason public.end_reason not null,
  duration_seconds integer not null default 0,
  challenge_date date,
  -- daily challenge: one character per question, "1" correct / "0" wrong
  pattern text,
  created_at timestamptz not null default now()
);

create index scores_created_idx on public.scores (created_at desc) where ranked;
create index scores_user_idx on public.scores (user_id, created_at desc);
create index scores_best_idx on public.scores (user_id, score desc) where ranked;
create index scores_challenge_idx on public.scores (challenge_date, score desc) where mode = 'daily';
create index profiles_xp_idx on public.profiles (xp desc) where xp > 0;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger questions_updated_at before update on public.questions
  for each row execute function private.set_updated_at();
create trigger achievements_updated_at before update on public.achievements
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- Auth: create a profile for every new user
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base text;
  candidate text;
  attempt integer := 0;
begin
  -- GitHub sends user_name, Google sends name/email.
  base := lower(coalesce(
    nullif(meta ->> 'user_name', ''),
    nullif(meta ->> 'preferred_username', ''),
    nullif(meta ->> 'name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'player'
  ));
  base := btrim(regexp_replace(base, '[^a-z0-9_]+', '_', 'g'), '_');
  base := left(base, 18);
  if char_length(base) < 3 then
    base := 'player';
  end if;

  candidate := base;
  loop
    begin
      insert into public.profiles (id, username, display_name, avatar_url)
      values (
        new.id,
        candidate,
        left(coalesce(nullif(btrim(meta ->> 'full_name'), ''), nullif(btrim(meta ->> 'name'), ''), candidate), 40),
        case
          when coalesce(meta ->> 'avatar_url', meta ->> 'picture') ~ '^https://'
          then coalesce(meta ->> 'avatar_url', meta ->> 'picture')
        end
      );
      exit;
    exception when unique_violation then
      attempt := attempt + 1;
      if attempt > 25 then
        candidate := 'player_' || substr(replace(new.id::text, '-', ''), 1, 12);
      else
        candidate := base || '_' || lpad(floor(random() * 10000)::integer::text, 4, '0');
      end if;
    end;
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Role check used by RLS policies and admin functions
-- ----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_answers enable row level security;
alter table public.scores enable row level security;

-- Supabase grants everything on new tables to anon/authenticated by default.
-- Start from nothing and grant exactly what each role needs.
revoke all on public.profiles, public.questions, public.achievements, public.user_achievements,
  public.daily_challenges, public.game_sessions, public.game_answers, public.scores
  from anon, authenticated;

-- profiles: public (leaderboards), players edit three columns of their own row.
-- Column grants stop anyone from giving themselves XP or the admin role.
grant select on public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url) on public.profiles to authenticated;

create policy "Profiles are public"
  on public.profiles for select to anon, authenticated
  using (true);

create policy "Players update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- questions: the answer key is admin-only. Players get questions through
-- next_question(), which strips the answer.
grant select, insert, update, delete on public.questions to authenticated;

create policy "Admins read questions"
  on public.questions for select to authenticated
  using ((select public.is_admin()));

create policy "Admins create questions"
  on public.questions for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update questions"
  on public.questions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete questions"
  on public.questions for delete to authenticated
  using ((select public.is_admin()));

-- achievements: definitions are public, admins manage them.
grant select on public.achievements to anon, authenticated;
grant insert, update, delete on public.achievements to authenticated;

create policy "Achievements are public"
  on public.achievements for select to anon, authenticated
  using (true);

create policy "Admins create achievements"
  on public.achievements for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update achievements"
  on public.achievements for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete achievements"
  on public.achievements for delete to authenticated
  using ((select public.is_admin()));

-- user_achievements: public badge collections, awarded only by the game functions.
grant select on public.user_achievements to anon, authenticated;

create policy "Unlocked achievements are public"
  on public.user_achievements for select to anon, authenticated
  using (true);

-- scores: public game history (leaderboards), written only by the game functions.
grant select on public.scores to anon, authenticated;

create policy "Scores are public"
  on public.scores for select to anon, authenticated
  using (true);

-- game_sessions / game_answers: private to the player (and admins).
grant select on public.game_sessions, public.game_answers to authenticated;

create policy "Players read their own sessions"
  on public.game_sessions for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

create policy "Players read their own answers"
  on public.game_answers for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

-- daily_challenges: no policies, so no client access at all.

-- ----------------------------------------------------------------------------
-- Game engine internals (private schema: not callable over the API)
-- ----------------------------------------------------------------------------

create or replace function private.difficulty_at(p_tier integer)
returns public.difficulty
language sql immutable set search_path = ''
as $$
  select (enum_range(null::public.difficulty))[least(greatest(p_tier, 0), 3) + 1];
$$;

create or replace function private.tier_of(p_difficulty public.difficulty)
returns smallint
language sql immutable set search_path = ''
as $$
  select (array_position(enum_range(null::public.difficulty), p_difficulty) - 1)::smallint;
$$;

-- Question ids the player answered recently, used to avoid repeats.
create or replace function private.recent_question_ids(p_user uuid)
returns bigint[]
language sql stable set search_path = ''
as $$
  select coalesce(array_agg(question_id), '{}')
  from (
    select question_id from public.game_answers
    where user_id = p_user and question_id is not null
    order by created_at desc
    limit 150
  ) recent;
$$;

-- The same ten questions for everyone on a given (UTC) day.
create or replace function private.daily_question_ids(p_date date)
returns bigint[]
language plpgsql security definer set search_path = ''
as $$
declare
  v_ids bigint[];
begin
  select question_ids into v_ids from public.daily_challenges where challenge_date = p_date;
  if found then
    return v_ids;
  end if;

  -- lib/config.ts DAILY_MIX: 3 easy, 3 medium, 2 hard, 2 expert, easiest first.
  select array_agg(id order by d_rank, pick) into v_ids
  from (
    select q.id, m.d_rank, m.cnt,
      row_number() over (partition by q.difficulty order by md5(p_date::text || ':' || q.id::text)) as pick
    from public.questions q
    join (values
      ('easy'::public.difficulty, 1, 3),
      ('medium'::public.difficulty, 2, 3),
      ('hard'::public.difficulty, 3, 2),
      ('expert'::public.difficulty, 4, 2)
    ) as m (difficulty, d_rank, cnt) on m.difficulty = q.difficulty
    where q.is_active
  ) ranked
  where pick <= cnt;

  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'The daily challenge has no questions yet.' using errcode = 'P0001';
  end if;

  insert into public.daily_challenges (challenge_date, question_ids)
  values (p_date, v_ids)
  on conflict (challenge_date) do nothing;

  select question_ids into v_ids from public.daily_challenges where challenge_date = p_date;
  return v_ids;
end;
$$;

-- Draw one question for endless/practice: unseen this run first, then not
-- answered recently, then random. Falls back to any type if the chosen
-- types have nothing at this difficulty.
create or replace function private.pick_question(p_session public.game_sessions, p_difficulty public.difficulty)
returns bigint
language plpgsql volatile set search_path = ''
as $$
declare
  v_recent bigint[] := private.recent_question_ids(p_session.user_id);
  v_id bigint;
begin
  select q.id into v_id
  from public.questions q
  where q.is_active and q.difficulty = p_difficulty and q.type = any (p_session.types)
  order by (q.id = any (p_session.served_ids)), (q.id = any (v_recent)), random()
  limit 1;

  if v_id is null then
    select q.id into v_id
    from public.questions q
    where q.is_active and q.difficulty = p_difficulty
    order by (q.id = any (p_session.served_ids)), (q.id = any (v_recent)), random()
    limit 1;
  end if;

  if v_id is null then
    raise exception 'No % questions are available right now.', p_difficulty using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;

create or replace function private.session_state(s public.game_sessions)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'sessionId', s.id,
    'mode', s.mode,
    'difficulty', s.difficulty,
    'status', s.status,
    'tier', s.tier,
    'lives', s.lives,
    'score', s.score,
    'xp', s.xp,
    'streak', s.streak,
    'bestStreak', s.best_streak,
    'answered', s.answered,
    'correct', s.correct,
    'wrong', s.wrong,
    'fastCorrect', s.fast_correct,
    'served', cardinality(s.served_ids),
    'total', cardinality(s.planned_ids),
    'pauseBudgetMs', s.pause_budget_ms,
    'challengeDate', s.challenge_date,
    'startedAt', s.started_at
  );
$$;

-- A question as the player sees it: no answer, shuffled options, and a
-- shuffled builder pool with neutral keys so the order leaks nothing.
create or replace function private.question_payload(q public.questions, s public.game_sessions)
returns jsonb
language plpgsql volatile set search_path = ''
as $$
declare
  v_rules record;
  v_options jsonb;
  v_order text[];
  v_pool jsonb;
  v_attempt integer := 0;
  v_elapsed_ms numeric;
begin
  select * into v_rules from public.difficulty_rules(q.difficulty);

  if q.options is not null then
    select jsonb_agg(o order by random()) into v_options from unnest(q.options) as o;
  end if;

  if q.type = 'drag-drop' then
    loop
      select array_agg(t order by random()) into v_order from unnest(q.tokens || q.distractors) as t;
      v_attempt := v_attempt + 1;
      exit when v_attempt >= 8 or v_order[1:cardinality(q.tokens)] is distinct from q.tokens;
    end loop;
    select jsonb_agg(jsonb_build_object('key', 'p' || (i - 1), 'text', v_order[i]) order by i)
      into v_pool
      from generate_subscripts(v_order, 1) as i;
  end if;

  v_elapsed_ms := greatest(0, extract(epoch from (now() - coalesce(s.current_served_at, now()))) * 1000 - 1500);

  return jsonb_build_object(
    'id', q.id,
    'index', cardinality(s.served_ids),
    'total', cardinality(s.planned_ids),
    'difficulty', q.difficulty,
    'type', q.type,
    'topic', q.topic,
    'question', q.question,
    'options', coalesce(v_options, '[]'::jsonb),
    'query', q.query,
    'sampleTables', q.sample_tables,
    'tokenPool', coalesce(v_pool, '[]'::jsonb),
    'schemaTables', to_jsonb(q.schema_tables),
    'hint', case when s.mode = 'practice' then q.hint end,
    'timer', v_rules.timer_seconds,
    'secondsLeft', case
      when s.mode = 'practice' then null
      else round(greatest(0, v_rules.timer_seconds - v_elapsed_ms / 1000.0), 2)
    end
  );
end;
$$;

-- Award every active achievement the player now qualifies for.
create or replace function private.award_achievements(p_user uuid)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_result jsonb;
begin
  with p as (
    select * from public.profiles where id = p_user
  ),
  earned as (
    select a.id
    from public.achievements a cross join p
    where a.is_active
      and not exists (
        select 1 from public.user_achievements ua where ua.user_id = p_user and ua.achievement_id = a.id
      )
      and (case a.metric
        when 'questions_correct' then p.questions_correct
        when 'games_played' then p.games_played
        when 'best_streak' then p.best_streak
        when 'expert_correct' then p.expert_correct
        when 'perfect_runs' then p.perfect_runs
        when 'best_fast_run' then p.best_fast_run
        when 'daily_completed' then p.daily_completed
        when 'best_day_streak' then p.best_day_streak
        when 'high_score' then p.high_score
        when 'total_score' then p.total_score
        when 'xp' then p.xp
      end) >= a.threshold
  ),
  inserted as (
    insert into public.user_achievements (user_id, achievement_id)
    select p_user, id from earned
    on conflict do nothing
    returning achievement_id, unlocked_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'description', a.description,
      'icon', a.icon,
      'unlockedAt', i.unlocked_at
    ) order by a.sort_order), '[]'::jsonb)
    into v_result
    from inserted i join public.achievements a on a.id = i.achievement_id;
  return v_result;
end;
$$;

-- Close a run: write the score, update the profile and award achievements.
-- Idempotent: returns null if the run is not active any more.
create or replace function private.finish_session(p_session_id uuid, p_reason public.end_reason)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  s public.game_sessions;
  p public.profiles;
  v_today date := private.utc_today();
  v_ranked boolean;
  v_perfect boolean;
  v_new_high boolean;
  v_day_streak integer;
  v_pattern text;
  v_unlocked jsonb;
  v_xp integer;
begin
  select * into s from public.game_sessions where id = p_session_id for update;
  if not found or s.status <> 'active' then
    return null;
  end if;

  if s.answered = 0 then
    if cardinality(s.served_ids) = 0 then
      -- Never saw a question: forget the run entirely (lets a daily attempt be retried).
      delete from public.game_sessions where id = s.id;
    else
      update public.game_sessions
        set status = 'abandoned', end_reason = p_reason, finished_at = now(),
            current_question_id = null, current_served_at = null
        where id = s.id;
    end if;
    return jsonb_build_object('recorded', false, 'endReason', p_reason, 'score', 0, 'xp', s.xp);
  end if;

  v_ranked := s.mode <> 'practice';
  v_perfect := p_reason = 'complete' and s.wrong = 0 and s.answered >= 5 and s.mode in ('classic', 'daily');

  select * into p from public.profiles where id = s.user_id for update;
  v_new_high := v_ranked and s.score > p.high_score;
  v_day_streak := case
    when p.last_played_on is null then 1
    when v_today - p.last_played_on = 0 then greatest(p.day_streak, 1)
    when v_today - p.last_played_on = 1 then p.day_streak + 1
    else 1
  end;

  if s.mode = 'daily' then
    select string_agg(case when is_correct then '1' else '0' end, '' order by id)
      into v_pattern
      from public.game_answers where session_id = s.id and not revealed;
  end if;

  update public.game_sessions
    set status = 'finished', end_reason = p_reason, finished_at = now(),
        current_question_id = null, current_served_at = null
    where id = s.id;

  insert into public.scores (
    user_id, session_id, mode, difficulty, ranked, score, xp_earned, answered, correct, wrong,
    best_streak, end_reason, duration_seconds, challenge_date, pattern
  ) values (
    s.user_id, s.id, s.mode, case when s.mode = 'daily' then null else s.difficulty end, v_ranked,
    s.score, s.xp, s.answered, s.correct, s.wrong, s.best_streak, p_reason,
    greatest(0, extract(epoch from (now() - s.started_at)))::integer, s.challenge_date, v_pattern
  );

  update public.profiles set
    games_played = games_played + 1,
    total_score = total_score + case when v_ranked then s.score else 0 end,
    high_score = case when v_ranked then greatest(high_score, s.score) else high_score end,
    perfect_runs = perfect_runs + v_perfect::integer,
    best_fast_run = greatest(best_fast_run, s.fast_correct),
    daily_completed = daily_completed + (s.mode = 'daily' and p_reason <> 'quit')::integer,
    day_streak = v_day_streak,
    best_day_streak = greatest(best_day_streak, v_day_streak),
    last_played_on = v_today
  where id = s.user_id
  returning xp into v_xp;

  v_unlocked := private.award_achievements(s.user_id);

  return jsonb_build_object(
    'recorded', true,
    'ranked', v_ranked,
    'endReason', p_reason,
    'score', s.score,
    'xp', s.xp,
    'answered', s.answered,
    'correct', s.correct,
    'wrong', s.wrong,
    'bestStreak', s.best_streak,
    'fastCorrect', s.fast_correct,
    'newHighScore', v_new_high,
    'previousHighScore', p.high_score,
    'dayStreak', v_day_streak,
    'profileXp', v_xp,
    'pattern', v_pattern,
    'challengeDate', s.challenge_date,
    'unlocked', v_unlocked
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Game API (RPC)
-- ----------------------------------------------------------------------------

create or replace function public.start_game(
  p_mode public.game_mode,
  p_difficulty public.difficulty default 'easy',
  p_types public.question_type[] default null
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_today date := private.utc_today();
  v_types public.question_type[] := coalesce(nullif(p_types, '{}'), enum_range(null::public.question_type));
  v_difficulty public.difficulty := case when p_mode = 'daily' then 'easy' else coalesce(p_difficulty, 'easy') end;
  v_planned bigint[];
  v_recent bigint[];
  v_stale uuid;
  v_keep uuid;
  s public.game_sessions;
begin
  if v_uid is null then
    raise exception 'Sign in to play.' using errcode = '28000';
  end if;

  if (select count(*) from public.game_sessions where user_id = v_uid and started_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Too many games started in a short time. Take a breather and try again in a few minutes.'
      using errcode = 'P0001';
  end if;

  if p_mode = 'daily' then
    select * into s from public.game_sessions
      where user_id = v_uid and mode = 'daily' and challenge_date = v_today;
    if found then
      if s.status <> 'active' then
        raise exception 'You have already played today''s challenge. A new one unlocks at midnight UTC.'
          using errcode = 'P0001';
      end if;
      v_keep := s.id;  -- resume it below
    end if;
  end if;

  -- One run at a time: close any other active run.
  for v_stale in
    select id from public.game_sessions
    where user_id = v_uid and status = 'active' and id is distinct from v_keep
  loop
    perform private.finish_session(v_stale, 'quit');
  end loop;

  if v_keep is not null then
    return private.session_state(s) || jsonb_build_object('resumed', true);
  end if;

  if p_mode <> 'daily' and not exists (
    select 1 from public.questions where is_active and difficulty = v_difficulty and type = any (v_types)
  ) then
    v_types := enum_range(null::public.question_type);
  end if;

  if p_mode = 'classic' then
    v_recent := private.recent_question_ids(v_uid);
    select array_agg(id order by rn) into v_planned
    from (
      select q.id, row_number() over (order by (q.id = any (v_recent)), random()) as rn
      from public.questions q
      where q.is_active and q.difficulty = v_difficulty and q.type = any (v_types)
    ) pool
    where rn <= 15;
  elsif p_mode = 'daily' then
    v_planned := private.daily_question_ids(v_today);
  end if;

  if p_mode in ('classic', 'daily') and coalesce(cardinality(v_planned), 0) = 0 then
    raise exception 'No questions are available for this selection yet.' using errcode = 'P0001';
  end if;
  if p_mode in ('endless', 'practice') and not exists (
    select 1 from public.questions where is_active and difficulty = v_difficulty
  ) then
    raise exception 'No questions are available for this selection yet.' using errcode = 'P0001';
  end if;

  insert into public.game_sessions (
    user_id, mode, difficulty, types, challenge_date, planned_ids, tier, pause_budget_ms
  ) values (
    v_uid, p_mode, v_difficulty, v_types,
    case when p_mode = 'daily' then v_today end,
    v_planned,
    private.tier_of(v_difficulty),
    case when p_mode = 'practice' then 0 else 120000 end
  )
  returning * into s;

  return private.session_state(s) || jsonb_build_object('resumed', false);
end;
$$;

create or replace function public.next_question(p_session_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  s public.game_sessions;
  q public.questions;
  v_next bigint;
begin
  select * into s from public.game_sessions where id = p_session_id and user_id = v_uid for update;
  if not found then
    raise exception 'Game not found.' using errcode = 'P0002';
  end if;
  if s.status <> 'active' then
    raise exception 'This game has already ended.' using errcode = 'P0001';
  end if;

  if s.current_question_id is not null then
    -- Already in play (the page was reloaded): same question, same clock.
    select * into q from public.questions where id = s.current_question_id;
    if found then
      return private.question_payload(q, s);
    end if;
  end if;

  if s.planned_ids is not null then
    loop
      v_next := s.planned_ids[cardinality(s.served_ids) + 1];
      if v_next is null then
        raise exception 'There are no more questions in this run.' using errcode = 'P0001';
      end if;
      select * into q from public.questions where id = v_next;
      exit when found;
      -- The question was deleted after the run was planned: drop it from the plan.
      s.planned_ids := array_remove(s.planned_ids, v_next);
    end loop;
  else
    v_next := private.pick_question(s, private.difficulty_at(s.tier));
    select * into q from public.questions where id = v_next;
  end if;

  update public.game_sessions
    set current_question_id = q.id,
        current_served_at = now(),
        served_ids = s.served_ids || q.id,
        planned_ids = s.planned_ids,
        last_activity_at = now()
    where id = s.id
    returning * into s;

  return private.question_payload(q, s);
end;
$$;

create or replace function public.submit_answer(
  p_session_id uuid,
  p_answer jsonb,
  p_paused_ms integer default 0,
  p_reveal boolean default false,
  p_timed_out boolean default false
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  s public.game_sessions;
  q public.questions;
  r record;
  v_kind text := p_answer ->> 'kind';
  v_practice boolean;
  v_correct boolean := false;
  v_given text;
  v_given_order text[];
  v_expected_order text[];
  v_elapsed_ms numeric;
  v_paused_ms integer := 0;
  v_effective_ms numeric;
  v_seconds_left numeric := 0;
  v_late boolean := false;
  v_streak integer;
  v_combo integer := 1;
  v_time_bonus integer := 0;
  v_points integer := 0;
  v_xp integer := 0;
  v_fast boolean := false;
  v_old_tier smallint;
  v_tier smallint;
  v_over boolean := false;
  v_reason public.end_reason;
  v_xp_after integer;
  v_unlocked jsonb := '[]'::jsonb;
  v_summary jsonb;
begin
  if p_answer is null or length(p_answer::text) > 20000 then
    raise exception 'Invalid answer.' using errcode = '22023';
  end if;

  select * into s from public.game_sessions where id = p_session_id and user_id = v_uid for update;
  if not found then
    raise exception 'Game not found.' using errcode = 'P0002';
  end if;
  if s.status <> 'active' then
    raise exception 'This game has already ended.' using errcode = 'P0001';
  end if;
  if s.current_question_id is null then
    raise exception 'There is no question in play.' using errcode = 'P0001';
  end if;

  select * into q from public.questions where id = s.current_question_id;
  if not found then
    update public.game_sessions set current_question_id = null, current_served_at = null where id = s.id;
    raise exception 'That question was just removed. Load the next one.' using errcode = 'P0001';
  end if;

  v_practice := s.mode = 'practice';
  if p_reveal and not v_practice then
    raise exception 'Answers can only be revealed in practice mode.' using errcode = 'P0001';
  end if;
  select * into r from public.difficulty_rules(q.difficulty);

  -- 1. Is the answer right? (lib/validation.ts isCorrect)
  if not p_reveal then
    case q.type
      when 'write-sql', 'fix-query' then
        if v_kind = 'text' then
          v_given := public.normalize_sql(p_answer ->> 'value');
          v_correct := v_given <> '' and exists (
            select 1 from unnest(array[q.answer] || q.alternatives) as accepted
            where public.normalize_sql(accepted) = v_given
          );
        end if;
      when 'multiple-choice', 'predict-output' then
        v_correct := v_kind = 'choice'
          and (p_answer ->> 'value') is not null
          and public.normalize_text(p_answer ->> 'value') = public.normalize_text(q.answer);
      when 'drag-drop' then
        if v_kind = 'order' and jsonb_typeof(p_answer -> 'value') = 'array' then
          select coalesce(array_agg(public.normalize_text(t) order by ord), '{}') into v_given_order
            from jsonb_array_elements_text(p_answer -> 'value') with ordinality as x (t, ord);
          select array_agg(public.normalize_text(t) order by ord) into v_expected_order
            from unnest(q.tokens) with ordinality as y (t, ord);
          v_correct := v_given_order = v_expected_order;
        end if;
    end case;
  end if;

  -- 2. Timing, on the server clock. Up to the remaining pause budget of
  -- reported pause time is forgiven, plus 1.5s for network latency.
  v_elapsed_ms := greatest(0, extract(epoch from (now() - s.current_served_at)) * 1000);
  if v_practice then
    v_effective_ms := v_elapsed_ms;
  else
    v_paused_ms := least(greatest(coalesce(p_paused_ms, 0), 0), s.pause_budget_ms, floor(v_elapsed_ms)::integer);
    v_effective_ms := greatest(0, v_elapsed_ms - v_paused_ms - 1500);
    v_seconds_left := greatest(0, r.timer_seconds - v_effective_ms / 1000.0);
    -- Answers arriving well after the timer ran out never count.
    v_late := v_effective_ms > (r.timer_seconds + 2) * 1000;
    if v_late then
      v_correct := false;
    end if;
  end if;

  -- 3. Score it (lib/scoring.ts scoreAnswer)
  v_streak := case when v_correct then s.streak + 1 else 0 end;
  if v_correct then
    if v_practice then
      v_points := r.base_points;
      v_xp := r.base_points / 2;
    else
      v_combo := public.combo_multiplier(v_streak);
      v_time_bonus := floor(v_seconds_left)::integer * r.time_multiplier;
      v_points := r.base_points * v_combo + v_time_bonus;
      v_xp := r.base_points * v_combo;
      v_fast := v_effective_ms <= 5000;
    end if;
  end if;

  v_old_tier := s.tier;
  v_tier := s.tier;
  if s.mode = 'endless' then
    v_tier := least(3, private.tier_of(s.difficulty) + (s.correct + v_correct::integer) / 8);
  end if;

  insert into public.game_answers (
    session_id, user_id, question_id, difficulty, type, answer, is_correct, timed_out, revealed,
    seconds_taken, points, xp
  ) values (
    s.id, v_uid, q.id, q.difficulty, q.type, p_answer, v_correct, (p_timed_out or v_late), p_reveal,
    round(v_effective_ms / 1000.0, 2), v_points, v_xp
  );

  update public.game_sessions set
    current_question_id = null,
    current_served_at = null,
    lives = lives - (not v_practice and not v_correct and not p_reveal)::integer,
    score = score + v_points,
    xp = xp + v_xp,
    streak = v_streak,
    best_streak = greatest(best_streak, v_streak),
    answered = answered + (not p_reveal)::integer,
    correct = correct + v_correct::integer,
    wrong = wrong + (not v_correct and not p_reveal)::integer,
    revealed = revealed + p_reveal::integer,
    fast_correct = fast_correct + v_fast::integer,
    pause_budget_ms = pause_budget_ms - v_paused_ms,
    tier = v_tier,
    last_activity_at = now()
  where id = s.id
  returning * into s;

  -- 4. Lifetime stats (revealed answers don't count)
  if not p_reveal then
    update public.profiles set
      questions_answered = questions_answered + 1,
      questions_correct = questions_correct + v_correct::integer,
      expert_correct = expert_correct + (v_correct and q.difficulty = 'expert')::integer,
      xp = xp + v_xp,
      level = public.level_for_xp(xp + v_xp),
      best_streak = greatest(best_streak, v_streak),
      best_fast_run = greatest(best_fast_run, s.fast_correct),
      fastest_answer_ms = case
        when v_correct and not v_practice then least(coalesce(fastest_answer_ms, 2147483647), floor(v_effective_ms)::integer)
        else fastest_answer_ms
      end
    where id = v_uid
    returning xp into v_xp_after;
    v_unlocked := private.award_achievements(v_uid);
  else
    select xp into v_xp_after from public.profiles where id = v_uid;
  end if;

  -- 5. Is the run over?
  if not v_practice and s.lives <= 0 then
    v_over := true;
    v_reason := 'lives';
  elsif s.planned_ids is not null and cardinality(s.served_ids) >= cardinality(s.planned_ids) then
    v_over := true;
    v_reason := 'complete';
  end if;
  if v_over then
    v_summary := private.finish_session(s.id, v_reason);
    v_unlocked := v_unlocked || coalesce(v_summary -> 'unlocked', '[]'::jsonb);
    select * into s from public.game_sessions where id = s.id;
    select xp into v_xp_after from public.profiles where id = v_uid;
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'timedOut', p_timed_out or v_late,
    'revealed', p_reveal,
    'basePoints', r.base_points,
    'combo', v_combo,
    'timeBonus', v_time_bonus,
    'points', v_points,
    'xp', v_xp,
    'secondsTaken', round(v_effective_ms / 1000.0, 2),
    'secondsLeft', round(v_seconds_left, 2),
    'streak', v_streak,
    'tierUp', v_tier > v_old_tier,
    'xpBefore', v_xp_after - v_xp,
    'xpAfter', v_xp_after,
    'solution', jsonb_build_object(
      'answer', q.answer,
      'alternatives', to_jsonb(q.alternatives),
      'tokens', to_jsonb(q.tokens),
      'explanation', q.explanation
    ),
    'state', private.session_state(s),
    'unlocked', v_unlocked,
    'gameOver', v_over,
    'summary', v_summary
  );
end;
$$;

create or replace function public.end_game(p_session_id uuid)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_summary jsonb;
begin
  if not exists (select 1 from public.game_sessions where id = p_session_id and user_id = (select auth.uid())) then
    raise exception 'Game not found.' using errcode = 'P0002';
  end if;
  v_summary := private.finish_session(p_session_id, 'quit');
  return coalesce(v_summary, jsonb_build_object('recorded', false, 'endReason', 'quit'));
end;
$$;

-- ----------------------------------------------------------------------------
-- Leaderboards & stats
-- ----------------------------------------------------------------------------

-- p_board: 'global' (lifetime XP), 'daily' (points today, UTC), 'weekly'
-- (points this ISO week), 'highest' (best single run) or 'challenge'
-- (today's daily challenge). Pass p_user to get one player's row.
create or replace function public.get_leaderboard(
  p_board text,
  p_limit integer default 50,
  p_user uuid default null
)
returns table (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  level smallint,
  value bigint,
  games bigint
)
language sql stable set search_path = ''
as $$
  with bounds as (
    select
      (now() at time zone 'utc')::date as today,
      date_trunc('day', now() at time zone 'utc') at time zone 'utc' as day_start,
      date_trunc('week', now() at time zone 'utc') at time zone 'utc' as week_start
  ),
  board as (
    select pr.id as user_id, pr.xp::bigint as value, pr.games_played::bigint as games, pr.created_at as tiebreak
    from public.profiles pr
    where p_board = 'global' and pr.xp > 0
    union all
    select sc.user_id, sum(sc.score)::bigint, count(*), max(sc.created_at)
    from public.scores sc, bounds b
    where p_board = 'daily' and sc.ranked and sc.created_at >= b.day_start
    group by sc.user_id
    union all
    select sc.user_id, sum(sc.score)::bigint, count(*), max(sc.created_at)
    from public.scores sc, bounds b
    where p_board = 'weekly' and sc.ranked and sc.created_at >= b.week_start
    group by sc.user_id
    union all
    select best.user_id, best.score::bigint, best.games, best.created_at
    from (
      select distinct on (sc.user_id) sc.user_id, sc.score, sc.created_at,
        count(*) over (partition by sc.user_id) as games
      from public.scores sc
      where p_board = 'highest' and sc.ranked
      order by sc.user_id, sc.score desc, sc.created_at asc
    ) best
    union all
    select sc.user_id, sc.score::bigint, 1::bigint, sc.created_at
    from public.scores sc, bounds b
    where p_board = 'challenge' and sc.mode = 'daily' and sc.challenge_date = b.today
  ),
  ranked as (
    select rank() over (order by value desc) as rank,
      row_number() over (order by value desc, tiebreak asc) as position,
      board.*
    from board
    where value > 0
  )
  select r.rank, r.user_id, p.username, p.display_name, p.avatar_url, p.level, r.value, r.games
  from ranked r join public.profiles p on p.id = r.user_id
  where p_user is null or r.user_id = p_user
  order by r.position
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- Per-player breakdowns for the dashboard and home screen.
create or replace function public.get_my_stats()
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'byDifficulty', coalesce((
      select jsonb_agg(jsonb_build_object('key', difficulty, 'answered', answered, 'correct', correct))
      from (
        select difficulty, count(*) as answered, count(*) filter (where is_correct) as correct
        from public.game_answers where user_id = (select auth.uid()) and not revealed
        group by difficulty
      ) d
    ), '[]'::jsonb),
    'byType', coalesce((
      select jsonb_agg(jsonb_build_object('key', type, 'answered', answered, 'correct', correct))
      from (
        select type, count(*) as answered, count(*) filter (where is_correct) as correct
        from public.game_answers where user_id = (select auth.uid()) and not revealed
        group by type
      ) t
    ), '[]'::jsonb),
    'bests', coalesce((
      select jsonb_agg(jsonb_build_object('mode', mode, 'difficulty', difficulty, 'score', best))
      from (
        select mode, difficulty, max(score) as best
        from public.scores where user_id = (select auth.uid()) and ranked
        group by mode, difficulty
      ) b
    ), '[]'::jsonb)
  );
$$;

-- ----------------------------------------------------------------------------
-- Admin API
-- ----------------------------------------------------------------------------

create or replace function public.admin_list_users(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  username text,
  display_name text,
  avatar_url text,
  role public.user_role,
  xp integer,
  level smallint,
  games_played integer,
  total_score bigint,
  high_score integer,
  questions_answered integer,
  questions_correct integer,
  provider text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  total_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_pattern text;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if nullif(btrim(p_search), '') is not null then
    v_pattern := '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
    select p.id, u.email::text, p.username, p.display_name, p.avatar_url, p.role, p.xp, p.level,
      p.games_played, p.total_score, p.high_score, p.questions_answered, p.questions_correct,
      coalesce(u.raw_app_meta_data ->> 'provider', 'email'), p.created_at, u.last_sign_in_at,
      count(*) over ()
    from public.profiles p
    join auth.users u on u.id = p.id
    where v_pattern is null
      or p.username ilike v_pattern
      or p.display_name ilike v_pattern
      or u.email ilike v_pattern
    order by p.created_at desc
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role public.user_role)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'You can''t remove your own admin role.' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role where id = p_user;
  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_overview()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_day_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'admins', (select count(*) from public.profiles where role = 'admin'),
    'newUsersToday', (select count(*) from public.profiles where created_at >= v_day_start),
    'questions', (select count(*) from public.questions),
    'activeQuestions', (select count(*) from public.questions where is_active),
    'games', (select count(*) from public.scores),
    'gamesToday', (select count(*) from public.scores where created_at >= v_day_start),
    'answersToday', (select count(*) from public.game_answers where created_at >= v_day_start),
    'activeRuns', (select count(*) from public.game_sessions where status = 'active' and last_activity_at > now() - interval '15 minutes'),
    'questionsByDifficulty', (
      select coalesce(jsonb_object_agg(difficulty, n), '{}'::jsonb)
      from (select difficulty, count(*) as n from public.questions group by difficulty) d
    ),
    'questionsByType', (
      select coalesce(jsonb_object_agg(type, n), '{}'::jsonb)
      from (select type, count(*) as n from public.questions group by type) t
    )
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Function privileges
-- ----------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.start_game(public.game_mode, public.difficulty, public.question_type[]) from public, anon;
revoke execute on function public.next_question(uuid) from public, anon;
revoke execute on function public.submit_answer(uuid, jsonb, integer, boolean, boolean) from public, anon;
revoke execute on function public.end_game(uuid) from public, anon;
revoke execute on function public.get_my_stats() from public, anon;
revoke execute on function public.admin_list_users(text, integer, integer) from public, anon;
revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
revoke execute on function public.admin_overview() from public, anon;

grant execute on function public.start_game(public.game_mode, public.difficulty, public.question_type[]) to authenticated;
grant execute on function public.next_question(uuid) to authenticated;
grant execute on function public.submit_answer(uuid, jsonb, integer, boolean, boolean) to authenticated;
grant execute on function public.end_game(uuid) to authenticated;
grant execute on function public.get_my_stats() to authenticated;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.get_leaderboard(text, integer, uuid) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Realtime: live leaderboards listen for new scores
-- ----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.scores;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Default achievements (admins can edit these or add more)
-- ----------------------------------------------------------------------------

insert into public.achievements (id, title, description, icon, metric, threshold, sort_order) values
  ('first-query', 'First Query', 'Answer your first question correctly.', 'sparkles', 'questions_correct', 1, 10),
  ('correct-10', '10 Correct Answers', 'Get 10 questions right across all games.', 'target', 'questions_correct', 10, 20),
  ('correct-50', '50 Correct Answers', 'Get 50 questions right across all games.', 'medal', 'questions_correct', 50, 30),
  ('correct-100', '100 Correct Answers', 'Get 100 questions right across all games.', 'trophy', 'questions_correct', 100, 40),
  ('no-mistakes', 'No Mistakes Run', 'Finish a Classic or Daily run of 5+ questions without a wrong answer.', 'shield', 'perfect_runs', 1, 50),
  ('speed-demon', 'Speed Demon', 'In one timed run, answer 5 questions correctly in under 5 seconds each.', 'zap', 'best_fast_run', 5, 60),
  ('sql-wizard', 'SQL Wizard', 'Answer 25 Expert questions correctly.', 'wand', 'expert_correct', 25, 70),
  ('combo-king', 'Combo King', 'Reach a ×5 combo: 10 correct answers in a row.', 'flame', 'best_streak', 10, 80),
  ('daily-challenger', 'Daily Challenger', 'Complete a Daily Challenge.', 'calendar', 'daily_completed', 1, 90),
  ('week-warrior', 'Week Warrior', 'Play on 7 days in a row.', 'crown', 'best_day_streak', 7, 100),
  ('high-roller', 'High Roller', 'Score 5,000 points in a single run.', 'gem', 'high_score', 5000, 110),
  ('sql-master', 'SQL Master', 'Reach 10,000 XP and the top level.', 'rocket', 'xp', 10000, 120)
on conflict (id) do nothing;
