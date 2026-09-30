// 8괘(삼획괘) 정의와 점괘 계산 로직(척전법·산통)

import { findHexagramByLines, type Hexagram } from "@/data/hexagrams";
import type { Period } from "./period";
import type { Category } from "./categories";

export type Trigram = {
  /** 산통 산가지 번호(선천 팔괘 순서 1~8) */
  number: number;
  name: string;
  hanja: string;
  symbol: string;
  /** 자연 상징 (천·택·화·뢰·풍·수·산·지) */
  nature: string;
  natureHanja: string;
  /** 3효, 인덱스 0이 맨 아래 */
  lines: string;
  meaning: string;
};

export const TRIGRAMS: Trigram[] = [
  { number: 1, name: "건", hanja: "乾", symbol: "☰", nature: "하늘", natureHanja: "天", lines: "111", meaning: "강건함, 창조, 아버지" },
  { number: 2, name: "태", hanja: "兌", symbol: "☱", nature: "못", natureHanja: "澤", lines: "110", meaning: "기쁨, 말, 막내딸" },
  { number: 3, name: "리", hanja: "離", symbol: "☲", nature: "불", natureHanja: "火", lines: "101", meaning: "밝음, 붙음, 둘째딸" },
  { number: 4, name: "진", hanja: "震", symbol: "☳", nature: "우레", natureHanja: "雷", lines: "100", meaning: "움직임, 놀람, 큰아들" },
  { number: 5, name: "손", hanja: "巽", symbol: "☴", nature: "바람", natureHanja: "風", lines: "011", meaning: "스며듦, 공손, 큰딸" },
  { number: 6, name: "감", hanja: "坎", symbol: "☵", nature: "물", natureHanja: "水", lines: "010", meaning: "험난함, 깊음, 둘째아들" },
  { number: 7, name: "간", hanja: "艮", symbol: "☶", nature: "산", natureHanja: "山", lines: "001", meaning: "멈춤, 고요, 막내아들" },
  { number: 8, name: "곤", hanja: "坤", symbol: "☷", nature: "땅", natureHanja: "地", lines: "000", meaning: "순함, 포용, 어머니" },
];

export function trigramByNumber(n: number): Trigram {
  const t = TRIGRAMS.find((x) => x.number === n);
  if (!t) throw new Error(`Invalid trigram number: ${n}`);
  return t;
}

export function trigramByLines(lines: string): Trigram {
  const t = TRIGRAMS.find((x) => x.lines === lines);
  if (!t) throw new Error(`Invalid trigram lines: ${lines}`);
  return t;
}

/** 괘의 하괘(0~2효)와 상괘(3~5효) */
export function trigramsOf(hex: Hexagram): { lower: Trigram; upper: Trigram } {
  return {
    lower: trigramByLines(hex.lines.slice(0, 3)),
    upper: trigramByLines(hex.lines.slice(3, 6)),
  };
}

/** 척전법 효값: 6 바뀌는 음, 7 그대로인 양, 8 그대로인 음, 9 바뀌는 양 (전통 이름은 노음, 소양, 소음, 노양) */
export type LineValue = 6 | 7 | 8 | 9;

export const LINE_VALUE_LABEL: Record<LineValue, string> = {
  6: "곧 양으로 바뀌는 음(변효)",
  7: "그대로인 양",
  8: "그대로인 음",
  9: "곧 음으로 바뀌는 양(변효)",
};

export type CoinToss = {
  /** true = 앞면(3점), false = 뒷면(2점) */
  coins: [boolean, boolean, boolean];
  value: LineValue;
};

export function tossCoins(rand: () => number = Math.random): CoinToss {
  const coins: [boolean, boolean, boolean] = [rand() < 0.5, rand() < 0.5, rand() < 0.5];
  const sum = coins.reduce((acc, c) => acc + (c ? 3 : 2), 0);
  return { coins, value: sum as LineValue };
}

