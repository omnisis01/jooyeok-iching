-- 장애 감시: 알림 발송 결과를 사용 기록에 남긴다(push_run)
alter table public.events drop constraint if exists events_name_ok;
alter table public.events add constraint events_name_ok check (name in (
  'app_open', 'cast_start', 'cast_done', 'quota_exhausted', 'login_prompt', 'login_link_sent', 'login_done',
  'share_image', 'share_coupon', 'push_on', 'push_off', 'deep_view', 'deep_buy_click', 'guide_open',
  'wheel_open', 'daily_card', 'pro_click',
  'ai_open', 'ai_request', 'ai_done', 'ai_retry', 'ai_fallback', 'ai_refused', 'ai_safety', 'ai_need_purchase',
  'review_submit', 'inquiry_submit', 'push_run'
));

notify pgrst, 'reload schema';
