// 점치기 전체 흐름: 질문 입력·방법 선택 → 점 뽑기 → 결과
"use client";

import { kstDateString } from "@/lib/clock";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Briefcase, Coins, Compass, FileSignature, GraduationCap, Heart, HeartPulse, HelpCircle, Home, Landmark, Lock, Plane, Scale, Sparkles, Sprout, Store, Users } from "lucide-react";

// 분야 아이콘: 글 대신 그림으로 고르게
const CATEGORY_ICON: Record<Category, React.ReactNode> = {
  overall: <Sparkles size={18} />,
  wealth: <Coins size={18} />,
  love: <Heart size={18} />,
  exam: <GraduationCap size={18} />,
  business: <Store size={18} />,
  work: <Briefcase size={18} />,
  contract: <FileSignature size={18} />,
  health: <HeartPulse size={18} />,
  move: <Home size={18} />,
  travel: <Plane size={18} />,
  family: <Users size={18} />,
  lawsuit: <Scale size={18} />,
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
  const [proOpen, setProOpen] = useState(false);
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
    setStage("setup");
  };

  return (
    <div className="relative">
        {stage === "setup" ? (
          <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {/* 묻기 화면: 글은 적게, 고를 것은 아이콘으로 한눈에. 분야 12개 격자 → 질문 한 칸(기간은 작은 칩) → 방법 두 장 → Pro 한 줄 */}
            <p className="font-bold">무엇이 궁금하세요?</p>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {CATEGORIES.map((c) => {
                const on = category === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    aria-pressed={on}
                    title={c.desc}
                    className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition ${on ? "bg-foreground text-card shadow-[0_6px_16px_rgba(31,29,26,0.25)]" : "bg-card text-foreground/80 shadow-[0_2px_10px_rgba(31,29,26,0.06)] hover:bg-border/60"}`}
                  >
                    <span className={on ? "text-gold-soft" : "text-vermilion"}>{CATEGORY_ICON[c.key]}</span>
                    {c.short}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <label htmlFor="question" className="font-bold">
                질문 <span className="text-sm font-normal text-muted">{categoryOf(category).desc}</span>
              </label>
              <button onClick={() => setPeriodOpen((v) => !v)} aria-expanded={periodOpen} className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-semibold shadow-[0_2px_10px_rgba(31,29,26,0.06)]">
                {PERIODS.find((p) => p.key === period)?.label}
                {period === "date" && periodDate ? ` ${periodDate.slice(5)}` : ""} {periodOpen ? "▴" : "▾"}
              </button>
            </div>
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
            <input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 60))}
              maxLength={60}
              placeholder={`예: ${QUESTION_EXAMPLES[category][0]}`}
              className="mt-2 w-full rounded-2xl bg-card px-4 py-3.5 text-[16px] shadow-[0_4px_16px_rgba(31,29,26,0.06)] outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
            />
            {question.trim() ? (
              <input
                value={context}
                onChange={(e) => setContext(e.target.value.slice(0, 80))}
                maxLength={80}
                placeholder="지금 상황 한 줄 (선택) 예: 2차 면접, 경쟁률이 높아요"
                className="mt-2 w-full rounded-2xl bg-card px-4 py-2.5 text-sm shadow-[0_4px_16px_rgba(31,29,26,0.06)] outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
              />
            ) : (
              <button onClick={() => setQuestion(QUESTION_EXAMPLES[category][1] ?? QUESTION_EXAMPLES[category][0])} className="mt-1.5 truncate px-1 text-xs text-muted hover:text-foreground">
                안 적어도 돼요 · 예시 넣기: {QUESTION_EXAMPLES[category][1] ?? QUESTION_EXAMPLES[category][0]}
              </button>
            )}

            <div className="mt-3 flex items-center justify-between">
              <p className="font-bold">어떻게 뽑을까요</p>
              <QuotaBadge />
            </div>
            {quota.remaining <= 0 ? (
              <div className="mt-2">
                <QuotaGate onGoPremium={() => (window.location.hash = "home")} />
              </div>
            ) : null}
            <div className={`mt-2 grid grid-cols-2 gap-2 ${quota.remaining <= 0 ? "pointer-events-none opacity-40" : ""}`}>
              <MethodCard icon={<Coins size={20} />} title="척전법" sub="동전 세 개" desc="가볍게 · 약 1분" wide onClick={() => start("coin")} />
              <MethodCard icon={<Landmark size={20} />} title="산통법" sub="산통 흔들기" desc="깊게 · 약 30초" wide onClick={() => start("santong")} />
            </div>
            <button
              onClick={() => setProOpen((v) => !v)}
              aria-expanded={proOpen}
              className={`mt-2 flex w-full items-center justify-between rounded-2xl bg-card px-4 py-2.5 text-left text-sm shadow-[0_4px_16px_rgba(31,29,26,0.06)] ${quota.remaining <= 0 ? "pointer-events-none opacity-40" : ""}`}
            >
              <span className="flex items-center gap-1.5 font-bold">
                {yarrowOpen ? <Sprout size={14} className="text-gold-soft" /> : <Lock size={14} className="text-muted" />} Pro 방식: 시초점, 육효점
              </span>
              <span className={`text-xs font-semibold ${yarrowOpen ? "text-gold-soft" : "text-vermilion"}`}>{yarrowOpen ? "열려 있어요" : "Pro 구매 시 바로"} {proOpen ? "▴" : "▾"}</span>
            </button>
            {proOpen ? (
              <div className={`mt-2 grid gap-2 ${quota.remaining <= 0 ? "pointer-events-none opacity-40" : ""}`}>
                <MethodCard
                  icon={yarrowOpen ? <Sprout size={22} /> : <HelpCircle size={22} />}
                  title="시초점"
                  sub="산가지 50개"
                  desc="산가지 49개를 18번 나누어 세는, 주역 원전의 가장 오래되고 정교한 방식이에요. 인생의 중요한 질문에 알맞아요. 약 3분, 자동 진행도 돼요."
                  badge={yarrowOpen ? (admin && !quota.premium ? "관리자" : "Pro") : "Pro 전용"}
                  locked={!yarrowOpen}
                  wide
                  onClick={() => (yarrowOpen ? start("yarrow") : (window.location.hash = "home"))}
                />
                <MethodCard
                  icon={yarrowOpen ? <Compass size={22} /> : <HelpCircle size={22} />}
                  title="육효점"
                  sub="동전 세 개 + 육효"
                  desc="동전으로 뽑은 괘에 날짜의 기운을 얹어, 되는지 안 되는지와 언제쯤인지를 짚어요. 날짜와 성패가 궁금한 질문에 알맞아요. 길·평·흉으로 답해요."
                  badge={yarrowOpen ? (admin && !quota.premium ? "관리자" : "Pro") : "Pro 전용"}
                  locked={!yarrowOpen}
                  wide
                  onClick={() => (yarrowOpen ? start("coin", true) : (window.location.hash = "home"))}
                />
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

function MethodCard({ icon, title, sub, desc, badge, locked, wide, onClick }: { icon: React.ReactNode; title: string; sub: string; desc: string; badge?: string; locked?: boolean; wide?: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`group flex break-keep rounded-2xl bg-card p-3 text-left shadow-[0_6px_30px_rgba(31,29,26,0.06)] transition hover:shadow-[0_10px_36px_rgba(31,29,26,0.10)] ${wide ? "items-center gap-2.5" : "flex-col items-start gap-2"} ${locked ? "opacity-80" : ""}`}
    >
      <span className={`shrink-0 rounded-xl p-2 transition ${locked ? "bg-foreground/8 text-muted" : "bg-vermilion/10 text-vermilion group-hover:bg-vermilion group-hover:text-card"}`}>{icon}</span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-base font-bold">{title}</span>
          <span className="text-xs text-muted">{sub}</span>
          {badge ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${locked ? "bg-foreground/10 text-foreground/70" : "bg-gold/20 text-gold-soft"}`}>
              {locked ? <Lock size={10} /> : null}
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-foreground/75">{desc}</span>
      </span>
    </motion.button>
  );
}