export function isYang(v: LineValue): boolean {
  return v === 7 || v === 9;
}

export function isChanging(v: LineValue): boolean {
  return v === 6 || v === 9;
}

export type Reading = {
  method: "coin" | "santong" | "yarrow";
  primary: Hexagram;
  /** 변효 인덱스(0 = 초효) */
  changingLines: number[];
  /** 변효가 있을 때의 지괘. 없으면 null */
  resulting: Hexagram | null;
  question?: string;
  /** 묻는 시기 (기본 오늘) */
  period?: Period;
  /** period가 date일 때의 날짜 */
  periodDate?: string;
  /** 운세 분류 (기본 총운) */
  category?: Category;
  /** 뽑은 시각 (ISO) */
  castAt?: string;
};

function flipLines(lines: string, changing: number[]): string {
  return lines
    .split("")
    .map((c, i) => (changing.includes(i) ? (c === "1" ? "0" : "1") : c))
    .join("");
}

export function readingFromValues(values: LineValue[], question?: string, method: "coin" | "yarrow" = "coin"): Reading {
  if (values.length !== 6) throw new Error("6개의 효값이 필요합니다");
  const lines = values.map((v) => (isYang(v) ? "1" : "0")).join("");
  const changing = values.flatMap((v, i) => (isChanging(v) ? [i] : []));
  const primary = findHexagramByLines(lines);
  const resulting = changing.length ? findHexagramByLines(flipLines(lines, changing)) : null;
  return { method, primary, changingLines: changing, resulting, question, castAt: new Date().toISOString() };
}

/** 시초점 한 번의 '변(變)': 49개(또는 남은 수)를 둘로 나누고 4개씩 세어 남는 것을 덜어낸다 */
export type YarrowChange = {
  /** 나누기 전 개수 */
  before: number;
  left: number;
  right: number;
  /** 오른쪽에서 손가락 사이에 끼운 1개 */
  hand: 1;
  /** 왼쪽 무더기를 4씩 센 나머지(0이면 4) */
  leftRemainder: number;
  rightRemainder: number;
  /** 이번 변에서 덜어낸 개수 (첫 변 5·9, 이후 4·8) */
  taken: number;
  /** 남은 개수 */
  after: number;
};

export function yarrowChange(before: number, rand: () => number = Math.random): YarrowChange {
  // 실제로 손으로 나누듯 절반 근처에서 흔들리게 한다 (정규분포 근사). 4로 나눈 나머지는 여전히 고르게 분포한다.
  const gauss = Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const left = Math.min(before - 1, Math.max(1, Math.round(before / 2 + gauss * before * 0.12)));
  const right = before - left;
  const rem = (n: number) => (n % 4 === 0 ? 4 : n % 4);
  const leftRemainder = rem(left);
  const rightRemainder = rem(right - 1);
  const taken = 1 + leftRemainder + rightRemainder;
  return { before, left, right, hand: 1, leftRemainder, rightRemainder, taken, after: before - taken };
}

/** 세 번의 변이 끝난 뒤 남은 개수(24·28·32·36)를 4로 나누면 효값(6~9) */
export function yarrowLineValue(remaining: number): LineValue {
  const v = remaining / 4;
  if (v !== 6 && v !== 7 && v !== 8 && v !== 9) throw new Error(`Invalid yarrow remainder: ${remaining}`);
  return v;
}

/** 산통: 하괘 번호, 상괘 번호(각 1~8), 동효(1~6) */
export function readingFromSantong(lower: number, upper: number, moving: number, question?: string): Reading {
  const lines = trigramByNumber(lower).lines + trigramByNumber(upper).lines;
  const changing = [moving - 1];
  const primary = findHexagramByLines(lines);
  const resulting = findHexagramByLines(flipLines(lines, changing));
  return { method: "santong", primary, changingLines: changing, resulting, question, castAt: new Date().toISOString() };
}

export const LINE_NAMES = ["초효", "이효", "삼효", "사효", "오효", "상효"];
