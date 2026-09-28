// 괘 하나의 상세 해설을 보여주는 모달
"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { hexagramSymbol, type Hexagram } from "@/data/hexagrams";
import { trigramsOf } from "@/lib/iching";
import HexagramFigure from "./HexagramFigure";

type Props = {
  hex: Hexagram | null;
  onClose: () => void;
};

export default function HexagramDetail({ hex, onClose }: Props) {
  useEffect(() => {
    if (!hex) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [hex, onClose]);

  return (
    <AnimatePresence>
      {hex ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${hex.name} 상세`}
        >
          <motion.div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-card p-6 shadow-2xl sm:rounded-3xl sm:p-8"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-foreground"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            <DetailBody hex={hex} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function DetailBody({ hex }: { hex: Hexagram }) {
  const { lower, upper } = trigramsOf(hex);
  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <div className="flex shrink-0 flex-col items-center gap-3 text-gold-soft">
        <HexagramFigure lines={hex.lines} size={110} animate title={hex.name} />
        <div className="text-4xl text-paper/80">{hexagramSymbol(hex.number)}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">제{hex.number}괘</p>
        <h3 className="mt-1 text-2xl font-bold tracking-tight">
          {hex.name} <span className="ml-1 font-normal text-muted">{hex.hanja}</span>
        </h3>
        <p className="mt-1 text-gold-soft">{hex.keyword}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-border bg-background/60 px-3 py-1">
            상괘 {upper.symbol} {upper.name}·{upper.nature}
          </span>
          <span className="rounded-full border border-border bg-background/60 px-3 py-1">
            하괘 {lower.symbol} {lower.name}·{lower.nature}
          </span>
        </div>

        <h4 className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted">쉬운 해설</h4>
        <p className="mt-2 leading-relaxed text-foreground/90">{hex.summary}</p>

        <h4 className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted">오늘의 조언</h4>
        <p className="mt-2 rounded-2xl border border-gold/30 bg-gold/10 p-4 leading-relaxed">{hex.advice}</p>
      </div>
    </div>
  );
}
