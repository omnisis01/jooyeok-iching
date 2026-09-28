// 프리미엄 상태 조회와 결제 페이지 이동 (Stripe Checkout)
import { cloudEnabled, supabase } from "./supabase";
import { cachePremiumUntil } from "./quota";

export const paymentsEnabled = cloudEnabled && process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

export const PREMIUM_BENEFITS = [
  "육효 결과의 전체 도표와 풀이를 기록에서 다시 볼 수 있어요",
  "점 기록을 개수 제한 없이 보관해요",
  "결과 이미지에 사이트 표시 없이 깔끔하게 저장돼요",
];

export const FREE_HISTORY_LIMIT = 30;

export async function fetchPremiumUntil(): Promise<Date | null> {
  if (!cloudEnabled) return null;
  const { data: session } = await supabase().auth.getSession();
  if (!session.session) {
    cachePremiumUntil(null);
    return null;
  }
  const { data } = await supabase().from("profiles").select("premium_until").eq("user_id", session.session.user.id).maybeSingle();
  const until = data?.premium_until ? new Date(data.premium_until as string) : null;
  const active = until && until.getTime() > Date.now() ? until : null;
  cachePremiumUntil(active);
  return active;
}

/** 결제 페이지 주소를 받아 이동한다. 로그인 토큰을 함수에 함께 보낸다 */
export async function startCheckout(): Promise<void> {
  const { data: session } = await supabase().auth.getSession();
  if (!session.session) throw new Error("먼저 로그인해 주세요");
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!res.ok) throw new Error("결제 페이지를 열지 못했습니다. 잠시 후 다시 시도해 주세요");
  const { url: checkoutUrl } = (await res.json()) as { url: string };
  window.location.href = checkoutUrl;
}

/** 결제 페이지에서 돌아왔는지 (주소의 checkout=success) */
export function checkoutReturn(): "success" | "cancel" | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("checkout");
  return v === "success" || v === "cancel" ? v : null;
}
