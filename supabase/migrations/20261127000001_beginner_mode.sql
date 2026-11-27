-- ============================================================================
-- SQL Rush — Beginner Mode, part 2: curriculum, learning progress, XP, streaks
-- ============================================================================
--
-- Beginner Mode is a guided course (lib/learn/curriculum.ts). Lessons are played
-- in the browser; this file stores what a learner has done and awards learning XP:
--
--   learn_get_state()     everything the roadmap, lesson player and progress page need
--   learn_open_lesson()   unlock check, starts a lesson and remembers it as the last one opened
--   learn_save_progress() where the learner is inside a lesson, plus unfinished work
--   learn_complete()      records the knowledge check, the challenge or the whole lesson,
--                         awards XP once per activity, updates the streak and daily goal
--   learn_set_goal()      lessons per day to aim for (1, 2, 3 or 5)
--
-- Learning XP is a separate pool from the competitive XP in public.profiles: lessons
-- are checked in the browser, so they must never feed the ranked leaderboards. The
-- learn_xp_events ledger has one row per (learner, kind, ref), which is what makes
-- every award happen at most once; repeating a lesson earns nothing more.
--
-- "Today" is the learner's own calendar day (their IANA time zone), never earlier
-- than the last day they learned, so travelling west can't replay a day.
--
-- The numbers mirror lib/learn/rules.ts and the catalog mirrors lib/learn/curriculum.ts;
-- `npm run test:db` checks both. Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Curriculum catalog (public, read-only)
-- ----------------------------------------------------------------------------

create table if not exists public.learn_modules (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  position smallint not null check (position > 0),
  title text not null check (char_length(title) between 1 and 60),
  constraint learn_modules_position_key unique (position) deferrable initially deferred
);

create table if not exists public.learn_lessons (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  module_id text not null references public.learn_modules (id) on delete cascade,
  -- Position across the whole curriculum: a lesson unlocks when the one before it is complete.
  position smallint not null check (position > 0),
  title text not null check (char_length(title) between 1 and 80),
  constraint learn_lessons_position_key unique (position) deferrable initially deferred
);

create index if not exists learn_lessons_module_idx on public.learn_lessons (module_id);

comment on table public.learn_lessons is 'Beginner Mode lessons in unlock order. Content lives in lib/learn/lessons; this copy lets the database check unlocks and award XP.';

insert into public.learn_modules (id, position, title) values
  ('database-explorer', 1, 'Database Explorer'),
  ('sql-beginner', 2, 'SQL Beginner'),
  ('data-explorer', 3, 'Data Explorer'),
  ('data-manager', 4, 'Data Manager'),
  ('data-analyst', 5, 'Data Analyst'),
  ('sql-champion', 6, 'SQL Champion')
on conflict (id) do update set position = excluded.position, title = excluded.title;

insert into public.learn_lessons (id, module_id, position, title) values
  ('what-is-data', 'database-explorer', 1, 'What is data?'),
  ('what-is-a-database', 'database-explorer', 2, 'What is a database?'),
  ('what-is-a-table', 'database-explorer', 3, 'What is a table?'),
  ('rows-and-columns', 'database-explorer', 4, 'Rows and columns'),
  ('primary-keys', 'database-explorer', 5, 'Primary keys'),
  ('what-is-sql', 'sql-beginner', 6, 'What is SQL?'),
  ('first-query', 'sql-beginner', 7, 'Your first query'),
  ('select', 'sql-beginner', 8, 'Choosing columns'),
  ('where', 'sql-beginner', 9, 'Filtering rows'),
  ('order-by', 'sql-beginner', 10, 'Sorting results'),
  ('distinct', 'data-explorer', 11, 'Removing duplicates'),
  ('limit', 'data-explorer', 12, 'Just the first few'),
  ('and-or', 'data-explorer', 13, 'Combining conditions'),
  ('in-between', 'data-explorer', 14, 'Lists and ranges'),
  ('like', 'data-explorer', 15, 'Matching patterns'),
  ('insert', 'data-manager', 16, 'Adding rows'),
  ('update', 'data-manager', 17, 'Changing values'),
  ('delete', 'data-manager', 18, 'Removing rows'),
  ('null-values', 'data-manager', 19, 'Missing values'),
  ('aggregates', 'data-analyst', 20, 'Counting and totals'),
  ('group-by', 'data-analyst', 21, 'Grouping rows'),
  ('having', 'data-analyst', 22, 'Filtering groups'),
  ('inner-join', 'data-analyst', 23, 'Joining tables'),
  ('outer-joins', 'data-analyst', 24, 'Keeping unmatched rows'),
  ('subqueries', 'sql-champion', 25, 'Queries inside queries'),
  ('ctes', 'sql-champion', 26, 'Naming a step'),
  ('case-when', 'sql-champion', 27, 'Labelling with conditions'),
  ('window-functions', 'sql-champion', 28, 'Ranking and running totals')
