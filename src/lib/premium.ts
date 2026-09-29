// 프리미엄 상태 조회와 결제 시작 (토스페이먼츠 정기결제 기본, Stripe는 대안)
import { cloudEnabled, supabase } from "./supabase";
import { cachePremiumUntil } from "./quota";
import { SITE_URL } from "./shareCard";

export type Provider = "toss" | "stripe";

const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
export const provider: Provider = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER as Provider) || (tossClientKey ? "toss" : "stripe");
export const paymentsEnabled = cloudEnabled && process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true" && (provider === "stripe" || Boolean(tossClientKey));

export const PREMIUM_PRICE_KRW = Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE_KRW || 4900);

export const PREMIUM_BENEFITS = [
  "점 횟수 제한 없이 언제든 뽑을 수 있어요",
  "육효 결과의 전체 도표와 풀이를 기록에서 다시 볼 수 있어요",
  "점 기록을 개수 제한 없이 보관하고, 결과 이미지에 사이트 표시가 빠져요",
];

export const FREE_HISTORY_LIMIT = 30;

export type PremiumStatus = {
  until: Date | null;
  billingStatus: "active" | "cancelled" | "failed" | null;
  cardLabel: string | null;
};

export async function fetchPremiumStatus(): Promise<PremiumStatus> {
  const empty: PremiumStatus = { until: null, billingStatus: null, cardLabel: null };
  if (!cloudEnabled) return empty;
  const { data: session } = await supabase().auth.getSession();
  if (!session.session) {
    cachePremiumUntil(null);
    return empty;
  }
  const { data } = await supabase().from("profiles").select("premium_until, billing_status, billing_card_label").eq("user_id", session.session.user.id).maybeSingle();
  const until = data?.premium_until ? new Date(data.premium_until as string) : null;
  const active = until && until.getTime() > Date.now() ? until : null;
  cachePremiumUntil(active);
  return { until: active, billingStatus: (data?.billing_status as PremiumStatus["billingStatus"]) ?? null, cardLabel: (data?.billing_card_label as string | null) ?? null };
}

export async function fetchPremiumUntil(): Promise<Date | null> {
  return (await fetchPremiumStatus()).until;
}

function siteBase(): string {
  if (typeof window === "undefined") return SITE_URL;
  return window.location.origin + window.location.pathname;
}

async function callFunction(name: string, body: unknown): Promise<Record<string, unknown>> {
  const { data: session } = await supabase().auth.getSession();
  if (!session.session) throw new Error("먼저 로그인해 주세요");
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error((json.error as string) || "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요");
  return json;
}

/** 결제 시작. 토스는 카드 등록 창을 열고, Stripe는 결제 페이지로 이동한다 */
export async function startCheckout(): Promise<void> {
  const { data: session } = await supabase().auth.getSession();
  if (!session.session) throw new Error("먼저 로그인해 주세요");
  if (provider === "toss") {
    const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
    const toss = await loadTossPayments(tossClientKey!);
    const payment = toss.payment({ customerKey: session.session.user.id });
    await payment.requestBillingAuth({
      method: "CARD",
      successUrl: `${siteBase()}?billing=success`,
      failUrl: `${siteBase()}?billing=fail`,
      customerEmail: session.session.user.email ?? undefined,
      customerName: session.session.user.email?.split("@")[0] ?? "회원",
    });
    return;
  }
  const json = await callFunction("create-checkout", {});
  window.location.href = json.url as string;
}

/** 토스 카드 등록 뒤 돌아왔을 때: 빌링키 발급과 첫 결제 */
export async function confirmBilling(authKey: string, customerKey: string): Promise<{ premium_until: string; card: string | null }> {
  const json = await callFunction("toss-billing-confirm", { authKey, customerKey });
  return { premium_until: json.premium_until as string, card: (json.card as string | null) ?? null };
}

export async function cancelBilling(): Promise<void> {
  await callFunction("toss-billing-cancel", {});
}

export type CheckoutReturn =
  | { kind: "stripe"; result: "success" | "cancel" }
  | { kind: "toss"; result: "success"; authKey: string; customerKey: string }
  | { kind: "toss"; result: "fail"; message: string }
  | null;

/** 결제 페이지에서 돌아왔는지 (주소의 checkout= 또는 billing=) */
export function checkoutReturn(): CheckoutReturn {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const c = p.get("checkout");
  if (c === "success" || c === "cancel") return { kind: "stripe", result: c };
  const b = p.get("billing");
  if (b === "success" && p.get("authKey") && p.get("customerKey")) return { kind: "toss", result: "success", authKey: p.get("authKey")!, customerKey: p.get("customerKey")! };
  if (b === "fail") return { kind: "toss", result: "fail", message: p.get("message") || "카드 등록을 마치지 못했어요" };
  return null;
}

export function clearReturnParams() {
  window.history.replaceState(null, "", window.location.pathname + window.location.hash);
}
