// 점 결과를 브라우저에 저장하고 불러오는 기록 기능 (localStorage)
import type { Reading } from "@/lib/iching";
import type { Period } from "@/lib/period";
import { findHexagramByLines } from "@/data/hexagrams";

const KEY = "jooyeok-master-history-v1";
const MAX = 60;

export type IchingRecord = {
  id: string;
  type: "iching";
  at: string;
  method: Reading["method"];
  lines: string;
  changing: number[];
  question?: string;
  period?: Period;
  periodDate?: string;
};

export type YukhyoRecord = {
  id: string;
  type: "yukhyo";
  at: string;
  date: string;
  category: string;
  categoryLabel: string;
  gender?: "male" | "female";
  lines: string;
  changing: number[];
  hexName: string;
  question?: string;
  level: "길" | "평" | "흉";
  title: string;
  text: string;
};

export type HistoryRecord = IchingRecord | YukhyoRecord;

function read(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryRecord[]) : [];
  } catch {
    return [];
  }
}

function write(list: HistoryRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // 저장 공간이 없거나 사생활 보호 모드면 조용히 넘어간다
  }
}

export function loadHistory(): HistoryRecord[] {
  return read();
}

export function saveRecord(record: HistoryRecord) {
  const list = read().filter((r) => r.id !== record.id);
  write([record, ...list]);
  window.dispatchEvent(new Event("history-changed"));
}

/** 이벤트를 내지 않고 저장한다. 여러 건을 받아올 때 마지막에 한 번만 알리기 위해 */
export function saveRecordSilently(record: HistoryRecord) {
  const list = read().filter((r) => r.id !== record.id);
  write([record, ...list].sort((a, b) => (a.at < b.at ? 1 : -1)));
}

export function removeRecord(id: string) {
  write(read().filter((r) => r.id !== id));
  window.dispatchEvent(new Event("history-changed"));
}

export function clearHistory() {
  write([]);
  window.dispatchEvent(new Event("history-changed"));
}

/** 같은 결과가 두 번 저장되지 않도록 내용으로 id를 만든다 */
export function makeId(parts: (string | number | undefined)[]): string {
  return parts.filter((p) => p !== undefined).join("|");
}

/** 기록에서 주역점 결과를 다시 만든다 */
export function readingFromRecord(r: IchingRecord): Reading {
  const primary = findHexagramByLines(r.lines);
  const changedLines = r.changing.reduce((acc, i) => acc.slice(0, i) + (acc[i] === "1" ? "0" : "1") + acc.slice(i + 1), r.lines);
  const resulting = r.changing.length ? findHexagramByLines(changedLines) : null;
  return { method: r.method, primary, changingLines: r.changing, resulting, question: r.question, period: r.period, periodDate: r.periodDate };
}

export function formatAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) + " " + d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}
