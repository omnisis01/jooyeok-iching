// 6효를 SVG로 그리는 괘 그림 컴포넌트 (변효 강조, 효가 아래부터 쌓이는 애니메이션)
"use client";

import { motion } from "motion/react";

type LinesProps = {
  /** 6효 문자열, 인덱스 0 = 초효(맨 아래) */
  lines: string;
  changing?: number[];
  /** 아래부터 몇 효까지 보여줄지 (점치는 중 단계별 표시용) */
  revealed?: number;
  width?: number;
  lineHeight?: number;
  gap?: number;
  color?: string;
  changingColor?: string;
  animate?: boolean;
};

/**
 * <svg> 없이 <g>만 반환해 다른 SVG(원도 등) 안에서도 재사용한다.
 * 좌표 원점은 왼쪽 위.
 */
export function HexagramLines({
  lines,
  changing = [],
  revealed = 6,
  width = 100,
  lineHeight = 10,
  gap = 8,
  color = "currentColor",
  changingColor = "var(--vermilion)",
  animate = false,
}: LinesProps) {
  const half = (width - width * 0.18) / 2;
  const items = [];
  for (let i = 0; i < 6; i++) {
    if (i >= revealed) continue;
    const isYang = lines[i] === "1";
    const y = (5 - i) * (lineHeight + gap);
    const fill = changing.includes(i) ? changingColor : color;
    const rects = isYang
      ? [{ x: 0, w: width }]
      : [
          { x: 0, w: half },
          { x: width - half, w: half },
        ];
    items.push(
      <motion.g
        key={i}
        initial={animate ? { opacity: 0, scaleX: 0.2 } : false}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.45, delay: animate ? i * 0.08 : 0, ease: "easeOut" }}
        style={{ transformOrigin: `${width / 2}px ${y + lineHeight / 2}px` }}
      >
        {rects.map((r, j) => (
          <rect key={j} x={r.x} y={y} width={r.w} height={lineHeight} rx={lineHeight / 5} fill={fill} />
        ))}
      </motion.g>,
    );
  }
  return <g>{items}</g>;
}

type FigureProps = Omit<LinesProps, "width" | "lineHeight" | "gap"> & {
  size?: number;
  className?: string;
  title?: string;
};

export default function HexagramFigure({ size = 120, className, title, ...rest }: FigureProps) {
  const width = 100;
  const lineHeight = 10;
  const gap = 8;
  const height = 6 * lineHeight + 5 * gap;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={size}
      height={(size * height) / width}
      className={className}
      role="img"
      aria-label={title ?? "괘 그림"}
    >
      {title ? <title>{title}</title> : null}
      <HexagramLines width={width} lineHeight={lineHeight} gap={gap} {...rest} />
    </svg>
  );
}
