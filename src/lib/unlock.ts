// 결과 하나의 "깊이 읽기"를 건별로 여는 결제 (토스페이먼츠 일반 결제, 카드 한 번 결제)
// Pro이면 모두 열려 있고, 아니면 결과마다 한 번 산다. 산 결과의 열쇠는 서버(unlocks)와 이 기기(localStorage) 양쪽에 둔다
import type { Reading } from "./iching";
import { cloudEnabled, supabase } from "./supabase";
import { isPremiumNow } from "./quota";
import { paymentsEnabled, provider } from "./premium";
import { SITE_URL } from "./shareCard";

export const UNLOCK_PRICE_KRW = Number(process.env.NEXT_PUBLIC_UNLOCK_PRICE_KRW || 1000);
/** 건별 결제는 토스 일반 결제로만 한다 */
export const unlockEnabled = paymentsEnabled && provider === "toss";

const LOCAL_KEY = "jooyeok-master-unlocks-v1";
const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

/** 결과를 가리키는 열쇠. 같은 괘, 같은 변효, 같은 시각(분)이면 같은 결과다 */
export function readingKey(reading: Reading): string {
  const at = reading.castAt ? reading.castAt.slice(0, 16) : "";
  return `${reading.primary.lines}-${reading.changingLines.join("")}-${at}`;
}

function localSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function rememberUnlock(key: string) {
  try {
    const s = localSet();
    s.add(key);
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...s]));
  } catch {
    // 저장 공간이 없으면 서버 기록만 남는다
  }
}

/** 이 기기 기준으로 바로 알 수 있는 상태. 서버 확인은 isUnlockedRemote */
export function isUnlockedLocal(key: string): boolean {
  return isPremiumNow() || localSet().has(key);
}

export async function isUnlockedRemote(key: string): Promise<boolean> {
  if (isUnlockedLocal(key)) return true;
  if (!cloudEnabled) return false;
  const { data: session } = await supabase().auth.getSession();
  if (!session.session) return false;
  const { data } = await supabase().from("unlocks").select("reading_key").eq("user_id", session.session.user.id).eq("reading_key", key).maybeSingle();
  if (data) rememberUnlock(key);
  return Boolean(data);
}

function siteBase(): string {
  if (typeof window === "undefined") return SITE_URL;
  return window.location.origin + window.location.pathname;
}

/** 토스 결제창을 연다. 끝나면 successUrl로 돌아오고, 그때 confirmUnlock을 부른다 */
export async function startUnlock(reading: Reading, label: string): Promise<void> {
  if (!unlockEnabled || !tossClientKey) throw new Error("지금은 결제를 받을 수 없어요");
  const { data: session } = await supabase().auth.getSession();
  if (!session.session) throw new Error("먼저 로그인해 주세요");
  const key = readingKey(reading);
  const orderId = `ul-${session.session.user.id.slice(0, 8)}-${Date.now().toString(36)}`;
  const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
  const toss = await loadTossPayments(tossClientKey);
  const payment = toss.payment({ customerKey: session.session.user.id });
  await payment.requestPayment({
    method: "CARD",
    amount: { currency: "KRW", value: UNLOCK_PRICE_KRW },
    orderId,
    orderName: `깊이 읽기, ${label}`,
    successUrl: `${siteBase()}?unlock=success&key=${encodeURIComponent(key)}`,
    failUrl: `${siteBase()}?unlock=fail`,
    customerEmail: session.session.user.email ?? undefined,
    customerName: session.session.user.email?.split("@")[0] ?? "회원",
    card: { flowMode: "DEFAULT", useEscrow: false },
  });
}

export type UnlockReturn = { result: "success"; paymentKey: string; orderId: string; amount: number; key: string } | { result: "fail"; message: string } | null;

export function unlockReturn(): UnlockReturn {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const u = p.get("unlock");
  if (u === "success" && p.get("paymentKey") && p.get("orderId") && p.get("key")) {
    return { result: "success", paymentKey: p.get("paymentKey")!, orderId: p.get("orderId")!, amount: Number(p.get("amount")), key: p.get("key")! };
  }
  if (u === "fail") return { result: "fail", message: p.get("message") || "결제를 마치지 못했어요" };
  return null;
}

/** 결제창에서 돌아온 뒤 서버에 승인을 맡긴다. 성공하면 열쇠를 기기에도 저장한다 */
export async function confirmUnlock(r: Extract<UnlockReturn, { result: "success" }>): Promise<void> {
  const { data: session } = await supabase().auth.getSession();
  if (!session.session) throw new Error("로그인 상태가 아니에요. 다시 로그인하면 결제 내역을 그대로 볼 수 있어요");
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/toss-payment-confirm`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.session.access_token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ paymentKey: r.paymentKey, orderId: r.orderId, amount: r.amount, readingKey: r.key }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error || "결제 승인에 실패했어요. 카드사 승인 내역이 있다면 알려 주세요");
  rememberUnlock(r.key);
}
