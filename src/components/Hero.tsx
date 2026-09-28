// 첫 화면: 회전하는 64괘 방원도와 제목, 점치기로 이동하는 버튼
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { Hexagram } from "@/data/hexagrams";
import HexagramWheel from "./HexagramWheel";
import HexagramDetail from "./HexagramDetail";

export default function Hero() {
  const [selected, setSelected] = useState<Hexagram | null>(null);

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-2 lg:pb-24 lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="order-2 lg:order-1">
          <p className="text-sm tracking-[0.3em] text-gold-soft">周易 · 六十四卦</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
            오늘의 괘를
            <br />
            뽑아 보세요
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-foreground/80">
            삼천 년 동안 읽혀 온 변화의 책, 주역. 동전을 던지고 산통을 흔들어 오늘의 괘를 뽑고,
            어렵지 않은 말로 풀어낸 해설과 함께 하루를 어떻게 보내면 좋을지 힌트를 얻어 보세요.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#divine"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 font-semibold text-ink shadow-lg shadow-gold/25 transition hover:bg-gold-soft"
            >
              <Sparkles size={18} /> 지금 점치기
            </a>
            <a
              href="#hexagrams"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-foreground/80 transition hover:border-gold/60 hover:text-foreground"
            >
              64괘 둘러보기 <ChevronDown size={16} />
            </a>
          </div>
          <p className="mt-6 text-xs text-muted">원도 위의 괘를 누르면 바로 뜻을 볼 수 있습니다.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="order-1 flex justify-center lg:order-2"
        >
          <HexagramWheel size={520} onSelect={setSelected} className="h-auto w-full max-w-[520px]" />
        </motion.div>
      </div>
      <HexagramDetail hex={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
