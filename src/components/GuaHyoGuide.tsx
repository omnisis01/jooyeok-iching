// 떠 있는 동그란 버튼 "주역의 괘와 효란?"과, 누르면 열리는 그림 설명(효, 괘, 변효, 지괘, 읽는 순서 5단계)
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { HEXAGRAMS, findHexagramByLines } from "@/data/hexagrams";
import { getLineText, lineTitle } from "@/data/lineTexts";
import { LINE_NAMES } from "@/lib/iching";
import { track } from "@/lib/track";

/** 다른 화면에서 이 설명을 열고 싶을 때 보내는 이벤트 이름 */
export const OPEN_GUIDE_EVENT = "open-guahyo-guide";
export function openGuaHyoGuide() {
  window.dispatchEvent(new Event(OPEN_GUIDE_EVENT));
}

// 예시: 택지취 구오가 움직여 뇌지예가 된다
const EX_PRIMARY = HEXAGRAMS.find((h) => h.number === 45)!;
const EX_LINE = 4;
const EX_RESULT = findHexagramByLines(
  EX_PRIMARY.lines
    .split("")
    .map((c, i) => (i === EX_LINE ? (c === "1" ? "0" : "1") : c))
    .join(""),
);
const EX_LINE_TITLE = lineTitle(EX_PRIMARY.lines, EX_LINE);

type HexProps = {
  lines: string;
  /** 빨갛게 표시할 줄 */
  changing?: number;
  /** 변효 색을 초록으로(뒤집힌 뒤) */
  flipped?: boolean;
  /** 아래부터 몇 줄까지 보일지 */
  reveal?: number;
  /** 왼쪽에 효 자리 이름 */
  names?: boolean;
  /** 오른쪽 변효 표식 */
  marker?: boolean;
  size?: "sm" | "md";
};

