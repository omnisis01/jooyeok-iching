// 점치기 전체 흐름: 질문 입력·방법 선택 → 점 뽑기 → 결과
"use client";

import { kstDateString } from "@/lib/clock";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Briefcase, ChevronRight, Coins, Compass, FileSignature, GraduationCap, Heart, HeartPulse, Home, Landmark, Lock, Plane, Scale, Sparkles, Sprout, Store, Users } from "lucide-react";
import { guessCategory } from "@/lib/categoryGuess";

type LastMethod = Method | "yukhyo";
const LAST_METHOD_KEY = "jooyeok-last-method";
const METHOD_LABEL: Record<LastMethod, string> = { coin: "척전법", santong: "산통법", yarrow: "시초점", yukhyo: "육효점" };

// 분야 아이콘: 글 대신 그림으로 고르게
const CATEGORY_ICON: Record<Category, React.ReactNode> = {
  overall: <Sparkles size={22} />,
  wealth: <Coins size={22} />,
  love: <Heart size={22} />,
  exam: <GraduationCap size={22} />,
  business: <Store size={22} />,
  work: <Briefcase size={22} />,
  contract: <FileSignature size={22} />,
  health: <HeartPulse size={22} />,
  move: <Home size={22} />,
  travel: <Plane size={22} />,
  family: <Users size={22} />,
  lawsuit: <Scale size={22} />,
};
import YukhyoResult from "./YukhyoResult";
import { analyzeYukhyo } from "@/lib/yukhyo";
import type { Reading } from "@/lib/iching";
import CoinCasting from "./CoinCasting";
import SantongCasting from "./SantongCasting";
import ResultView from "./ResultView";
import YarrowCasting from "./YarrowCasting";
import { type Method } from "./MethodGuide";
import FocusGate from "./FocusGate";
import { PERIODS, type Period } from "@/lib/period";
import { todayString } from "@/lib/yukhyo";
import { CATEGORIES, QUESTION_EXAMPLES, categoryOf, type Category } from "@/lib/categories";
import QuotaGate, { QuotaBadge, useQuota } from "./QuotaGate";
import { consumeCast, quotaState, refreshServerQuota } from "@/lib/quota";
import { track } from "@/lib/track";
import { fetchIsAdmin } from "@/lib/admin";

type Stage = "setup" | "focus" | Method | "result" | "yukhyo";

