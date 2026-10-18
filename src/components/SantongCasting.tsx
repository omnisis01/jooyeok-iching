// 산통점: 대나무 통과 산가지를 층으로 그려 입체감을 내고, 길게 누르거나 폰을 흔들면 산가지가 하나씩 따로 덜그럭거린다.
// 손을 떼면 산가지 하나가 올라오고, 세 번(하괘, 상괘, 동효) 뽑으면 결과로 넘어간다. 나무 부딪히는 소리는 파일 없이 즉석에서 만든다
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { LINE_NAMES, readingFromSantong, trigramByNumber, type Reading } from "@/lib/iching";
import { useShake } from "@/lib/useShake";
import { useCastingMode } from "@/lib/useCastingMode";
import { iga } from "@/lib/josa";
import ShakeHint from "./ShakeHint";

type Phase = "idle" | "shaking" | "rising" | "risen";

type Props = {
  question?: string;
  onComplete: (reading: Reading) => void;
};
const STEPS = [
  { key: "lower", label: "하괘", hint: "아래 세 효" },
  { key: "upper", label: "상괘", hint: "위 세 효" },
  { key: "moving", label: "동효", hint: "변하는 효" },
] as const;
const NUM_HANJA = ["一", "二", "三", "四", "五", "六", "七", "八"];
const MIN_HOLD_MS = 700;
const AUTO_SHAKE_MS = 1300;

// 통 치수 (그림 좌표 300 x 440, 위쪽은 올라오는 산가지 자리)
const CX = 150;
const RX = 66;
const RY = 17;
const TOP = 176;
const BOTTOM = 396;
const L = CX - RX;
const R = CX + RX;

