// 로그인한 사용자를 위해 Stripe 결제 페이지(Checkout Session)를 만들어 주소를 돌려주는 Edge Function
// 비밀값: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, SITE_URL (Edge Function Secrets)
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: CORS });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const priceId = Deno.env.get("STRIPE_PRICE_ID");
  const siteUrl = Deno.env.get("SITE_URL") ?? "https://omnisis01.github.io/jooyeok-iching/";
  if (!stripeKey || !priceId) return new Response("payments not configured", { status: 500, headers: CORS });

  // 요청에 실린 사용자 토큰으로 본인 확인
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return new Response("unauthorized", { status: 401, headers: CORS });
  const user = userData.user;

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

  // 같은 사용자는 같은 Stripe 고객으로 묶는다
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  let customerId = profile?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customerId = customer.id;
    await admin.from("profiles").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}?checkout=success#home`,
    cancel_url: `${siteUrl}?checkout=cancel#home`,
    locale: "ko",
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  });

  return new Response(JSON.stringify({ url: session.url }), { headers: { ...CORS, "Content-Type": "application/json" } });
});
