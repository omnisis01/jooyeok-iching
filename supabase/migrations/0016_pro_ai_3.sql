-- Pro의 AI 분석을 하루 1회에서 3회로. 첫 분석은 깊은 모델(서버에서 고른다)
create or replace function public.ai_entitlement(p_uid uuid, p_key text) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  kst date := (now() at time zone 'Asia/Seoul')::date;
begin
  if exists (select 1 from admins where user_id = p_uid) then return 'admin'; end if;
  if exists (select 1 from profiles where user_id = p_uid and premium_until > now())
     and (select count(*) from ai_readings where user_id = p_uid and via = 'pro' and day = kst) < 3 then
    return 'pro';
  end if;
  if exists (select 1 from unlocks where user_id = p_uid and reading_key = p_key) then return 'unlock'; end if;
  if not exists (select 1 from ai_readings where user_id = p_uid and via = 'trial') then return 'trial'; end if;
  return null;
end $$;
revoke all on function public.ai_entitlement(uuid, text) from public, anon, authenticated;
notify pgrst, 'reload schema';
