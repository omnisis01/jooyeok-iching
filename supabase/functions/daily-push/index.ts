// 매일 아침 오늘의 괘를 모든 푸시 구독자에게 보내는 Supabase Edge Function (Deno)
// 비밀 값은 Edge Function Secrets에만 둔다: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import hexagrams from "./hexagrams.json" with { type: "json" };

type Hex = { number: number; name: string; hanja: string; keyword: string; advice: string };

/** 앱의 dailyHexagram과 같은 해시. 한국 시간 기준 날짜 문자열을 쓴다 */
function dailyHexagram(dateStr: string): Hex {
  let h = 0;
  for (const ch of dateStr) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
  return (hexagrams as Hex[])[h % (hexagrams as Hex[]).length];
}

function kstDateString(): string {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  // 서비스 키로 호출된 요청만 허용한다 (cron이 Authorization 헤더로 보낸다)
  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
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

  const hex = dailyHexagram(kstDateString());
  const payload = JSON.stringify({
    title: `오늘의 괘, ${hex.name} ${hex.hanja}`,
    body: `${hex.keyword}. ${hex.advice}`,
    url: "./#home",
  });

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

  return new Response(JSON.stringify({ date: kstDateString(), hexagram: hex.name, sent, removed }), {
    headers: { "Content-Type": "application/json" },
  });
});
