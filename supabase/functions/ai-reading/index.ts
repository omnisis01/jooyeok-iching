// AI 풀이: 로그인 확인 → 저장된 풀이가 있으면 그대로 → 권한 확인 → 근거를 서버가 직접 계산 → Claude 호출
// → 우리 자료와 대조해 검증 → 걸리면 한 번만 다시 쓰게 → 그래도 안 되면 대체 풀이(차감 없음)
// 비밀값: ANTHROPIC_API_KEY (없으면 대체 풀이만 나간다). 선택: AI_MODEL(기본 Haiku), AI_MODEL_PRO(Pro와 관리자, 기본 Opus), AI_DAILY_CAP
import { CORS, adminClient, json, requireUser } from "../_shared/toss.ts";
import { aiReadingKey, buildContext, fallbackReading, isSelfHarm, isValidInput, needsExpertNote } from "../_shared/aiReading.js";
import { generate, generateFollowup } from "../_shared/aiGenerate.ts";

const MODEL = Deno.env.get("AI_MODEL") ?? "claude-haiku-5-5";
// Pro와 관리자는 더 깊은 모델로(1회 약 30원). 같은 기능에 품질 차이를 둬 Pro의 이유를 만든다
const PRO_MODEL = Deno.env.get("AI_MODEL_PRO") ?? "claude-opus-5-5";
const modelFor = (via: string) => (via === "pro" || via === "admin" ? PRO_MODEL : MODEL);
// 전체 사용자 합계 하루 상한. 넘으면 그날은 대체 풀이만 낸다(비용 폭주 방지)
const DAILY_CAP = Number(Deno.env.get("AI_DAILY_CAP") ?? 3000);
const MAX_ATTEMPTS = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const user = await requireUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as { input?: unknown; followup?: unknown };
  const input = body.input as Parameters<typeof isValidInput>[0];
  if (!input || !isValidInput(input)) return json({ error: "결과 정보가 올바르지 않아요" }, 400);

  const db = adminClient();
  const key = aiReadingKey(input);
  const ctx = buildContext(input);
  const log = (name: string, props: Record<string, unknown> = {}) => db.from("events").insert({ name, props, user_id: user.id }).then(() => {});
  const meta = {
    timing: ctx.yukhyo.timing,
    expertNote: needsExpertNote(ctx),
    sources: [`${ctx.primary.name} 괘 해설`, ...ctx.changing.map((c: { name: string }) => `${c.name} 효사`), ...(ctx.resulting ? [`${ctx.resulting.name} 괘 해설`] : []), "육효 판단"],
  };

  const { data: saved } = await db.from("ai_readings").select("result, followup, model, outcome").eq("user_id", user.id).eq("reading_key", key).maybeSingle();

  // 이어서 묻기: 이미 받은 풀이가 있을 때 한 번만
  if (typeof body.followup === "string") {
    const q = body.followup.trim().slice(0, 60);
    if (!saved) return json({ error: "먼저 AI 점사풀이를 받아 주세요" }, 400);
    if (saved.followup) return json({ status: "followup", followup: saved.followup, saved: true });
    if (q.length < 2) return json({ error: "질문을 적어 주세요" }, 400);
    if (isSelfHarm(q)) {
      await log("ai_safety");
      return json({ status: "safety" });
    }
    const apiKey2 = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey2) return json({ status: "followup_fallback" });
    const fmodel = (saved.model as string) || MODEL;
    const g = await generateFollowup(ctx, saved.result as Parameters<typeof generateFollowup>[1], q, fmodel, apiKey2);
    if (!g.ok) {
      await log("ai_followup_fallback", { reason: g.reason });
      return json({ status: "followup_fallback" });
    }
    const followup = { question: q, ...(g.result as { answer: string; action: string }) };
    await db.from("ai_readings").update({ followup }).eq("user_id", user.id).eq("reading_key", key);
    await log("ai_followup", { model: fmodel, retries: g.attempts - 1, in_tok: g.inTok, out_tok: g.outTok });
    return json({ status: "followup", followup, saved: false });
  }

  if (saved) return json({ status: "done", saved: true, result: saved.result, followup: saved.followup ?? null, outcome: saved.outcome ?? null, ...meta });

  if (isSelfHarm(ctx.question)) {
    await log("ai_safety");
    return json({ status: "safety" });
  }

  const { data: via } = await db.rpc("ai_entitlement", { p_uid: user.id, p_key: key });
  if (!via) {
    await log("ai_need_purchase");
    return json({ status: "need_purchase" });
  }

  const fallback = async (reason: string) => {
    await log("ai_fallback", { reason });
    // 차감하지 않도록 저장하지 않는다. 나중에 다시 누르면 다시 시도한다
    return json({ status: "fallback", reason, result: fallbackReading(ctx), ...meta });
  };

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return fallback("no_key");
  const { count } = await db.from("ai_readings").select("*", { count: "exact", head: true }).eq("day", new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10));
  if ((count ?? 0) >= DAILY_CAP) return fallback("daily_cap");

  const model = modelFor(via);
  await log("ai_request", { via, model });
  const started = Date.now();
  const g = await generate(ctx, model, apiKey, MAX_ATTEMPTS, (issues) => void log("ai_retry", { issues: issues.length, first: issues[0].slice(0, 60) }));
  if (!g.ok) {
    if (g.reason === "refusal") await log("ai_refused", { category: g.refusalCategory ?? null });
    return fallback(g.reason);
  }
  await db.from("ai_readings").insert({
    user_id: user.id,
    reading_key: key,
    question: ctx.question,
    result: g.result,
    via,
    model,
    input_tokens: g.inTok,
    output_tokens: g.outTok,
    retries: g.attempts - 1,
  });
  await log("ai_done", { via, model, retries: g.attempts - 1, ms: Date.now() - started, in_tok: g.inTok, out_tok: g.outTok });
  return json({ status: "done", saved: false, result: g.result, ...meta });
});