on conflict (id) do update set module_id = excluded.module_id, position = excluded.position, title = excluded.title;

-- ----------------------------------------------------------------------------
-- Learning progress (private to each learner, written only by the RPCs below)
-- ----------------------------------------------------------------------------

create table if not exists public.learners (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  lessons_completed integer not null default 0 check (lessons_completed >= 0),
  modules_completed integer not null default 0 check (modules_completed >= 0),
  streak integer not null default 0 check (streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_active_day date,
  daily_goal smallint not null default 1 check (daily_goal in (1, 2, 3, 5)),
  time_zone text not null default 'UTC' check (char_length(time_zone) between 1 and 64),
  last_lesson_id text references public.learn_lessons (id) on delete set null,
  last_completed_lesson_id text references public.learn_lessons (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.learners is 'Beginner Mode totals per learner: learning XP (separate from game XP), streaks, daily goal, time zone and resume pointers.';

create table if not exists public.learn_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.learn_lessons (id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'completed')),
  -- Index of the lesson step the learner was on, so a refresh or another device resumes there.
  step smallint not null default 0 check (step between 0 and 200),
  -- Unfinished work (answers, SQL drafts, sandbox edits) the lesson wants back.
  state jsonb check (state is null or (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 16000)),
  check_done boolean not null default false,
  challenge_done boolean not null default false,
  perfect boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists learn_progress_lesson_idx on public.learn_progress (lesson_id);

-- The XP ledger. unique (user_id, kind, ref) means each activity pays out once.
create table if not exists public.learn_xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('lesson', 'check', 'challenge', 'perfect', 'module', 'daily_goal')),
  -- lesson id, module id, or the learner's local date (YYYY-MM-DD) for daily_goal
  ref text not null check (char_length(ref) between 1 and 60),
  xp integer not null check (xp > 0),
  created_at timestamptz not null default now(),
  constraint learn_xp_events_once unique (user_id, kind, ref)
);

create index if not exists learn_xp_events_user_idx on public.learn_xp_events (user_id, created_at desc);

-- One row per learner per local day with any learning.
create table if not exists public.learn_activity (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  xp integer not null default 0 check (xp >= 0),
  -- Distinct lessons completed or reviewed that day (counts towards the daily goal).
  lesson_ids text[] not null default '{}',
  goal_met boolean not null default false,
  primary key (user_id, day)
);

drop trigger if exists learners_updated_at on public.learners;
create trigger learners_updated_at before update on public.learners
  for each row execute function private.set_updated_at();
drop trigger if exists learn_progress_updated_at on public.learn_progress;
create trigger learn_progress_updated_at before update on public.learn_progress
  for each row execute function private.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.learn_modules enable row level security;
alter table public.learn_lessons enable row level security;
alter table public.learners enable row level security;
alter table public.learn_progress enable row level security;
alter table public.learn_xp_events enable row level security;
alter table public.learn_activity enable row level security;

