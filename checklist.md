# 주역 점보기 앱 — 작업 체크리스트

## 통과 기준
- `npm run build` 통과.
- 브라우저에서 동전(척전법)·산통 두 방식으로 점을 쳐 결과 화면까지 도달.
- 64괘 갤러리에서 괘를 눌러 해설을 볼 수 있음.
- Pretendard 폰트가 실제로 적용됨(개발자 도구에서 확인).

## 정지 규칙
- 빌드/런타임 오류 재시도 3회 초과 시 중단하고 보고.

## 작업 (2026-09-28 1차 완료)
- [x] Next.js(App Router) + TS + Tailwind 스캐폴딩
- [x] 의존성 설치(motion, lucide-react, clsx)
- [x] 64괘 데이터(이름·키워드·해설·오늘의 조언) `src/data/hexagrams.ts`
- [x] 8괘(삼획괘) 데이터 + 괘 계산 유틸 `src/lib/iching.ts`
- [x] 괘 그림 컴포넌트: 효/괘(HexagramFigure), 태극(Taegeuk), 64괘 원도(HexagramWheel)
- [x] 점치기 인터랙션: 동전 3개 6회(CoinCasting), 산통 뽑기(SantongCasting)
- [x] 결과 화면: 본괘·변효·지괘 + 오늘의 조언(ResultView)
- [x] 64괘 갤러리 + 상세 다이얼로그
- [x] Pretendard 폰트, 다크 톤 테마, 반응형
- [x] `npm run build` + 브라우저 검증 (동전·산통 결과 도달, 갤러리/원도 모달, 모바일 375px 가로 스크롤 없음, Pretendard 로드 확인)

## 2026-09-28 2차: 시초점 + 방법 설명
- [x] 시초점 로직 `yarrowChange`/`yarrowLineValue` (확률 노음1:소양5:소음7:노양3 시뮬레이션으로 검증)
- [x] 시초점 화면 `YarrowCasting` (분이→괘일·설사→귀기 애니메이션, 한 변씩/이 효 자동/끝까지 자동)
- [x] 방법 설명 패널 `MethodGuide` (척전법·산통점·시초점 유래·절차·주의)
- [x] 브라우저 검증: 시초점 18변 자동 진행 → 결과 도달, 단계 타이밍 DOM 측정

## 2026-09-28 3차: 효사 + 배포
- [x] 384개 효사 데이터 `src/data/lines-*.ts` (원문 요지·풀이·조언), 64×6 검증 스크립트 통과
- [x] 결과 화면 변효 해설을 효사로 교체, 변효 개수별 읽기 규칙 표시
- [x] 괘 상세 모달에 여섯 효사 목록
- [x] GitHub Pages 배포: 저장소 omnisis01/jooyeok-iching, Actions 워크플로, https://omnisis01.github.io/jooyeok-iching/

## 2026-09-28 4차: 이미지 저장·공유
- [x] 캔버스로 1080×1350(내용 따라 늘어남) 결과 카드 생성 `src/lib/shareCard.ts`
- [x] 미리보기 모달 `ShareCardModal`: PNG 저장, Web Share(파일 공유 지원 기기), 글·링크 복사

## 2026-09-28 5차: 육효 모드 + UI 개편 + 데이터 버그 수정
- [x] 64괘 효 문자열이 삼획괘 안에서 뒤집혀 있던 버그 수정(진·간·태·손 포함 괘의 그림과 판정이 틀렸음). 이름과 삼획괘 대조 스크립트 통과
- [x] 육효 엔진 `src/lib/yukhyo.ts`: 납갑, 팔궁·세응, 육친, 육수, 일진·월건(태양황경 절기)·공망, 용신·복신, 왕쇠 점수, 응기. 알려진 괘와 날짜로 검증
- [x] 육효 화면 `YukhyoSection`, `YukhyoResult`(질문 분류, 날짜, 동전, 도표, 판단)
- [x] UI 개편: 밝은 색, 모바일 앱 틀(상단 바 + 하단 5탭), 홈 화면, 알아보기 화면. 가운뎃점·화살표·대문자 라벨 제거
- [x] 탭과 단계 전환에서 퇴장 애니메이션 제거(가려진 탭에서 멈추던 문제)

