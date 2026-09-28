// 육효점(납갑서법) 엔진: 납갑·팔궁·세응·육친·육수·일진·월건·공망·용신·왕쇠·응기 계산
import { HEXAGRAMS, findHexagramByLines, type Hexagram } from "@/data/hexagrams";

/* ---------- 기본 표 ---------- */

export const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const STEMS_HANJA = "甲乙丙丁戊己庚辛壬癸";
export const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export const BRANCHES_HANJA = "子丑寅卯辰巳午未申酉戌亥";

export type Element = "목" | "화" | "토" | "금" | "수";
export const ELEMENT_HANJA: Record<Element, string> = { 목: "木", 화: "火", 토: "土", 금: "金", 수: "水" };

const BRANCH_ELEMENT: Element[] = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];

/** a가 b를 낳는가 (목→화→토→금→수→목) */
export function generates(a: Element, b: Element): boolean {
  const cycle: Element[] = ["목", "화", "토", "금", "수"];
  return cycle[(cycle.indexOf(a) + 1) % 5] === b;
}
/** a가 b를 이기는가 (목克토, 토克수, 수克화, 화克금, 금克목) */
export function overcomes(a: Element, b: Element): boolean {
  const cycle: Element[] = ["목", "토", "수", "화", "금"];
  return cycle[(cycle.indexOf(a) + 1) % 5] === b;
}

/** 육합·육충 */
export function isHarmony(a: number, b: number): boolean {
  return (a + b) % 12 === 1; // 子丑(0+1) 寅亥(2+11) 卯戌(3+10) 辰酉(4+9) 巳申(5+8) 午未(6+7)
}
export function isClash(a: number, b: number): boolean {
  return Math.abs(a - b) === 6;
}

export function branchLabel(b: number): string {
  return `${BRANCHES[b]}(${BRANCHES_HANJA[b]})`;
}

/* ---------- 납갑: 8괘별 안팎 천간과 세 효의 지지 ---------- */

type Najia = { stemInner: number; stemOuter: number; inner: [number, number, number]; outer: [number, number, number] };

const NAJIA: Record<string, Najia> = {
  "111": { stemInner: 0, stemOuter: 8, inner: [0, 2, 4], outer: [6, 8, 10] }, // 乾 甲/壬 子寅辰 午申戌
  "000": { stemInner: 1, stemOuter: 9, inner: [7, 5, 3], outer: [1, 11, 9] }, // 坤 乙/癸 未巳卯 丑亥酉
  "100": { stemInner: 6, stemOuter: 6, inner: [0, 2, 4], outer: [6, 8, 10] }, // 震 庚 子寅辰 午申戌
  "011": { stemInner: 7, stemOuter: 7, inner: [1, 11, 9], outer: [7, 5, 3] }, // 巽 辛 丑亥酉 未巳卯
  "010": { stemInner: 4, stemOuter: 4, inner: [2, 4, 6], outer: [8, 10, 0] }, // 坎 戊 寅辰午 申戌子
  "101": { stemInner: 5, stemOuter: 5, inner: [3, 1, 11], outer: [9, 7, 5] }, // 離 己 卯丑亥 酉未巳
  "001": { stemInner: 2, stemOuter: 2, inner: [4, 6, 8], outer: [10, 0, 2] }, // 艮 丙 辰午申 戌子寅
  "110": { stemInner: 3, stemOuter: 3, inner: [5, 3, 1], outer: [11, 9, 7] }, // 兌 丁 巳卯丑 亥酉未
};

/** 괘의 여섯 효에 간지를 배당 (인덱스 0 = 초효) */
export function assignNajia(lines: string): { stem: number; branch: number }[] {
  const lower = NAJIA[lines.slice(0, 3)];
  const upper = NAJIA[lines.slice(3, 6)];
  return [
    ...lower.inner.map((b) => ({ stem: lower.stemInner, branch: b })),
    ...upper.outer.map((b) => ({ stem: upper.stemOuter, branch: b })),
  ];
}

/* ---------- 팔궁과 세응 ---------- */

export type PalaceInfo = {
  /** 본궁 8괘 효 문자열 */
  palace: string;
  palaceName: string;
  element: Element;
  /** 0 본궁(八純) 1~5 一~五世 6 遊魂 7 歸魂 */
  generation: number;
  generationName: string;
  world: number;
  response: number;
};