export default function SantongCasting({ question, onComplete }: Props) {
  useCastingMode();
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [draws, setDraws] = useState<number[]>([]);
  const [risen, setRisen] = useState<number | null>(null);
  const [sound, setSound] = useState(true);
  const [tip, setTip] = useState<string | null>(null);

  const count = step === 2 ? 6 : 8;
  const tubeRef = useRef<SVGGElement>(null);
  const stickRefs = useRef<(SVGGElement | null)[]>([]);
  const amp = useRef(0);
  const target = useRef(0);
  const holdStart = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const nextClack = useRef(0);
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  /** 나무 산가지가 부딪히는 짧은 소리: 잡음을 좁은 대역으로 걸러 빠르게 줄인다 */
  const clack = useCallback((strength: number, low = false) => {
    const ctx = audio.current;
    if (!ctx || !soundRef.current) return;
    const len = Math.floor(ctx.sampleRate * (low ? 0.09 : 0.035));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, low ? 2 : 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = low ? 520 : 1600 + Math.random() * 2200;
    bp.Q.value = low ? 3 : 6;
    const g = ctx.createGain();
    g.gain.value = (low ? 0.9 : 0.45) * strength;
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start();
  }, []);

  /** 매 프레임: 흔들림 세기를 목표값으로 부드럽게 맞추고, 통과 산가지를 각각 다르게 움직인다 */
  useEffect(() => {
    let id = 0;
    const frame = (now: number) => {
      amp.current += (target.current - amp.current) * 0.12;
      const a = amp.current;
      if (a > 0.003 || target.current > 0) {
        const t = now / 1000;
        if (tubeRef.current) {
          const rot = Math.sin(t * 19) * 5.5 * a + Math.sin(t * 31) * 1.5 * a;
          const dx = Math.sin(t * 17 + 1) * 5 * a;
          const dy = -Math.abs(Math.sin(t * 21)) * 4 * a;
          tubeRef.current.setAttribute("transform", `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${rot.toFixed(2)} ${CX} ${BOTTOM})`);
        }
        stickRefs.current.forEach((el, i) => {
          if (!el) return;
          const ph = i * 1.7;
          const y = -Math.abs(Math.sin(t * (23 + i * 1.3) + ph)) * 14 * a;
          // 흔들려도 가장자리 산가지가 통 입구 테를 넘지 않을 만큼만 기운다
          const r = Math.sin(t * (17 + i) + ph) * 2 * a;
          el.setAttribute("transform", `translate(0 ${y.toFixed(2)}) rotate(${r.toFixed(2)} ${CX} 330)`);
        });
        if (a > 0.15 && now > nextClack.current) {
          clack(Math.min(1, a));
          if (Math.random() < 0.25) navigator.vibrate?.(8);
          nextClack.current = now + 30 + Math.random() * (90 - a * 50);
        }
      }
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(id);
    };
  }, [clack]);

  useEffect(
    () => () => {
      audio.current?.close().catch(() => {});
    },
    [],
  );

  const ensureAudio = () => {
    if (audio.current) {
      void audio.current.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) audio.current = new Ctor();
  };

  const beginShake = () => {
    if (phase !== "idle") return;
    ensureAudio();
    setTip(null);
    holdStart.current = performance.now();
    target.current = 1;
    setPhase("shaking");
  };

  const draw = useCallback(() => {
    const pick = 1 + Math.floor(Math.random() * count);
    target.current = 0;
    clack(1, true);
    navigator.vibrate?.(30);
    setRisen(pick);
    setPhase("rising");
    window.setTimeout(() => setPhase("risen"), 650);
  }, [count, clack]);

  const endShake = () => {
    if (phase !== "shaking") return;
    if (performance.now() - holdStart.current < MIN_HOLD_MS) {
      target.current = 0;
      setPhase("idle");
      setTip("조금 더 길게 눌러 흔들어 주세요");
      return;
    }
    draw();
  };

  // 폰을 흔들면: 잠깐 저절로 흔들리다 산가지가 올라온다
  const shakeDetect = useShake(() => {
    if (phase !== "idle") return;
    beginShake();
    window.setTimeout(draw, AUTO_SHAKE_MS);
  }, phase === "idle");

  const next = () => {
    if (risen === null) return;
    const d = [...draws, risen];
    setDraws(d);
    setRisen(null);
    if (d.length === 3) {
      onComplete(readingFromSantong(d[0], d[1], d[2], question));
    } else {
      setStep(step + 1);
      setPhase("idle");
    }
  };

  const resultLabel = (i: number, n: number) => {
    if (i === 2) return LINE_NAMES[n - 1];
    const t = trigramByNumber(n);
    return `${t.symbol} ${t.name}괘`;
  };
  const risenText =
    risen === null
      ? ""
      : step === 2
        ? `${iga(LINE_NAMES[risen - 1])} 변해요`
        : `${trigramByNumber(risen).symbol} ${trigramByNumber(risen).name}괘, ${trigramByNumber(risen).nature}`;

  return (
    <div className="santong-stage relative flex break-keep flex-col items-center overflow-hidden rounded-3xl px-4 pb-6 pt-6 text-center shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <button
        onClick={() => setSound((s) => !s)}
        className="absolute right-3 top-3 rounded-full bg-card/70 p-2 text-muted shadow-sm backdrop-blur"
        aria-label={sound ? "소리 끄기" : "소리 켜기"}
      >
        {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      <p className="px-9 text-sm font-bold text-vermilion">마음속 질문을 떠올리고 통을 흔들어 주세요</p>
      <p className="mt-1 text-xs text-muted">한 번 뽑을 때마다 하괘, 상괘, 동효가 차례로 결정돼요</p>

      {/* 세 번의 뽑기 진행 */}
      <ol className="mt-4 flex gap-2">
        {STEPS.map((s, i) => {
          const v = draws[i];
          const active = i === step;
          return (
            <li
              key={s.key}
              className={`min-w-[84px] rounded-2xl px-3 py-2 text-xs transition ${v ? "bg-card text-foreground shadow-sm" : active ? "bg-vermilion/10 text-vermilion ring-1 ring-vermilion/30" : "bg-card/40 text-muted"}`}
            >
              <span className="block font-bold">{s.label}</span>
              <span className="mt-0.5 block">{v ? resultLabel(i, v) : s.hint}</span>
            </li>
          );
        })}
      </ol>

      <section className="flex w-full flex-col items-center">
        <div
          className="relative mt-4 w-full max-w-[300px] touch-none select-none"
          onPointerDown={beginShake}
          onPointerUp={endShake}
          onPointerLeave={endShake}
          onPointerCancel={endShake}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Tube count={count} step={step} risen={risen} phase={phase} tubeRef={tubeRef} stickRefs={stickRefs} />
        </div>

        <div className="mt-1 flex min-h-[112px] flex-col items-center justify-start">
          {phase === "risen" && risen !== null ? (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-base font-bold text-vermilion">
              {STEPS[step].label} {risenText}
            </motion.p>
          ) : null}
          {phase === "risen" ? (
            <button onClick={next} className="rounded-full bg-vermilion px-8 py-3.5 font-bold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)]">
              {step < 2 ? `다음, ${STEPS[step + 1].label} 뽑기` : "괘 보기"}
            </button>
          ) : (
            <>
              <button
                className={`relative grid h-16 w-16 touch-none select-none place-items-center rounded-full border-2 transition ${phase === "shaking" ? "scale-95 border-vermilion bg-vermilion/15" : "border-border bg-card/60"}`}
                onPointerDown={beginShake}
                onPointerUp={endShake}
                onPointerLeave={endShake}
                onPointerCancel={endShake}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="길게 눌러 흔들기"
              >
                <span className={`h-7 w-7 rounded-full ${phase === "shaking" ? "bg-vermilion" : "bg-gold/40"}`} />
                {phase === "shaking" ? <span className="absolute inset-0 animate-ping rounded-full border-2 border-vermilion/50" /> : null}
              </button>
              <p className="mt-2 text-xs text-muted">{tip ?? (phase === "shaking" ? "손을 떼면 산가지 하나가 올라와요" : "길게 눌러 흔들기, 또는 폰을 흔드세요")}</p>
              <div className="mt-2">
                <ShakeHint state={shakeDetect.state} onEnable={shakeDetect.requestPermission} verb="흔들" />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

type TubeProps = {
  count: number;
  step: number;
  risen: number | null;
  phase: Phase;
  tubeRef: React.RefObject<SVGGElement | null>;
  stickRefs: React.RefObject<(SVGGElement | null)[]>;
};

/** 층 순서: 바닥 그림자, 통 입구 안쪽과 뒤쪽 테, 산가지, 통 앞면(마디, 옻칠 띠, 금박 인장), 앞쪽 테 */
function Tube({ count, step, risen, phase, tubeRef, stickRefs }: TubeProps) {
  const sticks = Array.from({ length: count }, (_, i) => i + 1);
  const frontArc = (y: number) => `M${L},${y} A${RX},${RY} 0 0 0 ${R},${y}`;
  const backArc = (y: number) => `M${L},${y} A${RX},${RY} 0 0 1 ${R},${y}`;

  return (
    <svg viewBox="0 34 300 406" overflow="visible" className="h-auto w-full" role="img" aria-label="대나무 산통">
      <defs>
        <linearGradient id="lab-bamboo" x1="0" x2="1">
          <stop offset="0" stopColor="#4a3516" />
          <stop offset="0.1" stopColor="#7c5c2a" />
          <stop offset="0.32" stopColor="#c9a464" />
          <stop offset="0.42" stopColor="#e2c58a" />
          <stop offset="0.55" stopColor="#c19b5b" />
          <stop offset="0.82" stopColor="#7f602d" />
          <stop offset="1" stopColor="#3f2d12" />
        </linearGradient>
        <linearGradient id="lab-lacquer" x1="0" x2="1">
          <stop offset="0" stopColor="#5e150b" />
          <stop offset="0.3" stopColor="#b8321d" />
          <stop offset="0.42" stopColor="#e2583c" />
          <stop offset="0.6" stopColor="#a92c19" />
          <stop offset="1" stopColor="#4d1109" />
        </linearGradient>
        <radialGradient id="lab-mouth" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#1a1208" />
          <stop offset="1" stopColor="#3a2a12" />
        </radialGradient>
        <linearGradient id="lab-stick" x1="0" x2="1">
          <stop offset="0" stopColor="#b8995c" />
          <stop offset="0.45" stopColor="#f3e3b8" />
          <stop offset="1" stopColor="#a8884c" />
        </linearGradient>
        <linearGradient id="lab-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f6e2a4" />
          <stop offset="0.5" stopColor="#c9a24a" />
          <stop offset="1" stopColor="#8a6a24" />
        </linearGradient>
        <filter id="lab-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="lab-glow" x="-200%" y="-20%" width="500%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f2c66b" floodOpacity="0.85" />
        </filter>
        <filter id="lab-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>

      {/* 바닥 그림자: 흔들려도 제자리에 남는다 */}
      <ellipse cx={CX} cy={BOTTOM + 14} rx={92} ry={13} fill="#000" opacity={0.22} filter="url(#lab-blur)" />

      <g ref={tubeRef}>
        {/* 통 입구 안쪽과 뒤쪽 테 */}
        <ellipse cx={CX} cy={TOP} rx={RX} ry={RY} fill="url(#lab-mouth)" />
        <path d={backArc(TOP)} fill="none" stroke="#e8cf94" strokeWidth={3} />

        {/* 산가지: 통 바닥 쪽 한 점을 중심으로 부채꼴로 꽂혀 있다. 아랫부분은 통 앞면에 가려진다 */}
        {sticks.map((n, i) => {
          const spread = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
          const angle = spread * 6;
          const height = 108 + ((i * 37) % 5) * 7;
          const x = CX + spread * 24;
          const top = TOP - height + 60;
          const isRisen = risen === n;
          return (
            <motion.g
              key={`${step}-${n}`}
              animate={{ y: isRisen && phase !== "shaking" ? -96 : 0 }}
              transition={isRisen ? { type: "spring", stiffness: 120, damping: 14 } : { duration: 0.2 }}
            >
              <g
                ref={(el) => {
                  stickRefs.current[i] = el;
                }}
              >
                <g transform={`rotate(${angle.toFixed(2)} ${CX} 330)`} filter={isRisen && phase !== "shaking" ? "url(#lab-glow)" : undefined}>
                  <rect x={x - 5.5} y={top} width={11} height={330 - top} rx={5} fill="url(#lab-stick)" stroke="#7a6232" strokeWidth={0.6} />
                  {/* 붉은 옻칠 끝 */}
                  <rect x={x - 5.5} y={top} width={11} height={16} rx={5} fill="url(#lab-lacquer)" />
                  <rect x={x - 3.2} y={top + 3} width={1.6} height={10} rx={0.8} fill="#fff" opacity={0.35} />
                  {isRisen ? (
                    <text x={x} y={top + 34} textAnchor="middle" fontSize="11" fontWeight={700} fill="#8a2a17" fontFamily="serif">
                      {(count === 6 ? NUM_HANJA.slice(0, 6) : NUM_HANJA)[n - 1]}
                    </text>
                  ) : null}
                </g>
              </g>
            </motion.g>
          );
        })}

        {/* 통 앞면 */}
        <path d={`${frontArc(TOP)} L${R},${BOTTOM} A${RX},${RY} 0 0 1 ${L},${BOTTOM} Z`} fill="url(#lab-bamboo)" />
        {/* 대나무 결 */}
        {[0.18, 0.27, 0.5, 0.64, 0.76, 0.87].map((p) => (
          <line key={p} x1={L + RX * 2 * p} y1={TOP + 14} x2={L + RX * 2 * p} y2={BOTTOM + 10} stroke="#2e2009" strokeWidth={0.7} opacity={0.12} />
        ))}
        {/* 빛 반사 */}
        <rect x={CX - 30} y={TOP + 30} width={9} height={BOTTOM - TOP - 40} rx={4.5} fill="#fff8e6" opacity={0.28} filter="url(#lab-soft)" />

        {/* 옻칠 띠 */}
        <path d={`${frontArc(TOP + 10)} L${R},${TOP + 34} A${RX},${RY} 0 0 1 ${L},${TOP + 34} Z`} fill="url(#lab-lacquer)" />
        <path d={frontArc(TOP + 34)} fill="none" stroke="#e3b866" strokeWidth={1.4} opacity={0.9} />
        <path d={frontArc(TOP + 10)} fill="none" stroke="#e3b866" strokeWidth={1.4} opacity={0.9} />

        {/* 대나무 마디 */}
        {[TOP + 120, TOP + 196].map((y) => (
          <g key={y}>
            <path d={frontArc(y)} fill="none" stroke="#3a2a10" strokeWidth={3.2} opacity={0.75} />
            <path d={frontArc(y + 3.5)} fill="none" stroke="#f1d9a2" strokeWidth={1.3} opacity={0.6} />
          </g>
        ))}

        {/* 금박 인장 */}
        <g transform={`translate(${CX} ${TOP + 76})`}>
          <circle r={22} fill="none" stroke="url(#lab-gold)" strokeWidth={2} />
          <circle r={17.5} fill="none" stroke="url(#lab-gold)" strokeWidth={0.8} opacity={0.8} />
          <text textAnchor="middle" dominantBaseline="central" fontSize="22" fontFamily="serif" fontWeight={700} fill="url(#lab-gold)">
            易
          </text>
        </g>

        {/* 앞쪽 테: 두께감 */}
        <path d={frontArc(TOP)} fill="none" stroke="#f0d9a3" strokeWidth={3.5} />
        <path d={frontArc(TOP + 3)} fill="none" stroke="#5a3f17" strokeWidth={1.2} opacity={0.6} />
        {/* 바닥 테 */}
        <path d={`M${L},${BOTTOM - 1} A${RX},${RY} 0 0 0 ${R},${BOTTOM - 1}`} fill="none" stroke="#3a2a10" strokeWidth={2.4} opacity={0.5} />
      </g>
    </svg>
  );
}
