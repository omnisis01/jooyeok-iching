// 점을 치기 전에 마음을 모으도록 안내하는 화면 (호흡 애니메이션과 시작 버튼)
"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Taegeuk from "./Taegeuk";
import { motionGrantedBefore, requestMotion } from "@/lib/motion";

type Props = {
  /** 예) "동전을 던져" */
  action: string;
  /** 예) "재물운" */
  topic?: string;
  question?: string;
  onReady: () => void;
};

export default function FocusGate({ action, topic, question, onReady }: Props) {
  const [seconds, setSeconds] = useState(0);

  const reduce = useReducedMotion();
  // 한 번 숨쉬기 = 들이쉬기 4초 + 내쉬기 4초
  const BREATH = 8;
  const inhale = seconds % BREATH < BREATH / 2;

  useEffect(() => {
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-card p-6 text-center shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      {/* 호흡 원: 들이쉴 때 크게 부풀고 내쉴 때 작아진다. 빛 고리가 바깥으로 퍼진다 */}
      <div className="focus-orb relative mx-auto flex h-48 w-48 items-center justify-center">
        {reduce
          ? null
          : [0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border-2 border-vermilion/70"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.25], opacity: [0.7, 0] }}
                transition={{ duration: BREATH / 2, repeat: Infinity, ease: "easeOut", delay: i * (BREATH / 4) }}
              />
            ))}
        <motion.div
          className="absolute inset-3 rounded-full bg-vermilion/25 shadow-[0_0_70px_rgba(216,69,43,0.55)]"
          animate={reduce ? { scale: 1 } : { scale: [0.72, 1, 0.72] }}
          transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="relative"
          animate={reduce ? { scale: 1 } : { scale: [0.78, 1.12, 0.78] }}
          transition={{ duration: BREATH, repeat: Infinity, ease: "easeInOut" }}
        >
          <Taegeuk size={96} className="animate-spin-slow drop-shadow-[0_8px_24px_rgba(216,69,43,0.45)]" />
        </motion.div>
      </div>
      <motion.p
        key={inhale ? "in" : "out"}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 text-lg font-bold tracking-wide text-vermilion"
        aria-live="polite"
      >
        {inhale ? "천천히 들이쉬고" : "천천히 내쉬고"}
      </motion.p>

      <p className="mt-4 text-sm font-bold text-foreground/80">잠시 눈을 감고 마음을 모아 주세요</p>
      <h2 className="mt-2 text-xl font-bold leading-snug">
        최대한 정신을 집중해서
        <br />
        {action} 주세요
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
        정신 집중이 강할수록 더 정확한 결과가 나옵니다.
        {question ? (
          <>
            <br />
            마음속으로 “{question}” 를 또렷이 떠올리세요.
          </>
        ) : topic ? (
          <>
            <br />
            {topic}에서 궁금한 것을 마음속으로 또렷이 떠올리세요.
          </>
        ) : (
          <>
            <br />
            묻고 싶은 것을 마음속으로 또렷이 떠올리세요.
          </>
        )}
      </p>
      <p className="mt-4 text-xs text-muted">원이 커지면 들이쉬고, 작아지면 내쉬세요.</p>
      <p className="mt-4 rounded-2xl bg-background px-4 py-3 text-sm leading-relaxed text-foreground/85">
        <b className="text-foreground">한 가지 질문에 한 번만 뽑아요.</b> 처음 뽑은 답이 가장 정확해요. 마음에 안 든다고 같은 질문을 다시 뽑으면 효과가 없어요.
      </p>

      <button
        onClick={() => {
          // 예전에 흔들기를 허락했다면 이 순간 조용히 다시 켠다(아이폰은 누르는 순간에만 가능)
          if (motionGrantedBefore()) requestMotion();
          onReady();
        }}
        className="mt-6 w-full rounded-full bg-vermilion py-4 text-lg font-bold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105"
      >
        {seconds < 3 ? "마음을 모으는 중" : "집중했어요, 시작하기"}
      </button>
    </motion.div>
  );
}
