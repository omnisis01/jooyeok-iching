// 점치기 전체 흐름: 질문 입력·방법 선택 → 점 뽑기 → 결과
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Coins, Landmark, Sprout } from "lucide-react";
import type { Reading } from "@/lib/iching";
import CoinCasting from "./CoinCasting";
import SantongCasting from "./SantongCasting";
import ResultView from "./ResultView";
import YarrowCasting from "./YarrowCasting";
import MethodGuide, { type Method } from "./MethodGuide";
import FocusGate from "./FocusGate";

type Stage = "setup" | "focus" | Method | "result";

export default function DivinationFlow() {
  const [stage, setStage] = useState<Stage>("setup");
  const [question, setQuestion] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [castKey, setCastKey] = useState(0);
  const [pending, setPending] = useState<Method>("coin");
  const isFirstRender = useRef(true);

  // 단계가 바뀔 때 섹션 상단으로 스크롤해 결과가 잘리지 않게 한다 (첫 렌더는 제외)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document.getElementById("divine")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage]);

  const start = (method: Method) => {
    setPending(method);
    setStage("focus");
  };

  const beginCast = () => {
    setCastKey((k) => k + 1);
    setStage(pending);
  };

  const complete = (r: Reading) => {
    setReading(r);
    setStage("result");
  };

  const restart = () => {
    setReading(null);
    setStage("setup");
  };

  return (
    <div className="relative">
        {stage === "setup" ? (
          <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <label className="block">
              <span className="font-bold">마음속 질문을 적어 보세요</span> <span className="text-xs text-muted">선택</span>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={80}
                placeholder="예) 오늘 새 프로젝트를 시작해도 좋을까?"
                className="mt-2 w-full rounded-2xl bg-card px-5 py-4 text-lg shadow-[0_4px_16px_rgba(31,29,26,0.06)] outline-none transition placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
              />
            </label>

            <p className="mt-8 font-bold">점치는 방법을 고르세요</p>
            <div className="mt-3 grid gap-3">
              <MethodCard
                icon={<Coins size={28} />}
                title="동전 세 개, 척전법"
                desc="동전 3개를 6번 던져 점을 칩니다. 가장 널리 쓰이는 방법이고 변하는 효가 여러 개 나올 수 있어요."
                time="약 1분"
                onClick={() => start("coin")}
              />
              <MethodCard
                icon={<Landmark size={28} />}
                title="산통 흔들기, 산통점"
                desc="산통을 흔들어 산가지 3개를 뽑습니다. 아래 괘, 위 괘, 움직이는 효가 차례로 정해지는 우리 전통 방식이에요."
                time="약 30초"
                onClick={() => start("santong")}
              />
              <MethodCard
                icon={<Sprout size={28} />}
                title="산가지 50개, 시초점"
                desc="산가지 49개를 18번 나누어 셉니다. 주역 원전에 적힌 가장 오래된 정통 방식이에요. 자동 진행도 됩니다."
                time="약 3분, 자동 진행도 돼요"
                onClick={() => start("yarrow")}
              />
            </div>
          </motion.div>
        ) : null}

        {stage === "focus" ? (
          <motion.div key="focus" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <button onClick={restart} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground">
              <ArrowLeft size={16} /> 방법 다시 고르기
            </button>
            <FocusGate
              action={pending === "coin" ? "동전을 던져" : pending === "santong" ? "산통을 흔들어" : "산가지를 나누어"}
              question={question || undefined}
              onReady={beginCast}
            />
          </motion.div>
        ) : null}

        {stage === "coin" || stage === "santong" || stage === "yarrow" ? (
          <motion.div key={`cast-${castKey}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <button onClick={restart} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground">
              <ArrowLeft size={16} /> 방법 다시 고르기
            </button>
            {question ? <p className="mb-4 text-center text-muted">“{question}”</p> : null}
            <div className="mb-5">
              <MethodGuide method={stage} />
            </div>
            {stage === "coin" ? (
              <CoinCasting question={question || undefined} onComplete={complete} />
            ) : stage === "santong" ? (
              <SantongCasting question={question || undefined} onComplete={complete} />
            ) : (
              <YarrowCasting question={question || undefined} onComplete={complete} />
            )}
          </motion.div>
        ) : null}

        {stage === "result" && reading ? (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <ResultView reading={reading} onRestart={restart} />
          </motion.div>
        ) : null}
    </div>
  );
}

function MethodCard({ icon, title, desc, time, onClick }: { icon: React.ReactNode; title: string; desc: string; time: string; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group flex flex-col items-start gap-3 rounded-3xl bg-card p-5 text-left shadow-[0_6px_30px_rgba(31,29,26,0.06)] transition hover:shadow-[0_10px_36px_rgba(31,29,26,0.10)]"
    >
      <span className="rounded-2xl bg-vermilion/10 p-3 text-vermilion transition group-hover:bg-vermilion group-hover:text-card">{icon}</span>
      <span className="text-lg font-bold">{title}</span>
      <span className="text-sm leading-relaxed text-foreground/75">{desc}</span>
      <span className="text-xs text-muted">{time}</span>
    </motion.button>
  );
}
