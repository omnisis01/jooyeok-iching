// 육효점 결과: 여섯 효 도표(육수, 육친, 간지, 세응, 동효)와 용신 판단, 종합 풀이
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ImageDown, RotateCcw } from "lucide-react";
import {
  BEASTS,
  BEAST_MEANING,
  BRANCHES,
  BRANCHES_HANJA,
  CATEGORIES,
  ELEMENT_HANJA,
  RELATION_HANJA,
  STEMS_HANJA,
  branchLabel,
  type LineInfo,
  type YukhyoResult as Result,
} from "@/lib/yukhyo";
import { LINE_NAMES } from "@/lib/iching";
import { makeId, saveRecord } from "@/lib/history";
import ShareCardModal from "./ShareCardModal";
import { renderYukhyoCard, yukhyoFileName, yukhyoShareText } from "@/lib/yukhyoCard";

type Props = {
  result: Result;
  onRestart: () => void;
};

const LEVEL_STYLE = {
  길: "bg-jade/15 text-jade",
  평: "bg-gold/20 text-gold",
  흉: "bg-vermilion/15 text-vermilion",
};
const JUDGE_STYLE = {
  왕: "bg-jade/15 text-jade",
  평: "bg-gold/20 text-gold",
  쇠: "bg-vermilion/15 text-vermilion",
};
const JUDGE_LABEL = { 왕: "힘이 있어요", 평: "보통이에요", 쇠: "힘이 약해요" };

