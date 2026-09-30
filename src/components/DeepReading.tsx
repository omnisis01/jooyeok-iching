// 결과 하나의 "깊이 읽기": 운세 6분류 전부, 지괘의 분류별 풀이, 같은 괘를 육효로 다시 읽기
// Pro이거나 건별 결제로 열었을 때만 펼쳐진다. 결제가 꺼져 있으면 카드 자체를 보이지 않는다
"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Lock, Sparkles } from "lucide-react";
import type { Reading } from "@/lib/iching";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { categoryReading } from "@/data/categoryReadings";
import { analyzeYukhyo } from "@/lib/yukhyo";
import { UNLOCK_PRICE_KRW, isUnlockedLocal, isUnlockedRemote, readingKey, startUnlock, unlockEnabled } from "@/lib/unlock";
import { getSession } from "@/lib/cloudSync";
import YukhyoResult from "./YukhyoResult";

export default function DeepReading({ reading }: { reading: Reading }) {
  const key = readingKey(reading);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!unlockEnabled) return;
    let cancelled = false;
    isUnlockedRemote(key).then((v) => !cancelled && setUnlocked(v));
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!unlockEnabled) return null;
  const state = unlocked ?? isUnlockedLocal(key);
  const cat = categoryOf(reading.category);

  const buy = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (!(await getSession())) {
        setMessage("홈의 계정 카드에서 먼저 로그인해 주세요. 결제 내역이 계정에 남아요");
        return;
      }
      await startUnlock(reading, `${reading.primary.name} ${cat.label}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "결제를 시작하지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl bg-card shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <button onClick={() => (state ? setOpen((o) => !o) : undefined)} className="flex w-full items-center justify-between px-5 py-4 text-left" aria-expanded={state ? open : undefined}>
        <span className="flex items-center gap-2 font-bold">
          {state ? <Sparkles size={18} className="text-gold-soft" /> : <Lock size={18} className="text-muted" />}이 결과 깊이 읽기
        </span>
        {state ? <ChevronDown size={18} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} /> : <span className="text-xs font-bold text-vermilion">{UNLOCK_PRICE_KRW.toLocaleString("ko-KR")}원</span>}
      </button>

      {!state ? (
        <div className="px-5 pb-5">
          <ul className="space-y-1.5 text-sm leading-relaxed text-foreground/85">
            <li>운세 여섯 가지(총운, 재물, 애정, 합격, 계약, 건강)를 이 괘로 한꺼번에 읽어요.</li>
            <li>지괘의 운세별 풀이로 앞으로의 흐름을 분류별로 봐요.</li>
            <li>같은 괘를 육효로 다시 읽어 언제쯤 이루어질지까지 봐요.</li>
          </ul>
          <button disabled={busy} onClick={buy} className="mt-4 w-full rounded-full bg-vermilion py-3 font-bold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] disabled:opacity-50">
            {UNLOCK_PRICE_KRW.toLocaleString("ko-KR")}원으로 이 결과 열기
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">한 번 결제한 결과는 기록에서 언제든 다시 볼 수 있어요. Pro는 모든 결과가 열려 있어요.</p>
          {message ? <p className="mt-2 text-center text-xs text-vermilion">{message}</p> : null}
        </div>
      ) : open ? (
        <div className="space-y-5 px-5 pb-5">
          <div>
            <h4 className="text-sm font-bold text-muted">운세별로 보면</h4>
            <dl className="mt-2 space-y-3">
              {CATEGORIES.map((c) => (
                <div key={c.key} className={`rounded-2xl p-3 ${c.key === cat.key ? "bg-vermilion/8" : "bg-background"}`}>
                  <dt className="text-sm font-bold">{c.label}</dt>
                  <dd className="mt-1 text-[15px] leading-relaxed text-foreground/85">{categoryReading(reading.primary.number, c.key)}</dd>
                </div>
              ))}
            </dl>
          </div>
          {reading.resulting ? (
            <div>
              <h4 className="text-sm font-bold text-jade">앞으로의 흐름, 지괘 {reading.resulting.name}을 운세별로</h4>
              <dl className="mt-2 space-y-3">
                {CATEGORIES.map((c) => (
                  <div key={c.key} className="rounded-2xl bg-background p-3">
                    <dt className="text-sm font-bold">{c.label}</dt>
                    <dd className="mt-1 text-[15px] leading-relaxed text-foreground/85">{categoryReading(reading.resulting!.number, c.key)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          <div>
            <h4 className="text-sm font-bold text-muted">같은 괘를 육효로 다시 읽으면</h4>
            <div className="mt-2">
              <YukhyoResult
                result={analyzeYukhyo({ lines: reading.primary.lines, changingLines: reading.changingLines, category: cat.key, date: (reading.castAt ?? new Date().toISOString()).slice(0, 10), castAt: reading.castAt })}
                onRestart={() => setOpen(false)}
                saveToHistory={false}
                embedded
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