export default function DivinationFlow() {
  const [stage, setStage] = useState<Stage>("setup");
  const [category, setCategory] = useState<Category>("overall");
  // 점치기 전에 쓰는 질문(선택). AI 풀이와 결과 화면에 그대로 쓰인다
  const [question, setQuestion] = useState("");
  // 지금 상황 한 줄(선택). 구체적일수록 AI 점사풀이가 내 상황에 맞는다
  const [context, setContext] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [castKey, setCastKey] = useState(0);
  const [pending, setPending] = useState<Method>("coin");
  const [period, setPeriod] = useState<Period>("today");
  // 기간과 Pro 방식은 접어 둔다(대부분 오늘, 대부분 기본 방식). 화면을 짧게
  const [periodOpen, setPeriodOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  // 사용자가 분야를 직접 골랐으면 자동 짐작을 멈춘다
  const [catTouched, setCatTouched] = useState(false);
  const [guessed, setGuessed] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [lastMethod, setLastMethod] = useState<LastMethod | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const v = localStorage.getItem(LAST_METHOD_KEY) as LastMethod | null;
        if (v && v in METHOD_LABEL) setLastMethod(v);
      } catch {}
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  const onQuestionChange = (v: string) => {
    setQuestion(v);
    if (catTouched) return;
    const g = guessCategory(v);
    if (g) {
      setCategory(g);
      setGuessed(true);
    } else if (guessed) {
      setCategory("overall");
      setGuessed(false);
    }
  };
  const [periodDate, setPeriodDate] = useState(todayString());
  const quota = useQuota();
  // 시초점은 Pro와 관리자만. 가장 정교한 방식이라 Pro의 이유가 된다
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchIsAdmin().then((v) => alive && setAdmin(v));
    return () => {
      alive = false;
    };
  }, []);
  const yarrowOpen = quota.premium || admin;
  useEffect(() => {
    const busy = stage !== "result";
    document.body.toggleAttribute("data-casting", busy);
    return () => document.body.removeAttribute("data-casting");
  }, [stage]);
  // 육효점: 동전으로 뽑은 뒤 육효(세효·응효·용신·시기)로 바로 판단한다. Pro와 관리자만
  const [yukhyoMode, setYukhyoMode] = useState(false);
  const isFirstRender = useRef(true);

  // 단계가 바뀔 때 섹션 상단으로 스크롤해 결과가 잘리지 않게 한다 (첫 렌더는 제외)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document.getElementById("divine")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

  const start = (method: Method, yukhyo = false) => {
    setMethodOpen(false);
    const remember: LastMethod = yukhyo ? "yukhyo" : method;
    setLastMethod(remember);
    try {
      localStorage.setItem(LAST_METHOD_KEY, remember);
    } catch {}
    setYukhyoMode(yukhyo);
    setPending(method);
    setStage("focus");
    track("cast_start", { kind: "iching", method, category });
    // 다른 기기에서 쓴 횟수까지 반영해 집중 화면 동안 새로 확인한다
    refreshServerQuota();
  };

  const beginCast = () => {
    // 그사이 다른 기기에서 횟수를 다 썼으면 처음 화면으로 돌아가 안내한다
    if (quotaState().remaining <= 0) {
      setStage("setup");
      return;
    }
    setCastKey((k) => k + 1);
    setStage(pending);
  };

  const complete = (r: Reading) => {
    consumeCast();
    track("cast_done", { kind: "iching", method: r.method, category, changing: r.changingLines.length, q: Boolean(question.trim()) });
    setReading({ ...r, category, question: question.trim() || undefined, context: context.trim() || undefined, period, periodDate: period === "date" ? periodDate : undefined });
    setStage(yukhyoMode ? "yukhyo" : "result");
  };

  const restart = () => {
    setReading(null);
    setQuestion("");
    setContext("");
    setCatTouched(false);
    setGuessed(false);
    setCatOpen(false);
    setStage("setup");
  };

  return (
    <div className="relative">
        {stage === "setup" ? (
          <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {/* 묻기 화면은 메시지 하나: "무엇이 궁금하세요?" 질문 칸 + 하늘에 묻기 버튼. 분야는 글에서 짐작해 칩으로, 방법은 버튼 뒤 시트로 */}
            <h2 className="mt-2 text-center text-2xl font-extrabold">무엇이 궁금하세요?</h2>
            <p className="mt-1 text-center text-sm text-muted">한 줄로 적어 주세요. 안 적어도 괜찮아요.</p>
            <textarea
              id="question"
              value={question}
              onChange={(e) => onQuestionChange(e.target.value.slice(0, 60))}
              maxLength={60}
              rows={2}
              placeholder={`예: ${QUESTION_EXAMPLES[category][0]}`}
              className="mt-4 w-full resize-none rounded-3xl bg-card px-5 py-4 text-[17px] leading-relaxed shadow-[0_6px_30px_rgba(31,29,26,0.08)] outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
            />
            {question.trim() ? (
              <input
                value={context}
                onChange={(e) => setContext(e.target.value.slice(0, 80))}
                maxLength={80}
                placeholder="지금 상황 한 줄 (선택) 예: 2차 면접, 경쟁률이 높아요"
                className="mt-2 w-full rounded-2xl bg-card px-4 py-2.5 text-sm shadow-[0_4px_16px_rgba(31,29,26,0.06)] outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
              />
            ) : null}

            {/* 분야와 기간: 칩 두 개. 분야 칩을 누르면 12칸이 펼쳐진다 */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={() => setCatOpen((v) => !v)} aria-expanded={catOpen} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold shadow-[0_2px_10px_rgba(31,29,26,0.06)] ${catOpen ? "bg-foreground text-card" : "bg-card"}`}>
                <span className={catOpen ? "text-gold-soft" : "text-vermilion"}>{CATEGORY_ICON[category]}</span>
                {categoryOf(category).label}
                {guessed && !catTouched ? <span className={`text-[11px] font-normal ${catOpen ? "text-card/70" : "text-muted"}`}>자동</span> : null}
                <span className="text-[10px]">{catOpen ? "▴" : "▾"}</span>
              </button>
              <button onClick={() => setPeriodOpen((v) => !v)} aria-expanded={periodOpen} className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold shadow-[0_2px_10px_rgba(31,29,26,0.06)] ${periodOpen ? "bg-foreground text-card" : "bg-card"}`}>
                {PERIODS.find((p) => p.key === period)?.label}
                {period === "date" && periodDate ? ` ${periodDate.slice(5)}` : ""} <span className="text-[10px]">{periodOpen ? "▴" : "▾"}</span>
              </button>
              <span className="ml-auto">
                <QuotaBadge />
              </span>
            </div>
            {catOpen ? (
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {CATEGORIES.map((c) => {
                  const on = category === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => {
                        setCategory(c.key);
                        setCatTouched(true);
                        setCatOpen(false);
                      }}
                      aria-pressed={on}
                      title={c.desc}
                      className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition ${on ? "bg-vermilion/12 text-foreground ring-2 ring-vermilion" : "bg-card text-foreground/80 shadow-[0_2px_10px_rgba(31,29,26,0.06)] hover:bg-border/60"}`}
                    >
                      <span className="text-vermilion">{CATEGORY_ICON[c.key]}</span>
                      {c.short}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {periodOpen ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setPeriod(p.key);
                      if (p.key !== "date") setPeriodOpen(false);
                    }}
                    title={p.desc}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${period === p.key ? "bg-foreground text-card" : "bg-card text-foreground shadow-[0_2px_10px_rgba(31,29,26,0.06)] hover:bg-border/60"}`}
                  >
                    {p.label}
                  </button>
                ))}
                {period === "date" ? (
                  <input type="date" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} className="rounded-full bg-card px-3 py-1 text-xs shadow-[0_2px_10px_rgba(31,29,26,0.06)] outline-none" />
                ) : null}
              </div>
            ) : null}

            {quota.remaining <= 0 ? (
              <div className="mt-4">
                <QuotaGate onGoPremium={() => (window.location.hash = "home")} />
              </div>
            ) : (
              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => setMethodOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-vermilion px-8 py-3 text-base font-bold text-white shadow-[0_8px_24px_rgba(216,69,43,0.35)] transition hover:brightness-105"
                >
                  하늘에 묻기 <ChevronRight size={18} />
                </button>
              </div>
            )}
            <p className="mt-2 text-center text-xs text-muted">{lastMethod ? `지난번처럼 ${METHOD_LABEL[lastMethod]}으로 뽑아요. 버튼을 누른 뒤 바꿀 수 있어요.` : "누르면 뽑는 방법을 고를 수 있어요."}</p>

            {/* 방법 선택 시트 */}
            {methodOpen ? (
              <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="뽑는 방법">
                <button aria-label="닫기" onClick={() => setMethodOpen(false)} className="absolute inset-0 bg-black/45" />
                <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[520px] rounded-t-3xl bg-background px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
                  <div className="flex items-center justify-between px-1">
                    <p className="font-bold">어떻게 뽑을까요</p>
                    <QuotaBadge />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <MethodCard icon={<Coins size={22} />} title="척전법" sub="동전 세 개" desc="가볍고 빠르게" active={lastMethod === "coin"} onClick={() => start("coin")} />
                    <MethodCard icon={<Landmark size={22} />} title="산통법" sub="산통 흔들기" desc="깊이 들여다보기" active={lastMethod === "santong"} onClick={() => start("santong")} />
                  </div>
                  <div className="mt-2 grid gap-2">
                    <MethodCard
                      icon={<Sprout size={22} />}
                      title="시초점"
                      sub="산가지 50개"
                      desc="주역 원전의 가장 오래되고 정교한 방식이에요. 인생의 중요한 질문에 알맞아요."
                      badge={yarrowOpen ? (admin && !quota.premium ? "관리자" : "Pro") : "Pro 전용"}
                      locked={!yarrowOpen}
                      active={lastMethod === "yarrow"}
                      onClick={() => (yarrowOpen ? start("yarrow") : (window.location.hash = "home"))}
                    />
                    <MethodCard
                      icon={<Compass size={22} />}
                      title="육효점"
                      sub="동전 + 육효"
                      desc="날짜의 기운까지 얹어 되는지와 때를 짚어요."
                      badge={yarrowOpen ? (admin && !quota.premium ? "관리자" : "Pro") : "Pro 전용"}
                      locked={!yarrowOpen}
                      active={lastMethod === "yukhyo"}
                      onClick={() => (yarrowOpen ? start("coin", true) : (window.location.hash = "home"))}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        ) : null}

        {stage === "focus" ? (
          <motion.div key="focus" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <button onClick={restart} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground">
              <ArrowLeft size={16} /> 방법 다시 고르기
            </button>
            <FocusGate
              action={pending === "coin" ? "동전을 던져" : pending === "santong" ? "산통을 흔들어" : "산가지를 나누어"}
              topic={categoryOf(category).label}
              question={question.trim() || undefined}
              onReady={beginCast}
            />
          </motion.div>
        ) : null}

        {stage === "coin" || stage === "santong" || stage === "yarrow" ? (
          <motion.div key={`cast-${castKey}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mb-2 flex items-center justify-between">
              <button onClick={restart} className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground">
                <ArrowLeft size={16} /> 방법 다시 고르기
              </button>
              <span className="text-xs text-muted">
                {categoryOf(category).label} · {stage === "coin" ? (yukhyoMode ? "육효점" : "척전법") : stage === "santong" ? "산통법" : "시초점"}
              </span>
            </div>
            {stage === "coin" ? (
              <CoinCasting onComplete={complete} />
            ) : stage === "santong" ? (
              <SantongCasting onComplete={complete} />
            ) : (
              <YarrowCasting onComplete={complete} />
            )}
          </motion.div>
        ) : null}

        {stage === "yukhyo" && reading ? (
          <motion.div key="yukhyo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <YukhyoResult
              result={analyzeYukhyo({
                lines: reading.primary.lines,
                changingLines: reading.changingLines,
                category,
                date: reading.castAt ? kstDateString(Date.parse(reading.castAt)) : todayString(),
                question: reading.question,
                castAt: reading.castAt,
              })}
              onRestart={restart}
            />
          </motion.div>
        ) : null}

        {stage === "result" && reading ? (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <ResultView reading={reading} onRestart={restart} />
          </motion.div>
        ) : null}
    </div>
  );
}

function MethodCard({ icon, title, sub, desc, badge, locked, active, onClick }: { icon: React.ReactNode; title: string; sub: string; desc: string; badge?: string; locked?: boolean; active?: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`group flex break-keep items-center gap-2.5 rounded-2xl bg-card px-3 py-2.5 text-left shadow-[0_6px_30px_rgba(31,29,26,0.06)] transition hover:shadow-[0_10px_36px_rgba(31,29,26,0.10)] ${locked ? "opacity-75" : ""} ${active ? "ring-2 ring-vermilion" : ""}`}
    >
      <span className={`shrink-0 rounded-xl p-2 transition ${locked ? "bg-foreground/8 text-muted" : "bg-vermilion/10 text-vermilion group-hover:bg-vermilion group-hover:text-card"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[15px] font-bold">{title}</span>
          <span className="text-[11px] text-muted">{sub}</span>
          {badge ? (
            <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${locked ? "bg-foreground/10 text-foreground/70" : "bg-gold/20 text-gold-soft"}`}>
              {locked ? <Lock size={10} /> : null}
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-foreground/75">{desc}</span>
      </span>
    </motion.button>
  );
}
