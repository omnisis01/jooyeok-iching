// 척전법: 동전 3개를 6번 던져 아래 효부터 괘를 쌓는 인터랙티브 화면
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Coins, FastForward, Sparkles } from "lucide-react";
import {
  LINE_NAMES,
  LINE_VALUE_LABEL,
  isChanging,
  isYang,
  readingFromValues,
  tossCoins,
  type CoinToss,
  type LineValue,
  type Reading,
} from "@/lib/iching";
import HexagramFigure from "./HexagramFigure";

type Props = {
  question?: string;
  onComplete: (reading: Reading) => void;
};

const TOSS_MS = 1100;

export default function CoinCasting({ question, onComplete }: Props) {
  const [tosses, setTosses] = useState<CoinToss[]>([]);
  const [tossing, setTossing] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const pending = useRef<CoinToss | null>(null);

  const done = tosses.length >= 6;

  const toss = useCallback(() => {
    if (tossing || done) return;
    pending.current = tossCoins();
    setTossing(true);
    setSpinKey((k) => k + 1);
    window.setTimeout(() => {
      if (pending.current) {
        const next = pending.current;
        setTosses((prev) => {
          const updated = [...prev, next];
          if (updated.length >= 6) setAutoRun(false);
          return updated;
        });
      }
      pending.current = null;
      setTossing(false);
    }, TOSS_MS);
  }, [tossing, done]);

  useEffect(() => {
    if (!autoRun || tossing || done) return;
    const t = window.setTimeout(toss, 350);
    return () => window.clearTimeout(t);
  }, [autoRun, tossing, done, toss]);

  const values = tosses.map((t) => t.value);
  const lines = values.map((v) => (isYang(v) ? "1" : "0")).join("").padEnd(6, "0");
  const changing = values.flatMap((v, i) => (isChanging(v) ? [i] : []));
  const last = tosses[tosses.length - 1];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      {/* 동전 영역 */}
      <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card/70 p-6 sm:p-10">
        <p className="text-sm text-muted">
          {done ? "여섯 효가 모두 나왔습니다" : `${tosses.length + 1}번째 던지기 · ${LINE_NAMES[tosses.length]}`}
        </p>

        <div className="my-10 flex items-center justify-center gap-4 sm:gap-8" style={{ perspective: 900 }}>
          {[0, 1, 2].map((i) => (
            <Coin
              key={i}
              index={i}
              spinKey={spinKey}
              tossing={tossing}
              face={last ? last.coins[i] : null}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tossing ? (
            <motion.p key="tossing" className="h-6 text-gold-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              동전이 공중에서 돌고 있습니다…
            </motion.p>
          ) : last ? (
            <motion.p key={tosses.length} className="h-6 text-sm text-foreground/90" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {last.coins.map((c) => (c ? "앞" : "뒤")).join(" · ")} → 합 {last.value}, <b>{LINE_VALUE_LABEL[last.value]}</b>
            </motion.p>
          ) : (
            <p className="h-6 text-sm text-muted">앞면 3점, 뒷면 2점. 세 동전의 합이 효를 정합니다.</p>
          )}
        </AnimatePresence>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {!done ? (
            <>
              <button
                onClick={toss}
                disabled={tossing || autoRun}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-semibold text-ink shadow-lg shadow-gold/20 transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Coins size={18} /> 동전 던지기
              </button>
              <button
                onClick={() => setAutoRun(true)}
                disabled={tossing || autoRun}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm text-foreground/80 transition hover:border-gold/60 hover:text-foreground disabled:opacity-50"
              >
                <FastForward size={16} /> 남은 효 한 번에 던지기
              </button>
            </>
          ) : (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => onComplete(readingFromValues(values as LineValue[], question))}
              className="inline-flex items-center gap-2 rounded-full bg-vermilion px-7 py-3 font-semibold text-paper shadow-lg shadow-vermilion/30 transition hover:brightness-110"
            >
              <Sparkles size={18} /> 괘 풀이 보기
            </motion.button>
          )}
        </div>
      </div>

      {/* 쌓이는 괘 */}
      <div className="flex flex-col items-center rounded-3xl border border-border bg-card/40 p-6">
        <p className="text-sm text-muted">아래 효부터 쌓입니다</p>
        <div className="my-6 text-gold-soft">
          <HexagramFigure lines={lines} revealed={tosses.length} changing={changing} size={150} />
        </div>
        <ol className="w-full space-y-1.5 text-sm">
          {LINE_NAMES.map((name, i) => {
            const t = tosses[i];
            return (
              <li
                key={name}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  t ? "bg-background/60" : "text-muted/60"
                } ${i === tosses.length && !done ? "ring-1 ring-gold/50" : ""}`}
              >
                <span>{name}</span>
                {t ? (
                  <span className="flex items-center gap-2">
                    <span className="text-muted">{t.coins.map((c) => (c ? "○" : "●")).join("")}</span>
                    <span className={isChanging(t.value) ? "text-vermilion" : ""}>
                      {isYang(t.value) ? "양" : "음"}
                      {isChanging(t.value) ? " (변효)" : ""}
                    </span>
                  </span>
                ) : (
                  <span>—</span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-muted">○ 앞면 ● 뒷면 · 빨간 효는 변하는 효(변효)</p>
      </div>
    </div>
  );
}

function Coin({ index, spinKey, tossing, face }: { index: number; spinKey: number; tossing: boolean; face: boolean | null }) {
  const spins = 4 + index;
  return (
    <motion.div
      key={spinKey}
      className="relative h-20 w-20 sm:h-24 sm:w-24"
      style={{ transformStyle: "preserve-3d" }}
      initial={false}
      animate={
        tossing
          ? { rotateX: spins * 360, y: [0, -110 - index * 12, 0], rotateZ: [0, index % 2 ? 25 : -25, 0] }
          : { rotateX: face === false ? 180 : 0, y: 0, rotateZ: 0 }
      }
      transition={tossing ? { duration: TOSS_MS / 1000, ease: "easeInOut" } : { duration: 0.4 }}
    >
      <CoinFace side="front" />
      <CoinFace side="back" />
    </motion.div>
  );
}

function CoinFace({ side }: { side: "front" | "back" }) {
  const isFront = side === "front";
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center rounded-full border-4 shadow-xl ${
        isFront
          ? "border-gold-soft bg-[radial-gradient(circle_at_35%_30%,#f1dc9a,#c9a44a_60%,#8d6f24)] text-ink"
          : "border-[#6b7a8f] bg-[radial-gradient(circle_at_35%_30%,#a9b4c4,#5d6b80_60%,#2f3745)] text-paper"
      }`}
      style={{ backfaceVisibility: "hidden", transform: isFront ? "rotateX(0deg)" : "rotateX(180deg)" }}
    >
      <div className="absolute h-5 w-5 rounded-sm border-2 border-current/40 bg-card/70" />
      <span className="absolute -translate-y-6 text-[11px] font-bold tracking-widest">{isFront ? "陽" : "陰"}</span>
      <span className="absolute translate-y-6 text-[11px] font-bold tracking-widest">{isFront ? "三" : "二"}</span>
      <span className="absolute -translate-x-6 text-[10px] font-semibold">{isFront ? "通" : "陰"}</span>
      <span className="absolute translate-x-6 text-[10px] font-semibold">{isFront ? "寶" : "陽"}</span>
    </div>
  );
}