export default function YukhyoResult({ result, onRestart }: Props) {
  const { hexagram, changedHexagram, palace, day, lines, useRelation, useLine, hiddenUse, useJudgement, worldJudgement, verdict, timing, input } = result;
  const category = CATEGORIES.find((c) => c.key === input.category)!;
  const [shareOpen, setShareOpen] = useState(false);
  useEffect(() => {
    const at = new Date();
    saveRecord({
      id: makeId([at.toISOString().slice(0, 16), "yukhyo", hexagram.lines, input.changingLines.join(""), input.category, input.date]),
      type: "yukhyo",
      at: at.toISOString(),
      date: input.date,
      category: input.category,
      categoryLabel: category.label,
      lines: hexagram.lines,
      changing: input.changingLines,
      hexName: hexagram.name,
      question: input.question,
      level: verdict.level,
      title: verdict.title,
      text: verdict.text,
    });
  }, [hexagram, input, category.label, verdict]);

  const useLabel = useRelation === "세" ? "세효(나 자신)" : useRelation === "응" ? "응효(상대)" : `${useRelation}(${RELATION_HANJA[useRelation]})`;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="space-y-4">
      {/* 종합 */}
      <section className="rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <p className="text-sm text-muted">
          {category.label}
          {input.question ? ` “${input.question}”` : ""}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${LEVEL_STYLE[verdict.level]}`}>{verdict.level}</span>
          <h2 className="text-xl font-bold">{verdict.title}</h2>
        </div>
        <p className="mt-4 text-[17px] leading-relaxed">{verdict.text}</p>
        {timing.length ? (
          <div className="mt-4 rounded-2xl bg-background p-4 text-sm leading-relaxed text-foreground/80">
            <p className="mb-1 font-semibold text-foreground">언제쯤 이루어질까요</p>
            {timing.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        ) : null}
      </section>

      {/* 괘 정보 */}
      <section className="rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-lg font-bold">
            {hexagram.name} <span className="font-normal text-muted">{hexagram.hanja}</span>
          </h3>
          {changedHexagram ? (
            <span className="text-sm text-muted">
              변하면 {changedHexagram.name} {changedHexagram.hanja}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/75">{result.elementNote}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Chip>점친 날 {day.date.replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => `${y}년 ${Number(m)}월 ${Number(d)}일`)}</Chip>
          <Chip>오늘의 간지 {day.label}</Chip>
          <Chip>이달 {branchLabel(day.monthBranch)}월</Chip>
          <Chip>
            빈자리(공망) {BRANCHES[day.voids[0]]}{BRANCHES[day.voids[1]]}({BRANCHES_HANJA[day.voids[0]]}{BRANCHES_HANJA[day.voids[1]]})
          </Chip>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-[3.2rem_1fr_4.5rem_2.4rem_1fr] bg-background px-3 py-2 text-[11px] font-semibold text-muted">
            <span>육수</span>
            <span>육친과 간지</span>
            <span className="text-center">효</span>
            <span className="text-center">세응</span>
            <span>변한 효</span>
          </div>
          {[...lines].reverse().map((l) => (
            <LineRow key={l.index} line={l} isUse={useLine?.index === l.index} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">붉게 칠한 줄이 이번 질문의 용신이고, 動 표시는 움직이는 효입니다.</p>
      </section>

      {/* 용신 판단 */}
      <section className="rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold">용신 풀이</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${JUDGE_STYLE[useJudgement.level]}`}>{JUDGE_LABEL[useJudgement.level]}</span>
        </div>
        <p className="mt-2 text-sm text-foreground/80">
          {category.label} 질문의 용신은 <b className="text-foreground">{useLabel}</b>입니다.
          {useLine ? (
            <>
              {" "}
              {LINE_NAMES[useLine.index]} {branchLabel(useLine.branch)} {useLine.element}({ELEMENT_HANJA[useLine.element]}) 효를 살핍니다.
            </>
          ) : hiddenUse ? (
            " 괘에 드러나지 않아 복신을 살핍니다."
          ) : null}
        </p>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-foreground/85">
          {useJudgement.reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-vermilion/60" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">힘 점수 {useJudgement.score}</p>
      </section>

      {/* 세효 */}
      <section className="rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold">나의 자리, 세효</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${JUDGE_STYLE[worldJudgement.level]}`}>{JUDGE_LABEL[worldJudgement.level]}</span>
        </div>
        <p className="mt-2 text-sm text-foreground/80">
          {LINE_NAMES[palace.world]} {lines[palace.world].relation} {branchLabel(lines[palace.world].branch)} 효가 나를 뜻합니다. 육수는 {BEASTS[lines[palace.world].beast]}, {BEAST_MEANING[lines[palace.world].beast]}의 기운입니다.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-foreground/80">
          {worldJudgement.reasons.slice(0, 4).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <button onClick={onRestart} className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-semibold text-card transition hover:opacity-90">
          <RotateCcw size={18} /> 다시 묻기
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-vermilion px-6 py-3 font-semibold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105"
        >
          <ImageDown size={18} /> 이미지로 저장하기
        </button>
      </div>
      <ShareCardModal
        job={shareOpen ? { render: () => renderYukhyoCard(result), fileName: yukhyoFileName(result), text: yukhyoShareText(result) } : null}
        onClose={() => setShareOpen(false)}
      />
      <p className="text-center text-xs leading-relaxed text-muted">
        육효는 점친 날의 일진과 월건을 함께 보는 점법이라 같은 괘라도 날짜에 따라 풀이가 달라집니다. 결과는 참고로만 삼아 주세요.
      </p>
    </motion.div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-background px-2.5 py-1 text-foreground/75">{children}</span>;
}

function LineRow({ line, isUse }: { line: LineInfo; isUse: boolean }) {
  const yangBar = "h-2.5 w-full rounded-sm";
  return (
    <div className={`grid grid-cols-[3.2rem_1fr_4.5rem_2.4rem_1fr] items-center border-t border-border px-3 py-2.5 text-sm ${isUse ? "bg-vermilion/8" : ""}`}>
      <span className="text-xs text-muted">{BEASTS[line.beast]}</span>
      <span className={isUse ? "font-bold text-vermilion" : ""}>
        {line.relation}
        <span className="ml-1 text-muted">
          {STEMS_HANJA[line.stem]}
          {BRANCHES_HANJA[line.branch]}
        </span>
        <span className="ml-1 text-xs text-muted">{line.element}</span>
        {line.isVoid ? <span className="ml-1 text-[10px] text-muted">공망</span> : null}
      </span>
      <span className="flex items-center justify-center gap-1 px-1">
        {line.yang ? (
          <span className={`${yangBar} ${isUse ? "bg-vermilion" : "bg-foreground/80"}`} />
        ) : (
          <>
            <span className={`h-2.5 w-[42%] rounded-sm ${isUse ? "bg-vermilion" : "bg-foreground/80"}`} />
            <span className={`h-2.5 w-[42%] rounded-sm ${isUse ? "bg-vermilion" : "bg-foreground/80"}`} />
          </>
        )}
      </span>
      <span className="text-center text-xs font-bold text-foreground/70">{line.isWorld ? "세" : line.isResponse ? "응" : ""}</span>
      <span className="text-xs text-muted">
        {line.changing && line.changed ? (
          <>
            <span className="mr-1 rounded bg-vermilion/15 px-1 py-0.5 font-bold text-vermilion">動</span>
            {line.changed.relation} {BRANCHES_HANJA[line.changed.branch]} {line.changed.element}
          </>
        ) : (
          ""
        )}
      </span>
    </div>
  );
}
