// 선천 64괘 방원도: 64괘를 원형으로 배치하고 중앙에 태극과 8괘를 두는 장식 겸 탐색 컴포넌트
"use client";

import { HEXAGRAMS, type Hexagram } from "@/data/hexagrams";
import { TRIGRAMS } from "@/lib/iching";
import { HexagramLines } from "./HexagramFigure";

type Props = {
  size?: number;
  onSelect?: (hex: Hexagram) => void;
  className?: string;
};

/** 선천(복희) 순서: 효를 이진수로 읽어 정렬 (상효가 최상위 비트) */
const FUXI_ORDER = [...HEXAGRAMS].sort((a, b) => {
  const val = (h: Hexagram) => parseInt(h.lines.split("").reverse().join(""), 2);
  return val(b) - val(a);
});

/** 서버와 클라이언트의 부동소수점 결과가 달라 생기는 hydration 불일치를 막는다 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function HexagramWheel({ size = 560, onSelect, className }: Props) {
  const R = 300;
  const center = R;
  const outer = 262;
  const figW = 30;
  const figLine = 3.2;
  const figGap = 2.6;
  const figH = 6 * figLine + 5 * figGap;

  return (
    <svg
      viewBox={`0 0 ${R * 2} ${R * 2}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="선천 64괘 방원도"
    >
      <defs>
        <radialGradient id="wheel-glow" cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="rgba(201,164,74,0)" />
          <stop offset="100%" stopColor="rgba(201,164,74,0.18)" />
        </radialGradient>
      </defs>
      <circle cx={center} cy={center} r={R - 2} fill="url(#wheel-glow)" />
      <circle cx={center} cy={center} r={outer + 28} fill="none" stroke="var(--border)" strokeWidth="1" />
      <circle cx={center} cy={center} r={outer - 32} fill="none" stroke="var(--border)" strokeWidth="1" />

      {/* 바깥 고리: 64괘 */}
      <g className="animate-spin-slow" style={{ transformOrigin: "50% 50%" }}>
        {FUXI_ORDER.map((hex, i) => {
          const angle = (i / 64) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const x = round2(center + outer * Math.cos(rad));
          const y = round2(center + outer * Math.sin(rad));
          return (
            <g
              key={hex.number}
              transform={`translate(${x} ${y}) rotate(${angle + 90}) translate(${-figW / 2} ${-figH / 2})`}
              className={onSelect ? "cursor-pointer transition-opacity hover:opacity-100" : undefined}
              opacity={0.85}
              onClick={onSelect ? () => onSelect(hex) : undefined}
            >
              <title>{`${hex.number}. ${hex.name} ${hex.hanja}`}</title>
              <rect x={-4} y={-4} width={figW + 8} height={figH + 8} fill="transparent" />
              <HexagramLines
                lines={hex.lines}
                width={figW}
                lineHeight={figLine}
                gap={figGap}
                color="var(--gold-soft)"
              />
            </g>
          );
        })}
      </g>

      {/* 안쪽 고리: 8괘 */}
      <g className="animate-spin-slower" style={{ transformOrigin: "50% 50%" }}>
        <circle cx={center} cy={center} r={150} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 6" />
        {TRIGRAMS.map((t, i) => {
          const angle = (i / 8) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const x = round2(center + 150 * Math.cos(rad));
          const y = round2(center + 150 * Math.sin(rad));
          return (
            <g key={t.number} transform={`translate(${x} ${y})`}>
              <circle r={26} fill="var(--card)" stroke="var(--border)" />
              <text textAnchor="middle" dominantBaseline="central" fontSize="24" fill="var(--paper)" dy="-3">
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
      <g transform={`translate(${center - 60} ${center - 60}) scale(1.2)`}>
        <circle cx="50" cy="50" r="49" fill="var(--paper)" />
        <path d="M50 1 A49 49 0 0 0 50 99 A24.5 24.5 0 0 0 50 50 A24.5 24.5 0 0 1 50 1 Z" fill="var(--ink)" />
        <circle cx="50" cy="25.5" r="8" fill="var(--ink)" />
        <circle cx="50" cy="74.5" r="8" fill="var(--paper)" />
        <circle cx="50" cy="50" r="49" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
