// 로그인과 점 기록의 클라우드 동기화 (Supabase readings 테이블 ↔ localStorage)
import type { Session } from "@supabase/supabase-js";
import { cloudEnabled, supabase } from "./supabase";
import { loadHistory, saveRecordSilently, type HistoryRecord } from "./history";
import { SITE_URL } from "./shareCard";

export async function getSession(): Promise<Session | null> {
  if (!cloudEnabled) return null;
  const { data } = await supabase().auth.getSession();
  return data.session;
}

export function onAuthChange(cb: (session: Session | null) => void): () => void {
  if (!cloudEnabled) return () => {};
  const { data } = supabase().auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

/** 이메일로 로그인 링크를 보낸다 (비밀번호 없음) */
export async function sendMagicLink(email: string): Promise<void> {
  const redirect = typeof window !== "undefined" ? window.location.origin + window.location.pathname : SITE_URL;
  const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}

type Row = { id: string; payload: HistoryRecord; created_at: string };

/** 서버의 기록을 받아 로컬과 합친다. 같은 id는 한 번만 남긴다 */
export async function pullRemote(): Promise<number> {
  const { data, error } = await supabase().from("readings").select("id, payload, created_at").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const local = new Set(loadHistory().map((r) => r.id));
  let added = 0;
  for (const row of (data ?? []) as Row[]) {
    if (!local.has(row.id)) {
      saveRecordSilently(row.payload);
      added++;
    }
  }
  window.dispatchEvent(new Event("history-changed"));
  return added;
}

/** 로컬 기록 중 서버에 없는 것을 올린다 */
export async function pushLocal(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;
  const local = loadHistory();
  if (!local.length) return 0;
  const rows = local.map((r) => ({ id: r.id, user_id: session.user.id, payload: r, created_at: r.at }));
  const { error } = await supabase().from("readings").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function pushOne(record: HistoryRecord): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await supabase().from("readings").upsert({ id: record.id, user_id: session.user.id, payload: record, created_at: record.at }, { onConflict: "id", ignoreDuplicates: true });
}

export async function deleteRemote(id: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await supabase().from("readings").delete().eq("id", id);
}

export async function syncAll(): Promise<{ pulled: number; pushed: number }> {
  const pushed = await pushLocal();
  const pulled = await pullRemote();
  return { pulled, pushed };
}
