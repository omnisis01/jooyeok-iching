// AI 점사풀이 카드: 결과 요약 바로 아래. 내 질문에 맞춰 괘사, 효사, 지괘, 육효 시기를 근거로 풀어 준다
// 권한(관리자, Pro 하루 1회, 건별 결제, 첫 1회 체험)은 서버가 정하고, 화면은 버튼 문구만 고른다
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ImageDown, Lock, RefreshCw, Sparkles } from "lucide-react";
import type { Reading } from "@/lib/iching";
import { buildContext, needsExpertNote, type AiReading } from "@/lib/aiReading";
import { aiEntitlement, aiInputOf, requestAiReading, savedAiReading, type AiEntitlement } from "@/lib/aiClient";
import { getSession, onAuthChange } from "@/lib/cloudSync";
import { cloudEnabled } from "@/lib/supabase";
import { UNLOCK_PRICE_KRW, readingKey, startUnlock, unlockEnabled } from "@/lib/unlock";
import { currentSubscription, pushEnabled, pushSupported, subscribePush } from "@/lib/push";
import { setReminder } from "@/lib/aiClient";
import { Bell } from "lucide-react";
import { categoryOf } from "@/lib/categories";
import { track } from "@/lib/track";
import { SITE_URL } from "@/lib/shareCard";
import { aiCardFileName, renderAiCard } from "@/lib/aiCard";
import ShareCardModal from "./ShareCardModal";
import { usePaymentsOn } from "@/lib/usePaymentsOn";

const STEPS = ["괘사를 읽는 중", "효사를 읽는 중", "질문에 맞추는 중", "쉬운 말로 다듬는 중"];
// 받기 전에 어떤 내용을 받는지 미리 보여 준다
const PREVIEW = ["한 줄 답", "어떻게 변하나요", "내가 선 자리(효사 원문)", "앞으로의 흐름", "할 일 3가지", "하면과 미루면", "육효로 본 때", "조심할 점"];

type View =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: AiReading; fallback: boolean }
  | { kind: "need_purchase" }
  | { kind: "safety" }
  | { kind: "error"; message: string };

export default function AiReadingCard({ reading }: { reading: Reading }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [can, setCan] = useState<AiEntitlement>(null);
  const [view, setView] = useState<View>({ kind: "idle" });
  const [step, setStep] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
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
        setView({ kind: "done", result: saved, fallback: false });
        return;
      }
      setCan(await aiEntitlement(reading));
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

  if (!cloudEnabled) return null;

  const run = async () => {
    setStep(0);
    setView({ kind: "loading" });
    try {
      const r = await requestAiReading(reading);
      if (r.status === "done" || r.status === "fallback") setView({ kind: "done", result: r.result, fallback: r.status === "fallback" });
      else setView({ kind: r.status });
    } catch (e) {
      setView({ kind: "error", message: e instanceof Error ? e.message : "AI 점사풀이를 불러오지 못했어요" });
    }
  };

  const buy = async () => {
    try {
      track("deep_buy_click", { from: "ai" });
      await startUnlock(reading, `${reading.primary.name} ${cat.label} AI 점사풀이`);
    } catch (e) {
      setView({ kind: "error", message: e instanceof Error ? e.message : "결제를 시작하지 못했어요" });
    }
  };

  const label = can === "trial" ? "AI 점사풀이 무료로 받아 보기 (첫 1회)" : can === "pro" ? "AI 점사풀이 받기 (Pro, 오늘 1회)" : can === "admin" ? "AI 점사풀이 받기 (관리자)" : "AI 점사풀이 받기";

  return (
    <section id="ai-reading" className="break-keep scroll-mt-24 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <div className="flex items-center gap-2">
        <Sparkles size={18} className="text-gold-soft" />
        <h3 className="font-bold">AI 점사풀이</h3>
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
            expert={needsExpertNote(ctx)}
            sources={sourcesOf(ctx)}
            onRetry={run}
            reminder={
              view.result.timingIndex >= 0 && ctx.yukhyo.timingDates[view.result.timingIndex] ? (
                <ReminderButton date={ctx.yukhyo.timingDates[view.result.timingIndex]} readingKey={readingKey(reading)} question={ctx.question} hexName={reading.primary.name} />
              ) : null
            }
          />
          {!view.fallback ? (
            <button onClick={() => setShareOpen(true)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-vermilion py-3 font-bold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)]">
              <ImageDown size={18} /> AI 점사풀이 이미지로 저장하기
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
              {UNLOCK_PRICE_KRW.toLocaleString("ko-KR")}원으로 이 결과 열기 (AI 점사풀이 포함)
            </button>
          ) : (
            <p className="rounded-2xl bg-background px-4 py-3 text-sm text-muted">결제는 곧 열려요. 조금만 기다려 주세요.</p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {loggedIn === false ? (
            <button
              onClick={() => {
                window.location.hash = "home";
                window.setTimeout(() => document.getElementById("account")?.scrollIntoView({ behavior: "smooth", block: "center" }), 350);
              }}
              className="w-full rounded-full bg-foreground py-3 font-bold text-card"
            >
              로그인하고 AI 점사풀이 한 번 무료로 받기
            </button>
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

function sourcesOf(ctx: ReturnType<typeof buildContext>): string {
  return [`${ctx.primary.name} 괘 해설`, ...ctx.changing.map((c) => `${c.name} 효사`), ...(ctx.resulting ? [`${ctx.resulting.name} 괘 해설`] : []), "육효 판단"].join(", ");
}

function AiResult({ result, fallback, timing, expert, sources, onRetry, reminder }: { result: AiReading; fallback: boolean; timing: string[]; expert: boolean; sources: string; onRetry: () => void; reminder?: React.ReactNode }) {
  const when = result.timingIndex >= 0 ? timing[result.timingIndex] : null;
  const choices = result.choices && (result.choices.go || result.choices.wait) ? result.choices : null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-5">
      {fallback ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-background px-4 py-3 text-xs leading-relaxed text-muted">
          <span>AI 연결이 원활하지 않아 기본 자료로 정리했어요. 잠시 뒤 다시 누르면 AI 점사풀이를 받을 수 있고, 횟수는 차감되지 않았어요.</span>
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
      <div className="space-y-1 border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
        <p>이 풀이의 근거: {sources}</p>
        {expert ? <p>건강, 법률, 돈과 관련된 중요한 결정은 꼭 전문가와 상의하세요.</p> : null}
        <p>주역 풀이는 스스로를 돌아보는 참고 자료예요. AI가 쓴 글이라 틀린 부분이 있을 수 있어요.</p>
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
