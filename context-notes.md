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