## 2026-09-28 6차: 상용 앱 수준 다듬기
- [x] 앱 이름 "주역 마스터", 부제 "세상에서 가장 정확한 점사풀이" (메타데이터, 상단 바, 홈, 공유 카드)
- [x] 홈: 오늘의 괘 한마디(날짜별 고정), 나의 점 기록(localStorage, 다시 열기, 지우기)
- [x] 점법 한 줄 설명(카드와 점치기 화면 상단), 동전 한자 크게(陽三通寶 / 陰二點數)
- [x] 홈 화면 설치: manifest.webmanifest, SVG 아이콘, PNG 아이콘(파이썬으로 직접 생성), 애플 터치 아이콘
- [x] 탭 전환 퇴장 애니메이션 제거

## 2026-09-28 7차: 백엔드 준비(Supabase)
- [x] 공개 키만 쓰는 클라이언트 `src/lib/supabase.ts`, 키 없으면 기능 숨김
- [x] 이메일 매직링크 로그인 + 기록 동기화 `cloudSync.ts`, 홈 계정 카드 `AccountCard`
- [x] 오늘의 괘 푸시: 서비스 워커 `public/sw.js`, 구독 `push.ts`, Edge Function `supabase/functions/daily-push`, 스키마 `supabase/migrations/0001_init.sql`
- [x] CI에서 공개 키를 GitHub Secrets로 주입, `.env.example`, 설정 안내 `SETUP.md`
- [x] 자동 설정 스크립트 `scripts/setup-supabase.mjs` 실행 성공(2026-09-28, 프로젝트 ref egcmanpyvztornleapui, 서울). 배포 번들에 Supabase URL 포함, 함수 401 응답(배포 확인), GitHub Secrets 4개 등록
- [ ] 실기기에서 이메일 로그인, 다른 기기 동기화, 푸시 수신 확인

## 2026-09-28 8차: 집중 안내
- [x] 점법 선택 뒤 집중 화면 `FocusGate`(호흡 애니메이션, 3초 뒤 시작 버튼), 점치기 화면 상단 집중 문구

## 2026-09-28 11차: 표현 정리
- [x] 한문투(허물, 형통, 숭상, 군자/소인, 이롭지 않음이 없다)와 번역투를 우리말로 치환(문자열 안만, 주석 제외). 육효 판단 문장을 쉬운 말로 재작성, 날짜 우리말 표기
- [x] 정적 HTML의 날짜 문구가 브라우저와 어긋나던 hydration 오류 수정(useToday)

## 2026-09-28 12차: 원전 대조, 육효 카드, 가로 화면
- [x] 효사 원문 384개를 위키문헌 원문과 자동 대조(정확 295, 요지 40, 이체자 차이 49). 실제 수정 3곳. 64괘 양·음 효 데이터도 원문 표기로 재검증 통과
- [x] 육효 결과 이미지 카드 `src/lib/yukhyoCard.ts`, 공유 모달 범용화
- [x] 넓은 화면(1024px 이상) 왼쪽 메뉴 + 넓은 본문, 홈 카드 2열, 카드 격자 복원. 폰 가로 모드 여백 축소
- [x] 홈 문구 "오늘 나만의 주역 괘 뽑기"

## 2026-09-28 13차: 결제 준비 + 묻는 시기
- [x] Stripe 결제: Edge Function create-checkout(결제 페이지), stripe-webhook(서명 검증 후 profiles.premium_until 갱신), 0002_premium.sql, 프리미엄 카드, 무료 기록 30개 제한, 육효 전체 복원(프리미엄), 이미지 사이트 표시 생략(프리미엄)
- [x] 자동 설정 `scripts/setup-payments.mjs` (상품·가격·웹훅 생성, 함수 배포, GitHub Secret). 실계정 미실행
- [x] 점치기 전에 묻는 시기 선택(오늘, 이번 주, 이번 달, 올해, 날짜 지정, 때 상관없음). 결과 제목과 조언 문구, 기록, 이미지 카드에 반영
- [ ] 사용자가 Stripe 테스트 키로 스크립트를 실행한 뒤 시험 결제 확인

## 다음에 할 만한 것
- [ ] 결제(프리미엄): 토스페이먼츠 또는 Stripe + Edge Function 검증, `profiles.premium_until` (SETUP.md 4절)
- [ ] 오늘의 괘 기록(로컬 저장) 및 히스토리
