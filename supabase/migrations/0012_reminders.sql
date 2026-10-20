-- 시기 알림: AI 점사풀이가 짚은 날 아침에 "오늘이 그날이에요" 알림. 아침 알림(daily-push)이 그날 보낸다
create table if not exists public.reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  reading_key text not null,
  date date not null,
  question text,
  hex_name text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (user_id, reading_key)
);
create index if not exists reminders_date on public.reminders (date) where sent_at is null;
alter table public.reminders enable row level security;
drop policy if exists "reminders: own" on public.reminders;
create policy "reminders: own" on public.reminders for select using (auth.uid() = user_id);

create or replace function public.set_reminder(p_date date, p_key text, p_question text, p_hex text) returns json
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if uid is null then raise exception 'login required'; end if;
  if p_date <= today or p_date > today + 120 then raise exception 'bad date'; end if;
  if (select count(*) from reminders where user_id = uid and sent_at is null) >= 20 then raise exception 'too many'; end if;
  insert into reminders (user_id, reading_key, date, question, hex_name)
    values (uid, left(p_key, 80), p_date, nullif(left(trim(coalesce(p_question, '')), 60), ''), left(coalesce(p_hex, ''), 20))
    on conflict (user_id, reading_key) do update set date = excluded.date, question = excluded.question, hex_name = excluded.hex_name, sent_at = null;
  return json_build_object('ok', true);
end $$;
revoke all on function public.set_reminder(date, text, text, text) from public, anon;
grant execute on function public.set_reminder(date, text, text, text) to authenticated;

alter table public.events drop constraint if exists events_name_ok;
alter table public.events add constraint events_name_ok check (name in (
  'app_open', 'cast_start', 'cast_done', 'quota_exhausted', 'login_prompt', 'login_link_sent', 'login_done',
  'share_image', 'share_coupon', 'push_on', 'push_off', 'deep_view', 'deep_buy_click', 'guide_open',
  'wheel_open', 'daily_card', 'pro_click',
  'ai_open', 'ai_request', 'ai_done', 'ai_retry', 'ai_fallback', 'ai_refused', 'ai_safety', 'ai_need_purchase',
  'review_submit', 'inquiry_submit', 'push_run', 'reminder_set', 'reminder_sent'
));

notify pgrst, 'reload schema';