revoke all on public.learn_modules, public.learn_lessons, public.learners, public.learn_progress,
  public.learn_xp_events, public.learn_activity
  from anon, authenticated;

-- The catalog is public (the roadmap renders for signed-out visitors too).
grant select on public.learn_modules, public.learn_lessons to anon, authenticated;

drop policy if exists "Learning modules are public" on public.learn_modules;
create policy "Learning modules are public"
  on public.learn_modules for select to anon, authenticated
  using (true);

drop policy if exists "Learning lessons are public" on public.learn_lessons;
create policy "Learning lessons are public"
  on public.learn_lessons for select to anon, authenticated
  using (true);

-- Progress is private to the learner (and admins). No write grants: only the RPCs write.
grant select on public.learners, public.learn_progress, public.learn_xp_events, public.learn_activity
  to authenticated;

drop policy if exists "Learners read their own totals" on public.learners;
create policy "Learners read their own totals"
  on public.learners for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "Learners read their own progress" on public.learn_progress;
create policy "Learners read their own progress"
  on public.learn_progress for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "Learners read their own XP" on public.learn_xp_events;
create policy "Learners read their own XP"
  on public.learn_xp_events for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy if exists "Learners read their own activity" on public.learn_activity;
create policy "Learners read their own activity"
  on public.learn_activity for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

-- ----------------------------------------------------------------------------
-- Learning badges (in the same achievements table as the game's badges)
-- ----------------------------------------------------------------------------

alter table public.achievements drop constraint if exists achievements_lessons_shape;
alter table public.achievements add constraint achievements_lessons_shape check (
  case
    when metric = 'lessons'
      then coalesce(cardinality(lesson_ids), 0) >= 1 and threshold <= cardinality(lesson_ids)
    else lesson_ids is null
  end
);

-- lib/learn/curriculum.ts LEARN_BADGES
insert into public.achievements (id, title, description, icon, metric, threshold, lesson_ids, sort_order) values
  ('learn-first-steps', 'First Steps', 'Complete your first lesson.', 'footprints', 'lessons_completed', 1, null, 200),
  ('learn-table-detective', 'Table Detective', 'Understand rows and columns.', 'table', 'lessons', 1,
    array['rows-and-columns'], 210),
  ('learn-first-select', 'First SELECT', 'Successfully run your first SELECT query.', 'rocket', 'lessons', 1,
    array['first-query'], 220),
  ('learn-filter-master', 'Filter Master', 'Complete the filtering challenges: WHERE, AND/OR, IN/BETWEEN and LIKE.',
    'filter', 'lessons', 4, array['where', 'and-or', 'in-between', 'like'], 230),
  ('learn-sorting-expert', 'Sorting Expert', 'Complete the ORDER BY challenge.', 'sort', 'lessons', 1,
    array['order-by'], 240),
  ('learn-data-collector', 'Data Collector', 'Complete the aggregation lessons: COUNT/SUM/AVG, GROUP BY and HAVING.',
    'sigma', 'lessons', 3, array['aggregates', 'group-by', 'having'], 250),
  ('learn-table-connector', 'Table Connector', 'Complete the JOIN challenges.', 'link', 'lessons', 2,
    array['inner-join', 'outer-joins'], 260),
  ('learn-habit', 'Learning Habit', 'Learn on 3 days in a row.', 'flame', 'learn_best_streak', 3, null, 270),
  ('learn-week-streak', 'Week of Learning', 'Learn on 7 days in a row.', 'calendar', 'learn_best_streak', 7, null, 280),
  ('learn-sql-champion', 'SQL Champion', 'Complete the whole beginner curriculum.', 'graduation', 'modules_completed', 6,
    null, 290)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Rules (mirrors of lib/learn/rules.ts)
-- ----------------------------------------------------------------------------

-- LEARN_LEVELS, 0-based.
create or replace function private.learn_level_for_xp(p_xp integer)
returns smallint
language sql immutable parallel safe set search_path = ''
as $$
  select (case
    when p_xp >= 2450 then 5
    when p_xp >= 1500 then 4
    when p_xp >= 900 then 3
    when p_xp >= 450 then 2
    when p_xp >= 150 then 1
    else 0
  end)::smallint;
$$;

-- LEARN_XP
create or replace function private.learn_xp_for(p_kind text)
returns integer
language sql immutable parallel safe set search_path = ''
as $$
  select case p_kind
    when 'lesson' then 20
    when 'check' then 10
    when 'challenge' then 30
    when 'perfect' then 15
    when 'module' then 100
    when 'daily_goal' then 25
  end;
$$;

-- A usable IANA time zone name, or 'UTC'. Offsets like '+05:30' are refused because
-- PostgreSQL reads them as POSIX zones with the sign flipped.
create or replace function private.learn_tz(p_tz text)
returns text
language plpgsql stable set search_path = ''
as $$
begin
  if p_tz is null or char_length(p_tz) not between 1 and 64 or p_tz !~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)*$' then
    return 'UTC';
  end if;
  perform now() at time zone p_tz;
  return p_tz;
