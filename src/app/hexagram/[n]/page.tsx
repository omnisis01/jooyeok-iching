// 64괘 개별 페이지(검색 유입용, 정적 생성). 괘 하나의 뜻, 세 줄 요약, 운세 6분류 풀이, 여섯 효사를 한 페이지에 모두 펼친다
import type { Metadata } from "next";
import { HEXAGRAMS, hexagramSymbol } from "@/data/hexagrams";
import { getAllLineTexts, lineTitle } from "@/data/lineTexts";
import { summaryOf, MOOD_LABEL } from "@/data/summaries";
import { categoryReading } from "@/data/categoryReadings";
import { CATEGORIES } from "@/lib/categories";
import { LINE_NAMES, trigramsOf } from "@/lib/iching";
import { SITE_URL } from "@/lib/site";
import HexagramFigure from "@/components/HexagramFigure";
import Taegeuk from "@/components/Taegeuk";

export function generateStaticParams() {
  return HEXAGRAMS.map((h) => ({ n: String(h.number) }));
}

function hexOf(n: string) {
  return HEXAGRAMS.find((h) => h.number === Number(n)) ?? HEXAGRAMS[0];
}

export async function generateMetadata({ params }: PageProps<"/hexagram/[n]">): Promise<Metadata> {
  const { n } = await params;
  const hex = hexOf(n);
  const title = `${hex.name} ${hex.hanja} 뜻과 효사, 주역 제${hex.number}괘`;
  const description = `${hex.name}(${hex.hanja})은 ${hex.keyword}. ${hex.summary.slice(0, 80)}`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}hexagram/${hex.number}/` },
    openGraph: { title, description, url: `${SITE_URL}hexagram/${hex.number}/`, siteName: "주역으로 보는 나의 운세", locale: "ko_KR", type: "article" },
  };
}

export default async function HexagramPage({ params }: PageProps<"/hexagram/[n]">) {
  const { n } = await params;
  const hex = hexOf(n);
  const { lower, upper } = trigramsOf(hex);
  const summary = summaryOf(hex.number);
  const lines = getAllLineTexts(hex.number);
  const prev = HEXAGRAMS.find((h) => h.number === (hex.number === 1 ? 64 : hex.number - 1))!;
  const next = HEXAGRAMS.find((h) => h.number === (hex.number === 64 ? 1 : hex.number + 1))!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${hex.name} ${hex.hanja}, 주역 제${hex.number}괘`,
    description: hex.summary,
    inLanguage: "ko",
    author: { "@type": "Organization", name: "주역으로 보는 나의 운세" },
    mainEntityOfPage: `${SITE_URL}hexagram/${hex.number}/`,
  };

  return (
    <div className="app-backdrop min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <nav className="flex items-center justify-between text-sm">
          <a href="../../" className="inline-flex items-center gap-2 text-lg font-bold">
            <Taegeuk size={26} />
            주역으로 보는 나의 운세
          </a>
          <a href="../" className="text-muted underline">64괘 목록</a>
        </nav>

        <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-3 text-gold-soft">
            <HexagramFigure lines={hex.lines} size={120} title={hex.name} />
            <div className="text-5xl text-foreground/70">{hexagramSymbol(hex.number)}</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">주역 64괘 중 제{hex.number}괘</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
              {hex.name} <span className="ml-1 font-normal text-muted">{hex.hanja}</span>
            </h1>
            <p className="mt-2 text-lg text-gold-soft">{hex.keyword}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-card px-3 py-1">위 {upper.symbol} {upper.name} {upper.nature}</span>
              <span className="rounded-full bg-card px-3 py-1">아래 {lower.symbol} {lower.name} {lower.nature}</span>
            </div>
          </div>
        </header>

        <section className="mt-8 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
          <h2 className="text-sm font-bold text-muted">그래서, 한마디로</h2>
          <p className="mt-2 text-xs font-bold text-vermilion">{MOOD_LABEL[summary.mood]}</p>
          <p className="mt-1 text-2xl font-extrabold leading-snug">{summary.lines[0]}</p>
          <p className="mt-2 text-[17px] leading-relaxed text-foreground/85">{summary.lines[1]}</p>
          <p className="mt-1 text-[17px] leading-relaxed text-foreground/85">{summary.lines[2]}</p>
        </section>

        <section className="mt-6 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
          <h2 className="text-sm font-bold text-muted">괘사로 보는 큰 판세</h2>
          <p className="mt-2 leading-relaxed text-foreground/90">{hex.summary}</p>
          <h2 className="mt-6 text-sm font-bold text-muted">오늘의 조언</h2>
          <p className="mt-2 rounded-2xl bg-vermilion/8 p-4 leading-relaxed">{hex.advice}</p>
        </section>

        <section className="mt-6 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
          <h2 className="text-sm font-bold text-muted">운세별로 보면</h2>
          <dl className="mt-3 space-y-4">
            {CATEGORIES.map((c) => (
              <div key={c.key}>
                <dt className="font-bold">{c.label}</dt>
                <dd className="mt-1 leading-relaxed text-foreground/85">{categoryReading(hex.number, c.key)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
          <h2 className="text-sm font-bold text-muted">여섯 효의 효사</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            아래 여섯 줄 가운데 점을 칠 때 움직인 줄(변효)의 글이 지금 내 자리를 알려 줍니다. 맨 아래 초효가 일의 시작, 맨 위 상효가 마무리입니다.
          </p>
          <ol className="mt-4 space-y-3 leading-relaxed">
            {lines.map((lt, i) => ({ lt, i })).reverse().map(({ lt, i }) => (
              <li key={i} className="rounded-2xl bg-background p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-bold text-gold-soft">{lineTitle(hex.lines, i)}</span>
                  <span className="text-xs text-muted">{LINE_NAMES[i]}</span>
                  <span className="font-serif text-gold-soft/90">{lt.hanja}</span>
                </div>
                <p className="mt-1 text-foreground/90">{lt.text}</p>
                <p className="mt-1 text-sm text-foreground/70">조언. {lt.advice}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 rounded-3xl bg-foreground p-6 text-center text-card">
          <p className="text-lg font-bold">내 질문에는 어떤 괘가 나올까요</p>
          <p className="mt-1 text-sm text-card/75">동전, 산통, 산가지로 직접 뽑고 변효까지 풀어 드려요. 하루 3번 무료.</p>
          <a href="../../#divine" className="mt-4 inline-block rounded-full bg-vermilion px-6 py-3 font-bold text-card">나만의 괘와 효 뽑기</a>
        </section>

        <nav className="mt-8 flex items-center justify-between text-sm">
          <a href={`../${prev.number}/`} className="rounded-full bg-card px-4 py-2 font-semibold">제{prev.number}괘 {prev.name}</a>
          <a href={`../${next.number}/`} className="rounded-full bg-card px-4 py-2 font-semibold">제{next.number}괘 {next.name}</a>
        </nav>
        <p className="mt-6 text-center text-xs text-muted">
          <a href="../../" className="underline">앱으로 돌아가기</a>
        </p>
      </div>
    </div>
  );
}
