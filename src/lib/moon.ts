// 달의 모양(위상). 2000년 1월 6일 18:14 UTC의 삭을 기준으로 삭망월(29.530588853일)로 센다. 오차 ±1일 안팎이라 모양 이름에는 충분하다
const EPOCH = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC = 29.530588853 * 86400e3;

export type MoonPhase = {
  /** 0 = 삭, 0.25 = 상현, 0.5 = 보름, 0.75 = 하현 */
  p: number;
  /** 밝은 부분 비율 0~1 */
  lit: number;
  /** 초승달, 상현달, 보름달, 하현달, 그믐달… */
  name: string;
  /** 인사말에 넣는 구절. 예: "하현달이 뜬" */
  phrase: string;
  /** 삭 전후 이틀: 달이 거의 안 보인다 */
  dark: boolean;
};

export function moonPhase(ms: number = Date.now()): MoonPhase {
  const p = (((ms - EPOCH) % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC;
  const lit = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const dark = p < 0.03 || p > 0.97;
  const name = dark ? "삭" : p < 0.21 ? "초승달" : p < 0.29 ? "상현달" : p < 0.46 ? "차오르는 달" : p < 0.54 ? "보름달" : p < 0.71 ? "기우는 달" : p < 0.79 ? "하현달" : "그믐달";
  const phrase = dark ? "달이 숨은" : `${name}이 뜬`;
  return { p, lit, name, phrase, dark };
}

/** 달 모양 SVG 경로. 북반구 기준으로 차오를 때는 오른쪽이 밝다. cx, cy, r은 그릴 자리 */
export function moonPath(p: number, cx: number, cy: number, r: number): string {
  const t = Math.cos(2 * Math.PI * p) * r;
  const a = Math.abs(t).toFixed(2);
  if (p < 0.5) return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${a} ${r} 0 0 ${t > 0 ? 0 : 1} ${cx} ${cy - r} Z`;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 0 ${cx} ${cy + r} A ${a} ${r} 0 0 ${t > 0 ? 1 : 0} ${cx} ${cy - r} Z`;
}
