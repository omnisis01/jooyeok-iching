"use client";

import { useEffect, useState } from "react";
import { readingFromValues, type LineValue } from "@/lib/iching";
import type { AiReading } from "@/lib/aiReading";
import { renderAiCard } from "@/lib/aiCard";

// 천수송 초효가 변해 천택리로(대표님 첫 AI 풀이와 같은 괘)
const VALUES: LineValue[] = [6, 7, 8, 7, 7, 7];
const SAMPLE: AiReading = {
  answer: "이번 주 코스피 흐름은 크게 움직이기보다 조용히 지켜보는 쪽이 나아요.",
  change: "지금은 돈 문제로 말이 오가지만 앞으로는 다툼을 접고 준비와 정보 모으기로 바뀌어요. 큰 수익을 노리기보다 손해를 줄이는 쪽으로 흐름이 옮겨 가요.",
  situation: "",
  quote: "不永所事 小有言 終吉",
  position: "이 말은 일을 오래 끌지 않으면 작은 말썽은 있어도 끝은 좋다는 뜻이에요. 빨리 결론내리기보다 한 발 물러서서 상황을 살피는 것이 좋아요.",
  flow: "",
  actions: ["매수나 매도를 서두르지 말고 이번 주는 관찰만 하세요.", "손실 한도를 미리 정해 두고 그 선을 넘지 않도록 하세요.", "감정이 흔들릴 때는 잠시 자리를 떠나 마음을 가라앉히세요."],
  choices: { go: "", wait: "" },
  timingIndex: 0,
  caution: "뉴스나 주변 말에 휩쓸려 급하게 사고파는 것은 특히 피하세요.",
};

export default function AiCardLab() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const r = { ...readingFromValues(VALUES, "이번주 코스피 투자 흐름은?"), category: "wealth" as const, castAt: "2026-10-20T10:21:00.000Z" };
    let u: string | null = null;
    renderAiCard(r, SAMPLE, "지금은 힘이 약해 바로 이루어지기보다, 기운을 보태 주는 양력 2월, 3월 무렵에 진전이 있어요. 가까운 날로는 10월 22일이 좋아요.").then((b) => {
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, []);
  // eslint-disable-next-line @next/next/no-img-element
  return <main className="mx-auto max-w-md p-4">{url ? <img src={url} alt="AI 풀이 이미지 시안" className="w-full" /> : <p>그리는 중…</p>}</main>;
}
