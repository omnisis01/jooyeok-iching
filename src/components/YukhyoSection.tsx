// 육효점 흐름: 질문 분류와 날짜 선택, 동전으로 괘 뽑기, 결과
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import type { Reading } from "@/lib/iching";
import { CATEGORIES, analyzeYukhyo, todayString, type Category, type YukhyoResult as Result } from "@/lib/yukhyo";
import CoinCasting from "./CoinCasting";
import YukhyoResult from "./YukhyoResult";
import FocusGate from "./FocusGate";

type Stage = "setup" | "focus" | "cast" | "result";

export default function YukhyoSection() {
  const [stage, setStage] = useState<Stage>("setup");
  const [category, setCategory] = useState<Category>("wealth");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [question, setQuestion] = useState("");
  const [date, setDate] = useState(todayString());
  const [result, setResult] = useState<Result | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const complete = (reading: Reading) => {
    setResult(
      analyzeYukhyo({
        lines: reading.primary.lines,
        changingLines: reading.changingLines,
        category,
        gender,
        date,
        question: question || undefined,
      }),
    );
    setStage("result");
    document.getElementById("yukhyo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const restart = () => {
    setResult(null);
    setStage("setup");
  };

  return (
    <div>
        {stage === "setup" ? (
          <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
              <p className="font-bold">무엇이 궁금하세요?</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setCategory(c.key)}
                    className={`rounded-2xl px-3 py-3 text-left transition ${
                      category === c.key ? "bg-foreground text-card" : "bg-background text-foreground hover:bg-border/60"
                    }`}
                  >
                    <span className="block text-sm font-bold">{c.label}</span>
                    <span className={`mt-0.5 block text-[11px] ${category === c.key ? "text-card/70" : "text-muted"}`}>{c.desc}</span>
                  </button>
                ))}
              </div>
              {category === "love" ? (
                <div className="mt-4">
                  <p className="text-sm text-muted">상대를 뜻하는 별이 성별에 따라 달라요. 나는</p>
                  <div className="mt-2 flex gap-2">
                    {(["male", "female"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${gender === g ? "bg-foreground text-card" : "bg-background text-foreground"}`}
                      >
                        {g === "male" ? "남성" : "여성"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
              <label className="block">
                <span className="font-bold">질문을 적어 주세요</span>
                <span className="ml-2 text-xs text-muted">선택</span>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={80}
                  placeholder="예) 이번 달 계약이 성사될까요"
                  className="mt-2 w-full rounded-2xl bg-background px-4 py-3.5 outline-none transition placeholder:text-muted/70 focus:ring-2 focus:ring-vermilion/30"
                />
              </label>
              <label className="mt-4 block">
                <span className="font-bold">점치는 날짜</span>
                <span className="ml-2 text-xs text-muted">그날의 기운을 함께 봅니다</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-background px-4 py-3.5 outline-none focus:ring-2 focus:ring-vermilion/30"
                />
              </label>
            </div>

            <button
              onClick={() => setStage("focus")}
              className="w-full rounded-full bg-vermilion py-4 text-center text-lg font-bold text-card shadow-[0_8px_24px_rgba(216,69,43,0.3)] transition hover:brightness-105"
            >
              동전으로 괘 뽑기
            </button>

            <div className="rounded-3xl bg-card shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
              <button onClick={() => setGuideOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold" aria-expanded={guideOpen}>
                육효점은 주역점과 무엇이 다른가요
                <ChevronDown size={18} className={`text-muted transition-transform ${guideOpen ? "rotate-180" : ""}`} />
              </button>
              {guideOpen ? (
                <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-foreground/80">
                  <p>육효점은 주역의 64괘 모양을 그대로 쓰지만, 풀이는 효사를 읽지 않습니다. 대신 여섯 효마다 간지를 붙이고(납갑), 괘가 속한 궁의 오행과 견주어 부모, 형제, 자손, 처재, 관귀라는 여섯 관계(육친)를 정합니다.</p>
                  <p>질문에 따라 관계 하나를 용신으로 삼습니다. 돈은 처재, 직장과 시험은 관귀, 문서와 학업은 부모, 자녀는 자손, 친구는 형제, 나 자신은 세효입니다.</p>
                  <p>그 용신이 점친 날의 월건과 일진에게 도움을 받는지, 움직이는 효에게 눌리는지, 공망에 들었는지를 따져 힘이 있으면 이루어지고 약하면 어렵다고 봅니다. 한나라 경방에서 시작해 명나라와 청나라 때 정리된 방식입니다.</p>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}

        {stage === "focus" ? (
          <motion.div key="focus" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={restart} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground">
              <ArrowLeft size={16} /> 질문 다시 고르기
            </button>
            <FocusGate action="동전을 던져" question={question || undefined} onReady={() => setStage("cast")} />
          </motion.div>
        ) : null}

        {stage === "cast" ? (
          <motion.div key="cast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={restart} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground">
              <ArrowLeft size={16} /> 질문 다시 고르기
            </button>
            <p className="mb-4 text-center text-sm text-muted">
              {CATEGORIES.find((c) => c.key === category)?.label}
              {question ? ` “${question}”` : ""} {date}
            </p>
            <CoinCasting question={question || undefined} onComplete={complete} />
          </motion.div>
        ) : null}

        {stage === "result" && result ? (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <YukhyoResult result={result} onRestart={restart} />
          </motion.div>
        ) : null}
    </div>
  );
}
