-- More time for query questions.
--
-- Writing or fixing a query gets twice the multiple-choice time, and predicting output or building a
-- query gets 1.5x. The time bonus is rescaled to the base (difficulty) timer, so the maximum points per
-- question are unchanged and scores stay comparable with earlier runs.
--
-- question_payload and submit_answer are redefined unchanged apart from using question_timer().

-- lib/config.ts QUESTION_TIMERS: seconds per question by type and difficulty.
create or replace function public.question_timer(p_difficulty public.difficulty, p_type public.question_type)
returns integer
language sql immutable parallel safe set search_path = ''
as $$
  select case
    when p_type in ('write-sql', 'fix-query') then
      case p_difficulty when 'easy' then 60 when 'medium' then 90 when 'hard' then 120 else 180 end
    when p_type in ('predict-output', 'drag-drop') then
      case p_difficulty when 'easy' then 45 when 'medium' then 70 when 'hard' then 90 else 135 end
    else
      case p_difficulty when 'easy' then 30 when 'medium' then 45 when 'hard' then 60 else 90 end
  end;
$$;

create or replace function private.question_payload(q public.questions, s public.game_sessions)
returns jsonb
language plpgsql volatile set search_path = ''
as $$
declare
  v_timer integer;
  v_options jsonb;
  v_order text[];
  v_pool jsonb;
  v_attempt integer := 0;
  v_elapsed_ms numeric;
begin
  v_timer := public.question_timer(q.difficulty, q.type);

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
    'timer', v_timer,
    'secondsLeft', case
      when s.mode = 'practice' then null
      else round(greatest(0, v_timer - v_elapsed_ms / 1000.0), 2)
    end
  );
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
  v_timer integer;
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
  v_timer := public.question_timer(q.difficulty, q.type);

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
    v_seconds_left := greatest(0, v_timer - v_effective_ms / 1000.0);
    -- Answers arriving well after the timer ran out never count.
    v_late := v_effective_ms > (v_timer + 2) * 1000;
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
      -- Seconds left on the base timer's scale, so longer query timers don't raise the maximum bonus.
      v_time_bonus := floor(v_seconds_left * r.timer_seconds / v_timer)::integer * r.time_multiplier;
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
