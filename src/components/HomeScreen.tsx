// 홈 화면: 인사말, 점치기 입구, 64괘 원도(장식), 나의 점 기록
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ChevronRight, Trash2 } from "lucide-react";
import { confirmUnlock, unlockReturn } from "@/lib/unlock";
import { clearReturnParams } from "@/lib/premium";
import { readingKey } from "@/lib/unlock";
import type { Tab } from "./AppShell";
import HexagramFigure from "./HexagramFigure";
import { aiReadingKeys } from "@/lib/aiClient";
import { SkyArt, useMoon, useSky } from "./SkyBackdrop";
import ResultView from "./ResultView";
import PremiumCard from "./PremiumCard";
import YukhyoResult from "./YukhyoResult";
import { FREE_HISTORY_LIMIT, fetchPremiumUntil, paymentsEnabled } from "@/lib/premium";
import { onAuthChange } from "@/lib/cloudSync";
import { analyzeYukhyo } from "@/lib/yukhyo";
import { categoryOf, normalizeCategory } from "@/lib/categories";
import { QuotaBadge } from "./QuotaGate";
import { dayInfo } from "@/lib/yukhyo";
import { useToday } from "@/lib/useToday";
import { clearHistory, formatAt, loadHistory, readingFromRecord, removeRecord, type HistoryRecord } from "@/lib/history";
import { cloudEnabled } from "@/lib/supabase";
import { deleteRemote } from "@/lib/cloudSync";
import { usePaymentsOn } from "@/lib/usePaymentsOn";