const PALACE_ELEMENT: Record<string, Element> = { "111": "금", "110": "금", "101": "화", "100": "목", "011": "목", "010": "수", "001": "토", "000": "토" };
const PALACE_NAME: Record<string, string> = { "111": "건궁(乾宮)", "110": "태궁(兌宮)", "101": "이궁(離宮)", "100": "진궁(震宮)", "011": "손궁(巽宮)", "010": "감궁(坎宮)", "001": "간궁(艮宮)", "000": "곤궁(坤宮)" };
const GENERATION_NAME = ["팔순괘(本宮)", "일세괘", "이세괘", "삼세괘", "사세괘", "오세괘", "유혼괘(遊魂)", "귀혼괘(歸魂)"];
const WORLD_BY_GENERATION = [5, 0, 1, 2, 3, 4, 3, 2];

function flip(lines: string, i: number): string {
  return lines.slice(0, i) + (lines[i] === "1" ? "0" : "1") + lines.slice(i + 1);
}

const PALACE_MAP: Record<string, PalaceInfo> = (() => {
  const map: Record<string, PalaceInfo> = {};
  for (const tri of Object.keys(NAJIA)) {
    const pure = tri + tri;
    const seq = [pure];
    let h = pure;
    for (let i = 0; i < 5; i++) {
      h = flip(h, i);
      seq.push(h);
    }
    h = flip(h, 3); // 遊魂: 4효를 되돌림
    seq.push(h);
    h = tri + h.slice(3); // 歸魂: 하괘를 본궁으로 되돌림
    seq.push(h);
    seq.forEach((lines, g) => {
      const world = WORLD_BY_GENERATION[g];
      map[lines] = {
        palace: tri,
        palaceName: PALACE_NAME[tri],
        element: PALACE_ELEMENT[tri],
        generation: g,
        generationName: GENERATION_NAME[g],
        world,
        response: (world + 3) % 6,
      };
    });
  }
  return map;
})();

export function palaceOf(lines: string): PalaceInfo {
  const p = PALACE_MAP[lines];
  if (!p) throw new Error(`No palace for ${lines}`);
  return p;
}

/* ---------- 육친 ---------- */

export type Relation = "형제" | "자손" | "부모" | "처재" | "관귀";
export const RELATION_HANJA: Record<Relation, string> = { 형제: "兄弟", 자손: "子孫", 부모: "父母", 처재: "妻財", 관귀: "官鬼" };

export function relationOf(palaceEl: Element, lineEl: Element): Relation {
  if (palaceEl === lineEl) return "형제";
  if (generates(palaceEl, lineEl)) return "자손";
  if (generates(lineEl, palaceEl)) return "부모";
  if (overcomes(palaceEl, lineEl)) return "처재";
  return "관귀";
}

/* ---------- 육수 ---------- */

export const BEASTS = ["청룡", "주작", "구진", "등사", "백호", "현무"] as const;
export const BEAST_HANJA = ["靑龍", "朱雀", "勾陳", "螣蛇", "白虎", "玄武"];
export const BEAST_MEANING = ["기쁨과 경사, 귀인", "말과 소식, 구설", "지체와 얽매임", "놀람과 변덕", "질병과 다툼", "도난과 은밀함"];

function beastStart(dayStem: number): number {
  return [0, 0, 1, 1, 2, 3, 4, 4, 5, 5][dayStem];
}

/* ---------- 날짜: 일진·월건·공망 ---------- */

export type DayInfo = {
  date: string;
  dayStem: number;
  dayBranch: number;
  monthBranch: number;
  /** 공망 지지 두 개 */
  voids: [number, number];
  label: string;
};

function julianDay(y: number, m: number, d: number, hourUtc = 3): number {
  // hourUtc 3 = 한국 시간 정오
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  return jdn + (hourUtc - 12) / 24;
}

