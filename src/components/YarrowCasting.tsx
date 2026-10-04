// 시초점: 49개 산가지를 나누고 4씩 세어 덜어내는 '변'을 세 번 반복해 효 하나를 얻는 정통 방식 화면
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FastForward, Scissors, SkipForward, Sparkles } from "lucide-react";
import {
  LINE_NAMES,
  LINE_VALUE_LABEL,
  isChanging,
  isYang,
  readingFromValues,
  yarrowChange,
  yarrowLineValue,
  type LineValue,
  type Reading,
  type YarrowChange,
} from "@/lib/iching";
import HexagramFigure from "./HexagramFigure";

type Props = {
  question?: string;
  onComplete: (reading: Reading) => void;
};

type Phase = "idle" | "split" | "count" | "aside";
const PHASE_MS: Record<Exclude<Phase, "idle">, number> = { split: 800, count: 1300, aside: 800 };
const TOTAL = 49;
const ALL_IDS = Array.from({ length: TOTAL }, (_, i) => i);

export default function YarrowCasting({ question, onComplete }: Props) {
  const [values, setValues] = useState<LineValue[]>([]);
  const [changes, setChanges] = useState<YarrowChange[]>([]);
  const [active, setActive] = useState<number[]>(ALL_IDS);
  const [aside, setAside] = useState<number[]>([]);
  const [current, setCurrent] = useState<YarrowChange | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [auto, setAuto] = useState<"off" | "line" | "all">("off");
  const [lastValue, setLastValue] = useState<LineValue | null>(null);
  const timers = useRef<number[]>([]);

  const done = values.length >= 6;
  const remaining = active.length;

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const runChange = useCallback(() => {
    if (phase !== "idle" || done) return;
    const c = yarrowChange(remaining);
    setCurrent(c);
    setLastValue(null);
    setPhase("split");
    const t1 = window.setTimeout(() => setPhase("count"), PHASE_MS.split);
    const t2 = window.setTimeout(() => setPhase("aside"), PHASE_MS.split + PHASE_MS.count);
    const t3 = window.setTimeout(() => {
      // 덜어낸 산가지: 왼쪽 나머지 + 손가락에 낀 1개 + 오른쪽 나머지
      const left = active.slice(0, c.left);
      const right = active.slice(c.left);
      const hand = right[0];
      const takenIds = [...left.slice(left.length - c.leftRemainder), hand, ...right.slice(right.length - c.rightRemainder)];
      const rest = active.filter((id) => !takenIds.includes(id));
      const nextChanges = [...changes, c];
      if (nextChanges.length === 3) {
        const v = yarrowLineValue(c.after);
        setValues((prev) => {
          const updated = [...prev, v];
          if (updated.length >= 6) setAuto("off");
          return updated;
        });
        setLastValue(v);
        setChanges([]);
        setActive(ALL_IDS);
        setAside([]);
        setAuto((a) => (a === "line" ? "off" : a));
      } else {
        setChanges(nextChanges);
        setActive(rest);
        setAside((prev) => [...prev, ...takenIds]);
      }
      setCurrent(null);
      setPhase("idle");
    }, PHASE_MS.split + PHASE_MS.count + PHASE_MS.aside);
    timers.current.push(t1, t2, t3);
  }, [phase, done, remaining, active, changes]);

  useEffect(() => {
    if (auto === "off" || phase !== "idle" || done) return;
    const t = window.setTimeout(runChange, 350);
    return () => window.clearTimeout(t);
  }, [auto, phase, done, runChange]);

  const lines = values.map((v) => (isYang(v) ? "1" : "0")).join("").padEnd(6, "0");
  const changing = values.flatMap((v, i) => (isChanging(v) ? [i] : []));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col items-center rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)] sm:p-8">
        <p className="text-sm font-bold text-vermilion">정신을 집중해서 산가지를 나누어 주세요. 집중이 강할수록 결과가 정확해집니다.</p>
        <p className="mt-1 text-xs text-muted">시초점은 산가지 49개를 18번 나누어 세어 괘를 만듭니다</p>
        <p className="mt-1 text-sm text-muted">
          {done
            ? "열여덟 번의 변이 모두 끝났습니다"
            : `${LINE_NAMES[values.length]}, ${changes.length + 1}번째 변, 산가지 ${remaining}개`}
        </p>

        <div className="my-4 w-full max-w-[420px]">
          <StalkStage active={active} aside={aside} current={current} phase={phase} />
        </div>

        <div className="min-h-[3.5rem] w-full max-w-[420px] text-center text-sm">
          <AnimatePresence mode="wait">
            <Narration key={`${phase}-${values.length}-${changes.length}-${lastValue ?? ""}`} phase={phase} current={current} changes={changes} lastValue={lastValue} done={done} />
          </AnimatePresence>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {!done ? (
            <>
              <button
                onClick={runChange}
                disabled={phase !== "idle" || auto !== "off"}
                className="inline-flex items-center gap-2 rounded-full bg-vermilion px-6 py-3 font-semibold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Scissors size={18} /> 시초 나누기
              </button>
              <button
                onClick={() => setAuto("line")}
                disabled={phase !== "idle" || auto !== "off"}
                className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-[0_4px_16px_rgba(31,29,26,0.08)] transition hover:bg-background disabled:opacity-50"
              >
                <SkipForward size={16} /> 이 효 마저 세기
              </button>
              <button
                onClick={() => setAuto("all")}
                disabled={phase !== "idle" || auto !== "off"}
                className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-[0_4px_16px_rgba(31,29,26,0.08)] transition hover:bg-background disabled:opacity-50"
              >
                <FastForward size={16} /> 끝까지 자동
              </button>
            </>
          ) : (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => onComplete(readingFromValues(values, question, "yarrow"))}
              className="inline-flex items-center gap-2 rounded-full bg-vermilion px-7 py-3 font-semibold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105"
            >
              <Sparkles size={18} /> 괘 풀이 보기
            </motion.button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center rounded-3xl bg-card shadow-[0_6px_30px_rgba(31,29,26,0.06)] p-6">
        <p className="text-sm text-muted">산가지를 3번 나눌 때마다 효 하나가 결정돼요</p>
        <div className="my-6 text-gold-soft">
          <HexagramFigure lines={lines} revealed={values.length} changing={changing} size={150} />
        </div>
        <ol className="w-full space-y-1.5 text-sm">
          {[5, 4, 3, 2, 1, 0].map((i) => {
            const name = LINE_NAMES[i];
            const v = values[i];
            const isCurrent = i === values.length && !done;
            return (
              <li
                key={name}
                className={`flex items-center justify-between rounded-xl px-3 py-2 ${v ? "bg-background" : "text-muted/60"} ${isCurrent ? "ring-2 ring-vermilion/40" : ""}`}
              >
                <span>{name}</span>
                {v ? (
                  <span className={isChanging(v) ? "text-vermilion" : ""}>
                    {v * 4}개 남음, {v} {isYang(v) ? "양" : "음"}
                    {isChanging(v) ? " (변효)" : ""}
                  </span>
                ) : isCurrent ? (
                  <span className="text-gold-soft">
                    {changes.map((c) => c.after).join(", ") || "49"}
                    {changes.length ? ` (${changes.length}/3변)` : ""}
                  </span>
                ) : (
                  <span className="text-muted/50">아직</span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          남은 개수를 4로 나누면 효값입니다. 36은 9(바뀌는 양), 32는 8(그대로인 음), 28은 7(그대로인 양), 24는 6(바뀌는 음)
        </p>
      </div>
    </div>
  );
}

function Narration({ phase, current, changes, lastValue, done }: { phase: Phase; current: YarrowChange | null; changes: YarrowChange[]; lastValue: LineValue | null; done: boolean }) {
  const wrap = (node: React.ReactNode, cls = "text-foreground/90") => (
    <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`leading-relaxed ${cls}`}>
      {node}
    </motion.p>
  );
  if (done) return wrap("여섯 효가 모두 나왔습니다. 풀이를 확인해 보세요.", "text-gold-soft");
  if (phase === "split" && current)
    return wrap(
      <>
        <b>분이(分二)</b> 산가지를 두 무더기로 나눕니다. 왼쪽 {current.left}개, 오른쪽 {current.right}개.
      </>,
    );
  if (phase === "count" && current)
    return wrap(
      <>
        <b>괘일과 설사</b> 오른쪽에서 하나를 손가락에 끼우고, 양쪽을 4개씩 셉니다. 왼쪽은 {current.leftRemainder}개, 오른쪽은 {current.rightRemainder}개가 남습니다.
      </>,
    );
  if (phase === "aside" && current)
    return wrap(
      <>
        <b>귀기(歸奇)</b> 낀 1개와 {current.leftRemainder}개, {current.rightRemainder}개를 합쳐 <b>{current.taken}개</b>를 덜어냅니다. 남은 산가지 {current.after}개.
      </>,
    );
  if (lastValue)
    return wrap(
      <>
        세 번의 변이 끝났습니다. 남은 {lastValue * 4}개를 4로 나누면 <b>{lastValue}</b>, <b>{LINE_VALUE_LABEL[lastValue]}</b>
      </>,
      "text-gold-soft",
    );
  if (changes.length)
    return wrap(`${changes.length}번째 변까지 마쳤습니다. 남은 ${changes[changes.length - 1].after}개로 다시 나눕니다.`, "text-muted");
  return wrap("49개의 산가지를 두 무더기로 나누는 것부터 시작합니다.", "text-muted");
}

/* ---------- 산가지 무대 ---------- */

const W = 420;
const H = 300;

type Pos = { x: number; y: number; rotate: number; h: number; fill: string };

function StalkStage({ active, aside, current, phase }: { active: number[]; aside: number[]; current: YarrowChange | null; phase: Phase }) {
  const positions = new Map<number, Pos>();

  // 이미 덜어낸 산가지: 맨 위 줄에 작게
  aside.forEach((id, i) => {
    positions.set(id, { x: 14 + (i % 25) * 15.5, y: 12 + Math.floor(i / 25) * 14, rotate: 0, h: 22, fill: "#8c7a4d" });
  });

  const bundlePos = (i: number, n: number): Pos => ({
    x: W / 2 - (n * 5) / 2 + i * 5,
    y: 190 + ((i * 7) % 3) * 3,
    rotate: ((i * 13) % 7) - 3,
    h: 86,
    fill: "url(#yarrow)",
  });

  if (!current || phase === "idle") {
    active.forEach((id, i) => positions.set(id, bundlePos(i, active.length)));
  } else {
    const left = active.slice(0, current.left);
    const right = active.slice(current.left);
    const hand = right[0];
    const pilePos = (j: number, baseX: number, highlight: boolean): Pos => ({
      x: baseX + (j % 12) * 13,
      y: 92 + Math.floor(j / 12) * 50,
      rotate: 0,
      h: 44,
      fill: highlight ? "#c8462f" : "url(#yarrow)",
    });
    left.forEach((id, j) => {
      const isRem = phase !== "split" && j >= left.length - current.leftRemainder;
      positions.set(id, pilePos(j, 14, isRem));
    });
    right.forEach((id, j) => {
      if (id === hand && phase !== "split") {
        positions.set(id, { x: W / 2 - 6, y: 60, rotate: -28, h: 44, fill: "#c9a44a" });
        return;
      }
      const isRem = phase !== "split" && j >= right.length - current.rightRemainder;
      positions.set(id, pilePos(j, W / 2 + 26, isRem));
    });
    if (phase === "aside") {
      const takenIds = [...left.slice(left.length - current.leftRemainder), hand, ...right.slice(right.length - current.rightRemainder)];
      takenIds.forEach((id, k) => {
        const i = aside.length + k;
        positions.set(id, { x: 14 + (i % 25) * 15.5, y: 12 + Math.floor(i / 25) * 14, rotate: 0, h: 22, fill: "#8c7a4d" });
      });
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="시초 산가지">
      <defs>
        <linearGradient id="yarrow" x1="0" x2="1">
          <stop offset="0%" stopColor="#cdb87f" />
          <stop offset="50%" stopColor="#efe1b3" />
          <stop offset="100%" stopColor="#b59c62" />
        </linearGradient>
      </defs>
      {/* 덜어낸 자리 / 나누는 자리 안내선 */}
      <rect x={6} y={4} width={W - 12} height={40} rx={8} fill="none" stroke="var(--border)" strokeDasharray="4 5" />
      <text x={W - 12} y={40} textAnchor="end" fontSize="9" fill="var(--muted)">
        귀기(덜어낸 것)
      </text>
      {phase !== "idle" ? (
        <>
          <text x={14} y={84} fontSize="10" fill="var(--muted)">
            왼쪽, 하늘
          </text>
          <text x={W - 14} y={84} textAnchor="end" fontSize="10" fill="var(--muted)">
            오른쪽, 땅
          </text>
        </>
      ) : (
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
          한 묶음 {active.length}개
        </text>
      )}
      {ALL_IDS.map((id) => {
        const p = positions.get(id);
        if (!p) return null;
        return (
          <motion.rect
            key={id}
            width={6}
            rx={2}
            initial={false}
            // 색은 보간하지 않고 즉시 바꾼다. 49개를 동시에 색 보간하면 메인 스레드가 1초 넘게 멈춘다.
            fill={p.fill}
            animate={{ x: p.x, y: p.y, rotate: p.rotate, height: p.h }}
            transition={{ type: "tween", duration: 0.55, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 100%" }}
            stroke="#6e5a2d"
            strokeWidth={0.5}
          />
        );
      })}
    </svg>
  );
}
