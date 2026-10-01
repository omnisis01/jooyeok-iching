// 홈 화면: 오늘의 괘 한마디, 점치기 입구, 나의 점 기록
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ChevronRight, ImageDown, Shuffle, Trash2 } from "lucide-react";
import ShareCardModal from "./ShareCardModal";
import { renderDailyStoryCard, storyFileName } from "@/lib/storyCard";
import { SITE_URL } from "@/lib/shareCard";
import { confirmUnlock, unlockReturn } from "@/lib/unlock";
import { clearReturnParams } from "@/lib/premium";
import { readingKey } from "@/lib/unlock";
import type { Hexagram } from "@/data/hexagrams";
import type { Tab } from "./AppShell";
import HexagramFigure from "./HexagramFigure";
import HexagramWheel from "./HexagramWheel";
import HexagramDetail from "./HexagramDetail";
import ResultView from "./ResultView";
import AccountCard from "./AccountCard";
import PremiumCard from "./PremiumCard";
import YukhyoResult from "./YukhyoResult";
import { FREE_HISTORY_LIMIT, fetchPremiumUntil, paymentsEnabled } from "@/lib/premium";
import { onAuthChange } from "@/lib/cloudSync";
import { analyzeYukhyo } from "@/lib/yukhyo";
import { categoryOf, normalizeCategory } from "@/lib/categories";
import { QuotaBadge } from "./QuotaGate";
import { dayInfo } from "@/lib/yukhyo";
import { useToday } from "@/lib/useToday";
import { dailyHexagram } from "@/lib/daily";
import { clearHistory, formatAt, loadHistory, readingFromRecord, removeRecord, type HistoryRecord } from "@/lib/history";
import { cloudEnabled } from "@/lib/supabase";
import { deleteRemote } from "@/lib/cloudSync";

