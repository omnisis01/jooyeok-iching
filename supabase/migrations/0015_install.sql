-- 설치 권유(홈 화면에 추가)와 질문 입력 기록 이름을 허용한다
alter table public.events drop constraint if exists events_name_ok;
alter table public.events add constraint events_name_ok check (name in (
  'app_open', 'cast_start', 'cast_done', 'quota_exhausted', 'login_prompt', 'login_link_sent', 'login_done',
  'share_image', 'share_coupon', 'push_on', 'push_off', 'deep_view', 'deep_buy_click', 'guide_open',
  'wheel_open', 'daily_card', 'pro_click',
  'ai_open', 'ai_request', 'ai_done', 'ai_retry', 'ai_fallback', 'ai_refused', 'ai_safety', 'ai_need_purchase',
  'review_submit', 'inquiry_submit', 'push_run', 'reminder_set', 'reminder_sent', 'ai_followup', 'ai_followup_fallback',
  'outcome_asked', 'outcome_set',
  'install_prompt', 'install_add', 'install_dismiss', 'ai_question_added'
));
