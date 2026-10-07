// 선천 64괘 방원도. 괘를 누르면 그 괘가 바로 열린다. 무작위 뽑기는 바깥 버튼이 pickRandomRef로 부른다
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { HEXAGRAMS, type Hexagram } from "@/data/hexagrams";
import { TRIGRAMS } from "@/lib/iching";
import { HexagramLines } from "./HexagramFigure";

type Props = {
  size?: number;
  /** 있으면 괘를 누를 때 그 괘를 알려 준다 */
  onSelect?: (hex: Hexagram, how: "tap" | "random") => void;
  /** 바깥의 "무작위로 하나 뽑기" 버튼이 부를 함수를 받아 간다 */
  randomRef?: React.MutableRefObject<(() => void) | null>;
  className?: string;
  /** 값이 바뀌면 뽑힌 괘 표시를 지운다 (팝업을 닫을 때 올려 준다) */
  resetKey?: number;
};

/** 선천(복희) 순서: 효를 이진수로 읽어 정렬 (상효가 최상위 비트) */
const FUXI_ORDER = [...HEXAGRAMS].sort((a, b) => {
  const val = (h: Hexagram) => parseInt(h.lines.split("").reverse().join(""), 2);
  return val(b) - val(a);
});

/** 눌렀을 때 뽑을 괘의 자리 (이벤트 핸들러에서만 쓴다) */
function randomIndex(): number {
  return Math.floor(Math.random() * FUXI_ORDER.length);
}

/** 서버와 클라이언트의 부동소수점 결과가 달라 생기는 hydration 불일치를 막는다 */
const round2 = (n: number) => Math.round(n * 100) / 100;

const R = 300;
const CENTER = R;
const OUTER = 262;
// 안쪽 8괘 고리 반지름: 중앙 태극(반지름 60)과 바깥 64괘 고리(OUTER - 32) 사이 가운데
const TRI_RING = 148;
const FIG_W = 30;
const FIG_LINE = 3.2;
const FIG_GAP = 2.6;
const FIG_H = 6 * FIG_LINE + 5 * FIG_GAP;

