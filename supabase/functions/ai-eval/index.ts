// AI 풀이 품질 시험용(운영자 전용). 시험할 때만 잠깐 넣는 비밀값 AI_EVAL_TOKEN으로만 열리고, 아무것도 저장하지 않는다
// AI_EVAL_TOKEN이 없으면 항상 닫혀 있다(시험이 끝나면 지운다)
// 같은 입력을 모델별로 만들어 검증 결과와 토큰 수를 돌려준다
import { CORS, json } from "../_shared/toss.ts";
import { buildContext, fallbackReading, isValidInput } from "../_shared/aiReading.js";
import { generate } from "../_shared/aiGenerate.ts";

const ALLOWED = new Set(["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const auth = req.headers.get("Authorization") ?? "";
  const evalToken = Deno.env.get("AI_EVAL_TOKEN");
  if (!evalToken || evalToken.length < 32 || auth !== `Bearer ${evalToken}`) return json({ error: "unauthorized" }, 401);
  const body = (await req.json().catch(() => ({}))) as { input?: unknown; model?: string };
  const input = body.input as Parameters<typeof isValidInput>[0];
  if (!input || !isValidInput(input) || !body.model || !ALLOWED.has(body.model)) return json({ error: "bad input" }, 400);
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "no key" }, 500);
  const ctx = buildContext(input);
  const started = Date.now();
  const retries: string[][] = [];
  const g = await generate(ctx, body.model, apiKey, 2, (i) => retries.push(i));
  return json({ ...g, retries, ms: Date.now() - started, timing: ctx.yukhyo.timing, fallback: g.ok ? null : fallbackReading(ctx), primary: ctx.primary.name, resulting: ctx.resulting?.name ?? null });
});
