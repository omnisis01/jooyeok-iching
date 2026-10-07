// 모바일 앱처럼 보이는 화면 틀: 상단 바, 화면 전환, 하단 탭
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Grid3x3, Home, Sparkles } from "lucide-react";
import Taegeuk from "./Taegeuk";
import ThemeToggle from "./ThemeToggle";
import { useToday } from "@/lib/useToday";
import { syncClock } from "@/lib/clock";
import { attachServerQuota, refreshServerQuota } from "@/lib/quota";
import { getSession, onAuthChange } from "@/lib/cloudSync";
import HomeScreen from "./HomeScreen";
import DivinationFlow from "./DivinationFlow";
import HexagramGallery from "./HexagramGallery";
import AboutScreen from "./AboutScreen";
import GuaHyoGuide from "./GuaHyoGuide";
import { setTrackUser, track } from "@/lib/track";

// 육효는 메인 탭에서 빼고 결과 화면의 유료 "육효로 더 깊이 들여다보기"로 옮겼다
export type Tab = "home" | "divine" | "hexagrams" | "about";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "home", label: "홈", icon: <Home size={22} /> },
  { key: "divine", label: "점보기", icon: <Sparkles size={22} /> },
  { key: "hexagrams", label: "64괘", icon: <Grid3x3 size={22} /> },
  { key: "about", label: "알아보기", icon: <BookOpen size={22} /> },
];

const TITLES: Record<Tab, string> = {
  home: "나만의 정통주역운세",
  divine: "점보기",
  hexagrams: "64괘",
  about: "주역 알아보기",
};

function tabFromHash(): Tab {
  if (typeof window === "undefined") return "home";
  const raw = window.location.hash.replace("#", "");
  // 예전 육효 탭 주소(#yukhyo)는 점보기로 보낸다
  const h = (raw === "yukhyo" ? "divine" : raw) as Tab;
  return TABS.some((t) => t.key === h) ? h : "home";
}

export default function AppShell() {
  const [tab, setTab] = useState<Tab>("home");

  // 기기 시계가 틀려도 "오늘"이 한국 시간으로 맞도록 서버 시각과 한 번 맞춘다
  useEffect(() => {
    syncClock();
  }, []);

  // 로그인했으면 무료 횟수를 서버에서 센다. 다른 기기에서 쓴 횟수도 반영된다
  useEffect(() => {
    let alive = true;
    getSession().then((s) => {
      if (!alive) return;
      attachServerQuota(s?.user.id ?? null);
      setTrackUser(s?.user.id ?? null);
      const from = new URLSearchParams(window.location.search).get("from");
      track("app_open", { from: from ?? "direct", logged_in: Boolean(s) }, { oncePerSession: true });
    });
    const off = onAuthChange((s) => {
      const was = Boolean(s);
      attachServerQuota(s?.user.id ?? null);
      setTrackUser(s?.user.id ?? null);
      if (was) track("login_done", {}, { oncePerSession: true });
    });
    const onVisible = () => document.visibilityState === "visible" && refreshServerQuota();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      off();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const sync = () => setTab(tabFromHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const go = (t: Tab) => {
    window.location.hash = t;
    window.scrollTo({ top: 0 });
  };

  const { today } = useToday();
  const dateLabel = today ? new Date(today + "T12:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" }) : "";

  return (
    <div className="app-backdrop min-h-screen lg:pl-60">
      {/* 넓은 화면(가로 태블릿, 데스크톱): 왼쪽 메뉴 + 넓은 본문. 좁은 화면: 한 열 + 하단 탭 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card/90 px-4 py-6 backdrop-blur lg:flex">
        <button onClick={() => go("home")} className="flex items-center gap-2 px-2 text-lg font-bold">
          <Taegeuk size={28} />
          나만의 정통주역운세
        </button>
        <p className="mt-1 px-2 text-xs text-vermilion">원전 그대로, 쉬운 말로</p>
        <ul className="mt-8 space-y-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <li key={t.key}>
                <button
                  onClick={() => go(t.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-foreground text-card" : "text-foreground/80 hover:bg-background"}`}
                  aria-current={active ? "page" : undefined}
                >
                  {t.icon}
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto flex items-center justify-between px-2">
          <p className="text-xs text-muted">{dateLabel}</p>
          <ThemeToggle />
        </div>
      </aside>

      <div className="mx-auto min-h-screen w-full max-w-[520px] bg-background sm:shadow-[0_0_60px_rgba(31,29,26,0.08)] lg:max-w-none lg:bg-transparent lg:shadow-none">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-background/85 px-5 pb-3 pt-4 backdrop-blur lg:hidden">
          <button onClick={() => go("home")} className="flex items-center gap-2 text-lg font-bold">
            <Taegeuk size={26} />
            주역운세
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">{dateLabel}</span>
            <ThemeToggle />
          </div>
        </header>

        <main className="px-4 pb-40 pt-2 lg:mx-auto lg:max-w-4xl lg:px-8 lg:pb-12 lg:pt-8">
          <h1 className="mb-4 hidden text-2xl font-extrabold lg:block">{TITLES[tab]}</h1>
          {/* 탭 전환은 퇴장 애니메이션 없이 바로 바꾼다. 화면이 가려진 상태에서도 멈추지 않도록 */}
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
              {tab === "home" ? <HomeScreen go={go} /> : null}
              {tab === "divine" ? (
                <section id="divine" className="scroll-mt-24">
                  <DivinationFlow />
                </section>
              ) : null}
              {tab === "hexagrams" ? (
                <section id="hexagrams">
                  <p className="mb-4 text-sm leading-relaxed text-muted">줄 하나가 효, 여섯 줄을 쌓은 그림 하나가 괘예요. 64가지 괘를 누르면 뜻과 조언, 여섯 효의 효사를 볼 수 있어요. <a href="hexagram/" className="underline">글로 된 64괘 목록</a>도 있어요.</p>
                  <HexagramGallery />
                </section>
              ) : null}
              {tab === "about" ? <AboutScreen /> : null}
            </motion.div>
        </main>

        <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[520px] -translate-x-1/2 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <ul className="grid grid-cols-5">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <li key={t.key}>
                  <button
                    onClick={() => go(t.key)}
                    className={`flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${active ? "text-vermilion" : "text-muted hover:text-foreground"}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <GuaHyoGuide />
    </div>
  );
}