export default function HexagramWheel({ size = 560, onSelect, className, resetKey = 0, randomRef }: Props) {
  const outerRef = useRef<SVGGElement>(null);
  const innerRef = useRef<SVGGElement>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [pickedAtKey, setPickedAtKey] = useState(resetKey);
  // 팝업이 닫혀 resetKey가 바뀌면 표시를 감춘다
  const showPick = picked !== null && pickedAtKey === resetKey;
  const busyRef = useRef(false);

  /** 고른 괘를 잠깐 빛내고 바로 연다. 회전은 팝업이 떠 있는 동안 멈춘다 */
  const open = (index: number, how: "tap" | "random" = "tap") => {
    if (!onSelect || busyRef.current) return;
    busyRef.current = true;
    for (const el of [outerRef.current, innerRef.current]) if (el) el.style.animationPlayState = "paused";
    setPicked(index);
    setPickedAtKey(resetKey);
    window.setTimeout(() => {
      onSelect(FUXI_ORDER[index], how);
      busyRef.current = false;
    }, 260);
  };
  useEffect(() => {
    if (!randomRef) return;
    randomRef.current = () => open(randomIndex(), "random");
    return () => {
      randomRef.current = null;
    };
  });

  // 팝업이 닫히면 다시 돈다
  useEffect(() => {
    for (const el of [outerRef.current, innerRef.current]) if (el) el.style.animationPlayState = "running";
  }, [resetKey]);

  return (
    <svg
      viewBox={`0 0 ${R * 2} ${R * 2}`}
      width={size}
      height={size}
      className={`${className ?? ""} ${onSelect ? "select-none" : ""}`}
      role={onSelect ? "button" : "img"}
      aria-label={onSelect ? "64괘 원도, 괘를 누르면 그 괘가 열립니다" : "선천 64괘 방원도"}
    >
      <defs>
        <radialGradient id="wheel-glow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="rgba(201,164,74,0)" />
          <stop offset="100%" stopColor="rgba(185,134,43,0.14)" />
        </radialGradient>
      </defs>
      <circle cx={CENTER} cy={CENTER} r={R - 2} fill="url(#wheel-glow)" />
      <circle cx={CENTER} cy={CENTER} r={OUTER + 28} fill="none" stroke="var(--border)" strokeWidth="1" />
      <circle cx={CENTER} cy={CENTER} r={OUTER - 32} fill="none" stroke="var(--border)" strokeWidth="1" />

      {/* 바깥 고리: 64괘 */}
      <g ref={outerRef} className="animate-spin-slow" style={{ transformOrigin: "50% 50%" }}>
        {FUXI_ORDER.map((hex, i) => {
          const angle = (i / 64) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const x = round2(CENTER + OUTER * Math.cos(rad));
          const y = round2(CENTER + OUTER * Math.sin(rad));
          const isPicked = showPick && picked === i;
          return (
            <g
              key={hex.number}
              transform={`translate(${x} ${y}) rotate(${angle + 90}) translate(${-FIG_W / 2} ${-FIG_H / 2})`}
              opacity={isPicked ? 1 : 0.85}
              className={onSelect ? "cursor-pointer" : undefined}
              onClick={
                onSelect
                  ? (e) => {
                      e.stopPropagation();
                      open(i);
                    }
                  : undefined
              }
            >
              <title>{`${hex.number}. ${hex.name} ${hex.hanja}`}</title>
              {/* 손가락으로 누르기 쉽게 보이지 않는 넓은 영역 */}
              <rect x={-14} y={-14} width={FIG_W + 28} height={FIG_H + 28} fill="transparent" />
              {isPicked ? (
                <motion.circle
                  cx={FIG_W / 2}
                  cy={FIG_H / 2}
                  r={26}
                  fill="rgba(216,69,43,0.16)"
                  stroke="var(--vermilion)"
                  strokeWidth={2}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.75, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                  style={{ transformOrigin: `${FIG_W / 2}px ${FIG_H / 2}px` }}
                />
              ) : null}
              <HexagramLines lines={hex.lines} width={FIG_W} lineHeight={FIG_LINE} gap={FIG_GAP} color={isPicked ? "var(--vermilion)" : "var(--gold)"} />
            </g>
          );
        })}
      </g>

      {/* 안쪽 고리: 8괘 */}
      <g ref={innerRef} className="animate-spin-slower" style={{ transformOrigin: "50% 50%" }}>
        <circle cx={CENTER} cy={CENTER} r={TRI_RING} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 6" />
        {TRIGRAMS.map((t, i) => {
          const angle = (i / 8) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const x = round2(CENTER + TRI_RING * Math.cos(rad));
          const y = round2(CENTER + TRI_RING * Math.sin(rad));
          return (
            <g key={t.number} transform={`translate(${x} ${y})`}>
              <circle r={46} fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
              {/* 글꼴의 괘 기호는 작게 보여 세 줄을 직접 그린다. lines[0]이 맨 아래 효 */}
              {[2, 1, 0].map((li, row) => {
                const y = -26 + row * 12;
                return t.lines[li] === "1" ? (
                  <rect key={li} x={-24} y={y} width={48} height={7} rx={1.5} fill="var(--foreground)" />
                ) : (
                  <g key={li}>
                    <rect x={-24} y={y} width={20} height={7} rx={1.5} fill="var(--foreground)" />
                    <rect x={4} y={y} width={20} height={7} rx={1.5} fill="var(--foreground)" />
                  </g>
                );
              })}
              <text textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--muted)" y={31}>
                {t.natureHanja}
              </text>
            </g>
          );
        })}
      </g>

      {/* 중앙 태극 */}
      <g transform={`translate(${CENTER - 60} ${CENTER - 60}) scale(1.2)`}>
        <circle cx="50" cy="50" r="49" fill="var(--paper)" />
        <path d="M50 1 A49 49 0 0 0 50 99 A24.5 24.5 0 0 0 50 50 A24.5 24.5 0 0 1 50 1 Z" fill="var(--ink)" />
        <circle cx="50" cy="25.5" r="8" fill="var(--ink)" />
        <circle cx="50" cy="74.5" r="8" fill="var(--paper)" />
        <circle cx="50" cy="50" r="49" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
      </g>

    </svg>
  );
}
