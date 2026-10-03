// 괘와 효가 무엇이고 어떻게 다른지 그림과 함께 짧게 설명하는 카드
"use client";

import { useState } from "react";
import { openGuaHyoGuide } from "./GuaHyoGuide";
import { ChevronDown } from "lucide-react";

const LINE_LABELS = ["상효", "오효", "사효", "삼효", "이효", "초효"];

/** 중천건 대신 눈에 잘 띄는 예시로 화뢰서합(100101)을 그린다 */
const EXAMPLE = "100101";

function Diagram() {
  const w = 340;
  const lineH = 14;
  const gap = 12;
  const top = 18;
  const left = 136;
  const width = 120;
  const half = (width - width * 0.2) / 2;
  return (
    <svg viewBox={`0 0 ${w} 190`} className="mx-auto h-auto w-full max-w-[340px]" role="img" aria-label="여섯 효를 쌓아 만든 괘 하나의 그림">
      {LINE_LABELS.map((label, row) => {
        const i = 5 - row;
        const y = top + row * (lineH + gap);
        const yang = EXAMPLE[i] === "1";
        const isMoving = i === 1;
        const fill = isMoving ? "var(--vermilion)" : "var(--gold)";
        return (
          <g key={label}>
            <text x={left - 12} y={y + lineH - 2} textAnchor="end" fontSize="12" fill="var(--muted)">
              {label}
            </text>
            {yang ? (
              <rect x={left} y={y} width={width} height={lineH} rx={3} fill={fill} />
            ) : (
              <>
                <rect x={left} y={y} width={half} height={lineH} rx={3} fill={fill} />
                <rect x={left + width - half} y={y} width={half} height={lineH} rx={3} fill={fill} />
              </>
            )}
            <text x={left + width + 12} y={y + lineH - 2} fontSize="11" fill={isMoving ? "var(--vermilion)" : "var(--muted)"}>
              {isMoving ? "움직이는 효" : yang ? "양" : "음"}
            </text>
          </g>
        );
      })}
      <path d={`M ${left - 60} ${top - 6} v ${3 * (lineH + gap) - gap + 12} `} stroke="var(--border)" strokeWidth="1" fill="none" />
      <path d={`M ${left - 60} ${top + 3 * (lineH + gap) - 6} v ${3 * (lineH + gap) - gap + 12}`} stroke="var(--border)" strokeWidth="1" fill="none" />
      <text x={left - 66} y={top + 1.5 * (lineH + gap) - 3} textAnchor="end" fontSize="11" fill="var(--muted)">
        위 세 줄
      </text>
      <text x={left - 66} y={top + 4.5 * (lineH + gap) - 3} textAnchor="end" fontSize="11" fill="var(--muted)">
        아래 세 줄
      </text>
      <text x={w / 2} y={182} textAnchor="middle" fontSize="12" fill="var(--foreground)">
        여섯 줄이 모여 괘 하나. 예) 화뢰서합
      </text>
    </svg>
  );
}

export function GuaHyoBody() {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-foreground/85">
      <Diagram />
      <p>
        <b className="text-foreground">효(爻)</b>는 줄 하나예요. 꽉 찬 줄은 양, 가운데가 빈 줄은 음. 아래부터 초효, 이효, 삼효, 사효, 오효, 상효라 부르고, 아래가 일의 시작, 위가 마무리 단계를 뜻합니다.
      </p>
      <p>
        <b className="text-foreground">괘(卦)</b>는 그 줄 여섯 개를 쌓은 그림 하나예요. 점을 칠 때는 줄을 한 번에 하나씩 여섯 번 뽑아 아래부터 쌓습니다. 위 세 줄과 아래 세 줄의 조합으로 64가지가 있고, 하나하나가 하나의 상황을 뜻합니다.
      </p>
      <p>
        그래서 <b className="text-foreground">괘사</b>는 괘 전체에 붙은 글, 곧 큰 판세이고, <b className="text-foreground">효사</b>는 줄 하나하나에 붙은 글, 곧 그 단계에서의 조언입니다. 점을 치면 괘로 지금 상황을 보고, 그중 움직이는 효(빨간 줄)로 지금 내 자리를 봅니다.
      </p>
      <p>
        <b className="text-foreground">한 질문에 한 번만</b> 뽑는 것이 주역의 오랜 원칙이에요. 처음 뽑은 답이 가장 정확하고, 같은 질문을 두 번 세 번 다시 뽑으면 효과가 없다고 몽괘 괘사가 가르칩니다. 마음을 모아 한 번 묻고 그 답을 곰곰이 새기세요.
      </p>
    </div>
  );
}

/** 접었다 펼치는 형태 */
export default function GuaHyoExplainer({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-3xl bg-card shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left font-bold" aria-expanded={open}>
        괘와 효는 무엇이 다른가요
        <ChevronDown size={18} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="px-5 pb-5">
          <GuaHyoBody />
          <button onClick={openGuaHyoGuide} className="mt-4 w-full rounded-full bg-background py-3 text-sm font-bold">
            그림으로 차근차근 보기
          </button>
        </div>
      ) : null}
    </section>
  );
}
