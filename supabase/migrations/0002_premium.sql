-- 프리미엄(결제) 관련 확장
alter table public.profiles add column if not exists stripe_customer_id text;
create index if not exists profiles_stripe_customer on public.profiles (stripe_customer_id);

-- 서버(서비스 키)만 profiles를 쓰고, 사용자는 자기 것만 읽는다 (0001의 정책 유지)
