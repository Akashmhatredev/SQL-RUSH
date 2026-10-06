-- ============================================================================
-- SQL Rush — admin tools
-- ============================================================================
--
--   * Bootstrap admins: emails listed in private.admin_emails get the admin
--     role as soon as the address is confirmed, so the first admin doesn't
--     need a manual SQL update. Add more with:
--       insert into private.admin_emails (email) values ('someone@example.com');
--   * User management for the admin panel: edit a profile (names, avatar,
--     role, XP), reset a player's progress, delete an account, and grant or
--     revoke achievements.
--
-- Safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bootstrap admins
-- ----------------------------------------------------------------------------

create table if not exists private.admin_emails (
  email text primary key check (email = lower(btrim(email)))
);

insert into private.admin_emails (email) values ('akash.mhatre.dev@gmail.com')
on conflict (email) do nothing;

-- Only confirmed addresses count: requesting a magic link creates an
-- unconfirmed auth user, and that must not be enough to become an admin.
create or replace function private.is_bootstrap_admin(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join private.admin_emails a on a.email = lower(u.email)
    where u.id = p_user and u.email_confirmed_at is not null
  );
$$;

-- New profiles (OAuth sign-ups arrive already confirmed).
create or replace function private.grant_bootstrap_admin()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if private.is_bootstrap_admin(new.id) then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_bootstrap_admin on public.profiles;
create trigger profiles_bootstrap_admin
  before insert on public.profiles
  for each row execute function private.grant_bootstrap_admin();

-- Magic-link sign-ups are confirmed when the link is first opened.
create or replace function private.promote_bootstrap_admin()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if private.is_bootstrap_admin(new.id) then
    update public.profiles set role = 'admin' where id = new.id and role <> 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.promote_bootstrap_admin();

-- Accounts that already exist.
update public.profiles p
set role = 'admin'
where p.role <> 'admin' and private.is_bootstrap_admin(p.id);

-- ----------------------------------------------------------------------------
-- User management
-- ----------------------------------------------------------------------------

-- Sign-in details that only live in auth.users.
create or replace function public.admin_get_user(p_user uuid)
returns table (
  email text,
  provider text,
  last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  return query
    select u.email::text, coalesce(u.raw_app_meta_data ->> 'provider', 'email'), u.last_sign_in_at
    from auth.users u
    where u.id = p_user;
end;
$$;

-- Players can only edit their own names and avatar (column grants), so admin
-- edits go through here. The level always follows the XP.
create or replace function public.admin_update_user(
  p_user uuid,
  p_username text,
  p_display_name text,
  p_avatar_url text,
  p_role public.user_role,
  p_xp integer
)
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
  if p_xp is null or p_xp < 0 then
    raise exception 'XP can''t be negative.' using errcode = 'P0001';
  end if;
  update public.profiles
  set username = lower(btrim(p_username)),
      display_name = nullif(btrim(p_display_name), ''),
      avatar_url = nullif(btrim(p_avatar_url), ''),
      role = p_role,
      xp = p_xp,
      level = public.level_for_xp(p_xp)
  where id = p_user;
  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;
end;
$$;

-- Wipes a player's games, scores, answers and badges, and zeroes their stats.
-- The account, names and role stay.
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
  update public.profiles
  set xp = 0, level = 1, games_played = 0, total_score = 0, high_score = 0,
      questions_answered = 0, questions_correct = 0, expert_correct = 0,
      best_streak = 0, perfect_runs = 0, best_fast_run = 0, fastest_answer_ms = null,
      daily_completed = 0, day_streak = 0, best_day_streak = 0, last_played_on = null
  where id = p_user;
end;
$$;

-- Deletes the sign-in account; the profile and everything that belongs to it
-- cascade. Admins must be demoted first, so one admin can't remove another by accident.
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'You can''t delete your own account.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'Remove their admin role before deleting the account.' using errcode = 'P0001';
  end if;
  delete from auth.users where id = p_user;
  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;
end;
$$;

-- user_achievements: admins can also award and revoke badges by hand.
grant insert, delete on public.user_achievements to authenticated;

drop policy if exists "Admins award achievements" on public.user_achievements;
create policy "Admins award achievements"
  on public.user_achievements for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins revoke achievements" on public.user_achievements;
create policy "Admins revoke achievements"
  on public.user_achievements for delete to authenticated
  using ((select public.is_admin()));

-- ----------------------------------------------------------------------------
-- Function privileges
-- ----------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function public.admin_get_user(uuid) from public, anon;
revoke execute on function public.admin_update_user(uuid, text, text, text, public.user_role, integer) from public, anon;
revoke execute on function public.admin_reset_progress(uuid) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;

grant execute on function public.admin_get_user(uuid) to authenticated;
grant execute on function public.admin_update_user(uuid, text, text, text, public.user_role, integer) to authenticated;
grant execute on function public.admin_reset_progress(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