/** 줄 여섯 개. 음양이 바뀌면 가운데가 벌어지거나 붙는 애니메이션 */
function GuideHex({ lines, changing, flipped = false, reveal = 6, names = false, marker = false, size = "md" }: HexProps) {
  const barH = size === "sm" ? "h-2" : "h-3.5";
  const gap = size === "sm" ? "gap-1.5" : "gap-2.5";
  return (
    <div className={`flex flex-col ${gap}`}>
      {[5, 4, 3, 2, 1, 0].map((i) => {
        const yang = lines[i] === "1";
        const shown = i < reveal;
        const isChanging = i === changing;
        const color = isChanging ? (flipped ? "bg-jade" : "bg-vermilion") : "bg-gold";
        return (
          <div key={i} className={`flex items-center gap-2 ${shown ? "" : "invisible"}`}>
            {names ? <span className={`w-9 shrink-0 text-right text-xs font-bold ${isChanging ? "text-vermilion" : "text-muted"}`}>{LINE_NAMES[i]}</span> : null}
            <motion.div
              className={`relative flex-1 ${barH}`}
              initial={false}
              animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: -14 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <motion.span
                className={`absolute left-0 top-0 h-full rounded-sm ${color}`}
                initial={false}
                animate={{ width: yang ? "100%" : "42%" }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
              <motion.span
                className={`absolute right-0 top-0 h-full rounded-sm ${color}`}
                initial={false}
                animate={{ width: yang ? "0%" : "42%", opacity: yang ? 0 : 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
            </motion.div>
            {marker ? (
              <span className="w-14 shrink-0 text-xs font-bold">
                {isChanging ? (
                  <motion.span
                    className={`inline-flex items-center ${flipped ? "text-jade" : "text-vermilion"}`}
                    animate={flipped ? { x: 0 } : { x: [0, -4, 0] }}
                    transition={{ duration: 1, repeat: flipped ? 0 : Infinity }}
                  >
                    <ChevronLeft size={14} />
                    {flipped ? "뒤집힘" : "변효"}
                  </motion.span>
                ) : null}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Tag({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "red" | "jade" }) {
  const cls = tone === "red" ? "bg-vermilion/12 text-vermilion" : tone === "jade" ? "bg-jade/15 text-jade" : "bg-gold/15 text-gold-soft";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{children}</span>;
}

/* 1단계: 효 */
function StepHyo() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl bg-background p-4 text-center">
        <div className="mx-auto h-4 w-24 rounded-sm bg-gold" />
        <p className="mt-3 font-bold">양</p>
        <p className="text-xs text-muted">이어진 줄</p>
        <p className="mt-1 text-sm text-foreground/80">밝고 움직이는 힘</p>
      </div>
      <div className="rounded-2xl bg-background p-4 text-center">
        <div className="mx-auto flex w-24 justify-between">
          <span className="h-4 w-10 rounded-sm bg-gold" />
          <span className="h-4 w-10 rounded-sm bg-gold" />
        </div>
        <p className="mt-3 font-bold">음</p>
        <p className="text-xs text-muted">끊어진 줄</p>
        <p className="mt-1 text-sm text-foreground/80">부드럽고 받아들이는 힘</p>
      </div>
    </div>
  );
}

/* 2단계: 괘. 줄이 아래부터 하나씩 쌓인다 */
function StepGua() {
  const [reveal, setReveal] = useState(0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    let n = 0;
    const t = window.setInterval(() => {
      n += 1;
      setReveal(n);
      if (n >= 6) window.clearInterval(t);
    }, 450);
    return () => window.clearInterval(t);
  }, [run]);
  return (
    <div className="rounded-2xl bg-background p-4">
      <div className="mx-auto max-w-[260px]">
        <GuideHex lines={EX_PRIMARY.lines} reveal={reveal} names />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>첫 줄이 맨 아래, 여섯째 줄이 맨 위</span>
        <button
          onClick={() => {
            setReveal(0);
            setRun((r) => r + 1);
          }}
          className="inline-flex items-center gap-1 font-bold text-foreground/70"
        >
          <RefreshCw size={12} /> 다시 쌓기
        </button>
      </div>
      <p className="mt-3 text-center text-sm font-bold">
        {reveal >= 6 ? (
          <>
            여섯 줄이 모여 괘 하나, <span className="text-vermilion">{EX_PRIMARY.name}</span>
          </>
        ) : (
          `${reveal}번째 뽑기, ${LINE_NAMES[Math.max(0, reveal - 1)]}`
        )}
      </p>
    </div>
  );
}

/* 3단계: 변효 */
function StepChanging() {
  const t = getLineText(EX_PRIMARY.number, EX_LINE);
  return (
    <div className="rounded-2xl bg-background p-4">
      <p className="text-center text-sm font-bold">
        예) {EX_PRIMARY.name}에서 <span className="text-vermilion">{EX_LINE_TITLE}</span>가 움직였어요
      </p>
      <div className="mx-auto mt-3 max-w-[280px]">
        <GuideHex lines={EX_PRIMARY.lines} changing={EX_LINE} names marker />
      </div>
      <div className="mt-4 rounded-xl bg-card p-3 text-sm leading-relaxed">
        <Tag tone="red">{EX_LINE_TITLE} 효사</Tag>
        <p className="mt-2 font-serif text-gold-soft">{t.hanja}</p>
        <p className="mt-1 text-foreground/85">{t.text}</p>
      </div>
    </div>
  );
}

/* 4단계: 지괘. 변효가 뒤집히는 모습 */
function StepResult() {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setFlipped(true), 1200);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="rounded-2xl bg-background p-4">
      <div className="flex items-center justify-center gap-2 text-sm font-bold">
        <span className={flipped ? "text-muted line-through decoration-1" : "text-foreground"}>{EX_PRIMARY.name}</span>
        <ChevronRight size={16} className="text-muted" />
        <span className={flipped ? "text-jade" : "text-muted"}>{EX_RESULT.name}</span>
      </div>
      <div className="mx-auto mt-3 max-w-[280px]">
        <GuideHex lines={flipped ? EX_RESULT.lines : EX_PRIMARY.lines} changing={EX_LINE} flipped={flipped} names marker />
      </div>
      <p className="mt-3 text-center text-sm text-foreground/80">
        {flipped ? `양이던 ${EX_LINE_TITLE}가 음으로 바뀌어 ${EX_RESULT.name}가 되었어요` : "빨간 줄이 곧 반대로 뒤집혀요"}
      </p>
      <div className="mt-3 text-center">
        <button onClick={() => setFlipped((f) => !f)} className="inline-flex items-center gap-1 rounded-full bg-card px-4 py-2 text-xs font-bold">
          <RefreshCw size={12} /> {flipped ? "되돌리기" : "뒤집어 보기"}
        </button>
      </div>
    </div>
  );
}

/* 5단계: 이어서 읽기 */
function StepFlow({ onStart }: { onStart: () => void }) {
  const cols = [
    { head: "본괘", name: EX_PRIMARY.name, what: "큰 판세", tone: "gold" as const, node: <GuideHex lines={EX_PRIMARY.lines} changing={EX_LINE} size="sm" /> },
    { head: "변효", name: EX_LINE_TITLE, what: "지금 내 자리", tone: "red" as const, node: <GuideHex lines={EX_PRIMARY.lines} changing={EX_LINE} reveal={6} size="sm" /> },
    { head: "지괘", name: EX_RESULT.name, what: "앞으로의 흐름", tone: "jade" as const, node: <GuideHex lines={EX_RESULT.lines} changing={EX_LINE} flipped size="sm" /> },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-1 rounded-2xl bg-background p-3">
        {cols.map((c, i) => (
          <div key={c.head} className="contents">
            <div className="flex flex-col items-center text-center">
              <Tag tone={c.tone}>{c.head}</Tag>
              <div className={`mt-2 w-full max-w-[64px] ${i === 1 ? "opacity-40" : ""}`}>{c.node}</div>
              <p className="mt-2 text-sm font-bold">{c.name}</p>
              <p className="text-[11px] text-muted">{c.what}</p>
            </div>
            {i < 2 ? <ChevronRight size={16} className="mt-12 text-muted" /> : null}
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-background p-4 text-sm leading-relaxed">
        <p className="text-xs font-bold text-muted">이어서 읽으면</p>
        <p className="mt-1 font-bold">사람이 모이는 때에 나는 중심에 있어요. 꾸준히 바르게 하면, 준비한 대로 즐겁게 풀려 가요.</p>
      </div>
      <ul className="space-y-2 text-sm leading-relaxed text-foreground/85">
        <li className="rounded-2xl bg-background p-3">
          <b className="text-foreground">변효가 없으면</b> 지괘도 없어요. 괘사만으로 읽어요.
        </li>
        <li className="rounded-2xl bg-background p-3">
          <b className="text-foreground">한 질문에 한 번만 뽑아요.</b> 처음 뽑은 답이 가장 정확하고, 같은 질문을 두 번 세 번 다시 뽑으면 효과가 없어요. 주역 몽괘의 괘사가 그렇게 가르칩니다. 결과가 마음에 안 들어도 그 답을 곰곰이 새기는 쪽이 도움이 돼요.
        </li>
        <li className="rounded-2xl bg-background p-3">
          <b className="text-foreground">변효가 여럿이면</b> 전통 규칙에 따라 어느 효사를 중심으로 읽을지 앱이 골라 줘요. 여섯 줄이 모두 변효일 때도 있는데(4096번에 한 번쯤) 그때는 지괘의 괘사가 곧 답이에요.
        </li>
      </ul>
      <button onClick={onStart} className="w-full rounded-full bg-vermilion py-3.5 font-bold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)]">
        나만의 괘와 효 뽑아 보기
      </button>
    </div>
  );
}

const STEPS = [
  {
    title: "효는 줄 하나예요",
    body: "주역은 세상 모든 일을 두 가지 줄로 그려요. 이어진 줄은 양, 끊어진 줄은 음입니다. 이 줄 하나를 효라고 불러요. 점을 칠 때는 동전이나 산가지로 이 줄을 한 번에 하나씩, 모두 여섯 번 뽑아요.",
  },
  {
    title: "여섯 번 뽑은 줄이 쌓여 괘 하나가 돼요",
    body: "여섯 번 뽑은 줄 여섯 개를 아래에서 위로 쌓으면 괘 하나가 돼요. 첫 번째 뽑은 줄이 맨 아래 초효, 여섯 번째가 맨 위 상효예요. 줄마다 음 아니면 양이니 여섯 줄로 만들 수 있는 그림은 64가지, 이것이 64괘입니다. 괘에 붙은 글인 괘사가 큰 판세를 알려 줘요.",
  },
  {
    title: "변효는 여섯 줄 중 곧 바뀌려는 줄이에요",
    body: "여섯 번 뽑는 동안 동전 세 개가 모두 앞면이거나 모두 뒷면으로 나오는 때가 있어요. 그 줄은 지금은 양(또는 음)이지만 힘이 끝까지 차서 곧 반대로 넘어가요. 한낮이 지나면 해가 기울듯이요. 지금 모습과 곧 될 모습이 다른 이 줄을 변효, 곧 움직이는 효라고 해요. 여섯 줄 가운데 실제로 변화가 일어나는 자리라서 그 효사를 가장 먼저 읽어요.",
  },
  {
    title: "지괘는 변효가 뒤집힌 뒤의 괘예요",
    body: "양이던 변효는 음이, 음이던 변효는 양이 돼요. 그러면 다른 괘가 되는데 이것이 지괘입니다. 지금 상황이 어디로 흘러가는지 보여 줘요.",
  },
  {
    title: "세 가지를 이어서 읽어요",
    body: "괘로 큰 판세를, 변효로 지금 내 자리를, 지괘로 앞으로의 흐름을 봐요. 결과 화면도 이 순서대로 나와요.",
  },
];

export default function GuaHyoGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [hint, setHint] = useState(false);

  // 처음 몇 초 동안 버튼 옆에 이름표를 보여 준다
  useEffect(() => {
    const show = window.setTimeout(() => setHint(true), 800);
    const hide = window.setTimeout(() => setHint(false), 6800);
    const onOpen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_GUIDE_EVENT, onOpen);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
      window.removeEventListener(OPEN_GUIDE_EVENT, onOpen);
    };
  }, []);

  const go = (d: number) => {
    setDir(d);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + d)));
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  const start = () => {
    setOpen(false);
    window.location.hash = "divine";
    window.scrollTo({ top: 0 });
  };

  const s = STEPS[step];

  return (
    <>
      {/* 떠 있는 동그란 버튼. 휴대폰에서는 하단 탭 위, 넓은 화면에서는 오른쪽 아래 */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-4 z-40 flex items-center gap-2 sm:right-[max(1rem,calc(50%-260px+1rem))] lg:bottom-6 lg:right-6">
        <AnimatePresence>
          {hint && !open ? (
            <motion.span
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="rounded-full bg-foreground px-3 py-1.5 text-xs font-bold text-card shadow-lg"
            >
              주역의 괘와 효란?
            </motion.span>
          ) : null}
        </AnimatePresence>
        <motion.button
          onClick={() => {
            setStep(0);
            setOpen(true);
            setHint(false);
            track("guide_open", { from: "fab" });
          }}
          onMouseEnter={() => setHint(true)}
          onMouseLeave={() => setHint(false)}
          whileTap={{ scale: 0.92 }}
          aria-label="주역의 괘와 효란?"
          title="주역의 괘와 효란?"
          className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-foreground text-card shadow-[0_10px_28px_rgba(0,0,0,0.3)] ring-1 ring-card/10"
        >
          <span className="flex w-6 flex-col gap-[3px]" aria-hidden>
            <span className="h-[3px] rounded-full bg-card" />
            <span className="flex justify-between"><span className="h-[3px] w-[10px] rounded-full bg-card" /><span className="h-[3px] w-[10px] rounded-full bg-card" /></span>
            <span className="h-[3px] rounded-full bg-vermilion" />
          </span>
          <span className="mt-1 text-[10px] font-bold leading-none">괘와 효?</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="주역의 괘와 효란?"
              className="flex max-h-[92vh] w-full max-w-[480px] flex-col rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pt-5">
                <p className="text-sm font-bold text-vermilion">주역의 괘와 효란?</p>
                <button onClick={() => setOpen(false)} aria-label="닫기" className="rounded-full p-1.5 text-muted hover:bg-background">
                  <X size={20} />
                </button>
              </div>

              <div className="flex gap-1.5 px-5 pt-3" aria-hidden>
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDir(i > step ? 1 : -1);
                      setStep(i);
                    }}
                    className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-vermilion" : "bg-border"}`}
                  />
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-4 pt-4">
                {/* 단계 전환은 퇴장 애니메이션 없이 바로 바꾼다. 가려진 탭에서 멈추지 않도록 */}
                <motion.div key={step} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }}>
                    <p className="text-xs font-bold text-muted">
                      {step + 1} / {STEPS.length}
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold leading-snug">{s.title}</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-foreground/85">{s.body}</p>
                    <div className="mt-4">
                      {step === 0 ? <StepHyo /> : null}
                      {step === 1 ? <StepGua /> : null}
                      {step === 2 ? <StepChanging /> : null}
                      {step === 3 ? <StepResult /> : null}
                      {step === 4 ? <StepFlow onStart={start} /> : null}
                    </div>
                </motion.div>
              </div>

              <div className="flex gap-2 border-t border-border px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
                <button
                  onClick={() => go(-1)}
                  disabled={step === 0}
                  className="flex-1 rounded-full bg-background py-3 text-sm font-bold disabled:opacity-40"
                >
                  이전
                </button>
                {step < STEPS.length - 1 ? (
                  <button onClick={() => go(1)} className="flex-[2] rounded-full bg-foreground py-3 text-sm font-bold text-card">
                    다음
                  </button>
                ) : (
                  <button onClick={() => setOpen(false)} className="flex-[2] rounded-full bg-foreground py-3 text-sm font-bold text-card">
                    다 봤어요
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
