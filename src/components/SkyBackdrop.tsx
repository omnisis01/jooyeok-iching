// 하늘주역의 하늘: 로고와 같은 하늘(북두칠성, 초승달, 구름)을 화면 곳곳에 은은하게 깐다. 우리만의 정체성
// 한국 시간 6시~18시는 낮하늘(해, 흰 구름), 그 밖에는 노을 진 밤하늘. 테마와 상관없이 시간을 따른다
// 넓은 화면: 화면 전체 배경. 좁은 화면: 위쪽에 옅게 깔리고 아래로 사라진다. 홈의 히어로 카드도 같은 하늘을 쓴다
"use client";

import { useEffect, useState } from "react";
import { now } from "@/lib/clock";
import { moonPath, moonPhase, type MoonPhase } from "@/lib/moon";

export type Sky = "day" | "night";

export function skyOf(ms: number): Sky {
  const h = new Date(ms + 9 * 3600e3).getUTCHours();
  return h >= 6 && h < 18 ? "day" : "night";
}

/** 오늘 달의 모양. 한 시간마다 다시 본다 */
export function useMoon(): MoonPhase | null {
  const [moon, setMoon] = useState<MoonPhase | null>(null);
  useEffect(() => {
    const tick = () => setMoon(moonPhase(now()));
    const t0 = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 60 * 60 * 1000);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(t);
    };
  }, []);
  return moon;
}

/** 지금 하늘. 5분마다 다시 본다 */
export function useSky(): Sky | null {
  const [sky, setSky] = useState<Sky | null>(null);
  useEffect(() => {
    const tick = () => setSky(skyOf(now()));
    const t0 = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 5 * 60 * 1000);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(t);
    };
  }, []);
  return sky;
}

const CLOUD = "M20 70 a22 22 0 0 1 22-22 a28 28 0 0 1 54-6 a24 24 0 0 1 36 20 a18 18 0 0 1 -2 36 H38 a18 18 0 0 1 -18-28z";
const DIPPER: [number, number, number][] = [[0, 38, 2.6], [16, 26, 2.1], [32, 22, 2.1], [48, 24, 2.1], [72, 16, 2.6], [74, 40, 2.6], [50, 46, 2.1]];
const STARS: [number, number, number][] = [[120, 90, 1.6], [310, 140, 1.2], [520, 60, 1.4], [700, 180, 1.1], [900, 90, 1.5], [1100, 150, 1.2], [1380, 70, 1.6], [1500, 200, 1.1], [240, 300, 1.2], [640, 320, 1], [1000, 300, 1.3], [1450, 330, 1], [420, 420, 1.1], [1250, 420, 1.2]];

