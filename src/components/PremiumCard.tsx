// 홈의 Pro 카드: 혜택 안내, 카드 등록과 첫 결제, 이용 중 상태와 해지
"use client";

import { useEffect, useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import {
  PREMIUM_BENEFITS,
  PREMIUM_PRICE_KRW,
  cancelBilling,
  checkoutReturn,
  clearReturnParams,
  confirmBilling,
  fetchPremiumStatus,
  paymentsEnabled,
  provider,
  startCheckout,
  type PremiumStatus,
} from "@/lib/premium";
import { getSession, onAuthChange } from "@/lib/cloudSync";

export default function PremiumCard() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [status, setStatus] = useState<PremiumStatus>({ until: null, billingStatus: null, cardLabel: null });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!paymentsEnabled) return;
    let cancelled = false;
    const timers: number[] = [];
    const refresh = async () => {
      const s = await getSession();
      if (cancelled) return;
      setLoggedIn(Boolean(s));
      setStatus(s ? await fetchPremiumStatus() : { until: null, billingStatus: null, cardLabel: null });
    };
    const off = onAuthChange(() => refresh());
    const back = checkoutReturn();
    if (back) {
      clearReturnParams();
      timers.push(
        window.setTimeout(async () => {
          if (back.kind === "toss" && back.result === "success") {
            setMessage("카드를 확인하고 첫 달을 결제하는 중이에요");
            try {
              const r = await confirmBilling(back.authKey, back.customerKey);
              setMessage(`결제가 끝났어요. ${r.card ? r.card + " 카드로 " : ""}매달 자동으로 결제해 드려요`);
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "결제를 마치지 못했어요");
            }
            await refresh();
          } else if (back.kind === "toss") {
            setMessage(back.message);
          } else {
            setMessage(back.result === "success" ? "결제를 받았어요. 잠시 뒤 Pro를 켜 드려요" : "결제를 취소했어요");
            if (back.result === "success") timers.push(window.setTimeout(refresh, 4000));
          }
        }, 0),
      );
    }
    refresh();
    return () => {
      cancelled = true;
      off();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (!paymentsEnabled) return null;

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    setMessage(null);
    try {
      const m = await fn();
      if (m) setMessage(m);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "문제가 생겼어요");
    } finally {
      setBusy(false);
    }
  };

  const untilLabel = status.until?.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <section className="rounded-3xl bg-gradient-to-br from-foreground to-[#3a2f24] p-5 text-card shadow-[0_12px_40px_rgba(31,29,26,0.25)]">
      <div className="flex items-center gap-2">
        <Crown size={18} className="text-gold-soft" />
        <p className="font-bold">{status.until ? "Pro 이용 중" : "Pro로 더 깊게"}</p>
      </div>

      {status.until ? (
        <>
          <p className="mt-1 text-sm text-card/80">
            {untilLabel}까지 이용할 수 있어요.
            {status.billingStatus === "active" ? " 그 뒤로 매달 자동으로 결제합니다." : status.billingStatus === "cancelled" ? " 해지하셔서 자동 연장은 하지 않아요." : status.billingStatus === "failed" ? " 지난 결제가 실패했어요. 카드를 다시 등록해 주세요." : ""}
          </p>
          {status.cardLabel ? <p className="mt-1 text-xs text-card/60">등록 카드 {status.cardLabel}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {status.billingStatus === "active" ? (
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    if (!window.confirm("자동 결제를 해지할까요? 남은 기간까지는 계속 이용할 수 있어요.")) return;
                    await cancelBilling();
                    setStatus(await fetchPremiumStatus());
                    return "해지했어요. 남은 기간까지 이용할 수 있어요";
                  })
                }
                className="rounded-full bg-card/15 px-4 py-2 text-sm font-semibold text-card transition hover:bg-card/25 disabled:opacity-50"
              >
                자동 결제 해지
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => run(() => startCheckout())}
                className="rounded-full bg-vermilion px-4 py-2 text-sm font-bold text-card transition hover:brightness-105 disabled:opacity-50"
              >
                카드 다시 등록하고 자동 연장
              </button>
            )}
          </div>
        </>
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
            onClick={() =>
              run(async () => {
                if (!loggedIn) return "위의 계정 카드에서 먼저 로그인해 주세요";
                await startCheckout();
              })
            }
            className="mt-4 w-full rounded-full bg-vermilion py-3 text-sm font-bold text-card transition hover:brightness-105 disabled:opacity-50"
          >
            월 {PREMIUM_PRICE_KRW.toLocaleString("ko-KR")}원으로 시작하기
          </button>
          <p className="mt-2 text-center text-[11px] text-card/60">
            {provider === "toss" ? "카드를 한 번 등록하면 매달 자동으로 결제하고, 언제든 해지할 수 있어요. 결제는 토스페이먼츠가 안전하게 처리합니다." : "언제든 해지할 수 있어요. 결제는 Stripe가 안전하게 처리합니다."}
            {" "}
            <a href="terms/" className="underline">이용약관</a>과 <a href="privacy/" className="underline">개인정보처리방침</a>
          </p>
        </>
      )}
      {message ? <p className="mt-3 text-xs text-gold-soft">{message}</p> : null}
    </section>
  );
}
