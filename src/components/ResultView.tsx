// 점괘 결과: 본괘 해설, 오늘의 조언, 변효와 지괘를 보여주는 화면
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Copy, ImageDown, RotateCcw } from "lucide-react";
import { hexagramSymbol } from "@/data/hexagrams";
import { LINE_NAMES, trigramsOf, type Reading } from "@/lib/iching";
import { changingLinesRule, getLineText, lineTitle } from "@/data/lineTexts";
import HexagramFigure from "./HexagramFigure";
import ShareCardModal from "./ShareCardModal";
import { renderShareCard, shareFileName, shareText } from "@/lib/shareCard";
import { adaptAdvice, adviceHeading, periodLabel } from "@/lib/period";
import ShareForCoupon from "./ShareForCoupon";
import SummaryCard from "./SummaryCard";
import { LINE_STAGE_BY_CATEGORY, categoryOf } from "@/lib/categories";
import { categoryReading } from "@/data/categoryReadings";
import { makeId, saveRecord } from "@/lib/history";

type Props = {
  reading: Reading;
  onRestart: () => void;
  restartLabel?: string;
  /** 기록에서 다시 여는 경우 false */
  saveToHistory?: boolean;
};

export default function ResultView({ reading, onRestart, restartLabel = "다시 점치기", saveToHistory = true }: Props) {
  const { primary, resulting, changingLines, question, method, period, periodDate } = reading;
  const cat = categoryOf(reading.category);
  const catText = categoryReading(primary.number, cat.key);
  const advice = adaptAdvice(primary.advice, period, periodDate);
  const { lower, upper } = trigramsOf(primary);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // 결과가 나오면 이 기기에 기록한다 (같은 결과는 한 번만)
  useEffect(() => {
    if (!saveToHistory) return;
    const at = new Date();
    const id = makeId([at.toISOString().slice(0, 16), method, primary.lines, changingLines.join(""), question]);
    saveRecord({ id, type: "iching", at: at.toISOString(), method, lines: primary.lines, changing: changingLines, question, period, periodDate, category: cat.key });
  }, [saveToHistory, method, primary.lines, changingLines, question, period, periodDate, cat.key]);

  const copy = async () => {
    const text = [
      question ? `질문: ${question}` : null,
      `오늘의 괘: 제${primary.number}괘 ${primary.name}(${primary.hanja}) ${hexagramSymbol(primary.number)}`,
      `키워드: ${primary.keyword}`,
      `해설: ${primary.summary}`,
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

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <p className="text-center text-sm text-muted">
        {cat.label}, {question ? `“${question}” ` : ""}
        {period && period !== "today" ? `${periodLabel(period, periodDate)}의 일을 물은 괘` : "오늘의 괘"}, {method === "coin" ? "척전법" : method === "yarrow" ? "시초점" : "산통점"}
      </p>
      <p className="rounded-2xl bg-card/60 px-4 py-3 text-center text-sm leading-relaxed text-muted">
        주역은 두 겹으로 읽어요. <b className="text-foreground/80">괘사</b>는 지도, <b className="text-foreground/80">효사</b>는 지금 내 위치. 둘을 합쳐 한마디로 정리합니다.
      </p>

      {/* 본괘 */}
      <section className="grid gap-6 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)] sm:p-8 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-4 text-gold-soft">
          <HexagramFigure lines={primary.lines} changing={changingLines} size={170} animate title={primary.name} />
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
            <h3 className="text-sm font-bold text-vermilion">② 효사로 보는 지금 내 자리 (변효 풀이)</h3>
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
                    <p className="mt-1.5 font-semibold text-foreground">{cat.short}운으로 보면, {LINE_STAGE_BY_CATEGORY[cat.key][i]}</p>
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
                <b className="text-foreground/80">변효(움직이는 효)</b>는 괘 그림에서 빨갛게 표시된 줄입니다. 동전 세 개가 모두 앞면(합 9)이거나 모두 뒷면(합 6)이면 그 줄은 곧 반대로 뒤집히는 늙은 양이나 음이라 움직인다고 봅니다. 나머지 줄은 그대로 머뭅니다.
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
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "복사되었습니다" : "글로 복사"}
        </button>
      </div>
      <ShareCardModal
        job={shareOpen ? { render: () => renderShareCard(reading), fileName: shareFileName(reading), text: shareText(reading) } : null}
        onClose={() => setShareOpen(false)}
      />

      <ShareForCoupon className="mx-auto max-w-sm pt-2" />
      <p className="text-center text-xs text-muted">
        주역 점은 스스로를 돌아보는 거울입니다. 결과는 참고로만 삼고, 중요한 결정은 충분히 생각한 뒤 내려 주세요.
      </p>
    </motion.div>
  );
}
