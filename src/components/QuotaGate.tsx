// 오늘 남은 무료 횟수를 보여주고, 다 쓰면 공유 쿠폰이나 Pro로 안내하는 카드
"use client";

import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { FREE_PER_DAY, FREE_PER_DAY_GUEST, SHARE_COUPONS_PER_DAY, quotaState, type QuotaState } from "@/lib/quota";
import { msUntilKstMidnight } from "@/lib/clock";
import { paymentsEnabled } from "@/lib/premium";
import ShareForCoupon from "./ShareForCoupon";
import { track } from "@/lib/track";

export function useQuota(): QuotaState {
  const [state, setState] = useState<QuotaState>({ premium: false, guest: true, free: FREE_PER_DAY_GUEST, used: 0, coupons: 0, shares: 0, remaining: FREE_PER_DAY_GUEST, canShareForCoupon: true });
  useEffect(() => {
    let midnight: number | undefined;
    const sync = () => {
      setState(quotaState());
      // 앱을 켜 둔 채 한국 자정을 넘기면 바로 다시 채운다
      window.clearTimeout(midnight);
      midnight = window.setTimeout(sync, msUntilKstMidnight() + 1000);
    };
    const t = window.setTimeout(sync, 0);
    window.addEventListener("quota-changed", sync);
    // 다른 앱에 갔다 돌아왔을 때도 날짜를 다시 본다
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(midnight);
      window.removeEventListener("quota-changed", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return state;
}

/** 남은 횟수 한 줄 표시 */
export function QuotaBadge() {
  const q = useQuota();
  if (q.premium) return <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold">Pro, 횟수 제한 없음</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-bold text-foreground">
      <Ticket size={12} /> 오늘 남은 무료 점괘 {q.remaining}회
      {q.guest && FREE_PER_DAY_GUEST < FREE_PER_DAY ? <span className="font-normal text-muted">(로그인하면 하루 {FREE_PER_DAY}회)</span> : null}
    </span>
  );
}

/** 횟수를 다 썼을 때 보여주는 안내. 남아 있으면 아무것도 그리지 않는다 */
export default function QuotaGate({ onGoPremium }: { onGoPremium?: () => void }) {
  const q = useQuota();
  const exhausted = !q.premium && q.remaining <= 0;
  useEffect(() => {
    if (exhausted) track("quota_exhausted", { guest: q.guest }, { oncePerSession: true });
  }, [exhausted, q.guest]);
  if (!exhausted) return null;
  return (
    <section className="rounded-3xl bg-card p-6 text-center shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <Ticket size={28} className="mx-auto text-vermilion" />
      <h3 className="mt-3 text-lg font-bold">오늘의 무료 점괘 {q.free}회를 모두 썼어요</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">주역은 한 질문에 한 번만 뽑고, 하루에도 정성껏 몇 번만 치는 것이 좋다고 해요. 그래도 다른 것을 더 묻고 싶다면 아래 방법이 있어요.</p>
      {q.guest && FREE_PER_DAY_GUEST < FREE_PER_DAY ? (
        <button
          onClick={() => {
            track("login_prompt", { where: "quota" });
            window.location.hash = "home";
            window.setTimeout(() => document.getElementById("account")?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
          }}
          className="mt-5 w-full rounded-full bg-foreground px-5 py-3 text-sm font-bold text-card transition hover:opacity-90"
        >
          이메일로 로그인하고 하루 {FREE_PER_DAY}번 보기
        </button>
      ) : null}
      <ShareForCoupon className="mt-3" label="친구에게 공유하고 한 번 더 뽑기" />
      {paymentsEnabled ? (
        <button onClick={() => { track("pro_click", { where: "quota" }); onGoPremium?.(); }} className="mt-3 w-full rounded-full bg-vermilion px-5 py-3 text-sm font-bold text-card transition hover:brightness-105">
          Pro로 횟수 제한 없이 보기
        </button>
      ) : null}
      <p className="mt-4 text-xs text-muted">무료 횟수는 매일 밤 12시(한국 시간)에 충전돼요. 친구에게 공유하면 하루 {SHARE_COUPONS_PER_DAY}번까지 한 번씩 더 뽑을 수 있어요.</p>
    </section>
  );
}
