// Stripe 결제 결과(웹훅)를 받아 프리미엄 기간을 갱신하는 Edge Function
// 비밀값: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. JWT 검증 없이 배포하고 서명으로 진위를 확인한다
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !whSecret) return new Response("not configured", { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
  const signature = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, whSecret, undefined, Stripe.createSubtleCryptoProvider());
  } catch (e) {
    return new Response(`signature error: ${(e as Error).message}`, { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  async function setPremium(userId: string | null | undefined, until: number | null, customerId?: string | null) {
    if (!userId) return;
    await admin.from("profiles").upsert(
      { user_id: userId, premium_until: until ? new Date(until * 1000).toISOString() : null, ...(customerId ? { stripe_customer_id: customerId } : {}) },
      { onConflict: "user_id" },
    );
  }

  async function userIdFromCustomer(customerId: string): Promise<string | null> {
    const { data } = await admin.from("profiles").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    return (data?.user_id as string | undefined) ?? null;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id ?? s.metadata?.user_id;
      if (s.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(s.subscription));
        await setPremium(userId, sub.current_period_end, String(s.customer));
      }
      break;
    }
    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(inv.subscription));
        const userId = sub.metadata?.user_id ?? (await userIdFromCustomer(String(inv.customer)));
        await setPremium(userId, sub.current_period_end);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id ?? (await userIdFromCustomer(String(sub.customer)));
      const active = sub.status === "active" || sub.status === "trialing";
      await setPremium(userId, active ? sub.current_period_end : null);
      break;
    }
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
