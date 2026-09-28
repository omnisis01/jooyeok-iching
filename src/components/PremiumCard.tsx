// 홈의 프리미엄 카드: 혜택 안내, 결제 페이지 이동, 결제 후 상태 표시
"use client";

import { useEffect, useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { PREMIUM_BENEFITS, checkoutReturn, fetchPremiumUntil, paymentsEnabled, startCheckout } from "@/lib/premium";
import { getSession, onAuthChange } from "@/lib/cloudSync";

export default function PremiumCard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [until, setUntil] = useState<Date | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!paymentsEnabled) return;
    let cancelled = false;
    const refresh = async () => {
      const s = await getSession();
      if (cancelled) return;
      setLoggedIn(Boolean(s));
      setUntil(s ? await fetchPremiumUntil() : null);
    };
    refresh();
    const off = onAuthChange(() => refresh());
    const back = checkoutReturn();
    const timers: number[] = [];
    if (back) {
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      // 상태 문구는 다음 틱에 넣고, 성공이면 웹훅 처리 시간을 두고 다시 읽는다
      timers.push(window.setTimeout(() => setStatus(back === "success" ? "결제가 접수되었어요. 잠시 뒤 프리미엄이 켜집니다" : "결제를 취소했어요"), 0));
      if (back === "success") timers.push(window.setTimeout(refresh, 4000));
    }
    return () => {
      cancelled = true;
      off();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (!paymentsEnabled) return null;

  return (
    <section className="rounded-3xl bg-gradient-to-br from-foreground to-[#3a2f24] p-5 text-card shadow-[0_12px_40px_rgba(31,29,26,0.25)]">
      <div className="flex items-center gap-2">
        <Crown size={18} className="text-gold-soft" />
        <p className="font-bold">{until ? "프리미엄 이용 중" : "주역 마스터 프리미엄"}</p>
      </div>
      {until ? (
        <p className="mt-1 text-sm text-card/80">{until.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}까지 이용할 수 있어요. 고맙습니다.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-1.5 text-sm text-card/85">
            {PREMIUM_BENEFITS.map((b) => (
              <li key={b} className="flex gap-2">
                <Sparkles size={14} className="mt-1 shrink-0 text-gold-soft" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setStatus(null);
              try {
                if (!loggedIn) {
                  setStatus("위의 계정 카드에서 먼저 로그인해 주세요");
                  return;
                }
                await startCheckout();
              } catch (e) {
                setStatus(e instanceof Error ? e.message : "문제가 생겼어요");
              } finally {
                setBusy(false);
              }
            }}
            className="mt-4 w-full rounded-full bg-vermilion py-3 text-sm font-bold text-card transition hover:brightness-105 disabled:opacity-50"
          >
            월 4,900원으로 시작하기
          </button>
          <p className="mt-2 text-center text-[11px] text-card/60">언제든 해지할 수 있어요. 결제는 Stripe에서 안전하게 처리됩니다.</p>
        </>
      )}
      {status ? <p className="mt-3 text-xs text-gold-soft">{status}</p> : null}
    </section>
  );
}
