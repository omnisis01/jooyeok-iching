// 운영 지표용 사용 기록. 이메일, 질문 글, 결과 내용 같은 개인 정보는 보내지 않는다
// 실패해도 화면에는 영향이 없다
import { cloudEnabled, supabase } from "./supabase";

export type EventName =
  | "app_open" | "cast_start" | "cast_done" | "quota_exhausted" | "login_prompt" | "login_link_sent" | "login_done"
  | "share_image" | "share_coupon" | "push_on" | "push_off" | "deep_view" | "deep_buy_click" | "guide_open"
  | "wheel_open" | "daily_card" | "pro_click";

const ANON_KEY = "jooyeok-master-anon-id";
let userId: string | null = null;
const once = new Set<string>();

function anonId(): string | null {
  try {
    let v = localStorage.getItem(ANON_KEY);
    if (!v) {
      v = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).toLowerCase();
      localStorage.setItem(ANON_KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}

/** 로그인 상태가 바뀌면 부른다 */
export function setTrackUser(id: string | null) {
  userId = id;
}

/** 사건 하나를 남긴다. props에는 짧은 값(방법, 분류, 개수)만 */
export function track(name: EventName, props: Record<string, string | number | boolean> = {}, opts: { oncePerSession?: boolean } = {}) {
  if (!cloudEnabled || typeof window === "undefined") return;
  if (opts.oncePerSession) {
    const k = name + JSON.stringify(props);
    if (once.has(k)) return;
    once.add(k);
  }
  const row = { name, props, anon_id: anonId(), user_id: userId };
  // 화면을 막지 않도록 기다리지 않는다
  void supabase().from("events").insert(row).then(() => undefined, () => undefined);
}
