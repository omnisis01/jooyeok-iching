// 오늘 남은 무료 횟수를 보여주고, 다 쓰면 공유 쿠폰이나 프리미엄으로 안내하는 카드
"use client";

import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { FREE_PER_DAY, quotaState, type QuotaState } from "@/lib/quota";
import { paymentsEnabled } from "@/lib/premium";
import ShareForCoupon from "./ShareForCoupon";

export function useQuota(): QuotaState {
  const [state, setState] = useState<QuotaState>({ premium: false, used: 0, coupons: 0, shares: 0, remaining: FREE_PER_DAY, canShareForCoupon: true });
  useEffect(() => {
    const sync = () => setState(quotaState());
    const t = window.setTimeout(sync, 0);
    window.addEventListener("quota-changed", sync);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("quota-changed", sync);
    };
  }, []);
  return state;
}

/** 남은 횟수 한 줄 표시 */
export function QuotaBadge() {
  const q = useQuota();
  if (q.premium) return <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold">프리미엄, 횟수 제한 없음</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-bold text-foreground">
      <Ticket size={12} /> 오늘 남은 무료 점 {q.remaining}회
    </span>
  );
}

/** 횟수를 다 썼을 때 보여주는 안내. 남아 있으면 아무것도 그리지 않는다 */
export default function QuotaGate({ onGoPremium }: { onGoPremium?: () => void }) {
  const q = useQuota();
  if (q.premium || q.remaining > 0) return null;
  return (
    <section className="rounded-3xl bg-card p-6 text-center shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <Ticket size={28} className="mx-auto text-vermilion" />
      <h3 className="mt-3 text-lg font-bold">오늘의 무료 점 {FREE_PER_DAY}회를 모두 썼어요</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">주역은 한 질문에 한 번만 뽑고, 하루에도 정성껏 몇 번만 치는 것이 좋다고 해요. 그래도 다른 것을 더 묻고 싶다면 아래 방법이 있어요.</p>
      <ShareForCoupon className="mt-5" label="친구에게 공유하고 한 번 더 뽑기" />
      {paymentsEnabled ? (
        <button onClick={onGoPremium} className="mt-3 w-full rounded-full bg-vermilion px-5 py-3 text-sm font-bold text-card transition hover:brightness-105">
          프리미엄으로 횟수 제한 없이 보기
        </button>
      ) : null}
      <p className="mt-4 text-xs text-muted">무료 횟수는 매일 자정에 다시 채워져요.</p>
    </section>
  );
}
