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

## 다음에 할 만한 것
- [ ] 효사(爻辭) 기반 변효별 해설 추가 (지금은 효 자리별 일반 조언)
- [ ] 결과 이미지 저장/공유 카드
- [ ] 시초점(50개 산가지) 방식 추가
- [ ] 오늘의 괘 기록(로컬 저장) 및 히스토리
