// 점치기 전체 흐름: 질문 입력·방법 선택 → 점 뽑기 → 결과
"use client";

import { kstDateString } from "@/lib/clock";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Coins, HelpCircle, Landmark, Lock, Sprout, Compass } from "lucide-react";
import YukhyoResult from "./YukhyoResult";
import { analyzeYukhyo } from "@/lib/yukhyo";
import type { Reading } from "@/lib/iching";
import CoinCasting from "./CoinCasting";
import SantongCasting from "./SantongCasting";
import ResultView from "./ResultView";
import YarrowCasting from "./YarrowCasting";
import MethodGuide, { type Method } from "./MethodGuide";
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
  // 분야는 8개만 먼저, 기간은 접어 둔다(대부분 오늘). 화면을 짧게
  const [moreCats, setMoreCats] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
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
    track("cast_done", { kind: "iching", method: r.method, category, changing: r.changingLines.length });
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
            <p className="font-bold">무엇이 궁금하세요?</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(moreCats || CATEGORIES.findIndex((c) => c.key === category) >= 8 ? CATEGORIES : CATEGORIES.slice(0, 8)).map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  aria-pressed={category === c.key}
                  className={`rounded-2xl px-1 py-3 text-center transition ${category === c.key ? "bg-foreground text-card" : "bg-card text-foreground shadow-[0_4px_16px_rgba(31,29,26,0.06)] hover:bg-background"}`}
                >
                  <span className="block text-[15px] font-bold">{c.label}</span>
                  <span className={`mt-0.5 block break-keep text-[10px] leading-tight ${category === c.key ? "text-card/70" : "text-muted"}`}>{c.desc}</span>
                </button>
              ))}
            </div>
            {!moreCats && CATEGORIES.length > 8 && CATEGORIES.findIndex((c) => c.key === category) < 8 ? (
              <button onClick={() => setMoreCats(true)} className="mt-2 text-xs font-semibold text-muted hover:text-foreground">
                분야 더보기 +{CATEGORIES.length - 8}
              </button>
            ) : null}

            <label htmlFor="question" className="mt-6 block font-bold">
              질문을 적어 주세요 <span className="text-sm font-normal text-muted">(선택)</span>
            </label>
            <input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 60))}
              maxLength={60}
              placeholder={QUESTION_EXAMPLES[category][0]}
              className="mt-3 w-full rounded-2xl bg-card px-4 py-3 shadow-[0_4px_16px_rgba(31,29,26,0.06)] outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUESTION_EXAMPLES[category].map((ex) => (
                <button key={ex} onClick={() => setQuestion(ex)} className="rounded-full bg-card px-3 py-1.5 text-xs text-foreground/80 shadow-[0_2px_10px_rgba(31,29,26,0.06)] transition hover:bg-border/60">
                  {ex}
                </button>
              ))}
            </div>
            <p className="mt-2 break-keep text-xs leading-relaxed text-muted">구체적으로 적을수록 풀이가 내 상황에 더 잘 맞아요. &ldquo;~할까요, 말까요?&rdquo;처럼 물어보세요.</p>
            {question.trim() ? (
              <input
                value={context}
                onChange={(e) => setContext(e.target.value.slice(0, 80))}
                maxLength={80}
                placeholder="지금 상황을 한 줄 더 (선택) 예: 2차 면접, 경쟁률이 높아요"
                className="mt-3 w-full rounded-2xl bg-card px-4 py-3 text-sm shadow-[0_4px_16px_rgba(31,29,26,0.06)] outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
              />
            ) : null}

            <button onClick={() => setPeriodOpen((v) => !v)} aria-expanded={periodOpen} className="mt-6 flex w-full items-center justify-between rounded-2xl bg-card px-4 py-3 text-left shadow-[0_4px_16px_rgba(31,29,26,0.06)]">
              <span className="font-bold">언제의 일인가요</span>
              <span className="text-sm font-semibold text-foreground/80">
                {PERIODS.find((p) => p.key === period)?.label}
                {period === "date" && periodDate ? ` ${periodDate}` : ""} {periodOpen ? "▴" : "▾"}
              </span>
            </button>
            <div className={`mt-3 flex-wrap gap-2 ${periodOpen ? "flex" : "hidden"}`}>
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  title={p.desc}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${period === p.key ? "bg-foreground text-card" : "bg-card text-foreground shadow-[0_4px_16px_rgba(31,29,26,0.06)] hover:bg-background"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {periodOpen && period === "date" ? (
              <input
                type="date"
                value={periodDate}
                onChange={(e) => setPeriodDate(e.target.value)}
                className="mt-3 w-full rounded-2xl bg-card px-4 py-3 shadow-[0_4px_16px_rgba(31,29,26,0.06)] outline-none focus:ring-2 focus:ring-vermilion/30 sm:w-auto"
              />
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">점치는 방법을 고르세요</p>
              <QuotaBadge />
            </div>
            {quota.remaining <= 0 ? (
              <div className="mt-3">
                <QuotaGate onGoPremium={() => (window.location.hash = "home")} />
              </div>
            ) : null}
            <div className={`mt-3 grid grid-cols-2 gap-3 ${quota.remaining <= 0 ? "pointer-events-none opacity-40" : ""}`}>
              <MethodCard
                icon={<Coins size={26} />}
                title="척전법"
                sub="동전 세 개"
                desc="동전 3개를 던져 간단히 괘를 뽑아요. 가볍고 빠른 질문에 알맞아요."
                time="약 1분"
                onClick={() => start("coin")}
              />
              <MethodCard
                icon={<Landmark size={26} />}
                title="산통법"
                sub="산통 흔들기"
                desc="산통을 흔들어 산가지로 괘를 뽑아요. 좀 더 깊이 들여다볼 질문에 알맞아요."
                time="약 30초"
                onClick={() => start("santong")}
              />
            </div>
            <div className={`mt-3 grid gap-3 sm:grid-cols-2 ${quota.remaining <= 0 ? "pointer-events-none opacity-40" : ""}`}>
              <MethodCard
                icon={yarrowOpen ? <Sprout size={26} /> : <HelpCircle size={26} />}
                title="시초점"
                sub="산가지 50개"
                desc="산가지 49개를 18번 나누어 세는, 주역 원전의 가장 오래되고 정교한 방식이에요. 인생의 중요한 질문에 알맞아요."
                time={yarrowOpen ? "약 3분, 자동 진행도 돼요" : "Pro 구매 시 바로 쓸 수 있어요"}
                badge={yarrowOpen ? (admin && !quota.premium ? "관리자" : "Pro") : "Pro 전용"}
                locked={!yarrowOpen}
                wide
                onClick={() => (yarrowOpen ? start("yarrow") : (window.location.hash = "home"))}
              />
              <MethodCard
                icon={yarrowOpen ? <Compass size={26} /> : <HelpCircle size={26} />}
                title="육효점"
                sub="동전 세 개 + 육효"
                desc="동전으로 뽑은 괘에 날짜의 기운을 얹어, 되는지 안 되는지와 언제쯤인지를 짚어요. 날짜와 성패가 궁금한 질문에 알맞아요."
                time={yarrowOpen ? "약 1분, 길·평·흉으로 답해요" : "Pro 구매 시 바로 쓸 수 있어요"}
                badge={yarrowOpen ? (admin && !quota.premium ? "관리자" : "Pro") : "Pro 전용"}
                locked={!yarrowOpen}
                wide
                onClick={() => (yarrowOpen ? start("coin", true) : (window.location.hash = "home"))}
              />
            </div>
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
            <button onClick={restart} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground">
              <ArrowLeft size={16} /> 방법 다시 고르기
            </button>
            <p className="mb-4 text-center text-muted">{categoryOf(category).label}을 묻습니다</p>
            <div className="mb-5">
              <MethodGuide method={stage} />
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
                date: kstDateString(reading.castAt ? Date.parse(reading.castAt) : Date.now()),
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

function MethodCard({ icon, title, sub, desc, time, badge, locked, wide, onClick }: { icon: React.ReactNode; title: string; sub: string; desc: string; time: string; badge?: string; locked?: boolean; wide?: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`group flex break-keep rounded-3xl bg-card p-4 text-left shadow-[0_6px_30px_rgba(31,29,26,0.06)] transition hover:shadow-[0_10px_36px_rgba(31,29,26,0.10)] sm:p-5 ${wide ? "items-center gap-4" : "flex-col items-start gap-2.5"} ${locked ? "opacity-80" : ""}`}
    >
      <span className={`shrink-0 rounded-2xl p-3 transition ${locked ? "bg-foreground/8 text-muted" : "bg-vermilion/10 text-vermilion group-hover:bg-vermilion group-hover:text-card"}`}>{icon}</span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-lg font-bold">{title}</span>
          <span className="text-xs text-muted">{sub}</span>
          {badge ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${locked ? "bg-foreground/10 text-foreground/70" : "bg-gold/20 text-gold-soft"}`}>
              {locked ? <Lock size={10} /> : null}
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1.5 block text-sm leading-relaxed text-foreground/75">{desc}</span>
        <span className={`mt-1.5 block text-xs ${locked ? "font-semibold text-vermilion" : "text-muted"}`}>{time}</span>
      </span>
    </motion.button>
  );
}
