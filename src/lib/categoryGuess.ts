// 질문 글에서 분야를 짐작한다. 사용자가 직접 고르지 않았을 때만 쓰고, 칩으로 언제든 바꿀 수 있다
import type { Category } from "./categories";

const RULES: [Category, RegExp][] = [
  ["lawsuit", /소송|재판|고소|분쟁|합의|변호사|법원|판결/],
  ["contract", /계약|협상|서류|도장|입찰|조건|거래처|견적/],
  ["exam", /시험|면접|합격|자격증|수능|공무원|입시|지원|서류 통과|원서/],
  ["wealth", /돈|주식|투자|코인|부동산|매수|매도|대출|빚|월급|수입|지출|재테크|펀드|적금|복권|로또/],
  ["love", /연애|사랑|결혼|연락|그 사람|썸|고백|이별|재회|소개팅|남자|여자|애인|남친|여친|배우자/],
  ["business", /사업|창업|가게|장사|매출|확장|폐업|프랜차이즈|개업|손님/],
  ["work", /회사|직장|이직|승진|프로젝트|상사|동료|퇴사|취업|업무|발표|보고/],
  ["health", /건강|병원|수술|피로|아프|몸|다이어트|운동|검사|약|치료|잠/],
  ["move", /이사|집|전세|월세|분양|청약|인테리어|매물/],
  ["travel", /여행|출장|비행기|떠나|나들이|휴가/],
  ["family", /부모|아들|딸|자녀|형제|가족|아이|어머니|아버지|시댁|처가/],
];

export function guessCategory(question: string): Category | null {
  const q = question.trim();
  if (q.length < 2) return null;
  for (const [key, re] of RULES) if (re.test(q)) return key;
  return null;
}
