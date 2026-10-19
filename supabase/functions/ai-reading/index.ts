// AI 풀이: 로그인 확인 → 저장된 풀이가 있으면 그대로 → 권한 확인 → 근거를 서버가 직접 계산 → Claude 호출
// → 우리 자료와 대조해 검증 → 걸리면 한 번만 다시 쓰게 → 그래도 안 되면 대체 풀이(차감 없음)
// 비밀값: ANTHROPIC_API_KEY (없으면 대체 풀이만 나간다). 선택: AI_MODEL, AI_DAILY_CAP
import Anthropic from "npm:@anthropic-ai/sdk";
import { CORS, adminClient, json, requireUser } from "../_shared/toss.ts";
import {
  AI_SCHEMA,
  AI_SYSTEM,
  aiReadingKey,
  buildContext,
  buildUserMessage,
  fallbackReading,
  isSelfHarm,
  isValidInput,
  needsExpertNote,
  validateReading,
} from "../_shared/aiReading.js";

const MODEL = Deno.env.get("AI_MODEL") ?? "claude-haiku-5-5";
// 전체 사용자 합계 하루 상한. 넘으면 그날은 대체 풀이만 낸다(비용 폭주 방지)
const DAILY_CAP = Number(Deno.env.get("AI_DAILY_CAP") ?? 3000);
const MAX_ATTEMPTS = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const user = await requireUser(req);
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as { input?: unknown };
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

  const { data: saved } = await db.from("ai_readings").select("result").eq("user_id", user.id).eq("reading_key", key).maybeSingle();
  if (saved) return json({ status: "done", saved: true, result: saved.result, ...meta });

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

  await log("ai_request", { via, model: MODEL });
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 45_000 });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: buildUserMessage(ctx) }];
  let inTok = 0;
  let outTok = 0;
  const started = Date.now();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res: Anthropic.Message;
    try {
      res = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: [{ type: "text", text: AI_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages,
        output_config: { effort: "low", format: { type: "json_schema", schema: AI_SCHEMA } },
      });
    } catch (e) {
      const status = e instanceof Anthropic.APIError ? e.status : "network";
      return fallback(`api_${status}`);
    }
    inTok += res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0);
    outTok += res.usage.output_tokens;
    if (res.stop_reason === "refusal") {
      await log("ai_refused", { category: res.stop_details?.category ?? null });
      return fallback("refusal");
    }
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const issues: string[] = parsed ? validateReading(parsed as Parameters<typeof validateReading>[0], ctx) : ["정해진 형식(JSON)으로 쓰지 않았어요"];
    if (!issues.length) {
      await db.from("ai_readings").insert({
        user_id: user.id,
        reading_key: key,
        question: ctx.question,
        result: parsed,
        via,
        model: MODEL,
        input_tokens: inTok,
        output_tokens: outTok,
        retries: attempt,
      });
      await log("ai_done", { via, model: MODEL, retries: attempt, ms: Date.now() - started, in_tok: inTok, out_tok: outTok });
      return json({ status: "done", saved: false, result: parsed, ...meta });
    }
    if (attempt + 1 < MAX_ATTEMPTS) {
      await log("ai_retry", { issues: issues.length, first: issues[0].slice(0, 60) });
      messages.push({ role: "assistant", content: res.content });
      messages.push({ role: "user", content: `아래 문제를 고쳐서 같은 형식으로 다시 써 주세요.\n${issues.map((i) => `- ${i}`).join("\n")}` });
    } else {
      return fallback("validation");
    }
  }
  return fallback("validation");
});
