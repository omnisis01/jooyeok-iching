// 선천 64괘 방원도. 아무 곳이나 누르면 화살표가 원을 돌다 한 괘에 멈추고 그 괘를 보여준다
"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { HEXAGRAMS, type Hexagram } from "@/data/hexagrams";
import { TRIGRAMS } from "@/lib/iching";
import { HexagramLines } from "./HexagramFigure";

type Props = {
  size?: number;
  /** 있으면 누를 때마다 무작위로 한 괘를 골라 알려 준다 */
  onSelect?: (hex: Hexagram) => void;
  className?: string;
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
const FIG_W = 30;
const FIG_LINE = 3.2;
const FIG_GAP = 2.6;
const FIG_H = 6 * FIG_LINE + 5 * FIG_GAP;

/** CSS 애니메이션으로 돌고 있는 그룹의 현재 회전각(도) */
function currentRotation(el: Element | null): number {
  if (!el) return 0;
  try {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  } catch {
    return 0;
  }
}

export default function HexagramWheel({ size = 560, onSelect, className }: Props) {
  const outerRef = useRef<SVGGElement>(null);
  const innerRef = useRef<SVGGElement>(null);
  const [markerAngle, setMarkerAngle] = useState(-90);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const pendingRef = useRef<Hexagram | null>(null);
  const pickingRef = useRef(false);
  const fallbackRef = useRef<number | undefined>(undefined);

  const pick = () => {
    if (!onSelect || pickingRef.current) return;
    pickingRef.current = true;
    const index = randomIndex();
    pendingRef.current = FUXI_ORDER[index];
    // 원을 멈추고, 지금 회전각을 더해 화살표가 정확히 그 괘를 가리키게 한다
    for (const el of [outerRef.current, innerRef.current]) if (el) el.style.animationPlayState = "paused";
    const rot = currentRotation(outerRef.current);
    const target = (index / FUXI_ORDER.length) * 360 - 90 + rot;
    const delta = (((target - markerAngle) % 360) + 360) % 360;
    setPicked(index);
    setPicking(true);
    setMarkerAngle(markerAngle + 720 + delta);
    // 탭이 가려져 애니메이션이 멈춘 경우에도 결과는 나오게 한다
    window.clearTimeout(fallbackRef.current);
    fallbackRef.current = window.setTimeout(landed, 2300);
  };

  const landed = () => {
    if (!pickingRef.current) return;
    pickingRef.current = false;
    window.clearTimeout(fallbackRef.current);
    setPicking(false);
    window.setTimeout(() => {
      if (pendingRef.current) onSelect?.(pendingRef.current);
    }, 450);
    window.setTimeout(() => {
      for (const el of [outerRef.current, innerRef.current]) if (el) el.style.animationPlayState = "running";
    }, 2500);
  };

  return (
    <svg
      viewBox={`0 0 ${R * 2} ${R * 2}`}
      width={size}
      height={size}
      className={`${className ?? ""} ${onSelect ? "cursor-pointer select-none" : ""}`}
      role={onSelect ? "button" : "img"}
      aria-label={onSelect ? "64괘 원도, 누르면 괘 하나를 뽑습니다" : "선천 64괘 방원도"}
      onClick={pick}
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
          const isPicked = picked === i;
          return (
            <g key={hex.number} transform={`translate(${x} ${y}) rotate(${angle + 90}) translate(${-FIG_W / 2} ${-FIG_H / 2})`} opacity={isPicked ? 1 : 0.85}>
              <title>{`${hex.number}. ${hex.name} ${hex.hanja}`}</title>
              {isPicked ? (
                <motion.circle
                  cx={FIG_W / 2}
                  cy={FIG_H / 2}
                  r={26}
                  fill="rgba(216,69,43,0.16)"
                  stroke="var(--vermilion)"
                  strokeWidth={2}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={picking ? { scale: 0.6, opacity: 0 } : { scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
                  transition={picking ? { duration: 0.1 } : { duration: 1.2, repeat: 2 }}
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
        <circle cx={CENTER} cy={CENTER} r={150} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 6" />
        {TRIGRAMS.map((t, i) => {
          const angle = (i / 8) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const x = round2(CENTER + 150 * Math.cos(rad));
          const y = round2(CENTER + 150 * Math.sin(rad));
          return (
            <g key={t.number} transform={`translate(${x} ${y})`}>
              <circle r={26} fill="var(--card)" stroke="var(--border)" />
              <text textAnchor="middle" dominantBaseline="central" fontSize="24" fill="var(--foreground)" dy="-3">
                {t.symbol}
              </text>
              <text textAnchor="middle" fontSize="9" fill="var(--muted)" y={18}>
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

      {/* 화살표 표식: 원 바깥을 돌다가 뽑힌 괘 앞에 멈춘다 */}
      {onSelect ? (
        <motion.g
          initial={false}
          animate={{ rotate: markerAngle }}
          transition={{ duration: picking ? 1.7 : 0, ease: [0.15, 0.85, 0.25, 1] }}
          onAnimationComplete={landed}
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
        >
          <polygon points={`${CENTER + OUTER + 44},${CENTER - 11} ${CENTER + OUTER + 44},${CENTER + 11} ${CENTER + OUTER + 24},${CENTER}`} fill="var(--vermilion)" />
          <circle cx={CENTER + OUTER + 50} cy={CENTER} r={5} fill="var(--vermilion)" opacity={0.5} />
        </motion.g>
      ) : null}

      {onSelect && !picking && picked === null ? (
        <text x={CENTER} y={R * 2 - 8} textAnchor="middle" fontSize="15" fill="var(--muted)">
          원 아무 곳이나 누르면 괘 하나가 뽑혀요
        </text>
      ) : null}
    </svg>
  );
}
