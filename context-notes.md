# 주역 점보기 앱 — Context Notes (Decision Log)

## 2026-09-28 프로젝트 시작
- 요구사항: ① 64괘·음양도 등 주역 그림을 프론트에 표시 ② 산통/점괘 뽑는 장면을 인터랙티브 시각화 ③ 결과를 쉽게 해설하고 오늘의 조언 제공 ④ Pretendard 폰트.
- 스택: Next.js 16(App Router) + TypeScript + Tailwind v4. 애니메이션은 `motion`(Framer Motion 후속), 아이콘은 `lucide-react`.
  - 이유: 프로젝트 기본 규약(web-project-conventions). shadcn/ui는 이 앱에서 필요한 UI가 버튼·카드 정도라 Tailwind로 직접 작성(의존성 최소화).
- 프로젝트 이름: 폴더명(`jooyeok_Iching_bookofchanges`)에 대문자가 있어 npm 이름 규칙에 걸리므로 스크래치 폴더에서 `iching-app`으로 생성 후 복사. `package.json`의 name은 `iching-app`.
- 해설 데이터는 정적(하드코딩). LLM API를 쓰지 않는 이유: 키 관리·비용 없이 오프라인 동작, 결과 재현성. 필요하면 추후 확장.
- 점법 두 가지:
  - 척전법(동전 3개 × 6회): 앞면=3, 뒷면=2. 합 6=노음(변효), 7=소양, 8=소음, 9=노양(변효). 아래 효부터 쌓음.
  - 산통(팔괘 산통): 8개 산가지 중 1개 → 하괘, 다시 1개 → 상괘, 6개 중 1개 → 동효. 3번 뽑기로 끝나 짧고 직관적.
- 효 배열 표현: 문자열 6자리, 인덱스 0 = 초효(맨 아래), '1' = 양, '0' = 음. 그림은 위→아래로 뒤집어 그림.
- 괘 기호는 유니코드 U+4DC0 + (괘번호 − 1)로 계산(별도 이미지 불필요).
- 폰트: Pretendard CDN(jsdelivr, dynamic-subset)을 `layout.tsx` `<link>`로 로드. next/font는 로컬 파일이 필요해 CDN 선택.
- 주의: Google Drive 폴더에 node_modules가 생성됨. 동기화 부담 시 `.nosync` 혹은 로컬 폴더 이전 권고.

## 2026-09-28 1차 구현 완료 후 메모
- 브라우저 미리보기(preview_start)가 이 폴더에서 프로세스를 띄우지 못해 `npm run dev`를 직접 백그라운드로 실행해 검증함. 다음 세션도 터미널에서 `npm run dev`로 띄우는 편이 확실.
- 64괘 원도(HexagramWheel)의 좌표는 `Math.round(n*100)/100`로 고정. 서버와 브라우저의 cos/sin 결과가 미세하게 달라 hydration 경고가 났던 것을 해결.
- React 19 lint 규칙(`react-hooks/set-state-in-effect`) 때문에 CoinCasting의 자동 던지기 종료 처리는 effect가 아니라 setTosses 콜백 안에서 한다.
- 원도의 64괘 배열 순서는 선천(복희) 순서(효를 이진수로 읽어 정렬). 갤러리는 문왕 순서(1~64).
- 변효 해설은 효 자리(초~상)별 일반 조언 6개(`LINE_POSITION_ADVICE`). 384개 효사를 넣는 것은 후속 과제.

## 2026-09-28 2차: 시초점 모드 + 설명 패널
- 시초점 나누기는 균등 분포가 아니라 절반 근처 정규분포(표준편차 = 개수×0.12)로 나눈다. 손으로 나누는 느낌을 내면서도 4로 나눈 나머지는 고르게 분포해 정통 확률(1:5:7:3)이 그대로 나온다. 20만 회 시뮬레이션으로 확인.
- `motion.rect`로 49개 산가지의 fill 색까지 보간하면 메인 스레드가 1.5초 이상 멈춘다(측정). 색은 일반 `fill` 속성으로 즉시 바꾸고 위치·높이만 tween으로 애니메이션한다.
- 브라우저 패널이 가려져 있으면 스크린샷이 검게 나오거나 지연되므로, 애니메이션 단계 검증은 DOM 폴링(JS)으로 했다.
- Reading.method에 "yarrow" 추가. `readingFromValues(values, question, method)` 세 번째 인자로 구분.

