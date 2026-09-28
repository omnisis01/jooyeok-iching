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

## 다음에 할 만한 것
- [ ] 효사 문구 원전 대조 검토
- [ ] 오늘의 괘 기록(로컬 저장) 및 히스토리
