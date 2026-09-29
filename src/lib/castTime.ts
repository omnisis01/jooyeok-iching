// 뽑은 시각을 간지 날짜와 열두 시진으로 함께 표시한다
import { BRANCHES, BRANCHES_HANJA, dayInfo } from "./yukhyo";

/** 시진: 자시(23~01시)부터 두 시간씩 열두 개 */
export function hourBranch(date: Date): { index: number; label: string } {
  const index = Math.floor(((date.getHours() + 1) % 24) / 2);
  return { index, label: `${BRANCHES[index]}시(${BRANCHES_HANJA[index]}時)` };
}

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 예) 2026년 9월 29일 오후 3시 12분, 을사일 신시 */
export function formatCastAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  const day = dayInfo(localDateString(d));
  return `${date} ${time}, ${day.label} ${hourBranch(d).label}`;
}
