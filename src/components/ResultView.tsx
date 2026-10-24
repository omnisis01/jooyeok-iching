// 점괘 결과: 요약 카드(지금, 변하는 효, 앞으로) → 맞춤형 AI 점사 분석(자동으로 바로 나온다) → 그 아래 "주역 원문 해설 보기"(괘사, 효사, 변효 풀이, 지괘, 육효)
// 풀이는 AI 분석 하나로 모으고, 예전의 상세 풀이는 그 근거로 펼쳐 보게 한다
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, ChevronDown, ChevronRight, Copy, ImageDown, RotateCcw, Sparkles } from "lucide-react";
import { cloudEnabled } from "@/lib/supabase";
import { hexagramSymbol } from "@/data/hexagrams";
import { LINE_NAMES, trigramsOf, type Reading } from "@/lib/iching";
import { changingLinesRule, getLineText, lineTitle } from "@/data/lineTexts";
import HexagramFigure from "./HexagramFigure";
import ShareCardModal from "./ShareCardModal";
import { SITE_URL, renderShareCard, shareFileName, shareText } from "@/lib/shareCard";
import { renderStoryCard, storyFileName } from "@/lib/storyCard";
import { adaptAdvice, adviceHeading, periodLabel } from "@/lib/period";
import ShareForCoupon from "./ShareForCoupon";
import SummaryCard from "./SummaryCard";
import { LINE_STAGE_BY_CATEGORY, categoryOf } from "@/lib/categories";
import { categoryReading } from "@/data/categoryReadings";
import GuaHyoExplainer from "./GuaHyoExplainer";
import { formatCastAt } from "@/lib/castTime";
import FlowOverview from "./FlowOverview";
import InteractiveHexagram from "./InteractiveHexagram";
import DeepReading from "./DeepReading";
import AiReadingCard from "./AiReadingCard";
import type { AiReading } from "@/lib/aiReading";
import { aiCardFileName, renderAiCard } from "@/lib/aiCard";
import AdSlot from "./AdSlot";
import { makeId, saveRecord, updateRecordQuestion } from "@/lib/history";
import { iga, josa } from "@/lib/josa";

type Props = {
  reading: Reading;
  onRestart: () => void;
  restartLabel?: string;
  /** 기록에서 다시 여는 경우 false */
  saveToHistory?: boolean;
};

