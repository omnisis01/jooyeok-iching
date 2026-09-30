// 건별 결제(깊이 읽기) 승인: 토스 결제창에서 돌아온 paymentKey를 승인하고 unlocks에 기록한다
import { CORS, adminClient, json, requireUser, tossHeaders } from "../_shared/toss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const user = await requireUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as { paymentKey?: string; orderId?: string; amount?: number; readingKey?: string };
  const { paymentKey, orderId, amount, readingKey } = body;
  if (!paymentKey || !orderId || !amount || !readingKey) return json({ error: "결제 정보가 부족합니다" }, 400);
  const price = Number(Deno.env.get("UNLOCK_PRICE_KRW") ?? 1000);
  if (amount !== price) return json({ error: "결제 금액이 상품 가격과 다릅니다" }, 400);
  if (!orderId.startsWith(`ul-${user.id.slice(0, 8)}-`)) return json({ error: "주문번호가 사용자와 다릅니다" }, 403);

  const admin = adminClient();
  // 같은 주문을 두 번 승인하지 않는다
  const { data: existing } = await admin.from("payments").select("status").eq("order_id", orderId).maybeSingle();
  if (existing?.status === "DONE") {
    await admin.from("unlocks").upsert({ user_id: user.id, reading_key: readingKey, order_id: orderId }, { onConflict: "user_id,reading_key" });
    return json({ ok: true, already: true });
  }

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: tossHeaders(),
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const payment = await res.json();
  const ok = res.ok && payment.status === "DONE";
  await admin.from("payments").upsert(
    { user_id: user.id, provider: "toss", order_id: orderId, amount, status: ok ? "DONE" : `FAILED:${payment.code ?? res.status}`, approved_at: ok ? payment.approvedAt : null, raw: payment },
    { onConflict: "order_id" },
  );
  if (!ok) return json({ error: payment.message ?? "결제 승인에 실패했습니다" }, 402);
  await admin.from("unlocks").upsert({ user_id: user.id, reading_key: readingKey, order_id: orderId }, { onConflict: "user_id,reading_key" });
  return json({ ok: true });
});
