-- 운영 대시보드 1차: 문의함, 후기, 결제 관리
-- 쓰기는 모두 아래 함수로만 한다(길이와 횟수를 서버에서 막는다). 관리자 함수는 is_admin()을 확인한다

-- 문의
create table if not exists public.inquiries (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  anon_id text,
  email text,
  category text not null check (category in ('payment', 'bug', 'idea', 'other')),
  message text not null check (char_length(message) between 5 and 1000),
  status text not null default 'new' check (status in ('new', 'answered', 'closed')),
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists inquiries_status on public.inquiries (status, created_at desc);
alter table public.inquiries enable row level security;
drop policy if exists "inquiries: read own" on public.inquiries;
create policy "inquiries: read own" on public.inquiries for select using (auth.uid() = user_id);

create or replace function public.submit_inquiry(p_category text, p_message text, p_email text, p_anon text) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mail text := nullif(trim(p_email), '');
begin
  if uid is not null then
    select email into mail from auth.users where id = uid;
  elsif mail is null or mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email required';
  end if;
  -- 같은 사람이 한 시간에 3건까지
  if (select count(*) from inquiries where created_at > now() - interval '1 hour'
      and ((uid is not null and user_id = uid) or (uid is null and anon_id = p_anon))) >= 3 then
    raise exception 'too many';
  end if;
  insert into inquiries (user_id, anon_id, email, category, message)
    values (uid, case when p_anon ~ '^[a-z0-9-]{8,40}$' then p_anon end, left(mail, 200), p_category, left(trim(p_message), 1000));
  return json_build_object('ok', true);
end $$;
revoke all on function public.submit_inquiry(text, text, text, text) from public;
grant execute on function public.submit_inquiry(text, text, text, text) to anon, authenticated;

-- 후기: 결과 하나에 한 번. 공개는 본인이 동의하고 관리자가 고른 것만
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  anon_id text,
  reading_key text not null,
  hexagram int check (hexagram between 1 and 64),
  category text,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 120),
  public_ok boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists reviews_once on public.reviews (coalesce(user_id::text, anon_id), reading_key);
alter table public.reviews enable row level security;

create or replace function public.submit_review(p_key text, p_hexagram int, p_category text, p_rating int, p_comment text, p_public boolean, p_anon text) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  anon text := case when p_anon ~ '^[a-z0-9-]{8,40}$' then p_anon end;
begin
  if uid is null and anon is null then raise exception 'anon id required'; end if;
  if (select count(*) from reviews where created_at > now() - interval '1 day'
      and ((uid is not null and user_id = uid) or (uid is null and anon_id = anon))) >= 10 then
    raise exception 'too many';
  end if;
  insert into reviews (user_id, anon_id, reading_key, hexagram, category, rating, comment, public_ok)
    values (uid, anon, left(p_key, 80), p_hexagram, left(p_category, 20), p_rating, nullif(left(trim(coalesce(p_comment, '')), 120), ''), coalesce(p_public, false))
    on conflict do nothing;
  return json_build_object('ok', true);
end $$;
revoke all on function public.submit_review(text, int, text, int, text, boolean, text) from public;
grant execute on function public.submit_review(text, int, text, int, text, boolean, text) to anon, authenticated;

-- 홈에 보여 줄 후기(누구나): 동의했고 관리자가 고른 것만, 쓴 사람은 드러내지 않는다
create or replace function public.featured_reviews() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('rating', rating, 'comment', comment, 'hexagram', hexagram, 'category', category, 'day', (created_at at time zone 'Asia/Seoul')::date) order by created_at desc), '[]'::json)
  from (select * from reviews where featured and public_ok and comment is not null order by created_at desc limit 12) r
$$;
revoke all on function public.featured_reviews() from public;
grant execute on function public.featured_reviews() to anon, authenticated;

-- 관리자: 문의
create or replace function public.admin_inquiries(p_status text default null) returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return coalesce((select json_agg(row_to_json(i) order by i.created_at desc) from (
    select id, email, category, message, status, reply, replied_at, created_at, user_id is not null as member
    from inquiries where p_status is null or status = p_status order by created_at desc limit 200) i), '[]'::json);
end $$;

create or replace function public.admin_reply_inquiry(p_id bigint, p_reply text, p_status text) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update inquiries set reply = nullif(left(trim(coalesce(p_reply, '')), 2000), ''),
    status = p_status, replied_at = case when coalesce(trim(p_reply), '') <> '' then now() else replied_at end
  where id = p_id;
  return json_build_object('ok', true);
end $$;

-- 관리자: 후기
create or replace function public.admin_reviews() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return coalesce((select json_agg(row_to_json(r) order by r.created_at desc) from (
    select id, rating, comment, hexagram, category, public_ok, featured, created_at from reviews order by created_at desc limit 300) r), '[]'::json);
end $$;

create or replace function public.admin_feature_review(p_id bigint, p_featured boolean) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update reviews set featured = p_featured and public_ok where id = p_id;
  return json_build_object('ok', true);
end $$;

-- 관리자: 결제와 Pro
create or replace function public.admin_payments() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return json_build_object(
    'payments', coalesce((select json_agg(row_to_json(p) order by p.created_at desc) from (
      select pa.order_id, pa.amount, pa.status, pa.approved_at, pa.created_at, u.email
      from payments pa left join auth.users u on u.id = pa.user_id order by pa.created_at desc limit 100) p), '[]'::json),
    'pro', coalesce((select json_agg(row_to_json(x) order by x.premium_until desc) from (
      select u.email, pr.premium_until, pr.billing_status
      from profiles pr join auth.users u on u.id = pr.user_id where pr.premium_until > now()) x), '[]'::json)
  );
end $$;

-- Pro를 손으로 주거나(일수) 거둔다(0일). 오류 보상, 이벤트 당첨 등에 쓴다
create or replace function public.admin_grant_pro(p_email text, p_days int) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  until timestamptz;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'no such user'; end if;
  if p_days <= 0 then
    until := null;
  else
    select greatest(coalesce(premium_until, now()), now()) + make_interval(days => least(p_days, 366)) into until from profiles where user_id = uid;
    until := coalesce(until, now() + make_interval(days => least(p_days, 366)));
  end if;
  insert into profiles (user_id, premium_until) values (uid, until)
    on conflict (user_id) do update set premium_until = excluded.premium_until;
  return json_build_object('ok', true, 'premium_until', until);
end $$;

revoke all on function public.admin_inquiries(text), public.admin_reply_inquiry(bigint, text, text), public.admin_reviews(),
  public.admin_feature_review(bigint, boolean), public.admin_payments(), public.admin_grant_pro(text, int) from public, anon;
grant execute on function public.admin_inquiries(text), public.admin_reply_inquiry(bigint, text, text), public.admin_reviews(),
  public.admin_feature_review(bigint, boolean), public.admin_payments(), public.admin_grant_pro(text, int) to authenticated;

-- 운영 지표 이름 추가
alter table public.events drop constraint if exists events_name_ok;
alter table public.events add constraint events_name_ok check (name in (
  'app_open', 'cast_start', 'cast_done', 'quota_exhausted', 'login_prompt', 'login_link_sent', 'login_done',
  'share_image', 'share_coupon', 'push_on', 'push_off', 'deep_view', 'deep_buy_click', 'guide_open',
  'wheel_open', 'daily_card', 'pro_click',
  'ai_open', 'ai_request', 'ai_done', 'ai_retry', 'ai_fallback', 'ai_refused', 'ai_safety', 'ai_need_purchase',
  'review_submit', 'inquiry_submit'
));

notify pgrst, 'reload schema';