export default function ResultView({ reading: source, onRestart, restartLabel = "다른 질문 하기", saveToHistory = true }: Props) {
  // 질문 없이 뽑았다가 AI 분석 전에 적으면 여기서 붙인다. 괘는 그대로, 풀이만 질문에 맞춘다
  const [lateQuestion, setLateQuestion] = useState<{ for: Reading; q: string } | null>(null);
  const reading = lateQuestion && lateQuestion.for === source ? { ...source, question: lateQuestion.q } : source;
  const { primary, resulting, changingLines, question, method, period, periodDate, castAt } = reading;
  const addQuestion = (q: string) => {
    setLateQuestion({ for: source, q });
    updateRecordQuestion(source, q);
  };
  const cat = categoryOf(reading.category);
  const catText = categoryReading(primary.number, cat.key);
  const advice = adaptAdvice(primary.advice, period, periodDate);
  const { lower, upper } = trigramsOf(primary);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // AI 분석이 나오면 이미지 저장 모달에 "AI 분석" 형식이 추가된다(저장 버튼은 하나)
  const [ai, setAi] = useState<{ result: AiReading; timing: string | null } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  const openDetails = () => {
    setExpanded(true);
    window.setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };
  // 변하는 효: 두 개 이상이면 위쪽 효를 중심으로 본다(변효 풀이와 같은 규칙)
  const focusLine = changingLines.length ? Math.max(...changingLines) : null;
  const changeLabel = changingLines.length
    ? `${changingLines.length > 1 ? [...changingLines].sort((a, b) => a - b).map((i) => LINE_NAMES[i]).slice(0, -1).join(", ") + ", " : ""}${iga(LINE_NAMES[focusLine!])} 변해요`
    : null;
  const resultingCatText = resulting ? categoryReading(resulting.number, cat.key) : null;

  // 결과가 나오면 이 기기에 기록한다 (같은 결과는 한 번만)
  useEffect(() => {
    if (!saveToHistory) return;
    const at = castAt ? new Date(castAt) : new Date();
    const id = makeId([at.toISOString().slice(0, 16), method, primary.lines, changingLines.join("")]);
    saveRecord({ id, type: "iching", at: at.toISOString(), method, lines: primary.lines, changing: changingLines, question, context: reading.context, period, periodDate, category: cat.key });
  }, [saveToHistory, method, primary.lines, changingLines, question, reading.context, period, periodDate, cat.key, castAt]);

  const sources = [`${primary.name} 괘 해설`, ...changingLines.map((i) => `${lineTitle(primary.lines, i)} 효사`), ...(resulting ? [`${resulting.name} 괘 해설`] : []), "육효 판단"].join(", ");

  const copy = async () => {
    const text = [
      question ? `질문: ${question}` : null,
      `오늘의 괘: 제${primary.number}괘 ${primary.name}(${primary.hanja}) ${hexagramSymbol(primary.number)}`,
      `키워드: ${primary.keyword}`,
      `해설: ${primary.summary}`,
      castAt ? `뽑은 시각: ${formatCastAt(castAt)}` : null,
      `${cat.label}: ${catText}`,
      `${adviceHeading(period, periodDate)}: ${advice}`,
      ...changingLines.map((i) => {
        const lt = getLineText(primary.number, i);
        return `${lineTitle(primary.lines, i)} ${lt.hanja}: ${lt.text} ${lt.advice}`;
      }),
      resulting ? `앞으로의 흐름(지괘): 제${resulting.number}괘 ${resulting.name}, ${resulting.keyword}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("아래 내용을 복사하세요", text);
    }
  };

  // 지금, 변하는 효, 앞으로: 보는 사람에게 가장 중요한 "어떻게 변하나"를 한 줄기로 보여 준다
  const flowBlocks = (
        <div className="mx-auto mt-6 max-w-md space-y-2 text-left">
          <div className="rounded-2xl bg-background px-5 py-4">
            <p className="text-xs font-bold text-muted">지금, {cat.label}으로 보면</p>
            <p className="mt-1.5 text-lg font-semibold leading-relaxed">{catText}</p>
          </div>
          {resulting && focusLine !== null ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl border-2 border-vermilion/40 bg-vermilion/8 px-4 py-3">
                <div className="flex shrink-0 items-center gap-1">
                  <HexagramFigure lines={primary.lines} changing={changingLines} size={34} className="text-gold-soft" />
                  <ChevronRight size={16} className="text-vermilion" aria-hidden />
                  <HexagramFigure lines={resulting.lines} changing={changingLines} changingColor="var(--jade)" size={34} className="text-foreground/30" />
                </div>
                <div>
                  <p className="font-bold text-vermilion">{changeLabel}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-foreground/80">
                    {cat.label}으로 보면, {LINE_STAGE_BY_CATEGORY[cat.key][focusLine]}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-jade/10 px-5 py-4">
                <p className="text-xs font-bold text-jade">
                  앞으로, {resulting.name}
                  {josa(resulting.name, "으로", "로")} 변하면
                </p>
                <p className="mt-1.5 text-lg font-semibold leading-relaxed">{resultingCatText}</p>
                <p className="mt-1 text-sm text-muted">{resulting.keyword}</p>
              </div>
            </>
          ) : (
            <p className="rounded-2xl bg-background px-5 py-3 text-[15px] leading-relaxed text-foreground/80">변하는 효가 없어요. 지금의 흐름이 한동안 그대로 이어져요.</p>
          )}
        </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      {/* 첫 화면: 한 장 요약 */}
      <section className="break-keep rounded-3xl bg-card px-6 pb-7 pt-6 text-center shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <p className="text-xs text-muted">
          {cat.label}, {question ? `“${question}” ` : ""}
          {period && period !== "today" ? `${periodLabel(period, periodDate)}의 일을 물은 괘` : "오늘의 괘"}, {method === "coin" ? "척전법" : method === "yarrow" ? "시초점" : "산통점"}
        </p>
        {castAt ? <p className="mt-0.5 text-[11px] text-muted">뽑은 시각 {formatCastAt(castAt)}</p> : null}
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.5 }} className="mt-6 flex justify-center text-gold-soft">
          <HexagramFigure lines={primary.lines} changing={changingLines} size={cloudEnabled ? 88 : 116} title={primary.name} />
        </motion.div>
        <p className="mt-5 font-serif text-sm tracking-wide text-muted">{primary.hanja}</p>
        <h2 className="mt-1 text-4xl font-bold tracking-tight">{primary.name}</h2>
        <p className="mt-2 text-gold-soft">{primary.keyword}</p>

        {cloudEnabled && resulting ? (
          <p className="mx-auto mt-4 max-w-md rounded-2xl bg-background px-4 py-2.5 text-sm text-foreground/85">
            <span className="font-bold text-vermilion">{changeLabel}</span> <span className="text-muted">→</span> {resulting.name} <span className="text-muted">{resulting.keyword}</span>
          </p>
        ) : null}
        {!cloudEnabled ? flowBlocks : null}
      </section>

      <AiReadingCard reading={reading} onQuestion={addQuestion} onResult={setAi} />
      {cloudEnabled ? (
        <button
          onClick={() => (expanded ? setExpanded(false) : openDetails())}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between rounded-2xl bg-card px-5 py-4 text-left shadow-[0_6px_30px_rgba(31,29,26,0.06)]"
        >
          <span>
            <span className="block font-bold">주역 원문 해설 보기</span>
            <span className="mt-0.5 block text-xs text-muted">괘사, 효사 원문, 변효 풀이, 지괘, 육효. 분석이 어디서 나왔는지 직접 읽어 보세요</span>
          </span>
          <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      ) : null}

      {!expanded ? (
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-vermilion px-5 py-2.5 text-sm font-semibold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105"
          >
            <ImageDown size={16} /> 이미지로 저장하기
          </button>
          <button onClick={onRestart} className="inline-flex items-center gap-1.5 rounded-full bg-card px-5 py-2.5 text-sm font-semibold shadow-[0_4px_16px_rgba(31,29,26,0.08)] transition hover:bg-border/60">
            <RotateCcw size={16} /> {restartLabel}
          </button>
        </div>
      ) : null}

      {expanded ? (
        <motion.div ref={detailsRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="scroll-mt-24 space-y-6">
          {cloudEnabled ? (
            <section className="break-keep rounded-3xl bg-card px-6 py-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
              <h3 className="text-center text-sm font-bold text-muted">지금, 변하는 효, 앞으로</h3>
              {flowBlocks}
            </section>
          ) : null}
          {changingLines.length ? <FlowOverview primary={primary} changingLines={changingLines} resulting={resulting} /> : null}

          {/* 본괘 */}
          <section className="grid gap-6 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)] sm:p-8 lg:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-4 text-gold-soft lg:w-80">
              <InteractiveHexagram primary={primary} changingLines={changingLines} resulting={resulting} />
              <div className="text-5xl text-foreground/70">{hexagramSymbol(primary.number)}</div>
              <div className="flex gap-2 text-xs text-muted">
                <span className="rounded-full bg-background px-2.5 py-1">위 {upper.symbol} {upper.nature}</span>
                <span className="rounded-full bg-background px-2.5 py-1">아래 {lower.symbol} {lower.nature}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted">제{primary.number}괘</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                {primary.name} <span className="font-normal text-muted">{primary.hanja}</span>
              </h2>
              <p className="mt-2 text-lg text-gold-soft">{primary.keyword}</p>

              <h3 className="mt-7 text-sm font-bold text-muted">① 괘사로 보는 큰 흐름</h3>
              <p className="mt-2 text-lg leading-relaxed text-foreground/90">{primary.summary}</p>

              <h3 className="mt-6 text-sm font-bold text-vermilion">{cat.label}으로 보면</h3>
              <p className="mt-2 text-lg font-semibold leading-relaxed">{catText}</p>

              <h3 className="mt-7 text-sm font-bold text-muted">{adviceHeading(period, periodDate)}</h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-2 rounded-2xl bg-vermilion/8 p-5 text-lg leading-relaxed"
              >
                {advice}
              </motion.p>
            </div>
          </section>

          <SummaryCard number={primary.number} period={period} periodDate={periodDate} step="③" />

          {/* 변효 + 지괘 */}
          {changingLines.length ? (
            <section className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
                <h3 className="text-sm font-bold text-vermilion">② 주역 효사로 보는 지금 나의 운세 자리 (변효 풀이)</h3>
                <ul className="mt-3 space-y-4 text-base leading-relaxed text-foreground/90">
                  {[...changingLines].reverse().map((i) => {
                    const lt = getLineText(primary.number, i);
                    const isFocus = changingLines.length === 2 ? i === Math.max(...changingLines) : changingLines.length === 1;
                    return (
                      <li key={i} className={`rounded-2xl p-4 ${isFocus ? "bg-vermilion/8" : "bg-background"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-vermilion/15 px-2 py-0.5 text-xs font-semibold text-vermilion">
                            {lineTitle(primary.lines, i)} {LINE_NAMES[i]}
                          </span>
                          <span className="font-serif text-base tracking-wide text-gold-soft">{lt.hanja}</span>
                          {isFocus && changingLines.length > 1 ? <span className="text-xs text-muted">중심 효</span> : null}
                        </div>
                        <p className="mt-2">{lt.text}</p>
                        <p className="mt-1.5 font-semibold text-foreground">{cat.label}으로 보면, {LINE_STAGE_BY_CATEGORY[cat.key][i]}</p>
                        <p className="mt-1.5 text-foreground/75"><span className="mr-1.5 rounded bg-foreground/8 px-1.5 py-0.5 text-[11px] font-semibold text-foreground/70">조언</span>{lt.advice}</p>
                      </li>
                    );
                  })}
                </ul>
                {changingLinesRule(changingLines.length) ? (
                  <p className="mt-4 text-xs leading-relaxed text-muted">{changingLinesRule(changingLines.length)}</p>
                ) : null}
                <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs leading-relaxed text-muted">
                  <p>
                    <b className="text-foreground/80">변효(움직이는 효)</b>는 여섯 줄 가운데 빨갛게 표시된 줄입니다. 지금 모습과 곧 될 모습이 다른 줄이에요. 동전 세 개가 모두 앞면(합 9)이거나 모두 뒷면(합 6)이면 그 줄은 힘이 끝까지 차서 곧 반대로 변합니다. 이어진 줄은 끊어지고, 끊어진 줄은 이어져요. 그래서 움직이는 효라고 부릅니다. 나머지 줄은 그대로 머뭅니다.
                  </p>
                  <p>
                    <b className="text-foreground/80">효사</b>는 주역 원문에서 여섯 줄 하나하나에 붙은 짧은 글입니다. 64괘에 여섯 개씩, 모두 384개가 있습니다. 주역 점에서는 괘 전체의 뜻보다 지금 움직이는 줄에 붙은 글이 나에게 하는 말이라고 봅니다. 아래 줄부터 일의 시작, 위 줄로 갈수록 마무리 단계라 같은 괘라도 어느 줄이 움직이느냐에 따라 답이 달라집니다.
                  </p>
                  <p>
                    <b className="text-foreground/80">지괘</b>는 움직이는 줄을 뒤집어 만든 새 괘입니다. 본괘가 지금의 상황이라면 지괘는 앞으로 흘러갈 방향입니다.
                  </p>
                </div>
              </div>

              <div className="hidden items-center lg:flex">
                <ArrowRight className="text-muted" />
              </div>

              {resulting ? (
                <div className="flex gap-5 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
                  <div className="shrink-0 text-jade">
                    <HexagramFigure lines={resulting.lines} size={70} title={resulting.name} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-jade">앞으로의 흐름, 지괘</h3>
                    <p className="mt-2 text-lg font-bold">
                      {resulting.name} <span className="font-normal text-muted">{resulting.hanja}</span>
                    </p>
                    <p className="text-gold-soft">{resulting.keyword}</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/80">{resulting.summary}</p>
                  </div>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="rounded-3xl bg-card p-6 text-sm leading-relaxed text-foreground/80 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
              움직이는 효가 없습니다. 지금의 상황이 그대로 이어지는 흐름이니, 본괘의 뜻을 오늘 하루의 지침으로 삼으세요.
            </section>
          )}

          {/* 읽는 법과 용어 설명은 결과를 다 본 뒤에 */}
          <p className="rounded-2xl bg-card/60 px-4 py-3 text-center text-sm leading-relaxed text-muted">
            주역은 <b className="text-foreground/80">괘사</b>와 <b className="text-foreground/80">효사</b>를 함께 읽어요. 괘사로 지금 상황의 큰 판세를 보고, 효사로 그 안에서 내가 선 자리를 봅니다. 둘을 합쳐 한마디로 정리했어요.
          </p>
          <GuaHyoExplainer />

          <DeepReading reading={reading} />

          <p className="text-center text-xs leading-relaxed text-muted">
            처음 뽑은 답이 가장 정확해요. 같은 질문을 다시 뽑으면 효과가 없으니, 다른 궁금한 것을 물어보세요.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onRestart}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-semibold text-card transition hover:opacity-90"
            >
              <RotateCcw size={18} /> {restartLabel}
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-vermilion px-6 py-3 font-semibold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105"
            >
              <ImageDown size={18} /> 이미지로 저장하기
            </button>
            <button
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-full bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-[0_4px_16px_rgba(31,29,26,0.08)] transition hover:bg-background"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "복사했어요" : "글로 복사"}
            </button>
          </div>
        </motion.div>
      ) : null}
      <AdSlot className="mt-2" />
      <ShareCardModal
        job={shareOpen ? { ...(ai ? { renderAi: () => renderAiCard(reading, ai.result, ai.timing), aiFileName: aiCardFileName(reading), aiText: `${ai.result.answer}\n${SITE_URL}` } : {}), render: () => renderShareCard(reading), fileName: shareFileName(reading), text: shareText(reading), renderStory: () => renderStoryCard(reading), storyFileName: storyFileName("나의괘", reading.primary) } : null}
        onClose={() => setShareOpen(false)}
      />

      <ShareForCoupon className="mx-auto max-w-sm pt-2" />
      <div className="space-y-1 text-center text-[11px] leading-relaxed text-muted">
        <p>이 분석의 근거: {sources}</p>
        <p>주역 점은 스스로를 돌아보는 거울입니다. 결과는 참고로만 삼고, 건강, 법률, 돈과 관련된 중요한 결정은 꼭 전문가와 상의해 주세요.</p>
      </div>
    </motion.div>
  );
}
