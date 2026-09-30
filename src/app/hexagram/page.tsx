// 64괘 목록 페이지(검색 유입용). 각 괘 페이지로 이어진다
import type { Metadata } from "next";
import { HEXAGRAMS, hexagramSymbol } from "@/data/hexagrams";
import { SITE_URL } from "@/lib/site";
import Taegeuk from "@/components/Taegeuk";

export const metadata: Metadata = {
  title: "주역 64괘 뜻과 효사 한눈에 보기",
  description: "주역 64괘를 순서대로. 괘마다 뜻, 세 줄 요약, 운세별 풀이, 여섯 효의 효사를 쉬운 말로 읽을 수 있어요.",
  alternates: { canonical: `${SITE_URL}hexagram/` },
};

export default function HexagramIndex() {
  return (
    <div className="app-backdrop min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <a href="../" className="inline-flex items-center gap-2 text-lg font-bold">
          <Taegeuk size={26} />
          나만의 정통주역운세
        </a>
        <h1 className="mt-6 text-3xl font-extrabold">주역 64괘</h1>
        <p className="mt-2 leading-relaxed text-foreground/80">
          줄 하나가 효, 여섯 줄을 쌓은 그림 하나가 괘예요. 64가지 괘마다 뜻과 조언, 운세별 풀이, 여섯 효의 효사를 읽을 수 있어요.
        </p>
        <ol className="mt-6 grid gap-2 sm:grid-cols-2">
          {HEXAGRAMS.map((h) => (
            <li key={h.number}>
              <a href={`${h.number}/`} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-[0_4px_16px_rgba(31,29,26,0.05)] transition hover:bg-background">
                <span className="w-8 text-2xl text-foreground/70">{hexagramSymbol(h.number)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    <span className="mr-1.5 text-xs text-muted">{h.number}</span>
                    {h.name} <span className="font-normal text-muted">{h.hanja}</span>
                  </span>
                  <span className="block truncate text-sm text-foreground/70">{h.keyword}</span>
                </span>
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-center text-xs text-muted">
          <a href="../" className="underline">앱으로 돌아가기</a>
        </p>
      </div>
    </div>
  );
}
