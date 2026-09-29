// 알아보기 화면: 주역과 음양, 8괘, 점치는 방법 설명
import Taegeuk from "./Taegeuk";
import MethodGuide from "./MethodGuide";
import { ThemeSetting } from "./ThemeToggle";
import { TRIGRAMS } from "@/lib/iching";

export default function AboutScreen() {
  return (
    <div className="space-y-4">
      <ThemeSetting />

      <section className="rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <div className="flex items-center gap-4">
          <Taegeuk size={72} className="animate-spin-slow" />
          <div>
            <h2 className="text-xl font-bold">변화를 읽는 책, 주역</h2>
            <p className="mt-1 text-sm text-muted">삼천 년 동안 읽혀 온 동양의 고전</p>
          </div>
        </div>
        <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-foreground/85">
          <p>주역은 세상의 모든 변화를 음과 양, 두 가지 선의 조합으로 설명합니다. 음과 양은 서로 반대이면서 서로를 낳는 기운입니다. 밤과 낮, 쉼과 움직임처럼 한쪽만으로는 세상이 돌아가지 않습니다.</p>
          <p>선 세 개를 쌓으면 8괘가 되고, 8괘를 위아래로 겹치면 64괘가 됩니다. 괘 하나는 상황을, 여섯 효는 그 상황 안에서의 위치와 단계를 뜻합니다. 점을 쳐서 나온 괘는 지금 내가 어떤 국면에 서 있는지 비추어 주는 거울입니다.</p>
        </div>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <h3 className="font-bold">8괘</h3>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {TRIGRAMS.map((t) => (
            <div key={t.number} className="rounded-2xl bg-background p-3 text-center">
              <div className="text-2xl">{t.symbol}</div>
              <div className="mt-1 text-sm font-semibold">
                {t.name} <span className="text-muted">{t.hanja}</span>
              </div>
              <div className="text-xs text-muted">{t.nature}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="px-1 font-bold">점치는 방법</h3>
        <MethodGuide method="coin" />
        <MethodGuide method="santong" />
        <MethodGuide method="yarrow" />
        <MethodGuide method="yukhyo" />
      </section>

      <p className="px-2 pb-2 text-center text-xs leading-relaxed text-muted">
        이 앱의 해설은 통행본 주역을 바탕으로 쉽게 풀어 쓴 것입니다. 삶의 중요한 선택은 언제나 여러분의 몫입니다.
        <br />
        <a href="terms/" className="underline">이용약관</a> <span className="mx-1">|</span> <a href="privacy/" className="underline">개인정보처리방침</a>
      </p>
    </div>
  );
}
