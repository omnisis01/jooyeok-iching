// 푸시 알림 문구 고르기. 뽑을 이유(절기, 월초, 월요일, 명절, 새 날, 일요일 밤)를 정하고
// 같은 이유라도 표현이 매번 조금씩 다르게 나오도록 날짜로 돌려 쓴다.
// Deno와 Node 모두에서 돌아가게 외부 의존 없이 쓴다.

export type Slot = "morning" | "evening";

export type PushMessage = {
  title: string;
  body: string;
  url: string;
  /** 같은 태그는 기기에서 하나로 합쳐진다. 아침과 밤은 따로 */
  tag: string;
  reason: Reason;
};

export type Reason = "term" | "holiday" | "month" | "monday" | "day" | "sunday-night" | "skip";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const STEMS_HANJA = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const BRANCHES_HANJA = "子丑寅卯辰巳午未申酉戌亥";
const BRANCH_ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
/** 달이 바뀌는 절기(節) 이름. 인월(입춘)부터 */
const TERM_NAMES = ["입춘", "경칩", "청명", "입하", "망종", "소서", "입추", "백로", "한로", "입동", "대설", "소한"];
const MONTH_NAMES = ["인월(범의 달)", "묘월(토끼의 달)", "진월(용의 달)", "사월(뱀의 달)", "오월(말의 달)", "미월(양의 달)", "신월(원숭이의 달)", "유월(닭의 달)", "술월(개의 달)", "해월(돼지의 달)", "자월(쥐의 달)", "축월(소의 달)"];

/** 설날과 추석(양력). 음력 계산 대신 표로 둔다. 해마다 하나씩 보태 주면 된다 */
const HOLIDAYS: Record<string, string> = {
  "2026-01-01": "새해 첫날",
  "2026-02-17": "설날",
  "2026-09-25": "추석",
  "2027-01-01": "새해 첫날",
  "2027-02-06": "설날",
  "2027-09-15": "추석",
  "2028-01-01": "새해 첫날",
  "2028-01-26": "설날",
  "2028-10-03": "추석",
};

/** 한국 시간 hourKst 시의 율리우스일 */
function julianDay(y: number, m: number, d: number, hourKst = 12): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  return jdn + (hourKst - 9 - 12) / 24;
}

/** 받침이 있으면 "이에요", 없으면 "예요" */
export function ieyo(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  return word + (hangul && (code - 0xac00) % 28 !== 0 ? "이에요" : "예요");
}

/** 받침이 있으면 "이", 없으면 "가" */
export function ga(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  const hangul = code >= 0xac00 && code <= 0xd7a3;
  return word + (hangul && (code - 0xac00) % 28 !== 0 ? "이" : "가");
}

