-- 운영 지표용 사용 기록. 개인을 알아볼 수 있는 정보는 넣지 않는다(이메일, 질문 글, 결과 내용 없음)
-- anon_id: 기기마다 무작위로 만든 값. user_id: 로그인했을 때만
create table if not exists public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  day date not null default ((now() at time zone 'Asia/Seoul')::date),
  name text not null,
  props jsonb not null default '{}'::jsonb,
  anon_id text,
  user_id uuid references auth.users (id) on delete set null,
  constraint events_name_ok check (name in (
    'app_open', 'cast_start', 'cast_done', 'quota_exhausted', 'login_prompt', 'login_link_sent', 'login_done',
    'share_image', 'share_coupon', 'push_on', 'push_off', 'deep_view', 'deep_buy_click', 'guide_open',
    'wheel_open', 'daily_card', 'pro_click'
  )),
  constraint events_props_small check (octet_length(props::text) <= 600),
  constraint events_anon_ok check (anon_id is null or anon_id ~ '^[a-z0-9-]{8,40}$')
);
create index if not exists events_day_name on public.events (day, name);
alter table public.events enable row level security;

-- 누구나 기록은 남길 수 있지만(앱이 익명으로 보냄) 읽기는 서버(서비스 키)만 한다
drop policy if exists "events: insert" on public.events;
create policy "events: insert" on public.events for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- 대시보드용 하루 요약
create or replace view public.events_daily with (security_invoker = true) as
  select day, name, count(*) as n, count(distinct coalesce(user_id::text, anon_id)) as people
  from public.events group by day, name;
revoke all on public.events_daily from anon, authenticated;
