// 64괘 전체를 격자로 보여주고 클릭 시 상세 모달을 여는 갤러리
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { HEXAGRAMS, type Hexagram } from "@/data/hexagrams";
import HexagramFigure from "./HexagramFigure";
import HexagramDetail from "./HexagramDetail";

export default function HexagramGallery() {
  const [selected, setSelected] = useState<Hexagram | null>(null);

  return (
    <>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3">
        {HEXAGRAMS.map((hex, i) => (
          <motion.button
            key={hex.number}
            onClick={() => setSelected(hex)}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: (i % 8) * 0.03 }}
            whileHover={{ y: -3 }}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border bg-card/70 p-3 text-gold-soft/80 transition hover:border-gold/60 hover:bg-card hover:text-gold-soft hover:shadow-[0_0_24px_rgba(201,164,74,0.18)]"
          >
            <HexagramFigure lines={hex.lines} size={40} title={hex.name} />
            <span className="text-[11px] text-muted group-hover:text-foreground sm:text-xs">
              <span className="mr-1 tabular-nums opacity-60">{hex.number}</span>
              {hex.name}
            </span>
          </motion.button>
        ))}
      </div>
      <HexagramDetail hex={selected} onClose={() => setSelected(null)} />
    </>
  );
}
