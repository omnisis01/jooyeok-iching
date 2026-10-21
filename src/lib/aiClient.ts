// AI 점사풀이 서버 함수(ai-reading) 부르기와, 저장된 풀이, 권한 확인
import type { Reading } from "./iching";
import { kstDateString } from "./clock";
import { cloudEnabled, supabase } from "./supabase";
import { aiReadingKey, type AiFollowup, type AiInput, type AiReading } from "./aiReading";

export type AiEntitlement = "admin" | "pro" | "unlock" | "trial" | null;

export type AiResponse =
  | { status: "done" | "fallback"; result: AiReading; reason?: string; followup?: AiFollowup | null }
  | { status: "need_purchase" }
  | { status: "safety" };

export function aiInputOf(reading: Reading): AiInput {
  const at = reading.castAt ? Date.parse(reading.castAt) : Date.now();
  return {
    lines: reading.primary.lines,
    changing: reading.changingLines,
    category: reading.category ?? "overall",
    date: kstDateString(at),
    castAt: reading.castAt,
    question: reading.question?.trim() ? reading.question.trim().slice(0, 60) : undefined,
    context: reading.context?.trim() ? reading.context.trim().slice(0, 80) : undefined,
  };
}

async function session() {
  if (!cloudEnabled) return null;
  const { data } = await supabase().auth.getSession();
  return data.session;
}

/** 이미 만든 풀이(다시 열 때). 없으면 null */
export type AiOutcome = "hit" | "miss" | "unsure";

export async function savedAiReading(reading: Reading): Promise<{ result: AiReading; followup: AiFollowup | null; outcome: AiOutcome | null } | null> {
  const s = await session();
  if (!s) return null;
  const { data } = await supabase().from("ai_readings").select("result, followup, outcome").eq("user_id", s.user.id).eq("reading_key", aiReadingKey(aiInputOf(reading))).maybeSingle();
  return data ? { result: data.result as AiReading, followup: (data.followup as AiFollowup | null) ?? null, outcome: (data.outcome as AiOutcome | null) ?? null } : null;
}

/** 이 계정이 AI 점사풀이를 받은 결과들의 열쇠(기록 목록의 AI 표시용) */
export async function aiReadingKeys(): Promise<Set<string>> {
  const s = await session();
  if (!s) return new Set();
  const { data } = await supabase().from("ai_readings").select("reading_key").eq("user_id", s.user.id).limit(500);
  return new Set((data ?? []).map((r) => r.reading_key as string));
}

export type FollowupResponse = { status: "followup"; followup: AiFollowup } | { status: "followup_fallback" } | { status: "safety" };

/** 같은 괘로 한 번 더 묻기(결과 하나에 1회) */
export async function requestFollowup(reading: Reading, question: string): Promise<FollowupResponse> {
  const s = await session();
  if (!s) throw new Error("먼저 로그인해 주세요");
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-reading`, {
    method: "POST",
    headers: { Authorization: `Bearer ${s.access_token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ input: aiInputOf(reading), followup: question }),
  });
  const json = (await res.json().catch(() => ({}))) as FollowupResponse & { error?: string };
  if (!res.ok) throw new Error(json.error || "답을 불러오지 못했어요. 잠시 후 다시 시도해 주세요");
  return json;
}

/** 버튼 문구를 고르기 위한 권한 확인(만들지는 않는다) */
export async function aiEntitlement(reading: Reading): Promise<AiEntitlement> {
  const s = await session();
  if (!s) return null;
  const { data, error } = await supabase().rpc("ai_status", { p_key: aiReadingKey(aiInputOf(reading)) });
  if (error) return null;
  return ((data as { can?: AiEntitlement } | null)?.can ?? null) as AiEntitlement;
}

export async function requestAiReading(reading: Reading): Promise<AiResponse> {
  const s = await session();
  if (!s) throw new Error("먼저 로그인해 주세요");
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-reading`, {
    method: "POST",
    headers: { Authorization: `Bearer ${s.access_token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({ input: aiInputOf(reading) }),
  });
  const json = (await res.json().catch(() => ({}))) as AiResponse & { error?: string };
  if (!res.ok) throw new Error(json.error || "AI 점사풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요");
  return json;
}

/** AI가 짚은 날 아침에 알림 받기. 로그인과 알림 구독이 필요하다 */
export async function setReminder(date: string, readingKey: string, question: string | null, hexName: string): Promise<void> {
  const { error } = await supabase().rpc("set_reminder", { p_date: date, p_key: readingKey, p_question: question, p_hex: hexName });
  if (error) throw new Error(error.message.includes("login") ? "먼저 로그인해 주세요" : error.message.includes("date") ? "지난 날짜에는 알림을 걸 수 없어요" : "알림을 걸지 못했어요");
}

/** 그 뒤 어떻게 됐는지(맞았어요, 아니에요, 아직 몰라요) */
export async function setOutcome(reading: Reading, outcome: AiOutcome): Promise<void> {
  const { error } = await supabase().rpc("set_outcome", { p_key: aiReadingKey(aiInputOf(reading)), p_outcome: outcome });
  if (error) throw new Error("저장하지 못했어요");
}
