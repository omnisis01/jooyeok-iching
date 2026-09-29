// 정기결제 해지: 등록된 카드를 지우고 남은 기간까지만 프리미엄을 유지한다
import { CORS, adminClient, json, requireUser } from "../_shared/toss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const user = await requireUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("premium_until").eq("user_id", user.id).maybeSingle();
  await admin.from("profiles").upsert(
    { user_id: user.id, billing_key: null, billing_status: "cancelled" },
    { onConflict: "user_id" },
  );
  return json({ ok: true, premium_until: profile?.premium_until ?? null });
});