exception when others then
  return 'UTC';
end;
$$;

-- The calendar date right now in the given time zone (UTC if it isn't valid).
create or replace function private.learn_today(p_tz text)
returns date
language sql stable set search_path = ''
as $$
  select (now() at time zone private.learn_tz(p_tz))::date;
$$;

-- ----------------------------------------------------------------------------
-- Internals
-- ----------------------------------------------------------------------------

create or replace function private.learn_progress_json(p public.learn_progress)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'lessonId', p.lesson_id,
    'status', p.status,
    'step', p.step,
    'state', p.state,
    'checkDone', p.check_done,
    'challengeDone', p.challenge_done,
    'perfect', p.perfect,
    'startedAt', p.started_at,
    'completedAt', p.completed_at,
    'updatedAt', p.updated_at
  );
$$;

-- The learner's row, created on first use, locked for this transaction. A valid
-- time zone replaces the stored one (people travel); an invalid or missing one is ignored.
create or replace function private.learn_ensure(p_user uuid, p_tz text)
returns public.learners
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_tz text := private.learn_tz(p_tz);
  v_valid boolean := p_tz is not null and v_tz = p_tz;
  l public.learners;
begin
  insert into public.learners (user_id, time_zone)
  values (p_user, v_tz)
  on conflict (user_id) do update set time_zone = excluded.time_zone
    where v_valid and public.learners.time_zone is distinct from excluded.time_zone;
  select * into l from public.learners where user_id = p_user for update;
  return l;
end;
$$;