/** 하늘 그림 한 장. id는 한 화면에 여러 장 그릴 때 그라데이션 이름이 겹치지 않게 */
/** moon: 달의 위상 0~1(없으면 초승달 모양). 실제 달처럼 차고 기운다 */
export function SkyArt({ sky, id, moonX = 1250, moonY = 200, moonR = 70, dipperScale = 2.2, dipper = true, clouds = true, moon = 0.12 }: { sky: Sky; id: string; moonX?: number; moonY?: number; moonR?: number; dipperScale?: number; dipper?: boolean; clouds?: boolean; moon?: number }) {
  const g = `${id}-g`;
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1600 900" aria-hidden>
      <defs>
        {sky === "night" ? (
          <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b0f2e" />
            <stop offset="0.55" stopColor="#3b2452" />
            <stop offset="1" stopColor="#b86a34" />
          </linearGradient>
        ) : (
          <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fcbea" />
            <stop offset="0.6" stopColor="#dbeaf5" />
            <stop offset="1" stopColor="#f5f0e8" />
          </linearGradient>
        )}
        <radialGradient id={`${id}-glow`} cx={moonX / 1600} cy={moonY / 900} r="0.25">
          <stop offset="0" stopColor={sky === "night" ? "#f2c94c" : "#ffe9a8"} stopOpacity={sky === "night" ? 0.35 : 0.9} />
          <stop offset="1" stopColor={sky === "night" ? "#f2c94c" : "#ffe9a8"} stopOpacity="0" />
        </radialGradient>
        <symbol id={`${id}-cl`} viewBox="0 0 160 110">
          <path d={CLOUD} />
        </symbol>
      </defs>
      <rect width="1600" height="900" fill={`url(#${g})`} />
      <rect width="1600" height="900" fill={`url(#${id}-glow)`} />
      {sky === "night" ? (
        <>
          <g fill="#f1e9da" opacity="0.8">
            {STARS.map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
          {dipper ? (
          <g transform={`translate(140 150) scale(${dipperScale})`} opacity="0.95">
            <polyline points="0,38 16,26 32,22 48,24 72,16 74,40 50,46 48,24" fill="none" stroke="#f1e9da" strokeWidth="0.8" opacity="0.5" />
            <g fill="#f1e9da">
              {DIPPER.map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} />
              ))}
            </g>
          </g>
          ) : null}
          {/* 달: 어두운 면은 지구 반사광처럼 희미하게, 밝은 면은 실제 위상대로 */}
          <circle cx={moonX} cy={moonY} r={moonR} fill="#f2c94c" opacity="0.14" />
          <path d={moonPath(moon, moonX, moonY, moonR)} fill="#f2c94c" />
          {clouds ? (
            <>
              <g className="sky-drift" fill="#5a3a52" opacity="0.9">
                <use href={`#${id}-cl`} x="-60" y="700" width="420" height="290" />
                <use href={`#${id}-cl`} x="300" y="760" width="360" height="250" />
                <use href={`#${id}-cl`} x="900" y="740" width="400" height="275" />
                <use href={`#${id}-cl`} x="1300" y="790" width="380" height="260" />
              </g>
              <g className="sky-drift-slow" fill="#6b4458" opacity="0.95">
                <use href={`#${id}-cl`} x="120" y="800" width="360" height="250" />
                <use href={`#${id}-cl`} x="620" y="820" width="330" height="230" />
                <use href={`#${id}-cl`} x="1120" y="830" width="420" height="290" />
              </g>
            </>
          ) : null}
        </>
      ) : (
        <>
          <circle cx={moonX} cy={moonY} r={moonR * 0.8} fill="#f6c35a" opacity="0.95" />
          {clouds ? (
            <>
              <g className="sky-drift" fill="#ffffff" opacity="0.9">
                <use href={`#${id}-cl`} x="-40" y="120" width="380" height="260" />
                <use href={`#${id}-cl`} x="520" y="60" width="300" height="205" />
                <use href={`#${id}-cl`} x="980" y="260" width="340" height="235" />
              </g>
              <g className="sky-drift-slow" fill="#ffffff" opacity="0.85">
                <use href={`#${id}-cl`} x="-80" y="700" width="460" height="315" />
                <use href={`#${id}-cl`} x="420" y="760" width="380" height="260" />
                <use href={`#${id}-cl`} x="900" y="730" width="420" height="290" />
                <use href={`#${id}-cl`} x="1300" y="780" width="400" height="275" />
              </g>
            </>
          ) : null}
        </>
      )}
    </svg>
  );
}

export default function SkyBackdrop() {
  const sky = useSky();
  const moon = useMoon();
  if (!sky) return null;
  return (
    <>
      {/* 넓은 화면: 화면 전체 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 hidden overflow-hidden lg:block">
        <SkyArt sky={sky} id="sky-wide" moon={moon?.p} />
      </div>
      {/* 좁은 화면: 위쪽에 옅게 깔리고 바탕색으로 사라진다. 카드 뒤로 별과 달이 비친다 */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[52vh] overflow-hidden opacity-[0.8] lg:hidden">
        <SkyArt sky={sky} id="sky-top" moonX={1380} dipperScale={2.6} clouds={false} moon={moon?.p} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      </div>
    </>
  );
}
