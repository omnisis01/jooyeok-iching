-- 건별 결제로 연 결과(깊이 읽기) 기록
create table if not exists public.unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  reading_key text not null,
  order_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, reading_key)
);
alter table public.unlocks enable row level security;
drop policy if exists "unlocks: read own" on public.unlocks;
create policy "unlocks: read own" on public.unlocks
  for select using (auth.uid() = user_id);
-- 쓰기는 서버(서비스 키)만 한다
