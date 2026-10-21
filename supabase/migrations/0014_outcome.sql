-- 결과 확인: AI 점사풀이 7일 뒤 "어떻게 됐나요?"를 묻고(아침 알림), 맞았어요/아니에요/아직 몰라요를 받는다
alter table public.ai_readings add column if not exists asked_at timestamptz;
alter table public.ai_readings add column if not exists outcome text check (outcome in ('hit', 'miss', 'unsure'));
alter table public.ai_readings add column if not exists outcome_at timestamptz;
create index if not exists ai_readings_ask on public.ai_readings (day) where asked_at is null and outcome is null;

create or replace function public.set_outcome(p_key text, p_outcome text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_outcome not in ('hit', 'miss', 'unsure') then raise exception 'bad outcome'; end if;
  update ai_readings set outcome = p_outcome, outcome_at = now() where user_id = auth.uid() and reading_key = p_key;
  return json_build_object('ok', found);
end $$;
revoke all on function public.set_outcome(text, text) from public, anon;
grant execute on function public.set_outcome(text, text) to authenticated;

create or replace function public.admin_dashboard(p_days int default 14) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  since date := kst_today() - greatest(1, least(p_days, 90)) + 1;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return json_build_object(
    'today', kst_today(),
    'users', (select count(*) from auth.users),
    'users_today', (select count(*) from auth.users where (created_at at time zone 'Asia/Seoul')::date = kst_today()),
    'pro', (select count(*) from profiles where premium_until > now()),
    'unlocks', (select count(*) from unlocks),
    'unlocks_today', (select count(*) from unlocks where (created_at at time zone 'Asia/Seoul')::date = kst_today()),
    'paid_total', (select coalesce(sum(amount), 0) from payments where status = 'DONE'),
    'paid_today', (select coalesce(sum(amount), 0) from payments where status = 'DONE' and (coalesce(approved_at, created_at) at time zone 'Asia/Seoul')::date = kst_today()),
    'push_subs', (select count(*) from push_subscriptions where fail_count < 3),
    'ai_total', (select count(*) from ai_readings),
    'ai_today', (select count(*) from ai_readings where day = kst_today()),
    'ai_outcomes', (select json_build_object('hit', count(*) filter (where outcome = 'hit'), 'miss', count(*) filter (where outcome = 'miss'), 'unsure', count(*) filter (where outcome = 'unsure')) from ai_readings),
    'ai_month_models', coalesce((
      select json_agg(json_build_object('model', model, 'n', n, 'in_tok', in_tok, 'out_tok', out_tok))
      from (
        select model, count(*) as n, coalesce(sum(input_tokens), 0) as in_tok, coalesce(sum(output_tokens), 0) as out_tok
        from ai_readings where day >= date_trunc('month', kst_today())::date group by model
      ) m
    ), '[]'::json),
    'days', coalesce((
      select json_agg(json_build_object('day', day, 'name', name, 'n', n, 'people', people) order by day desc, name)
      from (
        select day, name, count(*) as n, count(distinct coalesce(user_id::text, anon_id)) as people
        from events where day >= since group by day, name
      ) t
    ), '[]'::json)
  );
end $$;

alter table public.events drop constraint if exists events_name_ok;
alter table public.events add constraint events_name_ok check (name in (
  'app_open', 'cast_start', 'cast_done', 'quota_exhausted', 'login_prompt', 'login_link_sent', 'login_done',
  'share_image', 'share_coupon', 'push_on', 'push_off', 'deep_view', 'deep_buy_click', 'guide_open',
  'wheel_open', 'daily_card', 'pro_click',
  'ai_open', 'ai_request', 'ai_done', 'ai_retry', 'ai_fallback', 'ai_refused', 'ai_safety', 'ai_need_purchase',
  'review_submit', 'inquiry_submit', 'push_run', 'reminder_set', 'reminder_sent', 'ai_followup', 'ai_followup_fallback',
  'outcome_asked', 'outcome_set'
));

notify pgrst, 'reload schema';
