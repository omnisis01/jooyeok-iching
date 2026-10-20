// 큰 글씨 스위치: 화면 전체를 조금 크게 보여 준다(어르신, 작은 글씨가 불편한 분). 선택은 이 기기에 기억한다
"use client";

import { useEffect, useState } from "react";

const KEY = "jooyeok-master-text";

export default function TextSizeToggle({ className = "" }: { className?: string }) {
  const [large, setLarge] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setLarge(document.documentElement.dataset.text === "large"), 0);
    return () => window.clearTimeout(t);
  }, []);
  const toggle = () => {
    const next = !large;
    document.documentElement.dataset.text = next ? "large" : "normal";
    try {
      localStorage.setItem(KEY, next ? "large" : "normal");
    } catch {
      // 저장 실패는 무시
    }
    setLarge(next);
  };
  return (
    <button
      onClick={toggle}
      aria-pressed={large}
      aria-label="큰 글씨"
      className={`rounded-full px-2.5 py-1 text-xs font-bold shadow-[0_2px_10px_rgba(31,29,26,0.08)] transition ${large ? "bg-foreground text-card" : "bg-card text-foreground/70 hover:text-foreground"} ${className}`}
    >
      큰 글씨
    </button>
  );
}
