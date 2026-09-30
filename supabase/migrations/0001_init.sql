-- 나만의 정통주역운세 백엔드 초기 스키마
-- Supabase SQL Editor에 붙여 넣어 실행합니다.

-- 1) 점 기록: 클라이언트가 만든 기록(JSON)을 사용자별로 보관
create table if not exists public.readings (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists readings_user_created on public.readings (user_id, created_at desc);

alter table public.readings enable row level security;

drop policy if exists "readings: own rows" on public.readings;
create policy "readings: own rows" on public.readings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) 푸시 구독: 로그인 없이도 구독할 수 있게 user_id는 선택
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  keys jsonb not null,
  user_id uuid references auth.users (id) on delete set null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  fail_count int not null default 0
);

alter table public.push_subscriptions enable row level security;

-- 누구나 자기 기기의 구독을 등록/삭제할 수 있다. 목록 조회는 서버(서비스 키)만 한다.
drop policy if exists "push: insert" on public.push_subscriptions;
create policy "push: insert" on public.push_subscriptions
  for insert with check (true);
drop policy if exists "push: update own endpoint" on public.push_subscriptions;
create policy "push: update own endpoint" on public.push_subscriptions
  for update using (true) with check (true);
drop policy if exists "push: delete" on public.push_subscriptions;
create policy "push: delete" on public.push_subscriptions
  for delete using (true);

-- 3) 프로필: 프리미엄 여부 등 (결제 연동 시 서버가 갱신)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  premium_until timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = user_id);

-- 4) 매일 아침 7시(KST, UTC 22:00) 오늘의 괘 푸시. scripts/setup-supabase.mjs 가 자동으로 등록합니다.
-- 수동으로 할 때는 아래 주석을 풀고 <PROJECT_REF>와 서비스 키를 Vault에 넣은 뒤 실행하세요.
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;
-- select cron.schedule(
--   'daily-hexagram-push',
--   '0 22 * * *',
--   $$
--   select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/daily-push',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
--     body := '{}'::jsonb
--   );
--   $$
-- );
