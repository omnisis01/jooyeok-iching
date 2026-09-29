// 밝은 테마와 어두운 테마를 바꾸는 버튼. 선택은 이 기기에 기억한다
"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "jooyeok-master-theme";
type Theme = "light" | "dark";

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // 저장 실패는 무시
  }
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // layout의 인라인 스크립트가 먼저 적용해 둔 값을 읽는다
    const t = window.setTimeout(() => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"), 0);
    return () => window.clearTimeout(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground/80 shadow-[0_2px_10px_rgba(31,29,26,0.08)] transition hover:text-foreground ${className}`}
      aria-label={theme === "dark" ? "밝은 화면으로" : "어두운 화면으로"}
      title={theme === "dark" ? "밝은 화면으로" : "어두운 화면으로"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
