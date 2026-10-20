// Claude 호출, 검증, 한 번 다시 쓰기. ai-reading(서비스)과 ai-eval(품질 시험)이 함께 쓴다
import Anthropic from "npm:@anthropic-ai/sdk";
import { AI_SCHEMA, AI_SYSTEM, buildUserMessage, validateReading } from "./aiReading.js";

export type GenerateResult =
  | { ok: true; result: unknown; attempts: number; inTok: number; outTok: number; issues: string[] }
  | { ok: false; reason: string; attempts: number; inTok: number; outTok: number; issues: string[]; refusalCategory?: string | null };

export async function generate(ctx: Parameters<typeof buildUserMessage>[0], model: string, apiKey: string, maxAttempts = 2, onRetry?: (issues: string[]) => void): Promise<GenerateResult> {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 45_000 });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: buildUserMessage(ctx) }];
  let inTok = 0;
  let outTok = 0;
  let issues: string[] = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res: Anthropic.Message;
    try {
      res = await client.messages.create({
        model,
        max_tokens: 4000,
        system: [{ type: "text", text: AI_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages,
        output_config: { effort: "low", format: { type: "json_schema", schema: AI_SCHEMA } },
      });
    } catch (e) {
      const status = e instanceof Anthropic.APIError ? e.status : "network";
      return { ok: false, reason: `api_${status}`, attempts: attempt + 1, inTok, outTok, issues };
    }
    inTok += res.usage.input_tokens + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0);
    outTok += res.usage.output_tokens;
    if (res.stop_reason === "refusal") return { ok: false, reason: "refusal", attempts: attempt + 1, inTok, outTok, issues, refusalCategory: res.stop_details?.category ?? null };
    const text = res.content.find((b) => b.type === "text")?.text ?? "";
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    issues = parsed ? validateReading(parsed as Parameters<typeof validateReading>[0], ctx) : ["정해진 형식(JSON)으로 쓰지 않았어요"];
    if (!issues.length) return { ok: true, result: parsed, attempts: attempt + 1, inTok, outTok, issues };
    if (attempt + 1 < maxAttempts) {
      onRetry?.(issues);
      messages.push({ role: "assistant", content: res.content });
      messages.push({ role: "user", content: `아래 문제를 고쳐서 같은 형식으로 다시 써 주세요.\n${issues.map((i) => `- ${i}`).join("\n")}` });
    }
  }
  return { ok: false, reason: "validation", attempts: maxAttempts, inTok, outTok, issues };
}