export default function HomeScreen({ go }: { go: (t: Tab) => void }) {
  const payOn = usePaymentsOn();
  // AI 점사풀이를 받은 결과의 열쇠(기록 목록에 AI 표시)
  const [aiKeys, setAiKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!cloudEnabled) return;
    let alive = true;
    const load = () => aiReadingKeys().then((k) => alive && setAiKeys(k)).catch(() => {});
    load();
    const off = onAuthChange(() => load());
    window.addEventListener("history-changed", load);
    return () => {
      alive = false;
      off();
      window.removeEventListener("history-changed", load);
    };
  }, []);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const sky = useSky();
  const moon = useMoon();
  const [viewing, setViewing] = useState<HistoryRecord | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [premium, setPremium] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  const { today, hour } = useToday();

  // 알림(결과 확인)에서 ?open=열쇠 로 들어오면 그 기록을 바로 연다
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const key = p.get("open");
    if (!key) return;
    const t = window.setTimeout(() => {
      const rec = loadHistory().find((r) => r.type === "iching" && readingKey(readingFromRecord(r)) === key);
      if (rec) setViewing(rec);
      p.delete("open");
      p.delete("from");
      window.history.replaceState(null, "", `${window.location.pathname}${p.size ? "?" + p : ""}${window.location.hash}`);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  // 건별 결제창에서 돌아왔으면 승인하고, 그 결과 기록을 바로 연다
  useEffect(() => {
    const back = unlockReturn();
    if (!back) return;
    clearReturnParams();
    const t = window.setTimeout(async () => {
      if (back.result === "fail") {
        setUnlockMessage(back.message);
        return;
      }
      setUnlockMessage("결제를 확인하는 중이에요");
      try {
        await confirmUnlock(back);
        setUnlockMessage("육효로 더 깊이 들여다보기가 열렸어요");
        const rec = loadHistory().find((r) => r.type === "iching" && readingKey(readingFromRecord(r)) === back.key);
        if (rec) setViewing(rec);
      } catch (e) {
        setUnlockMessage(e instanceof Error ? e.message : "결제 확인에 실패했어요");
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  const day = today ? dayInfo(today) : null;
  const greeting = hour === null ? "" : hour < 5 ? "고요한 밤이에요" : hour < 11 ? "좋은 아침이에요" : hour < 17 ? "좋은 오후예요" : "편안한 저녁이에요";

  useEffect(() => {
    const sync = () => setHistory(loadHistory());
    const t = window.setTimeout(sync, 0);
    window.addEventListener("history-changed", sync);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("history-changed", sync);
    };
  }, []);

  // Pro 여부 (결제 기능이 켜져 있을 때만 조회)
  useEffect(() => {
    if (!paymentsEnabled) return;
    let cancelled = false;
    const refresh = () => fetchPremiumUntil().then((u) => !cancelled && setPremium(Boolean(u))).catch(() => {});
    refresh();
    const off = onAuthChange(() => refresh());
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  if (viewing) {
    return (
      <div className="space-y-4">
        <button onClick={() => setViewing(null)} className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground">
          <ArrowLeft size={16} /> 기록으로 돌아가기
        </button>
        {viewing.type === "iching" ? (
          <ResultView reading={readingFromRecord(viewing)} onRestart={() => setViewing(null)} restartLabel="닫기" saveToHistory={false} />
        ) : premium || !payOn ? (
          <YukhyoResult
            result={analyzeYukhyo({
              lines: viewing.lines,
              changingLines: viewing.changing,
              category: normalizeCategory(viewing.category),
              gender: viewing.gender,
              date: viewing.date,
              question: viewing.question,
              castAt: viewing.at,
            })}
            onRestart={() => setViewing(null)}
            saveToHistory={false}
          />
        ) : (
          <YukhyoSummary record={viewing} />
        )}
      </div>
    );
  }

  const limited = payOn && !premium ? history.slice(0, FREE_HISTORY_LIMIT) : history;
  const shown = showAll ? limited : limited.slice(0, 3);

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {unlockMessage ? <p className="rounded-2xl bg-card px-4 py-3 text-center text-sm font-semibold text-gold-soft">{unlockMessage}</p> : null}

      {/* 점치기 입구 */}
      <motion.button
        onClick={() => go("divine")}
        whileTap={{ scale: 0.98 }}
        className={`relative w-full overflow-hidden rounded-3xl p-6 text-left shadow-[0_12px_40px_rgba(31,29,26,0.25)] ${sky === "day" ? "bg-[#cfe5f5] text-[#1f1d1a]" : "bg-[#1a1d4a] text-[#f1e9da]"}`}
      >
        {/* 배경: 하늘주역의 하늘(북두칠성, 달 또는 해). 글이 읽히도록 왼쪽을 살짝 어둡게 */}
        <div className="pointer-events-none absolute inset-0">
          {sky ? <SkyArt sky={sky} id="sky-hero" moonX={1200} dipperScale={2.6} clouds={false} moon={moon?.p} /> : null}
          <div className={`absolute inset-0 ${sky === "day" ? "bg-gradient-to-r from-white/55 via-white/25 to-transparent" : "bg-gradient-to-r from-black/35 via-black/10 to-transparent"}`} />
        </div>
        <div className="relative">
        <p className={`min-h-5 text-sm ${sky === "day" ? "text-[#1f1d1a]/70" : "text-[#f1e9da]/75"}`}>{day ? `오늘은 ${day.label.replace("일", "")} 날` : ""}{greeting ? `, ${sky === "night" && moon ? `${moon.phrase} ` : ""}${greeting}` : ""}</p>
        <p className="mt-2 text-2xl font-extrabold">오늘, 하늘에 무엇을 물을까요</p>
        <p className={`mt-2 max-w-[62%] text-sm leading-relaxed md:max-w-[70%] ${sky === "day" ? "text-[#1f1d1a]/80" : "text-[#f1e9da]/85"}`}>궁금한 일 하나를 적고 괘를 뽑으면, 내 질문에 맞춘 AI 점사 분석이 바로 나와요.</p>
        <span className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-vermilion px-4 py-2 text-sm font-bold text-white">
            하늘에 묻기 <ChevronRight size={16} />
          </span>
          <QuotaBadge />
        </span>
        </div>
      </motion.button>

      {/* 나의 점 기록 */}
      <section className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <div className="flex items-center justify-between">
          <p className="font-bold">내가 물은 것</p>
          {history.length ? (
            <button
              onClick={() => {
                if (window.confirm("기록을 모두 지울까요?")) clearHistory();
              }}
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-vermilion"
            >
              <Trash2 size={13} /> 모두 지우기
            </button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-muted">아직 하늘에 물은 적이 없어요. 괘를 뽑으면 이 기기에 알아서 저장해 둬요.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {shown.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <button onClick={() => setViewing(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <div className="shrink-0 text-foreground/70">
                    <HexagramFigure lines={r.lines} changing={r.changing} size={30} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {r.type === "iching" ? r.question || `${categoryOf(r.category).label} (질문 없음)` : `${r.hexName}, ${r.categoryLabel}`}
                      {r.type === "yukhyo" ? <span className="ml-1.5 text-xs font-bold text-vermilion">{r.level}</span> : null}
                      {r.type === "iching" && aiKeys.has(`${r.lines}-${r.changing.join("")}-${r.at.slice(0, 16)}`) ? (
                        <span className="ml-1.5 rounded bg-gold/15 px-1 py-0.5 align-middle text-[10px] font-bold text-gold-soft">AI</span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {r.type === "iching" ? `${readingFromRecord(r).primary.name}${readingFromRecord(r).resulting ? ` → ${readingFromRecord(r).resulting!.name}` : ""}, ` : r.question ? `“${r.question}”, ` : ""}
                      {formatAt(r.at)}
                    </p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                </button>
                <button
                  onClick={() => {
                    removeRecord(r.id);
                    if (cloudEnabled) deleteRemote(r.id).catch(() => {});
                  }}
                  className="p-1 text-muted/60 hover:text-vermilion"
                  aria-label="이 기록 지우기"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {limited.length > 3 ? (
          <button onClick={() => setShowAll((v) => !v)} className="mt-2 w-full rounded-xl bg-background py-2 text-sm font-semibold text-foreground/80">
            {showAll ? "접기" : `전체 ${limited.length}개 보기`}
          </button>
        ) : null}
        {payOn && !premium && history.length > FREE_HISTORY_LIMIT ? (
          <p className="mt-2 text-xs text-muted">무료 회원은 최근 {FREE_HISTORY_LIMIT}개까지 볼 수 있어요. Pro는 전부 보관해요.</p>
        ) : null}
      </section>


      <PremiumCard />

      <p className="px-2 text-center text-xs leading-relaxed text-muted lg:col-span-2">주역 점은 스스로를 돌아보는 거울입니다. 결과는 참고로만 삼아 주세요.</p>
    </div>
  );
}


function YukhyoSummary({ record }: { record: Extract<HistoryRecord, { type: "yukhyo" }> }) {
  return (
    <section className="rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <p className="text-sm text-muted">
        {record.categoryLabel}
        {record.question ? ` “${record.question}”` : ""}, {record.date}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="text-foreground/70">
          <HexagramFigure lines={record.lines} changing={record.changing} size={56} />
        </div>
        <div>
          <p className="font-bold">{record.hexName}</p>
          <p className="text-sm text-vermilion">
            {record.level}, {record.title}
          </p>
        </div>
      </div>
      <p className="mt-4 leading-relaxed">{record.text}</p>
      <p className="mt-3 text-xs text-muted">무료 회원은 종합 풀이만 다시 볼 수 있어요. Pro에서는 도표와 용신 풀이까지 그대로 다시 열립니다.</p>
    </section>
  );
}
