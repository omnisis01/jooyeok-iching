// Supabase 클라이언트. 공개용(anon) 키만 쓰며, 키가 없으면 클라우드 기능을 끈다
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const cloudEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!cloudEnabled) throw new Error("클라우드 기능이 설정되지 않았습니다");
  if (!client) client = createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
