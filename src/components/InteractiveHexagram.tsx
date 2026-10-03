// 결과 화면의 대화형 괘 그림: 효 이름, 변효 표식, 줄 누르면 효사, 지괘로 뒤집히는 애니메이션
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import type { Hexagram } from "@/data/hexagrams";
import { getLineText, lineTitle } from "@/data/lineTexts";
import { LINE_NAMES } from "@/lib/iching";

type Props = {
  primary: Hexagram;
  changingLines: number[];
  resulting: Hexagram | null;
};

export default function InteractiveHexagram({ primary, changingLines, resulting }: Props) {
  const [showResulting, setShowResulting] = useState(false);
  const [tapped, setTapped] = useState<number | null>(null);
  const current = showResulting && resulting ? resulting : primary;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted">{showResulting && resulting ? `지괘 ${resulting.name}` : `본괘 ${primary.name}`}</p>
        {resulting ? (
          <button
            onClick={() => setShowResulting((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${showResulting ? "bg-jade/15 text-jade" : "bg-vermilion/12 text-vermilion"}`}
          >
            <RefreshCw size={12} /> {showResulting ? "본괘로 돌아가기" : "변효 뒤집어 보기"}
          </button>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2">
        {[5, 4, 3, 2, 1, 0].map((i) => {
          const yang = current.lines[i] === "1";
          const isChanging = changingLines.includes(i);
          const active = tapped === i;
          const color = isChanging ? (showResulting ? "bg-jade" : "bg-vermilion") : "bg-gold";
          return (
            <li key={i}>
              <button
                onClick={() => setTapped(active ? null : i)}
                className={`grid w-full grid-cols-[3.4rem_1fr_5.2rem] items-center gap-2 rounded-xl px-2 py-1 text-left transition ${active ? "bg-background" : "hover:bg-background/60"}`}
                aria-pressed={active}
                aria-label={`${lineTitle(current.lines, i)} ${LINE_NAMES[i]}${isChanging ? ", 변효" : ""}`}
              >
                <span className={`text-sm font-bold ${isChanging ? "text-vermilion" : "text-foreground/80"}`}>
                  {lineTitle(current.lines, i)}
                  <span className="ml-1 text-[10px] font-normal text-muted">{LINE_NAMES[i]}</span>
                </span>
                <span className="relative flex h-4 items-center">
                  <motion.span
                    className={`absolute left-0 h-4 rounded-sm ${color}`}
                    initial={false}
                    animate={{ width: yang ? "100%" : "42%" }}
                    transition={{ type: "spring", stiffness: 220, damping: 24 }}
                  />
                  <motion.span
                    className={`absolute right-0 h-4 rounded-sm ${color}`}
                    initial={false}
                    animate={{ width: yang ? "0%" : "42%", opacity: yang ? 0 : 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 24 }}
                  />
                </span>
                <span className="flex items-center justify-start gap-1 text-[11px] font-bold">
                  {isChanging ? (
                    <motion.span
                      className={`inline-flex items-center gap-0.5 ${showResulting ? "text-jade" : "text-vermilion"}`}
                      animate={showResulting ? { x: 0 } : { x: [0, -4, 0] }}
                      transition={{ duration: 1.1, repeat: showResulting ? 0 : Infinity, ease: "easeInOut" }}
                    >
                      <ChevronLeft size={14} />
                      {showResulting ? "뒤집힘" : "변효"}
                    </motion.span>
                  ) : (
                    <span className="text-muted/60">{yang ? "양" : "음"}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {tapped !== null ? (
          <motion.div
            key={`${current.number}-${tapped}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3 rounded-2xl bg-background p-3 text-sm leading-relaxed"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${changingLines.includes(tapped) ? "bg-vermilion/15 text-vermilion" : "bg-foreground/10 text-foreground/80"}`}>
                {lineTitle(current.lines, tapped)} {LINE_NAMES[tapped]}
                {changingLines.includes(tapped) ? (showResulting ? " (뒤집힌 줄)" : " (변효)") : ""}
              </span>
              <span className="font-serif text-gold-soft">{getLineText(current.number, tapped).hanja}</span>
            </div>
            <p className="mt-1.5 text-foreground/85">{getLineText(current.number, tapped).text}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <p className="mt-2 text-center text-[11px] text-muted">
        {changingLines.length ? "빨간 줄이 변효예요. 각 줄을 누르면 효사가 나타납니다." : "움직이는 효가 없어요. 각 줄을 누르면 효사가 나타납니다."}
      </p>
    </div>
  );
}