function solarLongitude(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = ((357.52911 + 35999.05029 * T - 0.0001537 * T * T) * Math.PI) / 180;
  const C = (1.914602 - 0.004817 * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  return (((L0 + C) % 360) + 360) % 360;
}

export type DayFacts = {
  date: string;
  /** 0 = 일요일 */
  weekday: number;
  dayOfMonth: number;
  /** 예) 정미(丁未) */
  ganzhi: string;
  animal: string;
  /** 인월 = 0 */
  monthIndex: number;
  monthChanged: boolean;
  termName: string | null;
  holiday: string | null;
  /** 연초부터 며칠째인지. 문구를 돌려 쓰는 씨앗 */
  dayIndex: number;
};

export function dayFacts(dateStr: string): DayFacts {
  const [y, m, d] = dateStr.split("-").map(Number);
  const jd = julianDay(y, m, d);
  const jdn = Math.floor(jd + 0.5);
  const stem = (((jdn + 9) % 10) + 10) % 10;
  const branch = (((jdn + 1) % 12) + 12) % 12;
  const monthOf = (j: number) => Math.floor(((((solarLongitude(j) - 315) % 360) + 360) % 360) / 30);
  // 절기는 하루 중 어느 때든 들어올 수 있으니, 그날 0시와 다음 날 0시 사이에 달이 바뀌었는지 본다
  const monthIndex = monthOf(julianDay(y, m, d, 24));
  const monthChanged = monthOf(julianDay(y, m, d, 0)) !== monthIndex;
  const weekday = (jdn + 1) % 7;
  return {
    date: dateStr,
    weekday,
    dayOfMonth: d,
    ganzhi: `${STEMS[stem]}${BRANCHES[branch]}(${STEMS_HANJA[stem]}${BRANCHES_HANJA[branch]})`,
    animal: BRANCH_ANIMAL[branch],
    monthIndex,
    monthChanged,
    termName: monthChanged ? TERM_NAMES[monthIndex] : null,
    holiday: HOLIDAYS[dateStr] ?? null,
    dayIndex: jdn,
  };
}

type Ctx = DayFacts & { hexName: string; hexKeyword: string };
type Template = { title: (c: Ctx) => string; body: (c: Ctx) => string };

/* 표현은 짧고, 이유 하나를 앞세우고, 부담 대신 한 번만 물어보라는 권유로 끝낸다 */
const POOL: Record<Exclude<Reason, "skip">, Template[]> = {
  term: [
    { title: (c) => `오늘 ${c.termName}, 달이 바뀌었어요`, body: (c) => `${MONTH_NAMES[c.monthIndex]}이 시작됐어요. 육효의 월건이 달라지니 이달의 흐름을 새로 물어볼 때예요.` },
    { title: (c) => `${ieyo(c.termName!)}. 이달 첫 점 어때요`, body: (c) => `절기가 바뀌면 괘를 읽는 달의 기운도 바뀌어요. ${MONTH_NAMES[c.monthIndex]}의 큰 판세를 하나 뽑아 두세요.` },
    { title: (c) => `새 절기 ${c.termName}`, body: () => `오늘부터 한 달, 괘에 붙는 달의 기운이 새로 정해졌어요. 이달에 결정할 일 하나만 조용히 물어보세요.` },
    { title: (c) => `${c.termName} 아침이에요`, body: (c) => `달이 ${MONTH_NAMES[c.monthIndex]}로 넘어갔어요. 지난달 답은 잊고, 이달의 자리를 다시 짚어 볼 시간이에요.` },
  ],
  holiday: [
    { title: (c) => `${ieyo(c.holiday!)}. 한 해의 판세를 물어볼까요`, body: (c) => `${c.ganzhi}일, 온 가족이 새 출발을 말하는 날이에요. 올해 마음에 둔 일 하나만 괘로 물어보세요.` },
    { title: (c) => `${c.holiday} 아침, 한 번만 물어보세요`, body: () => `큰 명절은 오래 전부터 점을 치던 날이에요. 마음을 모아 이번 한 해의 큰 판세를 하나 뽑아 두세요.` },
    { title: (c) => `좋은 ${c.holiday} 되세요`, body: (c) => `${c.animal}의 날이에요. 붐비는 하루가 시작되기 전, 조용한 지금 한 가지만 물어보면 좋아요.` },
  ],
  month: [
    { title: () => `1일이에요. 이달의 판세 하나`, body: (c) => `${c.ganzhi}일로 한 달이 열려요. 이달에 정해야 할 일이 있다면 오늘 괘 하나가 기준이 돼요.` },
    { title: () => `새 달 첫날이에요`, body: () => `달력이 넘어갔어요. 이번 달 마음에 걸리는 일 하나를 괘로 물어 두면 결정할 때 흔들리지 않아요.` },
    { title: () => `이달은 어떤 흐름일까요`, body: (c) => `${c.animal}의 날로 시작하는 달이에요. 한 달의 큰 판세를 오늘 아침에 하나만 뽑아 보세요.` },
  ],
  monday: [
    { title: () => `월요일이에요. 이번 주 판세 하나`, body: (c) => `${c.ganzhi}일로 새 주가 시작돼요. 이번 주에 결정할 일 하나를 괘로 물어 두면 기준이 생겨요.` },
    { title: () => `새 주가 열렸어요`, body: () => `월요일 아침은 마음이 아직 바쁘지 않은 시간이에요. 이번 주 가장 궁금한 것 하나만 조용히 물어보세요.` },
    { title: () => `이번 주, 어디에 서 있을까요`, body: (c) => `${c.animal}의 날 월요일이에요. 이번 주의 큰 판세와 내 자리를 괘 하나로 짚어 보세요.` },
    { title: () => `한 주의 첫 점, 오늘이 좋아요`, body: () => `주역은 시작할 때 한 번 묻는 점이에요. 이번 주 마음에 걸리는 일 하나를 골라 물어보세요.` },
  ],
  day: [
    { title: (c) => `오늘은 ${c.ganzhi}일이에요`, body: () => `하루가 지나면 육효의 일진도 바뀌어 어제와 다른 답이 나와요. 오늘 하루의 큰 판세를 하나 뽑아 보세요.` },
    { title: (c) => `${c.animal}의 날 아침이에요`, body: (c) => `${c.ganzhi}일의 기운이 새로 들어왔어요. 마음이 고요한 지금, 궁금한 것 하나만 물어보세요.` },
    { title: () => `하루를 열기 전에 하나만`, body: () => `주역은 마음이 모였을 때 한 번 묻는 점이에요. 하루를 시작하는 지금, 조용히 하나만 물어보세요.` },
    { title: () => `새 날, 새 일진`, body: (c) => `오늘은 ${c.ganzhi}일. 어제 뽑은 답은 어제의 것이에요. 오늘 결정할 일이 있다면 지금 한 번 물어보세요.` },
    { title: () => `아침 5분, 괘 하나`, body: () => `동전 여섯 번이면 오늘 내가 어디에 서 있는지 보여요. 커피 한 잔 식기 전에 끝나요.` },
    { title: (c) => `${c.ganzhi}일, 마음이 맑을 때`, body: () => `하루 중 지금이 가장 조용한 시간이에요. 오늘 한 가지 질문에 한 번만 뽑아 보세요.` },
    { title: () => `오늘 하루의 큰 판세`, body: (c) => `${c.animal}의 날이에요. 날마다 기운이 다르니 오늘 일은 오늘 물어야 해요. 한 번이면 충분해요.` },
    { title: () => `잠깐 멈추고, 하나만`, body: (c) => `${c.ganzhi}일 아침이에요. 오늘 마음에 걸리는 일 하나를 괘로 물어 두면 하루가 덜 흔들려요.` },
  ],
  "sunday-night": [
    { title: () => `일요일 밤, 한 주를 정리할 시간`, body: () => `잠들기 전은 마음이 가라앉는 시간이에요. 다음 주에 결정할 일 하나만 조용히 물어보세요.` },
    { title: () => `내일부터 새 주가 시작돼요`, body: () => `주역은 시작 앞에서 한 번 묻는 점이에요. 다음 주 마음에 걸리는 것 하나, 지금 물어 두세요.` },
    { title: () => `조용한 밤이에요`, body: () => `하루가 끝나고 마음이 고요해졌어요. 다음 주 한 가지 질문에 한 번만 뽑아 보세요.` },
  ],
};

/** 오늘 왜 뽑을 만한지. 아침은 구체적인 이유부터, 밤은 일요일만 */
export function pickReason(f: DayFacts, slot: Slot): Reason {
  if (slot === "evening") return f.weekday === 0 ? "sunday-night" : "skip";
  if (f.holiday) return "holiday";
  if (f.monthChanged) return "term";
  if (f.dayOfMonth === 1) return "month";
  if (f.weekday === 1) return "monday";
  return "day";
}

/** 같은 이유 안에서 문구를 돌려 쓴다. 이유마다 따로 세어 연속으로 같은 문구가 나오지 않게 한다 */
function rotate<T>(pool: T[], seed: number): T {
  // 풀 크기와 서로소인 걸음으로 돌아 순서가 단조롭지 않게 한다
  const step = pool.length % 2 === 0 ? 3 : 2;
  return pool[(seed * step) % pool.length];
}

export function buildMessage(dateStr: string, slot: Slot, hex: { name: string; keyword: string }): PushMessage | null {
  const f = dayFacts(dateStr);
  const reason = pickReason(f, slot);
  if (reason === "skip") return null;
  const ctx: Ctx = { ...f, hexName: hex.name, hexKeyword: hex.keyword };
  // 이유별 씨앗: 매일 오는 문구는 날짜로, 주마다 오는 문구는 주 번호로, 달마다 오는 문구는 달 번호로 센다
  const seed = reason === "day" ? f.dayIndex : reason === "monday" || reason === "sunday-night" ? Math.floor(f.dayIndex / 7) : reason === "term" ? f.monthIndex + Math.floor(f.dayIndex / 365) * 12 : Math.floor(f.dayIndex / 30);
  const t = rotate(POOL[reason], seed);
  return {
    title: t.title(ctx),
    body: t.body(ctx),
    url: "./?from=push#divine",
    tag: slot === "morning" ? "morning-cast" : "evening-cast",
    reason,
  };
}
