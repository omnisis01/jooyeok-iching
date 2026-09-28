# 주역 마스터 백엔드 설정 안내

앱은 키가 없으면 지금처럼 기기 저장만으로 동작하고, 아래 설정을 마치면 로그인, 기록 동기화, 오늘의 괘 푸시 알림이 켜집니다. 키 값은 채팅이나 문서에 적지 말고 안내된 위치에만 넣어 주세요.

## 1. Supabase 프로젝트 만들기 (약 10분)

1. https://supabase.com 에서 새 프로젝트를 만듭니다. 지역은 Northeast Asia (Seoul)을 고릅니다.
2. 프로젝트의 SQL Editor를 열고 `supabase/migrations/0001_init.sql` 내용을 붙여 넣어 실행합니다.
3. Authentication > Providers > Email 에서 이메일 로그인을 켜고, "Confirm email"은 꺼도 됩니다(매직 링크 방식).
4. Authentication > URL Configuration 에서
   - Site URL: `https://omnisis01.github.io/jooyeok-iching/`
   - Redirect URLs: 위 주소와 `http://localhost:3000/` 두 개를 추가합니다.
5. Settings > API 에서 `Project URL`과 `anon public` 키를 확인합니다. `service_role` 키는 절대 앱이나 GitHub에 넣지 않습니다.

## 2. 앱에 공개 키 넣기

- 로컬 개발: 프로젝트 폴더에 `.env.local` 파일을 만들고 `.env.example`의 항목을 채웁니다. 이 폴더는 Google Drive에 동기화되므로, 가능하면 프로젝트를 로컬 폴더로 옮긴 뒤 `.env.local`을 두는 것이 안전합니다.
- 배포: GitHub 저장소 Settings > Secrets and variables > Actions 에 아래 세 개를 등록합니다.
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (3단계에서 생성)
  등록 후 Actions 탭에서 "Deploy to GitHub Pages"를 다시 실행하거나 아무 커밋이나 푸시하면 반영됩니다.

## 3. 푸시 알림 (오늘의 괘, 매일 아침 7시)

1. 터미널에서 VAPID 키 쌍을 만듭니다.

   ```bash
   npx web-push generate-vapid-keys
   ```

   출력된 Public Key는 2단계의 `NEXT_PUBLIC_VAPID_PUBLIC_KEY`에, Private Key는 아래 Edge Function Secrets에만 넣습니다.

2. Supabase CLI로 함수를 배포합니다(처음 한 번 `npx supabase login`, `npx supabase link --project-ref <프로젝트 ref>`).

   ```bash
   npx supabase functions deploy daily-push --no-verify-jwt
   ```

3. Supabase 대시보드 Edge Functions > daily-push > Secrets 에 등록합니다.
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (예: `mailto:본인이메일`)
   `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`는 자동으로 제공됩니다.

4. 매일 실행 예약: Database > Extensions 에서 `pg_cron`과 `pg_net`을 켠 뒤, `0001_init.sql` 맨 아래 주석 처리된 `cron.schedule` 구문의 `<PROJECT_REF>`를 채워 실행합니다. 서비스 키는 Vault(Settings > Vault)에 `service_role_key` 이름으로 저장해 두면 SQL이 그 값을 읽습니다.

5. 앱 홈의 계정 카드에서 "오늘의 괘 알림 받기"를 누르면 그 기기가 구독됩니다. iPhone은 홈 화면에 추가한 뒤에만 알림을 받을 수 있습니다(iOS 16.4 이상).

## 4. 결제(프리미엄)는 아직 설계만 되어 있습니다

정적 사이트에서는 결제 검증을 할 수 없어 서버가 필요합니다. 준비되면 다음 순서를 권합니다.

- 국내 카드 결제는 토스페이먼츠, 해외 포함이면 Stripe. 둘 다 사업자 등록과 심사가 필요합니다.
- 결제 승인 검증은 Supabase Edge Function에서 처리하고, 성공 시 `profiles.premium_until`을 갱신합니다. 앱은 이 값을 읽어 프리미엄 풀이(예: 육효 상세 도표 저장, 광고 제거)를 엽니다.
- 클라이언트에는 결제창을 여는 공개 키만 두고, 시크릿 키와 웹훅 서명 키는 함수 Secrets에만 둡니다.

## 확인 방법

- 로그인 후 홈의 계정 카드에 이메일이 보이고, 다른 기기에서 같은 계정으로 로그인하면 기록이 나타나면 동기화 성공입니다.
- 알림은 Supabase 대시보드에서 daily-push 함수를 "Invoke"로 수동 실행해 바로 시험할 수 있습니다.
