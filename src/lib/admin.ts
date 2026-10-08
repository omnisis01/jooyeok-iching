// 관리자 확인과 운영 현황 조회. 관리자인지는 서버(admins 표)가 정하고, 이 기기에는 화면 표시용으로만 기억한다
import { cloudEnabled, supabase } from "./supabase";

export type AdminDashboard = {
  today: string;
  users: number;
  users_today: number;
  pro: number;
  unlocks: number;
  unlocks_today: number;
  paid_total: number;
  paid_today: number;
  push_subs: number;
  days: { day: string; name: string; n: number; people: number }[];
};

let cached: Promise<boolean> | null = null;

/** 지금 로그인한 계정이 관리자인지. 로그인이 바뀌면 resetAdmin()으로 다시 묻는다 */
export function fetchIsAdmin(): Promise<boolean> {
  if (!cloudEnabled) return Promise.resolve(false);
  cached ??= (async () => {
    const { data: s } = await supabase().auth.getSession();
    if (!s.session) return false;
    const { data, error } = await supabase().rpc("is_admin");
    return !error && data === true;
  })().catch(() => false);
  return cached;
}

export function resetAdmin() {
  cached = null;
}

export async function fetchAdminDashboard(days = 14): Promise<AdminDashboard> {
  const { data, error } = await supabase().rpc("admin_dashboard", { p_days: days });
  if (error) throw new Error(error.message.includes("admin only") ? "관리자 계정이 아니에요" : "운영 현황을 불러오지 못했어요");
  return data as AdminDashboard;
}
