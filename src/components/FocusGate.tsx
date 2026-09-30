// 점을 치기 전에 마음을 모으도록 안내하는 화면 (호흡 애니메이션과 시작 버튼)
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import Taegeuk from "./Taegeuk";

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

  useEffect(() => {
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-card p-6 text-center shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <motion.div
        className="focus-orb mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-vermilion/8"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Taegeuk size={88} className="animate-spin-slow drop-shadow-[0_6px_18px_rgba(216,69,43,0.25)]" />
      </motion.div>

      <p className="mt-6 text-sm font-bold text-vermilion">잠시 눈을 감고 마음을 모아 주세요</p>
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
            {topic}에 대해 궁금한 것을 마음속으로 또렷이 떠올리세요.
          </>
        ) : (
          <>
            <br />
            묻고 싶은 것을 마음속으로 또렷이 떠올리세요.
          </>
        )}
      </p>
      <p className="mt-4 text-xs text-muted">천천히 숨을 들이쉬고 내쉬며 원이 커졌다 작아지는 것을 따라가 보세요.</p>
      <p className="mt-4 rounded-2xl bg-background px-4 py-3 text-sm leading-relaxed text-foreground/85">
        <b className="text-foreground">한 가지 질문에 한 번만 뽑아요.</b> 처음 뽑은 답이 가장 정확해요. 마음에 안 든다고 같은 질문을 다시 뽑으면 효과가 없어요.
      </p>

      <button
        onClick={onReady}
        className="mt-6 w-full rounded-full bg-vermilion py-4 text-lg font-bold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105"
      >
        {seconds < 3 ? "마음을 모으는 중" : "집중했어요, 시작하기"}
      </button>
    </motion.div>
  );
}
