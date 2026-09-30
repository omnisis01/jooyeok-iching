// 아침(매일)과 밤(일요일)에 "지금 뽑어 볼 이유"를 담은 푸시를 모든 구독자에게 보내는 Supabase Edge Function (Deno)
// 요청 본문 { "slot": "morning" | "evening" }. 없으면 한국 시간으로 정오 전은 아침, 뒤는 밤으로 본다
// 비밀 값은 Edge Function Secrets에만 둔다: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import hexagrams from "./hexagrams.json" with { type: "json" };
import { buildMessage, type Slot } from "./messages.ts";

type Hex = { number: number; name: string; hanja: string; keyword: string; advice: string };

/** 앱의 dailyHexagram과 같은 해시. 한국 시간 기준 날짜 문자열을 쓴다 */
function dailyHexagram(dateStr: string): Hex {
  let h = 0;
  for (const ch of dateStr) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
  return (hexagrams as Hex[])[h % (hexagrams as Hex[]).length];
}

function kstNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}
function kstDateString(): string {
  return kstNow().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  // 서비스 키로 호출된 요청만 허용한다 (cron이 Authorization 헤더로 보낸다)
  // 예전 형식(service_role JWT)과 새 형식(sb_secret_...) 비밀 키 둘 다 받는다
  const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const secretKeys = (Deno.env.get("SUPABASE_SECRET_KEYS") ?? "").split(/[,\s\[\]"]+/).filter(Boolean);
  const allowed = [serviceKey, ...secretKeys].filter(Boolean);
  if (!auth || !allowed.includes(auth)) {
    return new Response("unauthorized", { status: 401 });
  }

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
  if (!vapidPublic || !vapidPrivate) return new Response("vapid keys missing", { status: 500 });
  webpush.setVapidDetails(subject, vapidPublic, vapidPrivate);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data: subs, error } = await supabase.from("push_subscriptions").select("endpoint, keys, fail_count").lt("fail_count", 5);
  if (error) return new Response(error.message, { status: 500 });

  let slot: Slot | undefined;
  try {
    const body = await req.json();
    if (body?.slot === "morning" || body?.slot === "evening") slot = body.slot;
  } catch {
    // 본문이 없으면 시간으로 정한다
  }
  slot ??= kstNow().getUTCHours() < 12 ? "morning" : "evening";
  const hex = dailyHexagram(kstDateString());
  const message = buildMessage(kstDateString(), slot, hex);
  if (!message) {
    return new Response(JSON.stringify({ date: kstDateString(), slot, sent: 0, skipped: true }), { headers: { "Content-Type": "application/json" } });
  }
  const payload = JSON.stringify(message);

  let sent = 0;
  let removed = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 12 });
      await supabase.from("push_subscriptions").update({ last_sent_at: new Date().toISOString(), fail_count: 0 }).eq("endpoint", s.endpoint);
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
        removed++;
      } else {
        await supabase.from("push_subscriptions").update({ fail_count: (s.fail_count ?? 0) + 1 }).eq("endpoint", s.endpoint);
      }
    }
  }

  return new Response(JSON.stringify({ date: kstDateString(), slot, reason: message.reason, title: message.title, sent, removed }), {
    headers: { "Content-Type": "application/json" },
  });
});
