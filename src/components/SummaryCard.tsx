// "그래서, 한마디로": 괘의 뜻을 현대인의 말로 세 줄에 담은 결론 카드
"use client";

import { motion } from "motion/react";
import { MOOD_LABEL, summaryOf, type Mood } from "@/data/summaries";
import { adaptAdvice, type Period } from "@/lib/period";

const ACCENT: Record<Mood, { badge: string; bar: string }> = {
  go: { badge: "bg-jade/15 text-jade", bar: "bg-jade" },
  wait: { badge: "bg-gold/20 text-gold", bar: "bg-gold" },
  care: { badge: "bg-vermilion/15 text-vermilion", bar: "bg-vermilion" },
};

type Props = {
  number: number;
  period?: Period;
  periodDate?: string;
  /** 모달 안처럼 좁은 곳에서는 compact */
  compact?: boolean;
  /** 결과 화면에서 읽는 순서 표시 (예: ③) */
  step?: string;
};

export default function SummaryCard({ number, period, periodDate, compact = false, step }: Props) {
  const s = summaryOf(number);
  const accent = ACCENT[s.mood];
  const [head, why, todo] = s.lines.map((l) => adaptAdvice(l, period, periodDate));

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className={`relative overflow-hidden rounded-3xl bg-card shadow-[0_6px_30px_rgba(31,29,26,0.06)] ${compact ? "p-5" : "p-6 sm:p-8"}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1.5 ${accent.bar}`} />
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted">{step ? `${step} ` : ""}그래서, 한마디로</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${accent.badge}`}>{MOOD_LABEL[s.mood]}</span>
      </div>
      <p className={`mt-3 font-extrabold leading-tight tracking-tight ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>{head}</p>
      <p className={`mt-4 leading-relaxed text-foreground/85 ${compact ? "text-[15px]" : "text-lg"}`}>{why}</p>
      <p className={`mt-3 leading-relaxed text-foreground ${compact ? "text-[15px]" : "text-lg"}`}>{todo}</p>
    </motion.section>
  );
}
