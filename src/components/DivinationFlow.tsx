// 점치기 전체 흐름: 질문 입력·방법 선택 → 점 뽑기 → 결과
"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Coins, Landmark, Sprout } from "lucide-react";
import type { Reading } from "@/lib/iching";
import CoinCasting from "./CoinCasting";
import SantongCasting from "./SantongCasting";
import ResultView from "./ResultView";
import YarrowCasting from "./YarrowCasting";
import MethodGuide, { type Method } from "./MethodGuide";

type Stage = "setup" | Method | "result";

export default function DivinationFlow() {
  const [stage, setStage] = useState<Stage>("setup");
  const [question, setQuestion] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [castKey, setCastKey] = useState(0);
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
    setCastKey((k) => k + 1);
    setStage(method);
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
      <AnimatePresence mode="wait">
        {stage === "setup" ? (
          <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
            <label className="block">
              <span className="text-sm text-muted">마음속 질문을 적어 보세요 (선택)</span>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={80}
                placeholder="예) 오늘 새 프로젝트를 시작해도 좋을까?"
                className="mt-2 w-full rounded-2xl border border-border bg-card/70 px-5 py-4 text-lg outline-none transition placeholder:text-muted/60 focus:border-gold/70 focus:ring-2 focus:ring-gold/20"
              />
            </label>

            <p className="mt-8 text-sm text-muted">점치는 방법을 고르세요</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <MethodCard
                icon={<Coins size={28} />}
                title="척전법 · 동전 세 개"
                desc="동전 세 개를 여섯 번 던져 아래 효부터 괘를 쌓습니다. 변하는 효가 여러 개 나올 수 있어 풀이가 풍부합니다."
                time="약 1분"
                onClick={() => start("coin")}
              />
              <MethodCard
                icon={<Landmark size={28} />}
                title="산통점 · 산가지 뽑기"
                desc="산통을 흔들어 산가지를 세 번 뽑습니다. 하괘, 상괘, 움직이는 효가 차례로 정해지는 전통 방식입니다."
                time="약 30초"
                onClick={() => start("santong")}
              />
              <MethodCard
                icon={<Sprout size={28} />}
                title="시초점 · 산가지 50개"
                desc="49개를 나누고 4개씩 세어 덜어내는 과정을 18번 거칩니다. 주역 원전에 적힌 가장 오래된 정통 방식입니다."
                time="약 3분 (자동 진행 가능)"
                onClick={() => start("yarrow")}
              />
            </div>
          </motion.div>
        ) : null}

        {stage === "coin" || stage === "santong" || stage === "yarrow" ? (
          <motion.div key={`cast-${castKey}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35 }}>
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
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <ResultView reading={reading} onRestart={restart} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MethodCard({ icon, title, desc, time, onClick }: { icon: React.ReactNode; title: string; desc: string; time: string; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group flex flex-col items-start gap-3 rounded-3xl border border-border bg-card/70 p-6 text-left transition hover:border-gold/60 hover:shadow-[0_0_40px_rgba(201,164,74,0.15)]"
    >
      <span className="rounded-2xl bg-gold/15 p-3 text-gold-soft transition group-hover:bg-gold group-hover:text-ink">{icon}</span>
      <span className="text-lg font-bold">{title}</span>
      <span className="text-sm leading-relaxed text-foreground/75">{desc}</span>
      <span className="text-xs text-muted">{time}</span>
    </motion.button>
  );
}
