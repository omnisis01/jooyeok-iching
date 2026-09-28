# 주역 마스터 백엔드 설정 안내

앱은 키가 없으면 지금처럼 기기 저장만으로 동작하고, 아래 설정을 마치면 로그인, 기록 동기화, 오늘의 괘 푸시 알림이 켜집니다. 키 값은 채팅이나 문서에 적지 말고 안내된 위치에만 넣어 주세요.

## 빠른 길: 스크립트로 자동 설정 (약 5분)

사람이 직접 해야 하는 일은 두 가지뿐입니다.

1. https://supabase.com 에 가입하고(GitHub 계정으로 가능) 조직이 하나 있는지 확인합니다. 무료 플랜이면 됩니다.
2. https://supabase.com/dashboard/account/tokens 에서 "Generate new token"으로 개인 액세스 토큰을 만듭니다. 이름은 아무거나, 만든 값은 복사만 해 두고 어디에도 적지 않습니다.

그다음 프로젝트 폴더에서 아래를 실행합니다(토큰은 실행 중에 화면에 안 보이게 붙여 넣습니다).

```bash
node scripts/setup-supabase.mjs
```

스크립트가 하는 일: 서울 리전에 프로젝트 생성 → 테이블과 보안 정책 적용 → 이메일 링크 로그인과 리디렉션 주소 설정 → 푸시용 VAPID 키 생성 → daily-push 함수 배포와 비밀값 등록 → 매일 아침 7시 예약 → GitHub Secrets에 공개 키 등록 → 배포 워크플로 실행. 다시 실행해도 기존 프로젝트를 재사용하므로 안전합니다. 로컬 개발용 `.env.local`까지 만들려면 `--write-env-local`을 붙입니다.

끝나면 1~2분 뒤 https://omnisis01.github.io/jooyeok-iching/ 홈에 로그인 카드가 나타납니다. 토큰은 스크립트가 끝난 뒤 대시보드에서 삭제해도 됩니다(이미 설정은 끝났으니).

아래는 스크립트 없이 손으로 할 때의 순서입니다.

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

## 4. 결제(프리미엄), 스크립트로 자동 설정

Stripe 테스트 모드로 바로 시험할 수 있고, 실제 판매는 Stripe 계정 활성화(사업자 정보 입력) 뒤 라이브 키로 같은 스크립트를 다시 돌리면 됩니다.

직접 할 일은 두 가지입니다.

1. https://dashboard.stripe.com 에 가입합니다(무료). 오른쪽 위 "테스트 모드"를 켭니다.
2. 개발자 > API 키 에서 "비밀 키"(sk_test_ 로 시작)를 복사만 해 둡니다. 어디에도 적지 않습니다.

그다음 프로젝트 폴더에서 실행합니다(Supabase 액세스 토큰과 Stripe 비밀 키를 화면에 안 보이게 붙여 넣습니다).

```bash
node scripts/setup-payments.mjs
```

스크립트가 하는 일: 상품 "주역 마스터 프리미엄"과 월 4,900원 가격 생성 → 결제 결과를 받을 웹훅 등록 → 결제 함수(create-checkout, stripe-webhook) 배포와 비밀값 등록 → 프로필 테이블 확장 → 앱에 결제 기능 켜기(GitHub Secret) → 배포. 가격을 바꾸려면 `PREMIUM_PRICE_KRW=9900 node scripts/setup-payments.mjs` 처럼 실행합니다.

시험 결제: 카드번호 4242 4242 4242 4242, 만료일은 미래 날짜, CVC 아무 세 자리. 결제가 끝나면 홈으로 돌아오고 몇 초 뒤 "프리미엄 이용 중"으로 바뀝니다.

프리미엄 혜택(앱 기준): 육효 결과 전체를 기록에서 다시 열기, 기록 개수 제한 없음(무료는 최근 30개), 결과 이미지에 사이트 표시 없이 저장. 혜택 문구는 `src/lib/premium.ts`에서 고칩니다.

주의: Stripe 라이브 결제는 한국 사업자 등록과 정산 계좌가 필요합니다. 국내 간편결제(카카오페이 등)가 필요하면 토스페이먼츠로 바꾸는 작업이 별도로 필요합니다.

## 확인 방법

- 로그인 후 홈의 계정 카드에 이메일이 보이고, 다른 기기에서 같은 계정으로 로그인하면 기록이 나타나면 동기화 성공입니다.
- 알림은 Supabase 대시보드에서 daily-push 함수를 "Invoke"로 수동 실행해 바로 시험할 수 있습니다.
