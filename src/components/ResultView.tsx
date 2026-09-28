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
import { makeId, saveRecord } from "@/lib/history";

type Props = {
  reading: Reading;
  onRestart: () => void;
  restartLabel?: string;
};

export default function ResultView({ reading, onRestart, restartLabel = "다시 점치기" }: Props) {
  const { primary, resulting, changingLines, question, method, period, periodDate } = reading;
  const advice = adaptAdvice(primary.advice, period, periodDate);
  const { lower, upper } = trigramsOf(primary);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // 결과가 나오면 이 기기에 기록한다 (같은 결과는 한 번만)
  useEffect(() => {
    const at = new Date();
    const id = makeId([at.toISOString().slice(0, 16), method, primary.lines, changingLines.join(""), question]);
    saveRecord({ id, type: "iching", at: at.toISOString(), method, lines: primary.lines, changing: changingLines, question, period, periodDate });
  }, [method, primary.lines, changingLines, question, period, periodDate]);

  const copy = async () => {
    const text = [
      question ? `질문: ${question}` : null,
      `오늘의 괘: 제${primary.number}괘 ${primary.name}(${primary.hanja}) ${hexagramSymbol(primary.number)}`,
      `키워드: ${primary.keyword}`,
      `해설: ${primary.summary}`,
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
        {question ? `“${question}” ` : ""}
        {period && period !== "today" ? `${periodLabel(period, periodDate)}의 일을 물은 괘` : "오늘의 괘"}, {method === "coin" ? "척전법" : method === "yarrow" ? "시초점" : "산통점"}
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

          <h3 className="mt-7 text-sm font-bold text-muted">쉬운 해설</h3>
          <p className="mt-2 leading-relaxed text-foreground/90">{primary.summary}</p>

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

      {/* 변효 + 지괘 */}
      {changingLines.length ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
            <h3 className="text-sm font-bold text-vermilion">움직이는 효의 효사</h3>
            <ul className="mt-3 space-y-4 text-sm leading-relaxed text-foreground/90">
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
                    <p className="mt-1.5 text-foreground/75"><span className="mr-1.5 rounded bg-foreground/8 px-1.5 py-0.5 text-[11px] font-semibold text-foreground/70">조언</span>{lt.advice}</p>
                  </li>
                );
              })}
            </ul>
            {changingLinesRule(changingLines.length) ? (
              <p className="mt-4 text-xs leading-relaxed text-muted">{changingLinesRule(changingLines.length)}</p>
            ) : null}
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
