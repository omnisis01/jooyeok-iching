// AI 점사풀이 카드: 결과 요약 바로 아래. 내 질문에 맞춰 괘사, 효사, 지괘, 육효 시기를 근거로 풀어 준다
// 권한(관리자, Pro 하루 1회, 건별 결제, 첫 1회 체험)은 서버가 정하고, 화면은 버튼 문구만 고른다
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ImageDown, Lock, RefreshCw, Sparkles } from "lucide-react";
import type { Reading } from "@/lib/iching";
import { aiReadingKey, buildContext, type AiFollowup, type AiReading } from "@/lib/aiReading";
import { aiEntitlement, aiInputOf, requestAiReading, savedAiReading, type AiEntitlement } from "@/lib/aiClient";
import { getSession, onAuthChange } from "@/lib/cloudSync";
import { cloudEnabled } from "@/lib/supabase";
import { UNLOCK_PRICE_KRW, readingKey, startUnlock, unlockEnabled } from "@/lib/unlock";
import { currentSubscription, pushEnabled, pushSupported, subscribePush } from "@/lib/push";
import { requestFollowup, setOutcome, setReminder, type AiOutcome } from "@/lib/aiClient";
import { MessageCircleQuestion } from "lucide-react";
import { Bell } from "lucide-react";
import { QUESTION_EXAMPLES, categoryOf } from "@/lib/categories";
import { openSettings } from "./SettingsSheet";
import { track } from "@/lib/track";
import { SITE_URL } from "@/lib/shareCard";
import { aiCardFileName, renderAiCard } from "@/lib/aiCard";
import ShareCardModal from "./ShareCardModal";
import { usePaymentsOn } from "@/lib/usePaymentsOn";

const STEPS = ["하늘의 뜻을 묻는 중", "괘사와 효사를 읽는 중", "질문에 맞추는 중", "쉬운 말로 다듬는 중"];
// 받기 전에 어떤 내용을 받는지 미리 보여 준다
const PREVIEW = ["한 줄 답", "어떻게 변하나요", "내가 선 자리(효사 원문)", "앞으로의 흐름", "할 일 3가지", "하면과 미루면", "육효로 본 때", "조심할 점"];

type View =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: AiReading; fallback: boolean; followup: AiFollowup | null; saved: boolean; outcome: AiOutcome | null }
  | { kind: "need_purchase" }
  | { kind: "safety" }
  | { kind: "error"; message: string };

