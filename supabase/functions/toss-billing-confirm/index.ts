// 카드 등록(빌링 인증) 뒤 빌링키를 발급받고 첫 달을 결제해 프리미엄을 켜는 Edge Function
import { CORS, adminClient, chargeMonth, json, requireUser, tossHeaders } from "../_shared/toss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const user = await requireUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const { authKey, customerKey } = (await req.json().catch(() => ({}))) as { authKey?: string; customerKey?: string };
  if (!authKey || !customerKey) return json({ error: "authKey와 customerKey가 필요합니다" }, 400);
  if (customerKey !== user.id) return json({ error: "customerKey가 사용자와 다릅니다" }, 403);

  // 1) 빌링키 발급
  const res = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
    method: "POST",
    headers: tossHeaders(),
    body: JSON.stringify({ authKey, customerKey }),
  });
  const issued = await res.json();
  if (!res.ok || !issued.billingKey) return json({ error: issued.message ?? "카드 등록에 실패했습니다" }, 400);

  const admin = adminClient();
  const cardLabel = issued.card ? `${issued.card.issuerCode ?? ""} ${issued.card.number ?? ""}`.trim() : issued.cardCompany ?? null;
  await admin.from("profiles").upsert(
    { user_id: user.id, billing_key: issued.billingKey, billing_customer_key: customerKey, billing_card_label: cardLabel, billing_status: "active" },
    { onConflict: "user_id" },
  );

  // 2) 첫 달 결제
  const result = await chargeMonth(admin, user.id, issued.billingKey, customerKey, user.email);
  if (!result.ok) {
    await admin.from("profiles").update({ billing_status: "failed" }).eq("user_id", user.id);
    return json({ error: result.message }, 402);
  }
  return json({ ok: true, premium_until: result.until, card: cardLabel });
});
