-- 관리자 화면에 AI 풀이 지표를 더한다(0007의 admin_dashboard를 바꿔 쓴다)
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
    'ai_total', (select count(*) from ai_readings),
    'ai_today', (select count(*) from ai_readings where day = kst_today()),
    'ai_month_models', coalesce((
      select json_agg(json_build_object('model', model, 'n', n, 'in_tok', in_tok, 'out_tok', out_tok))
      from (
        select model, count(*) as n, coalesce(sum(input_tokens), 0) as in_tok, coalesce(sum(output_tokens), 0) as out_tok
        from ai_readings where day >= date_trunc('month', kst_today())::date group by model
      ) m
    ), '[]'::json),
    'days', coalesce((
      select json_agg(json_build_object('day', day, 'name', name, 'n', n, 'people', people) order by day desc, name)
      from (
        select day, name, count(*) as n, count(distinct coalesce(user_id::text, anon_id)) as people
        from events where day >= since group by day, name
      ) t
    ), '[]'::json)
  );
end $$;

notify pgrst, 'reload schema';
