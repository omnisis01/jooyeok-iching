// 산통점: 산통을 흔들어 산가지를 세 번 뽑아 하괘·상괘·동효를 정하는 인터랙티브 화면
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Hand, Sparkles } from "lucide-react";
import { LINE_NAMES, readingFromSantong, trigramByNumber, type Reading } from "@/lib/iching";
import HexagramFigure from "./HexagramFigure";

type Props = {
  question?: string;
  onComplete: (reading: Reading) => void;
};

type Step = 0 | 1 | 2 | 3;
const STEP_LABEL = ["하괘(아래 세 효)를 뽑습니다", "상괘(위 세 효)를 뽑습니다", "움직이는 효(동효)를 뽑습니다", "세 번의 뽑기가 끝났습니다"];

const SHAKE_MS = 900;
const RISE_MS = 700;

export default function SantongCasting({ question, onComplete }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [phase, setPhase] = useState<"idle" | "shaking" | "risen">("idle");
  const [draws, setDraws] = useState<number[]>([]);
  const [risen, setRisen] = useState<number | null>(null);

  const stickCount = step === 2 ? 6 : 8;

  const shake = () => {
    if (phase !== "idle" || step === 3) return;
    setPhase("shaking");
    const pick = 1 + Math.floor(Math.random() * stickCount);
    window.setTimeout(() => {
      setRisen(pick);
      setPhase("risen");
      window.setTimeout(() => {
        setDraws((d) => [...d, pick]);
        setStep((s) => (s + 1) as Step);
        setRisen(null);
        setPhase("idle");
      }, RISE_MS + 900);
    }, SHAKE_MS);
  };

  const lower = draws[0] ? trigramByNumber(draws[0]) : null;
  const upper = draws[1] ? trigramByNumber(draws[1]) : null;
  const moving = draws[2] ?? null;
  const lines = (lower?.lines ?? "") + (upper?.lines ?? "");

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col items-center justify-center rounded-3xl bg-card shadow-[0_6px_30px_rgba(31,29,26,0.06)] p-6 sm:p-10">
        <p className="text-sm font-bold text-vermilion">정신을 집중해서 산통을 흔들어 주세요. 집중이 강할수록 결과가 정확해집니다.</p>
        <p className="mt-1 text-xs text-muted">산통점은 통을 흔들어 산가지 3개를 차례로 뽑습니다</p>
        <p className="mt-1 text-sm text-muted">
          {step < 3 ? `${step + 1} / 3  ` : ""}
          {STEP_LABEL[step]}
        </p>

        <div className="relative my-6 h-[300px] w-[240px]">
          <Cylinder count={stickCount} shaking={phase === "shaking"} risen={risen} step={step} />
        </div>

        <div className="h-7">
          <AnimatePresence mode="wait">
            {phase === "shaking" ? (
              <motion.p key="s" className="text-gold-soft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                산통을 흔들고 있습니다…
              </motion.p>
            ) : phase === "risen" && risen ? (
              <motion.p key="r" className="text-foreground" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {step === 2 ? (
                  <>
                    <b>{risen}</b>번, <b className="text-vermilion">{LINE_NAMES[risen - 1]}</b>가 움직입니다
                  </>
                ) : (
                  <>
                    <b>{risen}</b>번, {trigramByNumber(risen).symbol} <b>{trigramByNumber(risen).name}</b> {trigramByNumber(risen).nature}
                  </>
                )}
              </motion.p>
            ) : step < 3 ? (
              <p key="i" className="text-sm text-muted">
                {step === 2 ? "1~6번 산가지 중 하나가 올라옵니다" : "1~8번 산가지 중 하나가 올라옵니다"}
              </p>
            ) : (
              <p key="d" className="text-sm text-gold-soft">
                괘가 완성되었습니다
              </p>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6">
          {step < 3 ? (
            <motion.button
              onClick={shake}
              disabled={phase !== "idle"}
              whileTap={{ scale: 0.95, rotate: -3 }}
              className="inline-flex items-center gap-2 rounded-full bg-vermilion px-6 py-3 font-semibold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Hand size={18} /> 산통 흔들기
            </motion.button>
          ) : (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => onComplete(readingFromSantong(draws[0], draws[1], draws[2], question))}
              className="inline-flex items-center gap-2 rounded-full bg-vermilion px-7 py-3 font-semibold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105"
            >
              <Sparkles size={18} /> 괘 풀이 보기
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center rounded-3xl bg-card shadow-[0_6px_30px_rgba(31,29,26,0.06)] p-6">
        <p className="text-sm text-muted">뽑은 결과</p>
        <div className="my-6 text-gold-soft">
          <HexagramFigure
            lines={lines.padEnd(6, "0")}
            revealed={lines.length}
            changing={moving ? [moving - 1] : []}
            size={150}
          />
        </div>
        <ul className="w-full space-y-2 text-sm">
          <ResultRow label="하괘" active={step === 0} value={lower ? `${lower.symbol} ${lower.name} ${lower.nature} (${lower.number}번)` : null} />
          <ResultRow label="상괘" active={step === 1} value={upper ? `${upper.symbol} ${upper.name} ${upper.nature} (${upper.number}번)` : null} />
          <ResultRow label="동효" active={step === 2} value={moving ? `${LINE_NAMES[moving - 1]} (${moving}번)` : null} accent />
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          산가지 번호는 선천 팔괘 순서입니다. 1 건☰, 2 태☱, 3 리☲, 4 진☳, 5 손☴, 6 감☵, 7 간☶, 8 곤☷
        </p>
      </div>
    </div>
  );
}

function ResultRow({ label, value, active, accent }: { label: string; value: string | null; active: boolean; accent?: boolean }) {
  return (
    <li className={`flex items-center justify-between rounded-xl px-3 py-2 ${value ? "bg-background" : "text-muted/60"} ${active ? "ring-2 ring-vermilion/40" : ""}`}>
      <span>{label}</span>
      <span className={value && accent ? "text-vermilion" : ""}>{value ?? <span className="text-muted/50">아직</span>}</span>
    </li>
  );
}

function Cylinder({ count, shaking, risen, step }: { count: number; shaking: boolean; risen: number | null; step: Step }) {
  const W = 240;
  const H = 300;
  const tubeX = 70;
  const tubeW = 100;
  const tubeTop = 120;
  const tubeBottom = 285;
  const sticks = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <motion.svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      animate={shaking ? { x: [0, -10, 10, -8, 8, -5, 5, 0], rotate: [0, -4, 4, -3, 3, -2, 2, 0] } : { x: 0, rotate: 0 }}
      transition={shaking ? { duration: SHAKE_MS / 1000, ease: "easeInOut" } : { duration: 0.2 }}
      style={{ transformOrigin: "50% 90%" }}
    >
      <defs>
        <linearGradient id="bamboo" x1="0" x2="1">
          <stop offset="0%" stopColor="#6f5a2a" />
          <stop offset="35%" stopColor="#b8a06a" />
          <stop offset="65%" stopColor="#a58d55" />
          <stop offset="100%" stopColor="#5c491f" />
        </linearGradient>
        <linearGradient id="stick" x1="0" x2="1">
          <stop offset="0%" stopColor="#d8c58e" />
          <stop offset="50%" stopColor="#f0e2b6" />
          <stop offset="100%" stopColor="#bda46a" />
        </linearGradient>
      </defs>

      {/* 산가지: 통 뒤쪽은 그리지 않고 통 위로 튀어나온 부분만 보이게 */}
      {sticks.map((n, i) => {
        const x = tubeX + 14 + (i * (tubeW - 28)) / (count - 1);
        const baseTop = tubeTop - 26 - ((i * 7) % 4) * 5;
        const isRisen = risen === n;
        return (
          <motion.g
            key={`${step}-${n}`}
            initial={{ y: 0 }}
            animate={
              shaking
                ? { y: [0, -6, 4, -8, 3, -5, 0] }
                : isRisen
                  ? { y: -95 }
                  : { y: 0 }
            }
            transition={shaking ? { duration: SHAKE_MS / 1000, delay: i * 0.03 } : { type: "spring", stiffness: 180, damping: 16, duration: RISE_MS / 1000 }}
          >
            <rect x={x - 5} y={baseTop} width={10} height={tubeBottom - baseTop} rx={3} fill="url(#stick)" stroke="#7c6a3c" strokeWidth={0.6} />
            <text x={x} y={baseTop + 16} textAnchor="middle" fontSize="10" fontWeight={700} fill={isRisen ? "var(--vermilion)" : "#6f5a2a"} style={{ writingMode: "vertical-rl" }}>
              {isRisen ? n : "|"}
            </text>
          </motion.g>
        );
      })}

      {/* 통 몸체 */}
      <rect x={tubeX} y={tubeTop} width={tubeW} height={tubeBottom - tubeTop} rx={14} fill="url(#bamboo)" stroke="#3e3113" strokeWidth={1.5} />
      {[0.3, 0.62].map((p) => (
        <rect key={p} x={tubeX - 3} y={tubeTop + (tubeBottom - tubeTop) * p} width={tubeW + 6} height={9} rx={3} fill="#4b3a14" opacity={0.85} />
      ))}
      <ellipse cx={tubeX + tubeW / 2} cy={tubeTop} rx={tubeW / 2} ry={12} fill="#2a2110" stroke="#3e3113" strokeWidth={1.5} />
      <text x={tubeX + tubeW / 2} y={tubeTop + 90} textAnchor="middle" fontSize="26" fill="#2a2110" opacity={0.55} fontWeight={700}>
        算筒
      </text>
    </motion.svg>
  );
}
