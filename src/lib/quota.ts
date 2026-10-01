// 하루 무료 점 횟수와 공유 쿠폰 관리 (이 기기의 localStorage 기준, 날짜는 한국 시간 자정에 바뀐다)
import { todayString } from "./yukhyo";
import { now } from "./clock";

export const FREE_PER_DAY = 3;
/** 공유 쿠폰 하루 한도. 공유가 곧 홍보라 넉넉히 둔다 */
export const SHARE_COUPONS_PER_DAY = 10;

const KEY = "jooyeok-master-quota-v1";
const PREMIUM_KEY = "jooyeok-master-premium-until";

type Quota = { date: string; used: number; coupons: number; shares: number };

function read(): Quota {
  const today = todayString();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const q = JSON.parse(raw) as Quota;
      if (q.date === today) return q;
    }
  } catch {
    // 저장소를 못 읽으면 새로 시작한다
  }
  return { date: today, used: 0, coupons: 0, shares: 0 };
}

function write(q: Quota) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // 저장 실패는 무시한다
  }
  window.dispatchEvent(new Event("quota-changed"));
}

/** Pro 만료일을 기기에 기억해 두어 점치기 흐름에서 바로 쓴다 */
export function cachePremiumUntil(until: Date | null) {
  try {
    if (until) localStorage.setItem(PREMIUM_KEY, until.toISOString());
    else localStorage.removeItem(PREMIUM_KEY);
  } catch {
    // 무시
  }
  window.dispatchEvent(new Event("quota-changed"));
}

export function isPremiumNow(): boolean {
  try {
    const v = localStorage.getItem(PREMIUM_KEY);
    return Boolean(v && new Date(v).getTime() > now());
  } catch {
    return false;
  }
}

export type QuotaState = {
  premium: boolean;
  used: number;
  coupons: number;
  shares: number;
  /** 남은 횟수 (Pro이면 Infinity) */
  remaining: number;
  canShareForCoupon: boolean;
};

export function quotaState(): QuotaState {
  const q = read();
  const premium = isPremiumNow();
  const remaining = premium ? Infinity : Math.max(0, FREE_PER_DAY + q.coupons - q.used);
  return { premium, used: q.used, coupons: q.coupons, shares: q.shares, remaining, canShareForCoupon: q.shares < SHARE_COUPONS_PER_DAY };
}

export function canCast(): boolean {
  return quotaState().remaining > 0;
}

/** 결과가 나왔을 때 한 번 차감한다 */
export function consumeCast() {
  if (isPremiumNow()) return;
  const q = read();
  write({ ...q, used: q.used + 1 });
}

/** 공유가 끝났을 때 쿠폰을 준다. 하루 한도를 넘으면 false */
export function grantShareCoupon(): boolean {
  const q = read();
  if (q.shares >= SHARE_COUPONS_PER_DAY) return false;
  write({ ...q, shares: q.shares + 1, coupons: q.coupons + 1 });
  return true;
}
