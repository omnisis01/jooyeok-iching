// 하루 무료 점 횟수와 공유 쿠폰 관리. 날짜는 한국 시간 자정에 바뀐다
// 로그인하면 서버(daily_quota)가 센다. 기기를 바꾸거나 저장 데이터를 지워도 횟수가 다시 생기지 않는다
// 로그인하지 않았으면 이 기기의 localStorage로 센다
import { todayString } from "./yukhyo";
import { now } from "./clock";
import { cloudEnabled, supabase } from "./supabase";

/** 로그인 사용자의 하루 무료 횟수 */
export const FREE_PER_DAY = 3;
/** 로그인하지 않은 사용자의 하루 무료 횟수. 로그인 기능이 없는 환경(로컬 개발)에서는 3회 */
export const FREE_PER_DAY_GUEST = cloudEnabled ? 1 : FREE_PER_DAY;
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

/* ---------- 서버 횟수 (로그인 사용자) ---------- */

type ServerQuota = { day: string; used: number; shares: number; premium: boolean };
let server: ServerQuota | null = null;
let serverUser: string | null = null;

function applyServer(json: unknown): boolean {
  const j = json as { ok?: boolean; day?: string; used?: number; shares?: number; premium?: boolean } | null;
  if (!j || !j.day) return false;
  server = { day: j.day, used: j.used ?? 0, shares: j.shares ?? 0, premium: Boolean(j.premium) };
  window.dispatchEvent(new Event("quota-changed"));
  return j.ok !== false;
}

async function rpc(name: string, args?: Record<string, unknown>): Promise<unknown | null> {
  if (!cloudEnabled || !serverUser) return null;
  try {
    const { data, error } = await supabase().rpc(name, args ?? {});
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/** 로그인 상태가 바뀔 때 부른다. 로그인 전 이 기기에서 쓴 오늘 횟수를 서버에 합친다 */
export async function attachServerQuota(userId: string | null): Promise<void> {
  if (userId === serverUser && server) return;
  serverUser = userId;
  server = null;
  if (!userId) {
    window.dispatchEvent(new Event("quota-changed"));
    return;
  }
  const local = read();
  const merged = await rpc("merge_local_quota", { p_day: local.date, p_used: local.used, p_shares: local.shares });
  if (merged) applyServer(merged);
}

/** 서버 값을 새로 읽는다. 점을 시작하기 직전과 앱으로 돌아왔을 때 */
export async function refreshServerQuota(): Promise<void> {
  const data = await rpc("quota_status");
  if (data) applyServer(data);
}

function serverToday(): ServerQuota | null {
  return server && server.day === todayString() ? server : null;
}

export type QuotaState = {
  premium: boolean;
  /** 로그인하지 않은 사용자 */
  guest: boolean;
  /** 오늘 무료 횟수(쿠폰 제외) */
  free: number;
  used: number;
  coupons: number;
  shares: number;
  /** 남은 횟수 (Pro이면 Infinity) */
  remaining: number;
  canShareForCoupon: boolean;
};

export function quotaState(): QuotaState {
  const sv = serverToday();
  if (sv) {
    const premium = sv.premium || isPremiumNow();
    const remaining = premium ? Infinity : Math.max(0, FREE_PER_DAY + sv.shares - sv.used);
    return { premium, guest: false, free: FREE_PER_DAY, used: sv.used, coupons: sv.shares, shares: sv.shares, remaining, canShareForCoupon: sv.shares < SHARE_COUPONS_PER_DAY };
  }
  // 서버 값을 아직 못 받았어도 로그인했으면 회원 기준(3회)으로 센다
  const guest = !serverUser;
  const free = guest ? FREE_PER_DAY_GUEST : FREE_PER_DAY;
  const q = read();
  const premium = isPremiumNow();
  const remaining = premium ? Infinity : Math.max(0, free + q.coupons - q.used);
  return { premium, guest, free, used: q.used, coupons: q.coupons, shares: q.shares, remaining, canShareForCoupon: q.shares < SHARE_COUPONS_PER_DAY };
}

export function canCast(): boolean {
  return quotaState().remaining > 0;
}

/** 결과가 나왔을 때 한 번 차감한다. 기기 기록은 언제나 남기고, 로그인했으면 서버에서도 차감한다 */
export async function consumeCast(): Promise<void> {
  const q = read();
  if (!isPremiumNow()) write({ ...q, used: q.used + 1 });
  if (serverUser) {
    const data = await rpc("consume_cast");
    if (data) applyServer(data);
  }
}

/** 공유가 끝났을 때 쿠폰을 준다. 하루 한도를 넘으면 false */
export async function grantShareCoupon(): Promise<boolean> {
  const q = read();
  const localOk = q.shares < SHARE_COUPONS_PER_DAY;
  if (localOk) write({ ...q, shares: q.shares + 1, coupons: q.coupons + 1 });
  if (serverUser) {
    const data = await rpc("grant_share");
    if (data) return applyServer(data);
  }
  return localOk;
}