## 2026-09-28 3차: 효사 데이터 + GitHub Pages 배포
- 효사는 4개 파일(16괘씩)로 나눠 `src/data/lineTexts.ts`에서 합친다. 원문은 요지만 싣고(긴 효사는 핵심 구절), 풀이·조언은 쉬운 말로.
- 변효가 여러 개일 때 읽는 규칙은 주자 계몽 기준(1개: 그 효, 2개: 위 효 중심, 3개: 본괘+지괘, 4~5개: 지괘 중심, 6개: 지괘). `changingLinesRule`.
- 배포: Vercel CLI가 없고 gh CLI만 로그인되어 있어 GitHub Pages 선택. `output: "export"` 정적 내보내기, `GITHUB_PAGES=true`일 때만 basePath `/jooyeok-iching` 적용(로컬 개발은 basePath 없음).
- 저장소 https://github.com/omnisis01/jooyeok-iching (public). main에 push하면 `.github/workflows/deploy.yml`이 자동 배포.
- Pages 설정은 `gh api -X POST repos/omnisis01/jooyeok-iching/pages -f build_type=workflow`로 켰다.

## 2026-09-28 4차: 결과 이미지 카드
- 외부 라이브러리 없이 Canvas 2D로 그린다. Pretendard는 `document.fonts.load`로 먼저 불러온 뒤 그려야 캔버스에 적용된다.
- 고정 높이로 그리면 변효·지괘 블록이 하단 문구와 겹쳐서, 넉넉한 임시 캔버스(1800)에 그린 뒤 내용 높이(최소 1350)로 잘라낸다.
- 공유는 `navigator.canShare({files})`가 true인 기기(주로 모바일)에서만 공유 버튼을 보이고, 아니면 저장·복사만 제공한다. 데스크톱 Chrome 계열은 파일 공유가 안 되는 경우가 많다.
- 효사 출처 관련: 사용자에게 통행본 기억 기반으로 작성했음을 알렸고, 원전 대조는 후속 과제로 남김. 네이버 검색은 이 브라우저에서 차단되어 참고 블로그(효산역술원)는 확인하지 못함.

