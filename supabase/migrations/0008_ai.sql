-- AI 풀이: 한 결과에 한 번만 만들고 저장한다. 다시 열면 저장한 것을 보여 준다(추가 비용 없음)
-- 쓰기는 서버 함수(ai-reading)만 한다. 본인 것만 읽을 수 있다
create table if not exists public.ai_readings (
  user_id uuid not null references auth.users (id) on delete cascade,
  reading_key text not null,
  question text,
  result jsonb not null,
  -- 어떤 권한으로 만들었는지: admin, pro, unlock, trial
  via text not null check (via in ('admin', 'pro', 'unlock', 'trial')),
  model text not null,
  input_tokens int,
  output_tokens int,
  retries int not null default 0,
  created_at timestamptz not null default now(),
  day date not null default ((now() at time zone 'Asia/Seoul')::date),
  primary key (user_id, reading_key)
);
create index if not exists ai_readings_day on public.ai_readings (day);
alter table public.ai_readings enable row level security;
drop policy if exists "ai_readings: read own" on public.ai_readings;
create policy "ai_readings: read own" on public.ai_readings for select using (auth.uid() = user_id);

-- 운영 지표에 AI 풀이 기록을 더한다
alter table public.events drop constraint if exists events_name_ok;
alter table public.events add constraint events_name_ok check (name in (
  'app_open', 'cast_start', 'cast_done', 'quota_exhausted', 'login_prompt', 'login_link_sent', 'login_done',
  'share_image', 'share_coupon', 'push_on', 'push_off', 'deep_view', 'deep_buy_click', 'guide_open',
  'wheel_open', 'daily_card', 'pro_click',
  'ai_open', 'ai_request', 'ai_done', 'ai_retry', 'ai_fallback', 'ai_refused', 'ai_safety', 'ai_need_purchase'
));

-- 지금 이 결과에 AI 풀이를 만들 수 있는지와 그 권한. 서버 함수가 서비스 키로 부른다
-- 순서: 관리자 > Pro(하루 1회) > 이 결과를 건별 결제 > 첫 1회 체험
create or replace function public.ai_entitlement(p_uid uuid, p_key text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  kst date := (now() at time zone 'Asia/Seoul')::date;
begin
  if exists (select 1 from admins where user_id = p_uid) then return 'admin'; end if;
  if exists (select 1 from profiles where user_id = p_uid and premium_until > now())
     and not exists (select 1 from ai_readings where user_id = p_uid and via = 'pro' and day = kst) then
    return 'pro';
  end if;
  if exists (select 1 from unlocks where user_id = p_uid and reading_key = p_key) then return 'unlock'; end if;
  if not exists (select 1 from ai_readings where user_id = p_uid and via = 'trial') then return 'trial'; end if;
  return null;
end $$;
revoke all on function public.ai_entitlement(uuid, text) from public, anon, authenticated;

-- 화면에서 버튼 문구를 고르기 위한 확인용(만들지는 않는다). 본인 것만
create or replace function public.ai_status(p_key text) returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  return json_build_object('can', ai_entitlement(auth.uid(), p_key));
end $$;
revoke all on function public.ai_status(text) from public, anon;
grant execute on function public.ai_status(text) to authenticated;

notify pgrst, 'reload schema';