-- A lesson is unlocked when the lesson just before it in the curriculum is completed.
create or replace function private.learn_unlocked(p_user uuid, p_position smallint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (
    select 1
    from (
      select id from public.learn_lessons where position < p_position order by position desc limit 1
    ) prev
    where not exists (
      select 1 from public.learn_progress lp
      where lp.user_id = p_user and lp.lesson_id = prev.id and lp.status = 'completed'
    )
  );
$$;

-- Pays out one ledger entry. Returns the XP awarded: 0 if it was already earned.
create or replace function private.learn_award(p_user uuid, p_kind text, p_ref text, p_day date)
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_xp integer := private.learn_xp_for(p_kind);
  v_rows integer;
begin
  insert into public.learn_xp_events (user_id, kind, ref, xp)
  values (p_user, p_kind, p_ref, v_xp)
  on conflict on constraint learn_xp_events_once do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return 0;
  end if;
  update public.learners set xp = xp + v_xp where user_id = p_user;
  insert into public.learn_activity (user_id, day, xp)
  values (p_user, p_day, v_xp)
  on conflict (user_id, day) do update set xp = public.learn_activity.xp + excluded.xp;
  return v_xp;
end;
$$;

-- Award every active achievement the player now qualifies for: game metrics come
-- from public.profiles, learning metrics from public.learners and learn_progress.
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
  lr as (
    -- Aggregates so there is always exactly one row, with zeros before the first lesson.
    select
      coalesce(max(l.xp), 0) as xp,
      coalesce(max(l.lessons_completed), 0) as lessons_completed,
      coalesce(max(l.modules_completed), 0) as modules_completed,
      coalesce(max(l.best_streak), 0) as best_streak
    from public.learners l
    where l.user_id = p_user
  ),
  earned as (
    select a.id
    from public.achievements a cross join p cross join lr
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
        when 'learn_xp' then lr.xp
        when 'lessons_completed' then lr.lessons_completed
        when 'modules_completed' then lr.modules_completed
        when 'learn_best_streak' then lr.best_streak
        when 'lessons' then (
          select count(*)
          from public.learn_progress lp
          where lp.user_id = p_user and lp.status = 'completed' and lp.lesson_id = any (a.lesson_ids)
        )
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

-- ----------------------------------------------------------------------------
-- Learning API (RPC)
-- ----------------------------------------------------------------------------

-- Everything about the signed-in learner. Read-only: before the first lesson it
-- returns zeros without creating anything.
create or replace function public.learn_get_state(p_tz text default 'UTC')
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  l public.learners;
  v_tz text;
  v_today date;
  a public.learn_activity;
begin
  if v_uid is null then
    raise exception 'Sign in to save your learning progress.' using errcode = '28000';
  end if;

  select * into l from public.learners where user_id = v_uid;
  v_tz := case
    when p_tz is not null and private.learn_tz(p_tz) = p_tz then p_tz
    when l.user_id is not null then l.time_zone
    else 'UTC'
  end;
  v_today := greatest(private.learn_today(v_tz), l.last_active_day);
  select * into a from public.learn_activity where user_id = v_uid and day = v_today;

  return jsonb_build_object(
    'xp', coalesce(l.xp, 0),
    'lessonsCompleted', coalesce(l.lessons_completed, 0),
    'modulesCompleted', coalesce(l.modules_completed, 0),
    'streak', case when l.last_active_day is not null and v_today - l.last_active_day <= 1 then l.streak else 0 end,
    'bestStreak', coalesce(l.best_streak, 0),
    'lastActiveDay', l.last_active_day,
    'today', v_today,
    'timeZone', v_tz,
    'dailyGoal', coalesce(l.daily_goal, 1),
    'todayLessons', coalesce(cardinality(a.lesson_ids), 0),
    'goalMetToday', coalesce(a.goal_met, false),
    'lastLessonId', l.last_lesson_id,
    'lastCompletedLessonId', l.last_completed_lesson_id,
    'lessons', coalesce((
      select jsonb_object_agg(p.lesson_id, private.learn_progress_json(p))
      from public.learn_progress p
      where p.user_id = v_uid
    ), '{}'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object(
          'day', d.day,
          'xp', d.xp,
          'lessons', cardinality(d.lesson_ids),
          'goalMet', d.goal_met
        ) order by d.day desc)
      from (
        select * from public.learn_activity where user_id = v_uid order by day desc limit 60
      ) d
    ), '[]'::jsonb),
    'recentXp', coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'ref', e.ref, 'xp', e.xp, 'at', e.created_at)
          order by e.created_at desc, e.id desc)
      from (
        select * from public.learn_xp_events where user_id = v_uid order by created_at desc, id desc limit 20
      ) e
    ), '[]'::jsonb)
  );
end;
$$;

-- Starts (or resumes, or reviews) a lesson and remembers it as the last one opened.
create or replace function public.learn_open_lesson(p_lesson text, p_tz text default 'UTC')
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_lesson public.learn_lessons;
  p public.learn_progress;
