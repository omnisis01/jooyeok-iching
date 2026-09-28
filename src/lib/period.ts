// 점으로 묻는 시기(오늘, 이번 주, 이번 달, 올해, 특정 날, 정해진 때 없음)와 문구 맞춤
export type Period = "today" | "week" | "month" | "year" | "date" | "open";

export const PERIODS: { key: Period; label: string; desc: string }[] = [
  { key: "today", label: "오늘", desc: "오늘 하루" },
  { key: "week", label: "이번 주", desc: "앞으로 일주일" },
  { key: "month", label: "이번 달", desc: "이번 한 달" },
  { key: "year", label: "올해", desc: "올 한 해" },
  { key: "date", label: "날짜 지정", desc: "특정한 날의 일" },
  { key: "open", label: "때는 상관없음", desc: "언제가 됐든 그 일 자체" },
];

/** 한글 받침 유무에 따라 은/는을 고른다 */
function topic(word: string): string {
  const ch = word[word.length - 1];
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return word + "은";
  return word + ((code - 0xac00) % 28 === 0 ? "는" : "은");
}

export function periodLabel(period: Period | undefined, dateStr?: string): string {
  switch (period) {
    case "week":
      return "이번 주";
    case "month":
      return "이번 달";
    case "year":
      return "올해";
    case "date": {
      if (!dateStr) return "그날";
      const [, m, d] = dateStr.split("-").map(Number);
      return `${m}월 ${d}일`;
    }
    case "open":
      return "앞으로";
    default:
      return "오늘";
  }
}

/** "오늘은 ..." 으로 시작하는 조언을 묻는 시기에 맞게 바꾼다 */
export function adaptAdvice(text: string, period: Period | undefined, dateStr?: string): string {
  if (!period || period === "today") return text;
  const label = periodLabel(period, dateStr);
  return text.replace(/오늘은/g, topic(label)).replace(/오늘/g, label);
}

export function adviceHeading(period: Period | undefined, dateStr?: string): string {
  if (!period || period === "today") return "오늘 이렇게 살아보세요";
  if (period === "open") return "이렇게 해 보세요";
  return `${periodLabel(period, dateStr)} 이렇게 보내 보세요`;
}