/** 태양 황경(도). 절기 판정용 저정밀 근사 (Meeus) */
function solarLongitude(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = ((357.52911 + 35999.05029 * T - 0.0001537 * T * T) * Math.PI) / 180;
  const C = (1.914602 - 0.004817 * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  return (((L0 + C) % 360) + 360) % 360;
}

export function dayInfo(dateStr: string): DayInfo {
  const [y, m, d] = dateStr.split("-").map(Number);
  const jd = julianDay(y, m, d);
  const jdn = Math.floor(jd + 0.5);
  const dayStem = (((jdn + 9) % 10) + 10) % 10;
  const dayBranch = (((jdn + 1) % 12) + 12) % 12;
  // 입춘(315°)부터 인월. 30도마다 다음 달
  const lon = solarLongitude(jd);
  const monthBranch = (Math.floor((((lon - 315) % 360) + 360) % 360 / 30) + 2) % 12;
  const xun = (dayBranch - dayStem + 12) % 12;
  const voids: [number, number] = [(xun + 10) % 12, (xun + 11) % 12];
  return {
    date: dateStr,
    dayStem,
    dayBranch,
    monthBranch,
    voids,
    label: `${STEMS[dayStem]}${BRANCHES[dayBranch]}(${STEMS_HANJA[dayStem]}${BRANCHES_HANJA[dayBranch]})일`,
  };
}

/* ---------- 질문 분류와 용신 ---------- */

export type Category = "wealth" | "career" | "love" | "health" | "document" | "children" | "friend" | "move" | "self";

export type CategoryDef = { key: Category; label: string; desc: string; target: Relation | "세" | "응" | "love" };

export const CATEGORIES: CategoryDef[] = [
  { key: "wealth", label: "재물과 사업", desc: "돈, 장사, 투자, 거래", target: "처재" },
  { key: "career", label: "직장, 시험, 명예", desc: "취업, 승진, 합격, 관운", target: "관귀" },
  { key: "love", label: "연애와 결혼", desc: "인연, 상대의 마음", target: "love" },
  { key: "health", label: "건강", desc: "몸 상태, 회복", target: "세" },
  { key: "document", label: "문서, 계약, 학업", desc: "계약, 부동산, 시험공부, 윗사람", target: "부모" },
  { key: "children", label: "자녀와 아랫사람", desc: "자식, 후배, 반려동물", target: "자손" },
  { key: "friend", label: "친구와 경쟁", desc: "동료, 동업자, 경쟁자", target: "형제" },
  { key: "move", label: "이사와 여행", desc: "옮김, 떠남, 방향", target: "세" },
  { key: "self", label: "나의 운세", desc: "지금 내 상태 전반", target: "세" },
];

/* ---------- 분석 ---------- */

export type LineInfo = {
  index: number;
  yang: boolean;
  changing: boolean;
  stem: number;
  branch: number;
  element: Element;
  relation: Relation;
  isWorld: boolean;
  isResponse: boolean;
  beast: number;
  isVoid: boolean;
  /** 동효일 때 변한 효 */
  changed?: { branch: number; element: Element; relation: Relation };
};

export type Judgement = {
  score: number;
  level: "왕" | "평" | "쇠";
  reasons: string[];
};

export type YukhyoInput = {
  lines: string;
  changingLines: number[];
  category: Category;
  /** 연애일 때 질문자 성별 */
  gender?: "male" | "female";
  date: string;
  question?: string;
};

export type YukhyoResult = {
  input: YukhyoInput;
  hexagram: Hexagram;
  changedHexagram: Hexagram | null;
  palace: PalaceInfo;
  day: DayInfo;
  lines: LineInfo[];
  useRelation: Relation | "세" | "응";
  useLine: LineInfo | null;
  /** 괘에 용신이 없을 때 본궁에서 찾은 복신 */
  hiddenUse: { branch: number; element: Element; at: number } | null;
  useJudgement: Judgement;
  worldJudgement: Judgement;
  verdict: { level: "길" | "평" | "흉"; title: string; text: string };
  timing: string[];
  elementNote: string;
};

function judge(lineEl: Element, branch: number, changing: boolean, changed: LineInfo["changed"] | undefined, all: LineInfo[], self: LineInfo | null, day: DayInfo, isVoid: boolean): Judgement {
  const reasons: string[] = [];
  let score = 0;
  const mEl = BRANCH_ELEMENT[day.monthBranch];
  const dEl = BRANCH_ELEMENT[day.dayBranch];

  // 월건
  if (mEl === lineEl) {
    score += 2;
    reasons.push(`이달(${branchLabel(day.monthBranch)}월)과 같은 ${lineEl} 기운이라 힘이 가장 셉니다.`);
  } else if (generates(mEl, lineEl)) {
    score += 1;
    reasons.push(`이달(${branchLabel(day.monthBranch)}월)이 힘을 보태 주어 기운이 좋습니다.`);
  } else if (generates(lineEl, mEl)) {
    score -= 1;
    reasons.push(`이달의 기운을 돕느라 오히려 힘이 빠집니다.`);
  } else if (overcomes(lineEl, mEl)) {
    score -= 1;
    reasons.push(`이달의 기운과 부딪혀 힘을 쓰지 못합니다.`);
  } else {
    score -= 2;
    reasons.push(`이달(${branchLabel(day.monthBranch)}월)의 기운에 눌려 힘이 없습니다.`);
  }
  if (isClash(day.monthBranch, branch)) {
    score -= 1.5;
    reasons.push(`이달의 기운과 정면으로 부딪혀(월파) 크게 흔들립니다.`);
  }

  // 일진
  if (dEl === lineEl || generates(dEl, lineEl)) {
    score += 1;
    reasons.push(`오늘(${day.label})의 기운이 도와줍니다.`);
  } else if (overcomes(dEl, lineEl)) {
    score -= 1;
    reasons.push(`오늘의 기운이 누릅니다.`);
  }
  if (isClash(day.dayBranch, branch)) {
    if (!changing && score > 0) {
      score += 0.5;
      reasons.push(`오늘의 기운이 부딪혀 조용히 움직이기 시작합니다(암동).`);
    } else {
      score -= 1;
      reasons.push(`오늘의 기운과 부딪혀(일파) 흔들립니다.`);
    }
  }

  // 다른 동효의 생극
  for (const m of all) {
    if (!m.changing || (self && m.index === self.index)) continue;
    if (generates(m.element, lineEl)) {
      score += 1;
      reasons.push(`${m.index + 1}효 ${m.relation}(${branchLabel(m.branch)})이 움직여 힘을 보태 줍니다.`);
    } else if (overcomes(m.element, lineEl)) {
      score -= 1.5;
      reasons.push(`${m.index + 1}효 ${m.relation}(${branchLabel(m.branch)})이 움직여 누릅니다.`);
    }
  }

  // 자신이 동효일 때 변효의 작용
  if (changing && changed) {
    if (generates(changed.element, lineEl)) {
      score += 1.5;
      reasons.push(`움직여 변한 효(${branchLabel(changed.branch)})가 되돌아와 힘을 보탭니다(회두생).`);
    } else if (overcomes(changed.element, lineEl)) {
      score -= 2;
      reasons.push(`움직여 변한 효(${branchLabel(changed.branch)})가 되돌아와 누릅니다(회두극).`);
    } else if (changed.element === lineEl) {
      const forward = [
        [2, 3], [5, 6], [8, 9], [11, 0], [1, 4], [4, 7], [7, 10], [10, 1],
      ].some(([a, b]) => a === branch && b === changed.branch);
      if (forward) {
        score += 1;
        reasons.push(`같은 기운으로 한 걸음 나아갑니다(진신).`);
      } else {
        score -= 1;
        reasons.push(`같은 기운이지만 한 걸음 물러섭니다(퇴신).`);
      }
    }
  }

  // 공망
  if (isVoid) {
    if (changing || score > 0) {
      score -= 0.5;
      reasons.push(`빈자리(공망)에 들었지만 힘이 있어, 그 자리를 벗어나는 날 이루어집니다.`);
    } else {
      score -= 2;
      reasons.push(`빈자리(공망)에 들고 힘도 없어 실속이 없습니다.`);
    }
  }

  const level: Judgement["level"] = score >= 2 ? "왕" : score >= 0 ? "평" : "쇠";
  return { score: Math.round(score * 10) / 10, level, reasons };
}

const VERDICTS: Record<Category, Record<"길" | "평" | "흉", string>> = {
  wealth: {
    길: "재물의 기운이 살아 있습니다. 거래나 투자를 진행해도 좋고, 예상보다 수익이 따를 수 있습니다.",
    평: "재물이 오가되 크게 남지는 않습니다. 무리한 확장보다 현상 유지가 낫습니다.",
    흉: "재물의 기운이 약합니다. 지출을 줄이고 새 투자나 큰 거래는 미루는 것이 안전합니다.",
  },
  career: {
    길: "관운이 살아 있습니다. 시험, 승진, 취업에 좋은 소식이 기대됩니다. 준비한 만큼 인정받습니다.",
    평: "가능성은 있으나 결정적이지 않습니다. 부족한 부분을 보완하면서 때를 기다리세요.",
    흉: "관운이 약합니다. 이번에는 결과를 얻기 어렵거나 늦어질 수 있으니 다음 기회를 준비하세요.",
  },
  love: {
    길: "상대의 기운이 살아 있어 인연이 이어질 가능성이 큽니다. 마음을 표현하기 좋은 때입니다.",
    평: "관계가 오가지만 아직 확실하지 않습니다. 서두르지 말고 관계를 차분히 다지세요.",
    흉: "상대의 기운이 약하거나 흔들립니다. 지금은 억지로 진전시키기보다 시간을 두는 편이 낫습니다.",
  },
  health: {
    길: "세효가 힘이 있어 회복력이 좋습니다. 관리하면 건강을 지킬 수 있습니다.",
    평: "큰 탈은 없으나 방심하면 잔병이 생깁니다. 무리하지 말고 규칙적으로 지내세요.",
    흉: "세효가 약합니다. 몸이 지쳐 있으니 휴식과 검진을 챙기고 무리한 일정을 피하세요.",
  },
  document: {
    길: "문서와 계약, 학업의 기운이 살아 있습니다. 계약 성사나 좋은 성적이 기대됩니다.",
    평: "일이 진행은 되나 더디거나 조건이 애매합니다. 서류와 조건을 꼼꼼히 확인하세요.",
    흉: "문서의 기운이 약합니다. 계약은 서두르지 말고, 공부는 방법을 바꿔야 효과가 납니다.",
  },
  children: {
    길: "자손효가 힘이 있어 자녀와 아랫사람에게 기쁜 일이 있고 근심이 풀립니다.",
    평: "특별한 문제는 없지만 기대만큼의 진전도 없습니다. 지켜보며 도와주세요.",
    흉: "자손효가 약합니다. 자녀나 아랫사람의 일에 걱정이 생길 수 있으니 살펴 주세요.",
  },
  friend: {
    길: "형제효가 힘이 있어 동료와 친구의 도움을 받거나 경쟁에서 밀리지 않습니다.",
    평: "관계가 무난합니다. 다만 형제효는 재물을 다투는 별이라 돈 문제는 분명히 하세요.",
    흉: "형제효가 약하거나 흔들립니다. 친구나 동업자와의 다툼이나 손해를 조심하세요.",
  },
  move: {
    길: "세효가 힘이 있어 이사, 여행, 출행에 무리가 없습니다. 움직이면 좋은 결과가 있습니다.",
    평: "움직여도 무방하나 큰 이득은 없습니다. 준비를 충분히 하고 떠나세요.",
    흉: "세효가 약하니 지금은 움직임이 불리합니다. 일정을 미루거나 조심스럽게 진행하세요.",
  },
  self: {
    길: "세효가 왕성해 지금의 흐름이 좋습니다. 하려는 일을 적극적으로 추진하세요.",
    평: "평온한 시기입니다. 큰 변화보다 현재를 정돈하는 데 힘쓰세요.",
    흉: "세효가 약해 기운이 눌려 있습니다. 무리하지 말고 주변의 도움을 받으며 때를 기다리세요.",
  },
};

export function analyzeYukhyo(input: YukhyoInput): YukhyoResult {
  const { lines, changingLines, category, gender, date } = input;
  const hexagram = findHexagramByLines(lines);
  const changedLines = changingLines.reduce((acc, i) => flip(acc, i), lines);
  const changedHexagram = changingLines.length ? findHexagramByLines(changedLines) : null;
  const palace = palaceOf(lines);
  const day = dayInfo(date);
  const najia = assignNajia(lines);
  const changedNajia = assignNajia(changedLines);
  const beast0 = beastStart(day.dayStem);

  const infos: LineInfo[] = najia.map((n, i) => {
    const element = BRANCH_ELEMENT[n.branch];
    const changing = changingLines.includes(i);
    const info: LineInfo = {
      index: i,
      yang: lines[i] === "1",
      changing,
      stem: n.stem,
      branch: n.branch,
      element,
      relation: relationOf(palace.element, element),
      isWorld: i === palace.world,
      isResponse: i === palace.response,
      beast: (beast0 + i) % 6,
      isVoid: day.voids.includes(n.branch),
    };
    if (changing) {
      const cb = changedNajia[i].branch;
      const ce = BRANCH_ELEMENT[cb];
      info.changed = { branch: cb, element: ce, relation: relationOf(palace.element, ce) };
    }
    return info;
  });

  // 용신 결정
  const def = CATEGORIES.find((c) => c.key === category)!;
  let useRelation: Relation | "세" | "응";
  if (def.target === "love") useRelation = gender === "female" ? "관귀" : "처재";
  else useRelation = def.target;

  let useLine: LineInfo | null = null;
  let hiddenUse: YukhyoResult["hiddenUse"] = null;
  if (useRelation === "세") useLine = infos[palace.world];
  else if (useRelation === "응") useLine = infos[palace.response];
  else {
    const rel = useRelation;
    const candidates = infos.filter((l) => l.relation === rel);
    if (candidates.length) {
      const scoreOf = (l: LineInfo) => (l.changing ? 2 : 0) + (l.isWorld ? 1 : 0) + (BRANCH_ELEMENT[day.monthBranch] === l.element || BRANCH_ELEMENT[day.dayBranch] === l.element ? 1 : 0);
      useLine = candidates.sort((a, b) => scoreOf(b) - scoreOf(a))[0];
    } else {
      // 복신: 본궁괘에서 같은 육친을 찾는다
      const pureNajia = assignNajia(palace.palace + palace.palace);
      const at = pureNajia.findIndex((n) => relationOf(palace.element, BRANCH_ELEMENT[n.branch]) === rel);
      if (at >= 0) hiddenUse = { branch: pureNajia[at].branch, element: BRANCH_ELEMENT[pureNajia[at].branch], at };
    }
  }

  const useJudgement = useLine
    ? judge(useLine.element, useLine.branch, useLine.changing, useLine.changed, infos, useLine, day, useLine.isVoid)
    : hiddenUse
      ? (() => {
          const j = judge(hiddenUse.element, hiddenUse.branch, false, undefined, infos, null, day, day.voids.includes(hiddenUse.branch));
          j.score -= 1.5;
          j.reasons.unshift(`용신이 괘에 나타나지 않아 본궁 ${hiddenUse.at + 1}효 ${branchLabel(hiddenUse.branch)} 자리에 숨어 있습니다(복신). 드러날 때까지 일이 더딥니다.`);
          j.level = j.score >= 2 ? "왕" : j.score >= 0 ? "평" : "쇠";
          return j;
        })()
      : { score: 0, level: "평" as const, reasons: ["용신을 정하지 못했습니다."] };

  const world = infos[palace.world];
  const worldJudgement = judge(world.element, world.branch, world.changing, world.changed, infos, world, day, world.isVoid);

  // 종합: 용신 중심, 세효 보조
  const total = useJudgement.score + worldJudgement.score * 0.3;
  const level: "길" | "평" | "흉" = total >= 1.5 ? "길" : total >= -0.5 ? "평" : "흉";
  const titleMap = { 길: "이루어질 기운이에요", 평: "지켜볼 기운이에요", 흉: "조심할 기운이에요" };

  // 응기
  const timing: string[] = [];
  const ub = useLine?.branch ?? hiddenUse?.branch;
  if (ub !== undefined) {
    const harmony = (1 - ub + 12) % 12;
    const useEl = BRANCH_ELEMENT[ub];
    if (useJudgement.level === "왕") {
      timing.push(`${branchLabel(ub)}의 날이나 달, 또는 짝이 되는 ${branchLabel(harmony)}의 날이나 달에 이루어지기 쉽습니다.`);
    } else {
      const parents = (["목", "화", "토", "금", "수"] as Element[]).filter((e) => generates(e, useEl));
      timing.push(`용신이 약하니 ${parents.join(", ")} 기운이 강한 날이나 달(${BRANCHES.map((b, i) => (parents.includes(BRANCH_ELEMENT[i]) ? b : null)).filter(Boolean).join(", ")})에 힘을 얻어 진전이 있습니다.`);
    }
    if (useLine?.isVoid || (hiddenUse && day.voids.includes(hiddenUse.branch))) {
      timing.push(`빈자리를 벗어나는 ${branchLabel(ub)}의 날 이후를 기다리세요.`);
    }
  }

  const elementNote = `이 괘는 ${palace.palaceName}의 ${palace.generationName}이고, 궁의 오행은 ${palace.element}(${ELEMENT_HANJA[palace.element]})입니다. 나를 뜻하는 세효는 ${palace.world + 1}효, 상대를 뜻하는 응효는 ${palace.response + 1}효입니다.`;

  return {
    input,
    hexagram,
    changedHexagram,
    palace,
    day,
    lines: infos,
    useRelation,
    useLine,
    hiddenUse,
    useJudgement,
    worldJudgement,
    verdict: { level, title: titleMap[level], text: VERDICTS[category][level] },
    timing,
    elementNote,
  };
}

/** 오늘 날짜(로컬) YYYY-MM-DD */
export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const ALL_HEXAGRAM_COUNT = HEXAGRAMS.length;
