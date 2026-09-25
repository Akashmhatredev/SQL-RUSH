-- ============================================================================
-- SQL Rush — remove an earlier schema so the migrations can run
-- ============================================================================
--
-- Run this ONCE in the Supabase SQL editor only if your project already has
-- tables named profiles / questions / scores / achievements from an earlier
-- setup that you don't need. It is NOT a migration and never runs by itself.
--
-- Safety: it refuses to drop anything if any of these tables contains rows.
-- Auth users (auth.users) are never touched.
-- ============================================================================

do $$
declare
  t text;
  n bigint;
  blockers text := '';
begin
  foreach t in array array['profiles', 'questions', 'scores', 'achievements', 'user_achievements', 'game_sessions', 'game_answers', 'daily_challenges'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then
        blockers := blockers || format('%s (%s rows) ', t, n);
      end if;
    end if;
  end loop;
  if blockers <> '' then
    raise exception 'Not resetting: these tables still contain data: %', blockers
      using hint = 'Back up or delete the rows first if you really want to replace them.';
  end if;
end;
$$;

-- Old sign-up triggers would keep writing to the old profiles table: remove every
-- trigger on auth.users that calls a function in the public schema.
do $$
declare
  r record;
begin
  for r in
    select t.tgname, p.proname
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal and n.nspname = 'public'
  loop
    execute format('drop trigger if exists %I on auth.users', r.tgname);
    raise notice 'Dropped trigger % (public.%) on auth.users', r.tgname, r.proname;
  end loop;
end;
$$;
drop function if exists public.handle_new_user() cascade;

drop table if exists public.scores cascade;
drop table if exists public.game_answers cascade;
drop table if exists public.game_sessions cascade;
drop table if exists public.daily_challenges cascade;
drop table if exists public.user_achievements cascade;
drop table if exists public.achievements cascade;
drop table if exists public.questions cascade;
drop table if exists public.profiles cascade;

drop schema if exists private cascade;

drop function if exists public.start_game(public.game_mode, public.difficulty, public.question_type[]) cascade;
drop function if exists public.next_question(uuid) cascade;
drop function if exists public.submit_answer(uuid, jsonb, integer, boolean, boolean) cascade;
drop function if exists public.end_game(uuid) cascade;
drop function if exists public.get_leaderboard(text, integer, uuid) cascade;
drop function if exists public.get_my_stats() cascade;
drop function if exists public.admin_list_users(text, integer, integer) cascade;
drop function if exists public.admin_set_role(uuid, public.user_role) cascade;
drop function if exists public.admin_overview() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.difficulty_rules(public.difficulty) cascade;
drop function if exists public.combo_multiplier(integer) cascade;
drop function if exists public.level_for_xp(integer) cascade;
drop function if exists public.normalize_sql(text) cascade;
drop function if exists public.normalize_text(text) cascade;

drop type if exists public.difficulty cascade;
drop type if exists public.question_type cascade;
drop type if exists public.game_mode cascade;
drop type if exists public.user_role cascade;
drop type if exists public.game_status cascade;
drop type if exists public.end_reason cascade;
drop type if exists public.achievement_metric cascade;
