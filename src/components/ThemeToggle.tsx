// 다크 모드와 라이트 모드를 고르는 스위치. 선택은 이 기기에 기억한다
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "jooyeok-master-theme";
export type Theme = "light" | "dark";

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // 저장 실패는 무시
  }
  window.dispatchEvent(new Event("theme-changed"));
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    const t = window.setTimeout(sync, 0);
    window.addEventListener("theme-changed", sync);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("theme-changed", sync);
    };
  }, []);
  return [theme, (t: Theme) => apply(t)];
}

/** 상단 바용 작은 스위치: 달과 해 아이콘에 글자를 함께 보여준다 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useTheme();
  return (
    <div className={`inline-flex rounded-full bg-card p-0.5 shadow-[0_2px_10px_rgba(31,29,26,0.08)] ${className}`} role="group" aria-label="화면 모드">
      <button
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${theme === "dark" ? "bg-foreground text-card" : "text-foreground/70 hover:text-foreground"}`}
      >
        <Moon size={13} /> 다크
      </button>
      <button
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${theme === "light" ? "bg-foreground text-card" : "text-foreground/70 hover:text-foreground"}`}
      >
        <Sun size={13} /> 라이트
      </button>
    </div>
  );
}

/** 설정 화면용 큰 스위치 */
export function ThemeSetting() {
  const [theme, setTheme] = useTheme();
  return (
    <section className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <p className="font-bold">화면 모드</p>
      <p className="mt-1 text-sm text-muted">기본은 다크 모드예요. 밝은 곳에서는 라이트 모드가 읽기 편해요.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => setTheme("dark")}
          aria-pressed={theme === "dark"}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition ${theme === "dark" ? "bg-foreground text-card" : "bg-background text-foreground hover:bg-border/60"}`}
        >
          <Moon size={16} /> 다크 모드
        </button>
        <button
          onClick={() => setTheme("light")}
          aria-pressed={theme === "light"}
          className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition ${theme === "light" ? "bg-foreground text-card" : "bg-background text-foreground hover:bg-border/60"}`}
        >
          <Sun size={16} /> 라이트 모드
        </button>
      </div>
    </section>
  );
}
