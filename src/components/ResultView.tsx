// 점괘 결과: 본괘 해설, 오늘의 조언, 변효와 지괘를 보여주는 화면
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Copy, ImageDown, RotateCcw } from "lucide-react";
import { hexagramSymbol } from "@/data/hexagrams";
import { LINE_NAMES, trigramsOf, type Reading } from "@/lib/iching";
import { changingLinesRule, getLineText, lineTitle } from "@/data/lineTexts";
import HexagramFigure from "./HexagramFigure";
import ShareCardModal from "./ShareCardModal";

type Props = {
  reading: Reading;
  onRestart: () => void;
};

export default function ResultView({ reading, onRestart }: Props) {
  const { primary, resulting, changingLines, question, method } = reading;
  const { lower, upper } = trigramsOf(primary);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const copy = async () => {
    const text = [
      question ? `질문: ${question}` : null,
      `오늘의 괘: 제${primary.number}괘 ${primary.name}(${primary.hanja}) ${hexagramSymbol(primary.number)}`,
      `키워드: ${primary.keyword}`,
      `해설: ${primary.summary}`,
      `오늘의 조언: ${primary.advice}`,
      ...changingLines.map((i) => {
        const lt = getLineText(primary.number, i);
        return `${lineTitle(primary.lines, i)} ${lt.hanja}: ${lt.text} ${lt.advice}`;
      }),
      resulting ? `흐름의 방향(지괘): 제${resulting.number}괘 ${resulting.name} — ${resulting.keyword}` : null,
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
      {question ? (
        <p className="text-center text-sm text-muted">
          “{question}” 에 대한 오늘의 괘 · {method === "coin" ? "척전법" : method === "yarrow" ? "시초점" : "산통점"}
        </p>
      ) : null}

      {/* 본괘 */}
      <section className="grid gap-8 rounded-3xl border border-gold/30 bg-card/80 p-6 shadow-[0_0_60px_rgba(201,164,74,0.10)] sm:p-10 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-4 text-gold-soft">
          <HexagramFigure lines={primary.lines} changing={changingLines} size={170} animate title={primary.name} />
          <div className="text-5xl text-paper/80">{hexagramSymbol(primary.number)}</div>
          <div className="flex gap-2 text-xs text-muted">
            <span className="rounded-full border border-border px-2.5 py-1">상 {upper.symbol} {upper.nature}</span>
            <span className="rounded-full border border-border px-2.5 py-1">하 {lower.symbol} {lower.nature}</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted">제{primary.number}괘</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {primary.name} <span className="font-normal text-muted">{primary.hanja}</span>
          </h2>
          <p className="mt-2 text-lg text-gold-soft">{primary.keyword}</p>

          <h3 className="mt-8 text-xs font-semibold uppercase tracking-widest text-muted">쉬운 해설</h3>
          <p className="mt-2 leading-relaxed text-foreground/90">{primary.summary}</p>

          <h3 className="mt-8 text-xs font-semibold uppercase tracking-widest text-muted">오늘 이렇게 살아보세요</h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-2 rounded-2xl border border-gold/40 bg-gold/10 p-5 text-lg leading-relaxed"
          >
            {primary.advice}
          </motion.p>
        </div>
      </section>

      {/* 변효 + 지괘 */}
      {changingLines.length ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-3xl border border-border bg-card/60 p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-vermilion">움직이는 효 · 효사(爻辭)</h3>
            <ul className="mt-3 space-y-4 text-sm leading-relaxed text-foreground/90">
              {[...changingLines].reverse().map((i) => {
                const lt = getLineText(primary.number, i);
                const isFocus = changingLines.length === 2 ? i === Math.max(...changingLines) : changingLines.length === 1;
                return (
                  <li key={i} className={`rounded-2xl border p-4 ${isFocus ? "border-vermilion/50 bg-vermilion/5" : "border-border/60 bg-background/40"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-vermilion/15 px-2 py-0.5 text-xs font-semibold text-vermilion">
                        {lineTitle(primary.lines, i)} · {LINE_NAMES[i]}
                      </span>
                      <span className="font-serif text-base tracking-wide text-gold-soft">{lt.hanja}</span>
                      {isFocus && changingLines.length > 1 ? <span className="text-xs text-muted">중심 효</span> : null}
                    </div>
                    <p className="mt-2">{lt.text}</p>
                    <p className="mt-1.5 text-foreground/75">→ {lt.advice}</p>
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
            <div className="flex gap-5 rounded-3xl border border-border bg-card/60 p-6">
              <div className="shrink-0 text-jade">
                <HexagramFigure lines={resulting.lines} size={70} title={resulting.name} />
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-jade">흐름의 방향 · 지괘</h3>
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
        <section className="rounded-3xl border border-border bg-card/60 p-6 text-sm leading-relaxed text-foreground/80">
          움직이는 효가 없습니다. 지금의 상황이 그대로 이어지는 흐름이니, 본괘의 뜻을 오늘 하루의 지침으로 삼으세요.
        </section>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-semibold text-ink transition hover:bg-gold-soft"
        >
          <RotateCcw size={18} /> 다시 점치기
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-vermilion px-6 py-3 font-semibold text-paper shadow-lg shadow-vermilion/25 transition hover:brightness-110"
        >
          <ImageDown size={18} /> 이미지 저장·공유
        </button>
        <button
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm text-foreground/80 transition hover:border-gold/60 hover:text-foreground"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "복사되었습니다" : "글로 복사"}
        </button>
      </div>
      <ShareCardModal reading={shareOpen ? reading : null} onClose={() => setShareOpen(false)} />

      <p className="text-center text-xs text-muted">
        주역 점은 스스로를 돌아보는 거울입니다. 결과는 참고로만 삼고, 중요한 결정은 충분히 생각한 뒤 내려 주세요.
      </p>
    </motion.div>
  );
}