## 2026-09-28 5차: 육효 모드, UI 개편, 효 순서 버그
- 중대 버그: 64괘 `lines` 문자열이 삼획괘 단위로 위→아래 순서(진 ☳ = "001")로 적혀 있었고, 그림과 척전법은 아래→위(인덱스 0 = 초효)를 가정했다. 대칭인 건·곤·감·리만 우연히 맞았다. 전부 아래→위로 변환(진 "100", 간 "001", 태 "110", 손 "011"). 검증: 64괘 이름의 삼획괘 조합과 문자열이 모두 일치.
- 육효 엔진 설계: 팔궁은 본궁괘에서 1~5효를 차례로 뒤집고(1~5세), 4효를 되돌려 유혼, 하괘를 본궁으로 되돌려 귀혼을 만든다. 세효 위치 [상,초,2,3,4,5,4,3]. 검증: 천풍구=건궁 일세, 화지진=건궁 유혼, 수뢰둔=감궁 이세 등.
- 일진: JDN 기준 천간 (jdn+9)%10, 지지 (jdn+1)%12 (2024-01-01 갑자일, 2000-01-01 무오일). 월건: Meeus 저정밀 태양황경으로 입춘(315°)부터 30°씩(2026-02-04 인월, 02-03 축월). 공망: (지지−천간) 순의 끝 두 지지.
- 왕쇠 점수: 월건(왕+2/상+1/휴−1/수−1/사−2, 월파−1.5), 일진(생부+1/극−1, 충: 암동+0.5 또는 일파−1), 타 동효 생+1/극−1.5, 자체 동효 회두생+1.5/회두극−2/진신+1/퇴신−1, 공망 −0.5 또는 진공 −2. 종합 = 용신 + 세효×0.3. 길 ≥1.5, 평 ≥−0.5, 흉.
- 용신이 없으면 본궁괘에서 같은 육친을 찾아 복신으로 쓰고 −1.5.
- UI 개편 방향: 앱스토어 상위 운세 앱(포스텔러, 점신 등)처럼 밝은 바탕(#f5f0e8), 흰 카드와 그림자, 주홍 포인트, 최대 폭 520px의 앱 틀, 하단 탭. 해시(#divine 등)로 탭 상태를 유지한다.
- 사용자 요청: 가운뎃점(·), 하이픈, 화살표, 대문자 자간 라벨처럼 AI 느낌이 나는 요소를 쓰지 않는다. 문구는 쉼표나 조사로 잇는다.
- AnimatePresence mode="wait"는 탭이 가려져 rAF가 멈추면 새 화면이 마운트되지 않는다. 탭·단계 전환에는 퇴장 애니메이션을 쓰지 않는다.

## 2026-09-28 6차: 상용 앱 수준 다듬기
- 기록은 `localStorage` 키 `jooyeok-master-history-v1`에 최대 60개. 주역점은 효와 변효로 결과를 그대로 복원하고(`readingFromRecord`), 육효는 종합 풀이만 저장한다(도표 복원에는 날짜별 재계산이 필요하지만 단순화).
- 오늘의 괘 한마디는 날짜 문자열 해시로 정한다. 서버 없이도 모든 사용자가 같은 날 같은 괘를 본다.
- PWA: 정적 사이트라 서비스 워커는 두지 않았다(오프라인 캐시 불필요). manifest의 start_url은 "./"로 두어 GitHub Pages 하위 경로와 로컬 모두 동작.
- 아이콘 PNG는 외부 도구 없이 파이썬으로 픽셀을 직접 계산해 만들었다(`zlib`+`struct`). 다시 만들려면 6차 커밋의 스크립트 참고.
- 사용자 요청: 상용 앱 수준. 서버가 필요한 기능(알림, 계정, 결제)은 이번 범위 밖으로 남김.

## 2026-09-28 7차: 백엔드 준비
- 정적 사이트(GitHub Pages)라 서버 기능은 Supabase(Auth, Postgres, Edge Functions)로 붙인다. 앱에는 anon 키와 VAPID 공개 키만 들어가고(NEXT_PUBLIC_), service_role과 VAPID 비밀 키는 Edge Function Secrets에만 둔다.
- 키가 없으면 `cloudEnabled=false`로 계정 카드가 숨겨지고 기존 동작(기기 저장)만 한다. 그래서 키 없이 빌드·배포가 계속 된다.
- 동기화 방식: readings(id text PK, user_id, payload jsonb). 로컬 기록 id를 그대로 서버 id로 써서 중복 없이 upsert(ignoreDuplicates). 로그인 시 pushLocal → pullRemote.
- 푸시: 구독은 로그인 없이도 가능(user_id null 허용). Edge Function은 Authorization이 service_role일 때만 동작하고, pg_cron + pg_net이 UTC 22:00(KST 07:00)에 호출. 410/404는 구독 삭제, 그 외 실패는 fail_count 증가(5 이상이면 제외).
- 오늘의 괘 해시는 앱(`daily.ts`)과 함수(`index.ts`)가 같은 식을 쓴다. 함수는 KST 날짜 문자열을 쓴다. 바꾸면 양쪽을 같이 바꿀 것.
- Deno 코드는 tsconfig exclude와 eslint globalIgnores에 넣어 Next 검사에서 제외했다.
- 실제 Supabase 프로젝트가 없어 로그인·동기화·푸시는 실기기 검증을 못 했다. SETUP.md 순서대로 진행 후 확인 필요.

## 2026-09-28 8차: 집중 안내
- 사용자 요청 문구: "최대한 정신을 집중해서 (동전을 던져) 주세요. 정신 집중이 강할수록 더 정확한 결과가 나옵니다." 점법마다 동사만 바꾼다(동전을 던져 / 산통을 흔들어 / 산가지를 나누어). 육효도 같은 화면을 거친다.

## 2026-09-28 9차: Supabase 자동 설정 스크립트
- 관리 API(api.supabase.com/v1)와 CLI를 섞어 쓴다. 프로젝트 생성/키 조회/SQL 실행/인증 설정은 API, 함수 배포와 secrets는 CLI(`--use-api`라 Docker 불필요).
- 비밀값은 인자에 두지 않고 stdin(gh secret set)이나 0600 임시 env 파일(supabase secrets set --env-file)로 넘긴다. 화면에는 변수명과 '설정됨'만 찍는다.
- 실제 계정 없이 작성해 문법 검사와 VAPID 생성만 확인했다. 관리 API 필드명(uri_allow_list, external_email_enabled, mailer_autoconfirm, api-keys?reveal=true)이 바뀌면 그 단계에서 오류 메시지를 보고 고칠 것.

## 2026-09-28 10차: Supabase 실제 연결
- 사용자가 스크립트를 실행해 프로젝트 `jooyeok-master`(ref egcmanpyvztornleapui, ap-northeast-2)가 생겼다. 관리 API 필드명은 모두 그대로 동작했다.
- GitHub Secrets: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, SUPABASE_DB_PASSWORD. 값은 저장소에 없고 변수명만 기록.
- 함수 `daily-push`는 인증 없이 호출하면 401. cron은 UTC 22:00.
- 남은 확인: 실제 로그인 메일 수신, 두 기기 동기화, 푸시 수신(iOS는 홈 화면 추가 후).

## 2026-09-28 11차: 표현 정리
- 치환은 문자열 리터럴 안에서만 정규식으로 했다(주석은 그대로). 사전은 커밋 이력의 스크립트 참고. 길/흉/이롭다는 운세 앱에서 흔한 우리말이라 남겼고, 허물/형통/숭상/군자/소인은 바꿨다.
- 홈의 날짜·인사말·오늘의 괘는 `useToday`로 마운트 뒤에만 채운다. 정적 export는 빌드 시각을 굽기 때문에 React #418이 났다.

## 2026-09-28 12차: 효사 원전 대조
- 위키문헌(zh.wikisource.org, 周易/괘이름 raw)에서 64괘 본문을 받아 초구~상육 효사를 뽑고, 384개 `hanja`(원문 요지)와 자동 비교했다. 스크립트와 결과는 스크래치 `canon.json`, `audit.json`.
- 결과: 정확히 포함 295, 요지만 줄여 순서는 일치 40, 나머지 49는 이체자 차이(卽/即, 爲/為, 恒/恆, 尙/尚, 旣/既, 顚/顛, 闚/窺, 于/於, 无/無, 氷/冰 등). 우리나라 통용 자형을 유지했다.
- 실제 수정 3곳: 풍산점 상구 逵→陸(통행본은 陸, 逵는 정이천의 교감), 수풍정 구오 洌→冽, 수지비 초육 他→它.
- 원문 표기(초구/초육)로 64괘 효 데이터도 재검증: 384효 모두 일치.
- 풀이(우리말 해설)의 타당성은 자동 대조 대상이 아니다. 원문이 맞으므로 뜻의 큰 방향은 보장되지만, 세부 해석 검토는 사람이 해야 한다.

## 2026-09-28 13차: 결제 준비, 묻는 시기
- 결제는 Stripe Checkout(구독, KRW 월 4,900). 클라이언트는 로그인 토큰으로 create-checkout 함수를 부르고 받은 주소로 이동한다. 웹훅은 서명 검증(SubtleCrypto) 뒤 서비스 키로 profiles를 갱신한다. 앱은 profiles.premium_until만 읽는다.
- 결제 화면은 NEXT_PUBLIC_PAYMENTS_ENABLED=true일 때만 나타난다. 무료 기록 제한(30개)도 이 플래그가 켜져야 적용된다(기존 사용자 경험 유지).
- 국내 간편결제가 필요하면 토스페이먼츠로 교체해야 한다. 함수 두 개와 premium.ts의 startCheckout만 바꾸면 된다.
- 묻는 시기: Reading.period(today/week/month/year/date/open). 64괘 조언이 모두 "오늘은"으로 시작해 `adaptAdvice`가 "이번 주는"처럼 바꾼다(받침에 따라 은/는). 육효는 시기 선택 없음(응기로 시점을 답한다).
- 사용자 질문 "오늘 것만 볼 수 있나": 주역점은 시기 제한이 없고 육효의 날짜는 점치는 날이다. 문구가 오늘 위주였던 것을 시기 선택으로 해결.

## 2026-09-28 14차: 하루 무료 횟수와 공유 쿠폰
- 횟수는 localStorage(`jooyeok-master-quota-v1`, 날짜별)에만 있다. 서버 검증이 없어 우회는 가능하지만 일반 사용에는 충분. 서버 검증이 필요해지면 readings 테이블의 당일 건수로 대체할 수 있다.
- 차감 시점은 결과가 나올 때(onComplete). 중간에 나가면 차감하지 않는다.
- 공유 쿠폰은 navigator.share 성공 또는 클립보드 복사 성공 시 지급, 하루 3회. 친구가 실제로 받았는지는 확인할 수 없다.
- 프리미엄 여부는 fetchPremiumUntil이 `jooyeok-master-premium-until`에 기억해 두어 점치기 흐름에서 동기적으로 쓴다.

## 2026-09-28 15차: QA 준비
- 사용자 결정: 결제는 무료 버전 QA 뒤에 붙인다. NEXT_PUBLIC_PAYMENTS_ENABLED는 미설정(꺼짐) 상태 유지.
- ResultView/YukhyoResult는 마운트 시 기록을 저장하므로, 기록에서 다시 열 때는 saveToHistory={false}를 넘겨야 한다.
- QA 항목은 QA.md. 발견 사항은 화면, 기기, 한 일, 기대, 실제, 오류 문구 형식으로 받는다.

## 2026-09-28 16차: 1차 자동 QA
- 브라우저 자동화 도구는 45초 안에 끝나야 하고, 탭이 가려지면(document.hidden) 타이머가 느려져 시초점 자동 진행 같은 긴 흐름은 여러 번에 나눠 폴링해야 한다. 스크립트가 시간 초과로 끊겨도 페이지 안의 비동기 코드는 계속 실행된다.
- 실제 사용자 제스처가 필요한 동작(클립보드, 공유)은 JS click()이 아니라 computer 도구의 실제 클릭으로 검증한다.
- 결과: QA.md 자동 확인 가능 항목 전부 통과. 결제는 꺼진 상태 유지.

## 2026-09-28 17차: 결제와 배포 채널 계획
- 스토어 앱 안의 디지털 구독은 애플·구글 결제가 필수라 채널별 결제를 붙이고, 프리미엄 판단은 Supabase profiles.premium_until 한 곳으로 모은다(웹훅 통합). 애플·구글은 RevenueCat으로 묶는 것을 권장.
- 한국 사용자 기준 웹 결제는 Stripe 대신 토스페이먼츠를 권장. 앱인토스는 웹앱을 거의 그대로 올릴 수 있어 두 번째 순서로.
- 사용자 준비물: 사업자등록, 통신판매업 신고, 각 개발자 계정. 개인정보처리방침은 초안 작성 가능.

## 2026-09-29 18차: 세 줄 결론 요약
- 애플 코리아 홈페이지 카피를 읽고 규칙을 뽑았다: 결론이 먼저, 5~10어절 초단문, 마침표로 끊는 리듬, 명사형 종결과 해요체 혼용, 대구법, 과장 대신 은유 한 스푼. 요약 3줄 = 판정 / 현대인 상황으로 이유 / 오늘 할 일 하나. mood(go/wait/care)로 카드 색을 정한다.
- 셋째 줄은 대부분 "오늘은"으로 시작해 `adaptAdvice`가 묻는 시기에 맞춰 바꾼다.

## 2026-09-29 19차
- 다크 테마는 `:root[data-theme="dark"]`에서 토큰만 바꾼다. 컴포넌트가 토큰 클래스만 쓰므로 대부분 그대로 따라온다. 캔버스 이미지 카드는 항상 밝은 색으로 그린다.
- 사용자 언급: 예전 검정 배경도 괜찮았다. 기본은 흰색 유지, 토글 제공.

## 2026-09-29 20차: 토스페이먼츠 정기결제
- 흐름: 클라이언트 requestBillingAuth(카드 등록 창) → successUrl(?billing=success&authKey&customerKey)로 복귀 → toss-billing-confirm이 사용자 토큰을 확인하고 /v1/billing/authorizations/issue로 빌링키 발급 → 바로 /v1/billing/{billingKey}로 첫 달 결제 → profiles.premium_until +1개월, billing_status=active, payments 기록.
- 갱신: 매일 21:00 UTC cron이 toss-billing-renew를 서비스 키로 호출, premium_until이 24시간 안이면 결제해 한 달 연장. 실패하면 billing_status=failed(카드 재등록 유도). 해지는 빌링키 삭제와 cancelled 표시, 남은 기간 유지.
- customerKey는 사용자 uuid. 함수가 토큰의 user.id와 같은지 검사한다.
- 토스 SDK v2는 동적 import로 결제 시작 시에만 불러온다(번들 크기).
- 결제 코드는 실제 토스 계정이 없어 실행 검증을 못 했다. 카드 응답 필드명(card.number, issuerCode)이 다르면 카드 라벨만 비게 되고 결제는 영향 없다.
- 약관/개인정보처리방침은 정적 페이지(/terms/, /privacy/)로 만들었고 앱 셸 밖에 있다(상대 링크 terms/ privacy/).

## 2026-09-29 21차: 로그인 메일
- /auth/v1/settings(anon 키)로 external.email=true, mailer_autoconfirm=true, disable_signup=false 확인. Supabase 기본 SMTP는 조직 구성원 주소로만 발송하고 시간당 한도가 매우 낮다. 실사용자 로그인에는 커스텀 SMTP 필수. 관리 API PATCH config/auth의 smtp_* 필드로 설정한다(`setup-smtp.mjs`).

## 2026-09-29 22차
- 운세 분류는 `src/lib/categories.ts` 하나가 진실이다. 육효의 CATEGORIES는 여기서 재수출하고 용신은 CATEGORY_TARGET(총운·건강=세효, 재물=처재, 합격=관귀, 계약=부모, 애정=성별)로 정한다.
- 괘사·효사 두 겹 읽기 설명은 "지도와 현재 위치" 비유 한 줄 + ①②③ 번호로만 한다. 길게 쓰지 않는다.
- 원도 뽑기: CSS 회전 그룹의 현재 각도를 getComputedStyle transform 행렬로 읽어 표식 목표각에 더한다. 뽑는 동안 회전을 일시정지(animationPlayState)하고 2.5초 뒤 재개. 배경 탭에서는 rAF가 멈추므로 setTimeout 예비 완료를 둔다.
- head 안 인라인 script(dangerouslySetInnerHTML)는 dev에서 hydration 불일치를 냈다. next/script beforeInteractive로 교체.
- 글자 크기는 html font-size로 올렸다(17/18px). rem 기반 Tailwind 크기가 함께 커진다. px 고정 폭(max-w-[520px])은 그대로.

## 2026-09-29 23차
- 뽑은 시각은 결과가 만들어질 때 ISO로 저장한다(readingFromValues/readingFromSantong). 기록에서 다시 열면 record.at을 castAt으로 넘긴다. 시진은 (시+1)%24 를 2로 나눈 몫(자시 23~01시).
- 사용자 질문(시각의 중요성): 주역 효사 읽기는 시각을 계산에 쓰지 않고, 육효는 날짜(일진·월건)를 쓴다. 시진은 매화역수의 시간기괘법과 일부 육효 응기에서 쓴다. 지금은 기록만 하고 계산에는 넣지 않았다.

## 2026-09-30 24차
- 휴대폰의 a[download]는 파일 앱(다운로드 폴더)으로 간다. 사진첩 저장은 Web Share 시트의 '이미지 저장' 또는 이미지 길게 누르기뿐이라 모달의 기본 버튼을 공유 시트로 바꿨다(canShare files일 때). 데스크톱은 내려받기 유지.
- PNG 아이콘은 4배 슈퍼샘플링 평균으로 안티에일리어싱했다. 색은 검정(#1f1d1a)/흰색/회색 배경(#ececee).

## 2026-09-30 25차
- 결과 화면은 "이름 먼저, 설명은 나중" 원칙. 본괘·변효·지괘의 실제 이름을 한 줄 흐름으로 맨 위에 두고, 괘/효/지괘 개념 설명은 버튼 바로 위로 내렸다.
- 변효 표시는 텍스트 화살표 대신 lucide ChevronLeft 아이콘을 좌우로 흔드는 방식. 지괘 상태에서는 흔들림을 멈추고 "뒤집힘"으로 바꾼다.
- 대화형 괘 그림에서 효 이름은 지금 보이는 괘(current.lines) 기준으로 계산해야 한다. 본괘 기준으로 두면 뒤집힌 뒤 구오/육오가 어긋난다.
- 산통 산가지는 통 안쪽에서 끝나야 한다. 흔들 때 y가 +4까지 내려가고 통 모서리가 둥글어(rx 14) 통 바닥까지 그리면 삐져나온다.

## 2026-09-30 26차
- 용어 원칙 추가: "지도" 대신 "큰 판세". 노양/노음/소양/소음, "늙은 양/음"은 쓰지 않고 "곧 반대로 바뀌는 양(9)", "그대로인 음(8)"처럼 숫자와 함께 풀어 쓴다. 전통 이름은 코드 주석에만 남긴다.
- 안내 팝업의 단계 전환도 퇴장 애니메이션 없이 바꾼다(가려진 탭에서 AnimatePresence 퇴장이 멈춰 두 단계가 겹쳐 보였다). 다른 화면에서 여는 통로는 window 이벤트 `open-guahyo-guide`.
- 뽑는 시점: 정통 효사 읽기는 시각을 계산에 넣지 않는다. 대신 "한 질문에 한 번만"(몽괘 初筮告 再三瀆 瀆則不告)이 핵심 태도라 앱 곳곳에 넣었다. 푸시 알림의 근거는 "날이 바뀌어 일진이 달라졌다"(육효), "마음이 모이는 시간"(몽괘) 두 가지로 쓰고, "지금이 가장 정확한 시각" 같은 단정은 쓰지 않는다.

## 2026-09-30 27차
- 푸시 문구 원칙(스픽 앱 참고): 제목은 이유 하나를 앞세운 한 문장, 본문은 두 문장 이내, 끝은 "하나만 물어보세요"류의 가벼운 권유. 같은 이유의 문구를 여러 개 두고 씨앗(날짜/주/달 번호)으로 돌려 표현만 바꾼다. "지금이 가장 정확한 시각" 같은 단정은 쓰지 않는다.
- 양력·음력: 절기, 일진, 월건은 모두 태양 위치 기준이라 양력 계산이 맞다. 음력이 필요한 것은 설날·추석뿐이고 표로 처리한다. 사용자 설정은 두지 않는다.
- Deno Edge Function의 문구 로직은 외부 의존 없이 써서 tsx로도 시험할 수 있게 했다(scratchpad에 복사해서 실행).
- setup-supabase.mjs는 pushCronSql을 export 하므로 import 될 때 main이 돌지 않게 argv 가드를 넣었다.
- Supabase 새 프로젝트는 예전 service_role JWT가 Edge Function 안의 SUPABASE_SERVICE_ROLE_KEY와 일치하지 않을 수 있다(새 형식 sb_secret_ 키로 넘어가는 중). 함수는 SUPABASE_SERVICE_ROLE_KEY와 SUPABASE_SECRET_KEYS 둘 다 허용하고, cron이 쓰는 vault 값은 sb_secret_ 키로 둔다. 설정 스크립트는 secret 형식을 우선 고른다.
- 설정 스크립트 토큰은 macOS 키체인 항목 jooyeok-supabase-token 에서 읽는다(scripts/token.mjs). 이제 Bash에서 프롬프트 없이 실행할 수 있다.

## 2026-09-30 28차
- 정적 내보내기에서 하위 경로 페이지는 링크를 상대 경로("../../")로 쓴다. basePath가 붙는 배포와 로컬 둘 다 맞는다. 메타데이터의 아이콘·매니페스트는 상대 경로면 하위 페이지에서 깨지므로 GITHUB_PAGES 값으로 절대 경로를 만든다.
- 동적 라우트의 PageProps 타입은 빌드가 생성하므로 tsc는 build 뒤에 돌려야 통과한다.
