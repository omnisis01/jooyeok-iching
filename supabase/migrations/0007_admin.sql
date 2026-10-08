-- 관리자: 이 표에 있는 계정만 관리자다. 앱 화면의 관리자 메뉴는 보기용이고, 권한은 아래 함수가 서버에서 확인한다
-- 관리자 추가: node scripts/setup-admin.mjs (이메일을 물어본다)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins: read own" on public.admins;
create policy "admins: read own" on public.admins for select using (auth.uid() = user_id);
-- 쓰기는 서버(관리 스크립트)만 한다

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from admins where user_id = auth.uid())
$$;

-- 관리자는 Pro처럼 점 횟수 제한이 없다
create or replace function public.quota_json(p_uid uuid, p_ok boolean default true) returns json
language plpgsql stable security definer set search_path = public as $$
declare
  q record;
  prem boolean;
  adm boolean;
begin
  select used, shares into q from daily_quota where user_id = p_uid and day = kst_today();
  select exists(select 1 from profiles where user_id = p_uid and premium_until > now()) into prem;
  select exists(select 1 from admins where user_id = p_uid) into adm;
  return json_build_object('ok', p_ok, 'day', kst_today(), 'used', coalesce(q.used, 0), 'shares', coalesce(q.shares, 0),
    'premium', prem or adm, 'admin', adm, 'free', 3, 'share_limit', 10);
end $$;

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
  select exists(select 1 from profiles where user_id = uid and premium_until > now())
      or exists(select 1 from admins where user_id = uid) into prem;
  if not prem and q.used >= 3 + q.shares then
    return quota_json(uid, false);
  end if;
  update daily_quota set used = used + 1, updated_at = now() where user_id = uid and day = kst_today();
  return quota_json(uid, true);
end $$;

-- 운영 현황 한 번에: 사용자, 결제, 알림 구독, 최근 며칠의 사용 기록 요약. 관리자가 아니면 오류
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
    'days', coalesce((
      select json_agg(json_build_object('day', day, 'name', name, 'n', n, 'people', people) order by day desc, name)
      from (
        select day, name, count(*) as n, count(distinct coalesce(user_id::text, anon_id)) as people
        from events where day >= since group by day, name
      ) t
    ), '[]'::json)
  );
end $$;

revoke all on function public.is_admin(), public.admin_dashboard(int) from public, anon;
grant execute on function public.is_admin(), public.admin_dashboard(int) to authenticated;
notify pgrst, 'reload schema';