begin
  if v_uid is null then
    raise exception 'Sign in to save your learning progress.' using errcode = '28000';
  end if;
  select * into v_lesson from public.learn_lessons where id = p_lesson;
  if not found then
    raise exception 'That lesson doesn''t exist.' using errcode = 'P0002';
  end if;
  if not private.learn_unlocked(v_uid, v_lesson.position) then
    raise exception 'Finish the previous lesson to unlock this one.' using errcode = 'P0001';
  end if;

  perform private.learn_ensure(v_uid, p_tz);
  insert into public.learn_progress (user_id, lesson_id)
  values (v_uid, v_lesson.id)
  on conflict (user_id, lesson_id) do nothing;
  update public.learners set last_lesson_id = v_lesson.id
    where user_id = v_uid and last_lesson_id is distinct from v_lesson.id;

  select * into p from public.learn_progress where user_id = v_uid and lesson_id = v_lesson.id;
  return private.learn_progress_json(p);
end;
$$;

-- Saves where the learner is inside a lesson. Never changes completion.
create or replace function public.learn_save_progress(p_lesson text, p_step integer, p_state jsonb default null)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Sign in to save your learning progress.' using errcode = '28000';
  end if;
  if p_step is null or p_step < 0 or p_step > 200 then
    raise exception 'Invalid lesson step.' using errcode = '22023';
  end if;
  if p_state is not null and jsonb_typeof(p_state) <> 'object' then
    raise exception 'Invalid lesson state.' using errcode = '22023';
  end if;
  if p_state is not null and octet_length(p_state::text) > 16000 then
    raise exception 'Your unfinished work is too large to save. Try shortening it.' using errcode = 'P0001';
  end if;

  update public.learn_progress
    set step = p_step, state = p_state
    where user_id = v_uid and lesson_id = p_lesson;
  if not found then
    raise exception 'Open the lesson first.' using errcode = 'P0002';
  end if;
end;
$$;

