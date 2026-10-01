// 앱의 "오늘"은 한국 시간 기준으로 정한다. 기기 시계가 틀리거나 일부러 바꿔도 날짜가 흔들리지 않도록
// 서버 응답의 Date 헤더로 기기 시계와의 차이를 한 번 재서 보정한다
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SKEW_KEY = "jooyeok-master-clock-skew";

let skew = 0;
let synced = false;

function loadSkew() {
  try {
    const v = sessionStorage.getItem(SKEW_KEY);
    if (v !== null) skew = Number(v) || 0;
  } catch {
    // 저장소를 못 쓰면 보정 없이 기기 시계를 쓴다
  }
}
if (typeof window !== "undefined") loadSkew();

/** 보정한 현재 시각(ms) */
export function now(): number {
  return Date.now() + skew;
}

/** 한국 시간 기준 날짜 문자열 YYYY-MM-DD */
export function kstDateString(ms: number = now()): string {
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** 한국 시간 기준 시(0~23) */
export function kstHour(ms: number = now()): number {
  return new Date(ms + KST_OFFSET_MS).getUTCHours();
}

/** 다음 한국 자정까지 남은 ms */
export function msUntilKstMidnight(ms: number = now()): number {
  const k = ms + KST_OFFSET_MS;
  return DAY_MS - (k % DAY_MS);
}

/** 서버 시각과 기기 시각의 차이를 잰다. 2분 넘게 다르면 보정하고 화면에 알린다 */
export async function syncClock(): Promise<void> {
  if (synced || typeof window === "undefined") return;
  synced = true;
  try {
    const sent = Date.now();
    const res = await fetch(`manifest.webmanifest?t=${sent}`, { method: "HEAD", cache: "no-store" });
    const header = res.headers.get("date");
    if (!header) return;
    const received = Date.now();
    const server = new Date(header).getTime() + (received - sent) / 2;
    const diff = server - received;
    const next = Math.abs(diff) > 2 * 60 * 1000 ? diff : 0;
    if (next !== skew) {
      skew = next;
      try {
        sessionStorage.setItem(SKEW_KEY, String(skew));
      } catch {
        // 무시
      }
      window.dispatchEvent(new Event("quota-changed"));
    }
  } catch {
    // 오프라인이면 기기 시계를 그대로 쓴다
  }
}
