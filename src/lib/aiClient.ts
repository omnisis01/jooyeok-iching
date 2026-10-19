// AI 풀이 서버 함수(ai-reading) 부르기와, 저장된 풀이, 권한 확인
import type { Reading } from "./iching";
import { kstDateString } from "./clock";
import { cloudEnabled, supabase } from "./supabase";
import { aiReadingKey, type AiInput, type AiReading } from "./aiReading";

export type AiEntitlement = "admin" | "pro" | "unlock" | "trial" | null;

export type AiResponse =
  | { status: "done" | "fallback"; result: AiReading; reason?: string }
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
  };
}

async function session() {
  if (!cloudEnabled) return null;
  const { data } = await supabase().auth.getSession();
  return data.session;
}

/** 이미 만든 풀이(다시 열 때). 없으면 null */
export async function savedAiReading(reading: Reading): Promise<AiReading | null> {
  const s = await session();
  if (!s) return null;
  const { data } = await supabase().from("ai_readings").select("result").eq("user_id", s.user.id).eq("reading_key", aiReadingKey(aiInputOf(reading))).maybeSingle();
  return (data?.result as AiReading | undefined) ?? null;
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
  if (!res.ok) throw new Error(json.error || "AI 풀이를 불러오지 못했어요. 잠시 후 다시 시도해 주세요");
  return json;
}
