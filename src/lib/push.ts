// 오늘의 괘 푸시 알림 구독 (Web Push + Supabase push_subscriptions 테이블)
import { cloudEnabled, supabase } from "./supabase";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export const pushEnabled = cloudEnabled && Boolean(vapidPublicKey);

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  // 상대 경로라 GitHub Pages 하위 경로에서도 같은 폴더의 sw.js를 찾는다
  return navigator.serviceWorker.register("sw.js");
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function subscribePush(userId: string | null): Promise<void> {
  if (!pushEnabled || !pushSupported()) throw new Error("이 기기는 알림을 지원하지 않습니다");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("알림 권한이 거부되었습니다");
  const reg = await registration();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!) as BufferSource,
  });
  const json = sub.toJSON();
  const { error } = await supabase().from("push_subscriptions").upsert(
    { endpoint: sub.endpoint, keys: json.keys, user_id: userId, user_agent: navigator.userAgent.slice(0, 200) },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function unsubscribePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
