// 토스페이먼츠 빌링 API 호출과 프리미엄 갱신에 쓰는 공용 함수 (Edge Function 전용)
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const API = "https://api.tosspayments.com/v1";

export function tossHeaders(): HeadersInit {
  const secret = Deno.env.get("TOSS_SECRET_KEY");
  if (!secret) throw new Error("TOSS_SECRET_KEY missing");
  return { Authorization: `Basic ${btoa(secret + ":")}`, "Content-Type": "application/json" };
}

export function priceKrw(): number {
  return Number(Deno.env.get("PREMIUM_PRICE_KRW") ?? 4900);
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

/** 요청의 사용자 토큰으로 본인을 확인한다 */
export async function requireUser(req: Request) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/** 빌링키로 한 달 치를 결제하고 성공하면 프리미엄을 한 달 연장한다 */
export async function chargeMonth(admin: SupabaseClient, userId: string, billingKey: string, customerKey: string, email?: string | null) {
  const amount = priceKrw();
  const orderId = `jm-${userId.slice(0, 8)}-${Date.now()}`;
  const res = await fetch(`${API}/billing/${billingKey}`, {
    method: "POST",
    headers: tossHeaders(),
    body: JSON.stringify({ customerKey, amount, orderId, orderName: "Pro 1개월", customerEmail: email ?? undefined }),
  });
  const payment = await res.json();
  const ok = res.ok && payment.status === "DONE";
  await admin.from("payments").insert({
    user_id: userId,
    provider: "toss",
    order_id: orderId,
    amount,
    status: ok ? "DONE" : `FAILED:${payment.code ?? res.status}`,
    approved_at: ok ? payment.approvedAt : null,
    raw: payment,
  });
  if (!ok) return { ok: false as const, message: payment.message ?? "결제에 실패했습니다" };

  // 남은 기간이 있으면 그 뒤로 이어 붙인다
  const { data: profile } = await admin.from("profiles").select("premium_until").eq("user_id", userId).maybeSingle();
  const base = profile?.premium_until && new Date(profile.premium_until as string).getTime() > Date.now() ? new Date(profile.premium_until as string) : new Date();
  const until = new Date(base);
  until.setMonth(until.getMonth() + 1);
  await admin.from("profiles").upsert(
    { user_id: userId, premium_until: until.toISOString(), billing_status: "active", last_charged_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  return { ok: true as const, until: until.toISOString() };
}
