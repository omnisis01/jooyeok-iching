-- 하루 무료 점 횟수를 서버에서 센다(로그인 사용자). 날짜는 서버 시각의 한국 날짜라 기기 시계와 무관하다
create table if not exists public.daily_quota (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  used int not null default 0,
  shares int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.daily_quota enable row level security;
drop policy if exists "quota: read own" on public.daily_quota;
create policy "quota: read own" on public.daily_quota for select using (auth.uid() = user_id);
-- 쓰기는 아래 함수로만 한다

create or replace function public.kst_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Seoul')::date $$;

create or replace function public.quota_json(p_uid uuid, p_ok boolean default true) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  q record;
  prem boolean;
begin
  select used, shares into q from daily_quota where user_id = p_uid and day = kst_today();
  select exists(select 1 from profiles where user_id = p_uid and premium_until > now()) into prem;
  return json_build_object('ok', p_ok, 'day', kst_today(), 'used', coalesce(q.used, 0), 'shares', coalesce(q.shares, 0),
    'premium', prem, 'free', 3, 'share_limit', 10);
end $$;

create or replace function public.quota_status() returns json
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  return quota_json(auth.uid());
end $$;

-- 점 한 번 차감. 무료 3회 + 공유 쿠폰을 넘으면 차감하지 않고 ok=false
create or replace function public.consume_cast() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q record;
  prem boolean;
begin
  if uid is null then raise exception 'login required'; end if;
  insert into daily_quota (user_id, day) values (uid, kst_today()) on conflict do nothing;
  select used, shares into q from daily_quota where user_id = uid and day = kst_today() for update;
  select exists(select 1 from profiles where user_id = uid and premium_until > now()) into prem;
  if not prem and q.used >= 3 + q.shares then
    return quota_json(uid, false);
  end if;
  update daily_quota set used = used + 1, updated_at = now() where user_id = uid and day = kst_today();
  return quota_json(uid, true);
end $$;

-- 공유 쿠폰 1회. 하루 10회까지
create or replace function public.grant_share() returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  q record;
begin
  if uid is null then raise exception 'login required'; end if;
  insert into daily_quota (user_id, day) values (uid, kst_today()) on conflict do nothing;
  select shares into q from daily_quota where user_id = uid and day = kst_today() for update;
  if q.shares >= 10 then return quota_json(uid, false); end if;
  update daily_quota set shares = shares + 1, updated_at = now() where user_id = uid and day = kst_today();
  return quota_json(uid, true);
end $$;

-- 로그인 전에 이 기기에서 쓴 횟수를 합친다(로그인으로 횟수를 다시 받는 것을 막는다). 오늘 것만, 큰 값으로
create or replace function public.merge_local_quota(p_day date, p_used int, p_shares int) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'login required'; end if;
  if p_day = kst_today() then
    insert into daily_quota (user_id, day, used, shares)
      values (uid, kst_today(), least(greatest(p_used, 0), 13), least(greatest(p_shares, 0), 10))
      on conflict (user_id, day) do update
        set used = greatest(daily_quota.used, excluded.used),
            shares = greatest(daily_quota.shares, excluded.shares),
            updated_at = now();
  end if;
  return quota_json(uid, true);
end $$;

revoke all on function public.quota_json(uuid, boolean) from public, anon, authenticated;
revoke all on function public.quota_status(), public.consume_cast(), public.grant_share(), public.merge_local_quota(date, int, int) from public, anon;
grant execute on function public.quota_status(), public.consume_cast(), public.grant_share(), public.merge_local_quota(date, int, int) to authenticated;
