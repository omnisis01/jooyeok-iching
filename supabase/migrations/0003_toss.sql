-- 토스페이먼츠 정기결제(빌링) 관련 확장
alter table public.profiles add column if not exists billing_key text;
alter table public.profiles add column if not exists billing_customer_key text;
alter table public.profiles add column if not exists billing_card_label text;
alter table public.profiles add column if not exists billing_status text; -- active, cancelled, failed
alter table public.profiles add column if not exists last_charged_at timestamptz;

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'toss',
  order_id text not null unique,
  amount int not null,
  status text not null,
  approved_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "payments: read own" on public.payments;
create policy "payments: read own" on public.payments
  for select using (auth.uid() = user_id);

-- 매일 아침 6시(KST) 갱신 결제는 scripts/setup-payments-toss.mjs 가 cron으로 등록합니다.
