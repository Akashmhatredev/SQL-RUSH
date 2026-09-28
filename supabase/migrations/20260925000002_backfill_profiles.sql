-- Profiles for users who signed in before the on_auth_user_created trigger existed,
-- e.g. after running supabase/reset.sql, which keeps auth.users but drops profiles.
-- The trigger only fires on insert, so those users would otherwise stay without a
-- profile. Safe to re-run: users who already have a profile are skipped.

insert into public.profiles (id, username, display_name, avatar_url)
select
  u.id,
  -- Players can rename themselves; the id prefix keeps this unique.
  'player_' || substr(replace(u.id::text, '-', ''), 1, 12),
  left(coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    'Player'
  ), 40),
  case
    when coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') ~ '^https://'
    then coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
  end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
