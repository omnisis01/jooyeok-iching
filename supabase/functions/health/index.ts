// 장애 감시용 상태 보고(숫자만, 개인 정보 없음). 비밀값 HEALTH_TOKEN을 아는 감시 작업(GitHub Actions)만 부를 수 있다
import { CORS, adminClient, json } from "../_shared/toss.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const token = Deno.env.get("HEALTH_TOKEN");
  if (!token || token.length < 32 || req.headers.get("Authorization") !== `Bearer ${token}`) return json({ error: "unauthorized" }, 401);

  const db = adminClient();
  const since24 = new Date(Date.now() - 24 * 3600e3).toISOString();
  const since2 = new Date(Date.now() - 2 * 3600e3).toISOString();
  const started = Date.now();

  const [subs, pushRuns, aiDone, aiFallback, recentApiFails, lastEvent] = await Promise.all([
    db.from("push_subscriptions").select("*", { count: "exact", head: true }).lt("fail_count", 5),
    db.from("events").select("at, props").eq("name", "push_run").order("at", { ascending: false }).limit(1),
    db.from("events").select("*", { count: "exact", head: true }).eq("name", "ai_done").gte("at", since24),
    db.from("events").select("props").eq("name", "ai_fallback").gte("at", since24).limit(200),
    db.from("events").select("props").eq("name", "ai_fallback").gte("at", since2).limit(50),
    db.from("events").select("at").order("at", { ascending: false }).limit(1),
  ]);
  const dbOk = !subs.error && !pushRuns.error && !aiDone.error;
  const reasons = (aiFallback.data ?? []).map((r) => String((r.props as { reason?: string })?.reason ?? "?"));
  const recent = (recentApiFails.data ?? []).map((r) => String((r.props as { reason?: string })?.reason ?? "?"));

  return json({
    ok: dbOk,
    db_ms: Date.now() - started,
    ai_key: Boolean(Deno.env.get("ANTHROPIC_API_KEY")),
    ai_done_24h: aiDone.count ?? 0,
    ai_fallback_24h: reasons.length,
    ai_fallback_reasons_24h: reasons.reduce<Record<string, number>>((a, r) => ((a[r] = (a[r] ?? 0) + 1), a), {}),
    // AI 연결 자체가 깨진 신호(키 만료, 크레딧 소진, 서버 오류)만 따로
    ai_broken_2h: recent.filter((r) => r === "no_key" || r.startsWith("api_")).length,
    push_subscribers: subs.count ?? 0,
    push_last_run: pushRuns.data?.[0] ?? null,
    last_event_at: lastEvent.data?.[0]?.at ?? null,
  });
});
