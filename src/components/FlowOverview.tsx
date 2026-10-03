// 결과 맨 위에 괘 → 움직이는 효 → 지괘를 한 줄로 보여주는 흐름 요약
"use client";

import { ChevronRight } from "lucide-react";
import type { Hexagram } from "@/data/hexagrams";
import { LINE_NAMES } from "@/lib/iching";
import { lineTitle } from "@/data/lineTexts";
import HexagramFigure from "./HexagramFigure";

type Props = {
  primary: Hexagram;
  changingLines: number[];
  resulting: Hexagram | null;
};

export default function FlowOverview({ primary, changingLines, resulting }: Props) {
  const focus = changingLines.length ? Math.max(...changingLines) : null;
  return (
    <section className="rounded-3xl bg-card p-4 shadow-[0_6px_30px_rgba(31,29,26,0.06)] sm:p-5">
      <p className="flex flex-wrap items-center justify-center gap-1.5 text-center text-base font-extrabold">
        <span>{primary.name}</span>
        {focus !== null ? <span className="text-vermilion">{lineTitle(primary.lines, focus)}</span> : null}
        {resulting ? (
          <>
            <ChevronRight size={16} className="text-muted" />
            <span className="text-jade">{resulting.name}</span>
          </>
        ) : null}
      </p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1">
        <Step label="지금, 괘" name={primary.name} sub={primary.keyword}>
          <div className="text-gold">
            <HexagramFigure lines={primary.lines} size={56} title={primary.name} />
          </div>
        </Step>
        <ChevronRight size={18} className="text-muted" />
        <Step
          label="움직이는 효"
          name={focus !== null ? `${lineTitle(primary.lines, focus)}${changingLines.length > 1 ? ` 외 ${changingLines.length - 1}` : ""}` : "없음"}
          sub={focus !== null ? LINE_NAMES[focus] + "이 변해요" : "그대로 머물러요"}
        >
          <div className="text-gold">
            <HexagramFigure lines={primary.lines} changing={changingLines} size={56} title="움직이는 효" />
          </div>
        </Step>
        <ChevronRight size={18} className="text-muted" />
        <Step label="앞으로, 지괘" name={resulting ? resulting.name : primary.name} sub={resulting ? resulting.keyword : "지금 흐름 그대로 가요"}>
          <div className="text-jade">
            <HexagramFigure lines={(resulting ?? primary).lines} size={56} title={(resulting ?? primary).name} />
          </div>
        </Step>
      </div>
    </section>
  );
}

function Step({ label, name, sub, children }: { label: string; name: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center">
      <span className="text-[11px] font-bold text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
      <span className="mt-1.5 truncate text-base font-extrabold">{name}</span>
      <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{sub}</span>
    </div>
  );
}
