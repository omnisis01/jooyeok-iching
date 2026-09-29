// 매일 실행: 만료가 하루 안으로 다가온 활성 구독을 빌링키로 다시 결제해 한 달 연장한다 (서비스 키로만 호출)
import { adminClient, chargeMonth, json } from "../_shared/toss.ts";

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) return json({ error: "unauthorized" }, 401);

  const admin = adminClient();
  const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: due, error } = await admin
    .from("profiles")
    .select("user_id, billing_key, billing_customer_key, premium_until")
    .eq("billing_status", "active")
    .not("billing_key", "is", null)
    .lte("premium_until", soon);
  if (error) return json({ error: error.message }, 500);

  let renewed = 0;
  let failed = 0;
  for (const p of due ?? []) {
    const { data: u } = await admin.auth.admin.getUserById(p.user_id as string);
    const r = await chargeMonth(admin, p.user_id as string, p.billing_key as string, p.billing_customer_key as string, u?.user?.email);
    if (r.ok) renewed++;
    else {
      failed++;
      await admin.from("profiles").update({ billing_status: "failed" }).eq("user_id", p.user_id as string);
    }
  }
  return json({ checked: due?.length ?? 0, renewed, failed });
});
