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
      <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
        {HEXAGRAMS.map((hex, i) => (
          <motion.button
            key={hex.number}
            onClick={() => setSelected(hex)}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.35, delay: (i % 8) * 0.03 }}
            whileHover={{ y: -3 }}
            className="group flex flex-col items-center gap-2 rounded-2xl bg-card p-3 text-foreground/80 shadow-[0_4px_16px_rgba(31,29,26,0.05)] transition hover:text-vermilion hover:shadow-[0_8px_24px_rgba(31,29,26,0.10)]"
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
