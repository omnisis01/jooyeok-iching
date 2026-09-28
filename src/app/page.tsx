// 메인 페이지: 히어로(방원도) → 점치기 → 64괘 갤러리 → 주역 소개
import DivinationFlow from "@/components/DivinationFlow";
import Hero from "@/components/Hero";
import HexagramGallery from "@/components/HexagramGallery";
import Taegeuk from "@/components/Taegeuk";
import { TRIGRAMS } from "@/lib/iching";

export default function Home() {
  return (
    <main className="flex-1">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
          <a href="#" className="flex items-center gap-2.5 font-bold tracking-tight">
            <Taegeuk size={26} />
            오늘의 괘
          </a>
          <nav className="flex gap-5 text-sm text-foreground/70">
            <a href="#divine" className="transition hover:text-foreground">점치기</a>
            <a href="#hexagrams" className="transition hover:text-foreground">64괘</a>
            <a href="#about" className="hidden transition hover:text-foreground sm:block">주역이란</a>
          </nav>
        </div>
      </header>

      <Hero />

      <section id="divine" className="scroll-mt-20 border-t border-border/60">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:py-24">
          <SectionTitle eyebrow="占" title="점치기" desc="마음을 가라앉히고 질문을 떠올린 뒤, 마음에 드는 방법으로 괘를 뽑아 보세요." />
          <div className="mt-10">
            <DivinationFlow />
          </div>
        </div>
      </section>

      <section id="hexagrams" className="scroll-mt-20 border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <SectionTitle eyebrow="卦" title="64괘 한눈에 보기" desc="여섯 개의 선(효)으로 이루어진 64가지 상황의 그림입니다. 괘를 누르면 뜻과 조언을 볼 수 있습니다." />
          <div className="mt-10">
            <HexagramGallery />
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-20 border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <SectionTitle eyebrow="易" title="주역, 변화를 읽는 책" desc="주역은 세상 모든 변화를 음(- -)과 양(—) 두 가지 선의 조합으로 설명합니다." />
          <div className="mt-10 grid gap-8 lg:grid-cols-[auto_1fr]">
            <div className="flex justify-center">
              <Taegeuk size={180} className="animate-spin-slow drop-shadow-[0_0_30px_rgba(201,164,74,0.25)]" />
            </div>
            <div className="space-y-4 leading-relaxed text-foreground/85">
              <p>
                <b className="text-gold-soft">음과 양</b>은 서로 반대이면서 서로를 낳는 두 기운입니다. 밤과 낮, 쉼과 움직임처럼 어느 한쪽만으로는 세상이
                돌아가지 않습니다. 태극 문양은 이 두 기운이 끊임없이 돌며 자리를 바꾸는 모습을 그린 것입니다.
              </p>
              <p>
                선 세 개를 쌓으면 <b className="text-gold-soft">8괘</b>가 되고, 8괘를 위아래로 겹치면 <b className="text-gold-soft">64괘</b>가 됩니다.
                각 괘는 하나의 상황을, 여섯 효는 그 상황 안에서의 위치와 단계를 뜻합니다. 점을 쳐서 나온 괘는 지금 내가 어떤 국면에 서 있는지를
                비추어 주는 거울입니다.
              </p>
              <div className="grid grid-cols-4 gap-2 pt-2 sm:grid-cols-8">
                {TRIGRAMS.map((t) => (
                  <div key={t.number} className="rounded-2xl border border-border bg-card/60 p-3 text-center">
                    <div className="text-3xl text-paper/90">{t.symbol}</div>
                    <div className="mt-1 text-sm font-semibold">
                      {t.name} <span className="text-muted">{t.hanja}</span>
                    </div>
                    <div className="text-xs text-muted">{t.nature}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted">
                척전법은 동전 세 개를 여섯 번 던져 괘를 정하는 가장 널리 쓰이는 방법이고, 산통점은 산가지가 든 통을 흔들어 뽑는 우리 전통 방식입니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 py-10 text-center text-xs text-muted sm:px-8">
          <p>오늘의 괘 · 주역 64괘 점보기</p>
          <p>이 앱의 해설은 참고용이며, 삶의 중요한 선택은 언제나 여러분의 몫입니다.</p>
        </div>
      </footer>
    </main>
  );
}

function SectionTitle({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-3xl text-gold/70">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-3 leading-relaxed text-foreground/75">{desc}</p>
    </div>
  );
}