export default function HomeScreen({ go }: { go: (t: Tab) => void }) {
  const [selected, setSelected] = useState<Hexagram | null>(null);
  const [wheelReset, setWheelReset] = useState(0);
  const wheelRandom = useRef<(() => void) | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [viewing, setViewing] = useState<HistoryRecord | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [premium, setPremium] = useState(false);
  const [dailyShare, setDailyShare] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  const { today, hour } = useToday();

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
        setUnlockMessage("깊이 읽기가 열렸어요");
        const rec = loadHistory().find((r) => r.type === "iching" && readingKey(readingFromRecord(r)) === back.key);
        if (rec) setViewing(rec);
      } catch (e) {
        setUnlockMessage(e instanceof Error ? e.message : "결제 확인에 실패했어요");
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  const day = today ? dayInfo(today) : null;
  const daily = today ? dailyHexagram(today) : null;
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
        ) : premium || !paymentsEnabled ? (
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

  const limited = paymentsEnabled && !premium ? history.slice(0, FREE_HISTORY_LIMIT) : history;
  const shown = showAll ? limited : limited.slice(0, 3);

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      <div className="px-1 pt-2 lg:col-span-2">
        <p className="text-xs font-bold text-vermilion">원전 그대로, 쉬운 말로</p>
        <p className="mt-1 min-h-5 text-sm text-muted">{greeting}</p>
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight">
          {day ? `오늘은 ${day.label.replace("일", "")} 날,` : "오늘은"}
          <br />
          어떤 괘가 나올까요
        </h1>
      </div>

      <div className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <div className="flex items-center justify-between">
          <p className="font-bold">64괘</p>
          <button onClick={() => go("about")} className="text-sm text-muted hover:text-foreground">
            주역이란
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">괘를 누르면 그 괘의 뜻과 효사가 바로 열려요.</p>
        <div className="mt-3 flex justify-center">
          <HexagramWheel size={340} onSelect={setSelected} resetKey={wheelReset} randomRef={wheelRandom} className="h-auto w-full max-w-[340px]" />
        </div>
        <div className="mt-2 flex justify-center">
          <button onClick={() => wheelRandom.current?.()} className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-sm font-semibold transition hover:bg-border/60">
            <Shuffle size={15} /> 무작위로 하나 뽑기
          </button>
        </div>
      </div>

      {unlockMessage ? <p className="rounded-2xl bg-card px-4 py-3 text-center text-sm font-semibold text-gold-soft">{unlockMessage}</p> : null}

      {/* 오늘의 괘 한마디 */}
      <motion.button
        onClick={() => daily && setSelected(daily)}
        whileTap={{ scale: 0.98 }}
        className="flex min-h-[112px] w-full items-center gap-4 rounded-3xl bg-card p-5 text-left shadow-[0_6px_30px_rgba(31,29,26,0.06)]"
      >
        {daily ? (
          <>
            <div className="shrink-0 text-gold">
              <HexagramFigure lines={daily.lines} size={56} title={daily.name} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-vermilion">오늘의 괘 한마디</p>
              <p className="mt-1 font-bold">
                {daily.name} <span className="font-normal text-muted">{daily.hanja}</span>
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-foreground/80">{daily.advice}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-muted" />
          </>
        ) : (
          <p className="text-xs font-bold text-vermilion">오늘의 괘 한마디</p>
        )}
      </motion.button>
      {daily && today ? (
        <div className="-mt-2 flex justify-end">
          <button onClick={() => setDailyShare(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted hover:text-foreground">
            <ImageDown size={14} /> 오늘의 괘를 이미지로
          </button>
          <ShareCardModal
            job={
              dailyShare
                ? {
                    render: () => renderDailyStoryCard(daily, today),
                    fileName: storyFileName("오늘의괘", daily),
                    text: `오늘의 괘 ${daily.name}(${daily.hanja}), ${daily.keyword}\n${daily.advice}\n${SITE_URL}`,
                  }
                : null
            }
            onClose={() => setDailyShare(false)}
          />
        </div>
      ) : null}

      {/* 점치기 입구 */}
      <motion.button
        onClick={() => go("divine")}
        whileTap={{ scale: 0.98 }}
        className="relative w-full overflow-hidden rounded-3xl bg-foreground p-6 text-left text-card shadow-[0_12px_40px_rgba(31,29,26,0.25)]"
      >
        <div className="pointer-events-none absolute -right-16 -top-10 opacity-60">
          <HexagramWheel size={260} />
        </div>
        <p className="text-sm text-card/70">주역 64괘 점</p>
        <p className="mt-2 text-2xl font-extrabold">나만의 주역 괘와 효 뽑기</p>
        <p className="mt-2 max-w-[62%] text-sm leading-relaxed text-card/80 md:max-w-[70%]">동전, 산통, 산가지 중 마음에 드는 방법으로 괘를 뽑고 오늘의 조언을 받아 보세요.</p>
        <span className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-vermilion px-4 py-2 text-sm font-bold">
            시작하기 <ChevronRight size={16} />
          </span>
          <QuotaBadge />
        </span>
      </motion.button>


      <Card title="육효로 묻기" desc="돈, 직장, 연애처럼 구체적인 질문에 답합니다" onClick={() => go("yukhyo")} accent="bg-vermilion/10 text-vermilion" badge="상세 점" />

      {/* 나의 점 기록 */}
      <section className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <div className="flex items-center justify-between">
          <p className="font-bold">나의 점 기록</p>
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
          <p className="mt-2 text-sm text-muted">아직 기록이 없어요. 점을 치면 이 기기에 알아서 저장해 둬요.</p>
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
                      {r.type === "iching" ? readingFromRecord(r).primary.name : `${r.hexName}, ${r.categoryLabel}`}
                      {r.type === "yukhyo" ? <span className="ml-1.5 text-xs font-bold text-vermilion">{r.level}</span> : null}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatAt(r.at)}
                      {r.type === "iching" ? ` ${categoryOf(r.category).label} ${r.method === "coin" ? "척전법" : r.method === "yarrow" ? "시초점" : "산통점"}` : r.question ? ` “${r.question}”` : ""}
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
        {paymentsEnabled && !premium && history.length > FREE_HISTORY_LIMIT ? (
          <p className="mt-2 text-xs text-muted">무료 회원은 최근 {FREE_HISTORY_LIMIT}개까지 볼 수 있어요. Pro는 전부 보관해요.</p>
        ) : null}
      </section>


      <AccountCard />
      <PremiumCard />
      <Card title="64괘 둘러보기" desc="괘마다 뜻과 조언, 효사를 볼 수 있어요" onClick={() => go("hexagrams")} accent="bg-gold/15 text-gold" badge="사전" />

      <p className="px-2 text-center text-xs leading-relaxed text-muted lg:col-span-2">주역 점은 스스로를 돌아보는 거울입니다. 결과는 참고로만 삼아 주세요.</p>
      <HexagramDetail
        hex={selected}
        onClose={() => {
          setSelected(null);
          setWheelReset((k) => k + 1);
        }}
      />
    </div>
  );
}

function Card({ title, desc, onClick, accent, badge }: { title: string; desc: string; onClick: () => void; accent: string; badge: string }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="flex w-full flex-col items-start rounded-3xl bg-card p-5 text-left shadow-[0_6px_30px_rgba(31,29,26,0.06)] transition hover:shadow-[0_10px_36px_rgba(31,29,26,0.10)]"
    >
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${accent}`}>{badge}</span>
      <span className="mt-3 text-lg font-bold">{title}</span>
      <span className="mt-1 text-xs leading-relaxed text-muted">{desc}</span>
    </motion.button>
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