-- Records one part of a lesson: 'check' (knowledge check passed), 'challenge'
-- (practical challenge solved) or 'lesson' (finished; needs both of the others).
create or replace function public.learn_complete(
  p_lesson text,
  p_part text,
  p_perfect boolean default false,
  p_tz text default 'UTC'
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_lesson public.learn_lessons;
  l public.learners;
  p public.learn_progress;
  a public.learn_activity;
  v_today date;
  v_xp_before integer;
  v_gain integer;
  v_awards jsonb := '[]'::jsonb;
  v_first_today boolean;
  v_streak integer;
  v_goal_now boolean := false;
  v_module text;
  v_unlocked jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in to save your learning progress.' using errcode = '28000';
  end if;
  if p_part is null or p_part not in ('check', 'challenge', 'lesson') then
    raise exception 'Unknown lesson part.' using errcode = 'P0001';
  end if;
  select * into v_lesson from public.learn_lessons where id = p_lesson;
  if not found then
    raise exception 'That lesson doesn''t exist.' using errcode = 'P0002';
  end if;

  -- Lock the learner first, then the progress row: concurrent calls queue up here.
  l := private.learn_ensure(v_uid, p_tz);
  select * into p from public.learn_progress where user_id = v_uid and lesson_id = v_lesson.id for update;
  if not found then
    raise exception 'Open the lesson first.' using errcode = 'P0002';
  end if;
  if not private.learn_unlocked(v_uid, v_lesson.position) then
    raise exception 'Finish the previous lesson to unlock this one.' using errcode = 'P0001';
  end if;

  v_xp_before := l.xp;
  v_today := greatest(private.learn_today(l.time_zone), l.last_active_day);

  -- 1. The part itself
  if p_part = 'check' then
    if not p.check_done then
      update public.learn_progress set check_done = true where user_id = v_uid and lesson_id = v_lesson.id;
    end if;
    v_gain := private.learn_award(v_uid, 'check', v_lesson.id, v_today);
    if v_gain > 0 then
      v_awards := v_awards || jsonb_build_object('kind', 'check', 'ref', v_lesson.id, 'xp', v_gain);
    end if;
  elsif p_part = 'challenge' then
    if not p.challenge_done then
      update public.learn_progress set challenge_done = true where user_id = v_uid and lesson_id = v_lesson.id;
    end if;
    v_gain := private.learn_award(v_uid, 'challenge', v_lesson.id, v_today);
    if v_gain > 0 then
      v_awards := v_awards || jsonb_build_object('kind', 'challenge', 'ref', v_lesson.id, 'xp', v_gain);
    end if;
  else
    if not (p.check_done and p.challenge_done) then
      raise exception 'Finish the knowledge check and the challenge first.' using errcode = 'P0001';
    end if;
    if p.status <> 'completed' then
      update public.learn_progress
        set status = 'completed', completed_at = now(), perfect = coalesce(p_perfect, false)
        where user_id = v_uid and lesson_id = v_lesson.id;

      v_gain := private.learn_award(v_uid, 'lesson', v_lesson.id, v_today);
      if v_gain > 0 then
        v_awards := v_awards || jsonb_build_object('kind', 'lesson', 'ref', v_lesson.id, 'xp', v_gain);
      end if;
      if coalesce(p_perfect, false) then
        v_gain := private.learn_award(v_uid, 'perfect', v_lesson.id, v_today);
        if v_gain > 0 then
          v_awards := v_awards || jsonb_build_object('kind', 'perfect', 'ref', v_lesson.id, 'xp', v_gain);
        end if;
      end if;

      update public.learners set
        lessons_completed = (
          select count(*) from public.learn_progress where user_id = v_uid and status = 'completed'
        ),
        last_completed_lesson_id = v_lesson.id
      where user_id = v_uid;

      -- Was that the last lesson of its module?
      if not exists (
        select 1 from public.learn_lessons ll
        where ll.module_id = v_lesson.module_id
          and not exists (
            select 1 from public.learn_progress lp
            where lp.user_id = v_uid and lp.lesson_id = ll.id and lp.status = 'completed'
          )
      ) then
        v_gain := private.learn_award(v_uid, 'module', v_lesson.module_id, v_today);
        if v_gain > 0 then
          v_module := v_lesson.module_id;
          v_awards := v_awards || jsonb_build_object('kind', 'module', 'ref', v_lesson.module_id, 'xp', v_gain);
        end if;
        update public.learners set modules_completed = (
          select count(*) from public.learn_modules m
          where exists (select 1 from public.learn_lessons ll where ll.module_id = m.id)
            and not exists (
              select 1 from public.learn_lessons ll
              where ll.module_id = m.id
                and not exists (
                  select 1 from public.learn_progress lp
                  where lp.user_id = v_uid and lp.lesson_id = ll.id and lp.status = 'completed'
                )
            )
        )
        where user_id = v_uid;
      end if;
    end if;
  end if;

  -- 2. Streak: several activities on one day count once.
  v_first_today := l.last_active_day is null or l.last_active_day < v_today;
  v_streak := case
    when l.last_active_day is null then 1
    when v_today - l.last_active_day <= 0 then greatest(l.streak, 1)
    when v_today - l.last_active_day = 1 then l.streak + 1
    else 1
  end;
  update public.learners
    set streak = v_streak, best_streak = greatest(best_streak, v_streak), last_active_day = v_today
    where user_id = v_uid;

  -- 3. Today's activity and daily goal (distinct lessons finished or reviewed today).
  insert into public.learn_activity (user_id, day, lesson_ids)
  values (v_uid, v_today, case when p_part = 'lesson' then array[v_lesson.id] else '{}'::text[] end)
  on conflict (user_id, day) do update set lesson_ids = case
    when p_part = 'lesson' and not (v_lesson.id = any (public.learn_activity.lesson_ids))
      then public.learn_activity.lesson_ids || v_lesson.id
    else public.learn_activity.lesson_ids
  end
  returning * into a;

  select * into l from public.learners where user_id = v_uid;
  if not a.goal_met and cardinality(a.lesson_ids) >= l.daily_goal then
    update public.learn_activity set goal_met = true where user_id = v_uid and day = v_today;
    v_goal_now := true;
    v_gain := private.learn_award(v_uid, 'daily_goal', v_today::text, v_today);
    if v_gain > 0 then
      v_awards := v_awards || jsonb_build_object('kind', 'daily_goal', 'ref', v_today::text, 'xp', v_gain);
    end if;
  end if;

  -- 4. Badges
  v_unlocked := private.award_achievements(v_uid);

  select * into l from public.learners where user_id = v_uid;
  select * into p from public.learn_progress where user_id = v_uid and lesson_id = v_lesson.id;

  return jsonb_build_object(
    'xpGained', l.xp - v_xp_before,
    'awards', v_awards,
    'xpBefore', v_xp_before,
    'xpAfter', l.xp,
    'streak', l.streak,
    'bestStreak', l.best_streak,
    'streakExtended', v_first_today,
    'todayLessons', cardinality(a.lesson_ids),
    'dailyGoal', l.daily_goal,
    'goalMetNow', v_goal_now,
    'moduleCompleted', v_module,
    'unlocked', v_unlocked,
    'lesson', private.learn_progress_json(p)
  );
end;
$$;

create or replace function public.learn_set_goal(p_goal integer)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Sign in to save your learning progress.' using errcode = '28000';
  end if;
  if p_goal is null or p_goal not in (1, 2, 3, 5) then
    raise exception 'Pick a daily goal of 1, 2, 3 or 5 lessons.' using errcode = 'P0001';
  end if;
  perform private.learn_ensure(v_uid, null);
  update public.learners set daily_goal = p_goal where user_id = v_uid;
end;
$$;

-- ----------------------------------------------------------------------------
-- Admin: resetting a player also resets their learning
-- ----------------------------------------------------------------------------

create or replace function public.admin_reset_progress(p_user uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;
  -- Scores and answers cascade from their sessions.
  delete from public.game_sessions where user_id = p_user;
  delete from public.user_achievements where user_id = p_user;
  delete from public.learn_xp_events where user_id = p_user;
  delete from public.learn_activity where user_id = p_user;
  delete from public.learn_progress where user_id = p_user;
  delete from public.learners where user_id = p_user;
  update public.profiles
  set xp = 0, level = 1, games_played = 0, total_score = 0, high_score = 0,
      questions_answered = 0, questions_correct = 0, expert_correct = 0,
      best_streak = 0, perfect_runs = 0, best_fast_run = 0, fastest_answer_ms = null,
      daily_completed = 0, day_streak = 0, best_day_streak = 0, last_played_on = null
  where id = p_user;
end;
$$;

-- ----------------------------------------------------------------------------
-- Function privileges
-- ----------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.learn_get_state(text) from public, anon;
revoke execute on function public.learn_open_lesson(text, text) from public, anon;
revoke execute on function public.learn_save_progress(text, integer, jsonb) from public, anon;
revoke execute on function public.learn_complete(text, text, boolean, text) from public, anon;
revoke execute on function public.learn_set_goal(integer) from public, anon;
revoke execute on function public.admin_reset_progress(uuid) from public, anon;

grant execute on function public.learn_get_state(text) to authenticated;
grant execute on function public.learn_open_lesson(text, text) to authenticated;
grant execute on function public.learn_save_progress(text, integer, jsonb) to authenticated;
grant execute on function public.learn_complete(text, text, boolean, text) to authenticated;
grant execute on function public.learn_set_goal(integer) to authenticated;
grant execute on function public.admin_reset_progress(uuid) to authenticated;