export default function AiReadingCard({ reading, onQuestion }: { reading: Reading; onQuestion?: (q: string) => void }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [can, setCan] = useState<AiEntitlement>(null);
  const [view, setView] = useState<View>({ kind: "idle" });
  const [step, setStep] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  // 결과가 열리면 분석을 기본으로 바로 보여 준다(버튼 없이). 한 결과에 한 번만
  const [autoRun, setAutoRun] = useState(false);
  // 질문 없이 뽑았으면 분석 전에 한 번 묻는다. "분야 전체로 분석"을 누르면 질문 없이 간다
  const [skipAsk, setSkipAsk] = useState(false);
  const [draftQ, setDraftQ] = useState("");
  const autoRan = useRef<string | null>(null);
  const payOn = usePaymentsOn();
  const ctx = useMemo(() => buildContext(aiInputOf(reading)), [reading]);
  const cat = categoryOf(reading.category);

  useEffect(() => {
    if (!cloudEnabled) return;
    let alive = true;
    const check = async () => {
      const s = await getSession();
      if (!alive) return;
      setLoggedIn(Boolean(s));
      if (!s) return;
      const saved = await savedAiReading(reading);
      if (!alive) return;
      if (saved) {
        setView({ kind: "done", result: saved.result, fallback: false, followup: saved.followup, saved: true, outcome: saved.outcome });
        return;
      }
      setCan(await aiEntitlement(reading));
      if (alive) setAutoRun(true);
    };
    void check();
    track("ai_open", {}, { oncePerSession: true });
    const off = onAuthChange(() => void check());
    return () => {
      alive = false;
      off();
    };
  }, [reading]);

  useEffect(() => {
    if (view.kind !== "loading") return;
    const t = window.setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 3000);
    return () => window.clearInterval(t);
  }, [view.kind]);

  const run = async () => {
    setStep(0);
    setView({ kind: "loading" });
    try {
      const r = await requestAiReading(reading);
      if (r.status === "done" || r.status === "fallback") setView({ kind: "done", result: r.result, fallback: r.status === "fallback", followup: r.followup ?? null, saved: false, outcome: null });
      else setView({ kind: r.status });
    } catch (e) {
      setView({ kind: "error", message: e instanceof Error ? e.message : "AI 점사 분석을 불러오지 못했어요" });
    }
  };

  const runKey = aiReadingKey(aiInputOf(reading));
  useEffect(() => {
    if (!autoRun || view.kind !== "idle" || autoRan.current === runKey) return;
    if (!ctx.question && !skipAsk) return;
    autoRan.current = runKey;
    const t = window.setTimeout(() => void run(), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, runKey, ctx.question, skipAsk]);

  const askQuestion = loggedIn === true && autoRun && !ctx.question && !skipAsk && view.kind === "idle";
  const examples = QUESTION_EXAMPLES[cat.key] ?? [];
  const submitQuestion = (q: string) => {
    const t = q.trim().slice(0, 60);
    if (t.length < 2) return;
    onQuestion?.(t);
  };

  if (!cloudEnabled) return null;

  const buy = async () => {
    try {
      track("deep_buy_click", { from: "ai" });
      await startUnlock(reading, `${reading.primary.name} ${cat.label} AI 점사 분석`);
    } catch (e) {
      setView({ kind: "error", message: e instanceof Error ? e.message : "결제를 시작하지 못했어요" });
    }
  };

  const label = can === "trial" ? "AI 점사풀이 무료로 받아 보기 (첫 1회)" : can === "pro" ? "AI 점사풀이 받기 (Pro, 오늘 1회)" : can === "admin" ? "AI 점사풀이 받기 (관리자)" : "AI 점사풀이 받기";

  return (
    <section id="ai-reading" className="break-keep scroll-mt-24 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-gold-soft" />
        <h3 className="font-bold">맞춤형 AI 점사 분석</h3>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        {ctx.question ? <>&ldquo;{ctx.question}&rdquo;에 대해, </> : <>{cat.label}에 대해, </>}
        뽑은 괘의 괘사, 효사, 지괘, 육효 시기를 근거로 풀어요.
      </p>
      {view.kind !== "done" ? (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PREVIEW.map((t) => (
              <span key={t} className="rounded-full bg-background px-2.5 py-1 text-xs text-foreground/75">
                {t}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {view.kind === "done" ? (
        <>
          <AiResult
            result={view.result}
            fallback={view.fallback}
            timing={ctx.yukhyo.timing}
            onRetry={run}
            reminder={
              view.result.timingIndex >= 0 && ctx.yukhyo.timingDates[view.result.timingIndex] ? (
                <ReminderButton date={ctx.yukhyo.timingDates[view.result.timingIndex]} readingKey={readingKey(reading)} question={ctx.question} hexName={reading.primary.name} />
              ) : null
            }
          />
          {!view.fallback ? <FollowupBox reading={reading} saved={view.followup} onDone={(f) => setView({ ...view, followup: f })} /> : null}
          {view.saved ? <OutcomeRow reading={reading} outcome={view.outcome} onSet={(o) => setView({ ...view, outcome: o })} /> : null}
          {!view.fallback ? (
            <button onClick={() => setShareOpen(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-vermilion py-3 font-bold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)]">
              <ImageDown size={18} /> AI 점사 분석 이미지로 저장하기
            </button>
          ) : null}
          <ShareCardModal
            job={
              shareOpen && view.kind === "done"
                ? {
                    render: () => renderAiCard(reading, view.result, view.result.timingIndex >= 0 ? (ctx.yukhyo.timing[view.result.timingIndex] ?? null) : null),
                    fileName: aiCardFileName(reading),
                    text: `${view.result.answer}\n${SITE_URL}`,
                  }
                : null
            }
            onClose={() => setShareOpen(false)}
          />
        </>
      ) : view.kind === "loading" ? (
        <div className="mt-5 flex flex-col items-center gap-3 py-6" aria-live="polite">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
          <p className="text-sm font-semibold text-gold-soft">{STEPS[step]}…</p>
        </div>
      ) : view.kind === "safety" ? (
        <div className="mt-4 rounded-2xl bg-vermilion/8 p-4 text-sm leading-relaxed">
          <p className="font-bold">지금 많이 힘드신가요?</p>
          <p className="mt-1">혼자 견디지 않으셔도 돼요. 언제든 <b>자살예방상담전화 109</b>(24시간)나 <b>정신건강위기상담 1577-0199</b>에서 이야기를 들어 드려요. 위급하면 112, 119에 바로 연락해 주세요.</p>
        </div>
      ) : view.kind === "need_purchase" ? (
        <div className="mt-4 space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Lock size={14} className="text-muted" /> 무료 체험을 이미 썼어요
          </p>
          {unlockEnabled && payOn ? (
            <button onClick={buy} className="w-full rounded-full bg-vermilion py-3 font-bold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)]">
              {UNLOCK_PRICE_KRW.toLocaleString("ko-KR")}원으로 이 결과 열기 (AI 점사 분석 포함)
            </button>
          ) : (
            <p className="rounded-2xl bg-background px-4 py-3 text-sm text-muted">결제는 곧 열려요. 조금만 기다려 주세요.</p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {loggedIn === false ? (
            <button
              onClick={openSettings}
              className="w-full rounded-full bg-foreground py-3 font-bold text-card"
            >
              로그인하고 AI 점사 분석 한 번 무료로 받기
            </button>
          ) : askQuestion ? (
            <div className="rounded-2xl bg-background p-4">
              <p className="font-bold">질문 없이 뽑으셨네요. 무엇이 궁금했나요?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">질문을 적으면 이 괘를 내 상황에 맞춰 풀어요. 괘는 이미 정해졌으니 결과는 바뀌지 않아요.</p>
              <input
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitQuestion(draftQ)}
                maxLength={60}
                placeholder={examples[0] ? `예: ${examples[0]}` : "한 줄로 적어 주세요"}
                className="mt-3 w-full rounded-xl bg-card px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-vermilion/30"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {examples.map((q) => (
                  <button key={q} onClick={() => setDraftQ(q)} className="rounded-full bg-card px-3 py-1.5 text-xs text-foreground/80 transition hover:bg-border/60">
                    {q}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => submitQuestion(draftQ)} disabled={draftQ.trim().length < 2} className="flex-1 rounded-full bg-vermilion py-2.5 text-sm font-bold text-card disabled:opacity-40">
                  이 질문으로 분석
                </button>
                <button onClick={() => setSkipAsk(true)} className="flex-1 rounded-full bg-card py-2.5 text-sm font-semibold">
                  {cat.label} 전체로 분석
                </button>
              </div>
            </div>
          ) : (
            <button onClick={run} disabled={loggedIn === null} className="w-full rounded-full bg-foreground py-3 font-bold text-card transition hover:opacity-90 disabled:opacity-50">
              {label}
            </button>
          )}
          {view.kind === "error" ? <p className="mt-2 text-center text-xs text-vermilion">{view.message}</p> : null}
        </div>
      )}
    </section>
  );
}

function AiResult({ result, fallback, timing, onRetry, reminder }: { result: AiReading; fallback: boolean; timing: string[]; onRetry: () => void; reminder?: React.ReactNode }) {
  const when = result.timingIndex >= 0 ? timing[result.timingIndex] : null;
  const choices = result.choices && (result.choices.go || result.choices.wait) ? result.choices : null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-5">
      {fallback ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-background px-4 py-3 text-xs leading-relaxed text-muted">
          <span>AI 연결이 원활하지 않아 기본 자료로 정리했어요. 잠시 뒤 다시 누르면 AI 점사 분석을 받을 수 있고, 횟수는 차감되지 않았어요.</span>
          <button onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 font-semibold text-foreground">
            <RefreshCw size={12} /> 다시
          </button>
        </div>
      ) : null}
      <p className="text-xl font-bold leading-snug">{result.answer}</p>
      {result.change ? (
        <div className="rounded-2xl border-2 border-vermilion/40 bg-vermilion/8 px-4 py-3">
          <h4 className="text-xs font-bold text-vermilion">어떻게 변하나요</h4>
          <p className="mt-1 text-[15px] font-semibold leading-relaxed">{result.change}</p>
        </div>
      ) : null}
      <Block title="지금 상황">{result.situation}</Block>
      <div>
        <h4 className="text-xs font-bold text-vermilion">내가 선 자리</h4>
        {result.quote ? <p className="mt-1.5 select-text font-serif text-lg tracking-wide text-gold-soft">{result.quote}</p> : null}
        <p className="mt-1 text-[15px] leading-relaxed text-foreground/90">{result.position}</p>
      </div>
      <Block title="앞으로의 흐름">{result.flow}</Block>
      <div>
        <h4 className="text-xs font-bold text-muted">이렇게 해 보세요</h4>
        <ul className="mt-1.5 space-y-1.5">
          {result.actions.map((a) => (
            <li key={a} className="rounded-xl bg-background px-3 py-2 text-[15px] leading-relaxed">
              {a}
            </li>
          ))}
        </ul>
      </div>
      {choices ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {choices.go ? <Block title="하면">{choices.go}</Block> : null}
          {choices.wait ? <Block title="미루면">{choices.wait}</Block> : null}
        </div>
      ) : null}
      {when ? (
        <div>
          <Block title="육효로 본 때">{when}</Block>
          {reminder}
        </div>
      ) : null}
      <div className="rounded-2xl bg-vermilion/8 px-4 py-3">
        <h4 className="text-xs font-bold text-vermilion">조심할 점</h4>
        <p className="mt-1 text-[15px] leading-relaxed">{result.caution}</p>
      </div>
    </motion.div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-bold text-muted">{title}</h4>
      <p className="mt-1 text-[15px] leading-relaxed text-foreground/90">{children}</p>
    </div>
  );
}

/** AI가 짚은 날 아침에 "오늘이 그날이에요" 알림. 로그인한 사람만, 알림을 켜지 않았으면 함께 켠다 */
function ReminderButton({ date, readingKey: key, question, hexName }: { date: string; readingKey: string; question: string | null; hexName: string }) {
  const [state, setState] = useState<"hidden" | "idle" | "busy" | "done" | "ios" | "error">("hidden");
  const [error, setError] = useState<string | null>(null);
  const label = `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;

  useEffect(() => {
    if (!pushEnabled || Date.parse(date) <= Date.now()) return;
    let alive = true;
    getSession().then((s) => alive && s && setState("idle"));
    return () => {
      alive = false;
    };
  }, [date]);

  if (state === "hidden") return null;

  const set = async () => {
    setState("busy");
    setError(null);
    try {
      const s = await getSession();
      if (!s) throw new Error("먼저 로그인해 주세요");
      if (!pushSupported()) {
        const ios = /iP(hone|ad)/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches;
        setState(ios ? "ios" : "error");
        if (!ios) setError("이 브라우저는 알림을 지원하지 않아요");
        return;
      }
      if (!(await currentSubscription())) await subscribePush(s.user.id);
      await setReminder(date, key, question, hexName);
      track("reminder_set", {});
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "알림을 걸지 못했어요");
      setState("error");
    }
  };

  if (state === "done") return <p className="mt-2 text-xs text-gold-soft">{label} 아침에 &ldquo;오늘이 그날이에요&rdquo; 알림을 보내 드릴게요.</p>;
  if (state === "ios")
    return <p className="mt-2 text-xs leading-relaxed text-muted">아이폰은 사파리 공유 버튼에서 <b className="text-foreground">홈 화면에 추가</b>를 한 뒤, 그 아이콘으로 열어야 알림을 걸 수 있어요.</p>;
  return (
    <div className="mt-2">
      <button onClick={set} disabled={state === "busy"} className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-xs font-semibold transition hover:bg-border/60 disabled:opacity-50">
        <Bell size={13} /> {label} 아침에 알림 받기
      </button>
      {error ? <p className="mt-1 text-xs text-vermilion">{error}</p> : null}
    </div>
  );
}

/** 같은 괘로 한 번 더 묻기. 다시 뽑지 않고 앞선 풀이에서 한 걸음 더 */
function FollowupBox({ reading, saved, onDone }: { reading: Reading; saved: AiFollowup | null; onDone: (f: AiFollowup) => void }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "error" | "fallback" | "safety">("idle");
  const [error, setError] = useState<string | null>(null);

  if (saved) {
    return (
      <div className="mt-5 rounded-2xl bg-background p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-muted">
          <MessageCircleQuestion size={14} /> 이어서 물었어요
        </p>
        <p className="mt-1 font-semibold">&ldquo;{saved.question}&rdquo;</p>
        <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">{saved.answer}</p>
        <p className="mt-2 rounded-xl bg-card px-3 py-2 text-[15px] leading-relaxed">{saved.action}</p>
      </div>
    );
  }

  const ask = async () => {
    setState("busy");
    setError(null);
    try {
      const r = await requestFollowup(reading, q.trim());
      if (r.status === "followup") onDone(r.followup);
      else setState(r.status === "safety" ? "safety" : "fallback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "답을 불러오지 못했어요");
      setState("error");
    }
  };

  return (
    <div className="mt-5 rounded-2xl bg-background p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <MessageCircleQuestion size={16} className="text-vermilion" /> 이어서 한 번 더 묻기
        <span className="text-xs font-normal text-muted">(이 괘로 1회)</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">다시 뽑지 않고, 지금 괘 안에서 한 걸음 더 물어봐요. 예: 그럼 언제 연락하는 게 좋을까요?</p>
      {state === "safety" ? (
        <p className="mt-3 text-sm leading-relaxed">많이 힘드신가요? <b>자살예방상담전화 109</b>(24시간)에서 이야기를 들어 드려요.</p>
      ) : state === "fallback" ? (
        <p className="mt-3 text-sm text-muted">지금은 이어서 답하기 어려워요. 잠시 뒤 다시 눌러 주세요. 횟수는 차감되지 않았어요.</p>
      ) : null}
      {state !== "safety" ? (
        <div className="mt-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value.slice(0, 60))}
            maxLength={60}
            placeholder="한 가지만 더 물어보세요"
            className="min-w-0 flex-1 rounded-full bg-card px-4 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
          />
          <button onClick={ask} disabled={state === "busy" || q.trim().length < 2} className="shrink-0 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-card disabled:opacity-40">
            {state === "busy" ? "주역이 답하는 중…" : "묻기"}
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-vermilion">{error}</p> : null}
    </div>
  );
}

/** 다시 열어 본 풀이에서 "그 뒤 어떻게 됐나요?"를 한 번 묻는다. 맞았다는 답이 쌓이면 홍보 근거가 된다 */
function OutcomeRow({ reading, outcome, onSet }: { reading: Reading; outcome: AiOutcome | null; onSet: (o: AiOutcome) => void }) {
  const [busy, setBusy] = useState(false);
  if (outcome) return <p className="mt-4 text-center text-xs text-muted">{outcome === "hit" ? "맞았다고 알려 주셨어요. 고마워요." : outcome === "miss" ? "아니었다고 알려 주셨어요. 풀이를 더 다듬을게요." : "아직 모른다고 알려 주셨어요. 때가 되면 다시 봐 주세요."}</p>;
  const pick = async (o: AiOutcome) => {
    setBusy(true);
    try {
      await setOutcome(reading, o);
      track("outcome_set", { outcome: o });
      onSet(o);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4 rounded-2xl bg-background p-4 text-center">
      <p className="text-sm font-bold">이 풀이, 그 뒤 어떻게 됐나요?</p>
      <div className="mt-2 flex justify-center gap-2">
        {([["hit", "맞았어요"], ["miss", "아니에요"], ["unsure", "아직 몰라요"]] as [AiOutcome, string][]).map(([o, l]) => (
          <button key={o} disabled={busy} onClick={() => pick(o)} className="rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-border/60 disabled:opacity-50">
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
