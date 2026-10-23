// 설정 시트: 상단의 톱니를 누르면 아래에서 올라온다. 계정(로그인, 알림, 동기화), 글씨 크기, 화면, 알아보기, 문의, 약관을 한곳에
// 계정 카드는 로그인 상태에서 기록을 올리는 일을 하므로 시트가 닫혀 있어도 항상 떠 있게(숨김만) 둔다
"use client";

import { useEffect, useState } from "react";
import { BookOpen, Mail, X } from "lucide-react";
import AccountCard from "./AccountCard";
import TextSizeToggle from "./TextSizeToggle";
import ThemeToggle from "./ThemeToggle";
import type { Tab } from "./AppShell";

export const OPEN_SETTINGS = "open-settings";
export function openSettings() {
  window.dispatchEvent(new Event(OPEN_SETTINGS));
}

export default function SettingsSheet({ go }: { go: (t: Tab) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setOpen(true);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener(OPEN_SETTINGS, on);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener(OPEN_SETTINGS, on);
      window.removeEventListener("keydown", esc);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const jump = (t: Tab, id?: string) => {
    setOpen(false);
    go(t);
    if (id) window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 350);
  };

  return (
    <div className={open ? "fixed inset-0 z-50" : "hidden"} aria-hidden={!open}>
      <button aria-label="닫기" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/45" />
      <div role="dialog" aria-modal="true" aria-label="설정" className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full max-w-[520px] overflow-y-auto rounded-t-3xl bg-background px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between px-1">
          <p className="text-lg font-extrabold">설정</p>
          <button onClick={() => setOpen(false)} className="rounded-full bg-card p-2 text-muted" aria-label="닫기">
            <X size={18} />
          </button>
        </div>
        <div className="mt-3 space-y-3">
          <AccountCard />
          <section className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
            <Row label="글씨 크기">
              <TextSizeToggle />
            </Row>
            <Row label="화면">
              <ThemeToggle />
            </Row>
          </section>
          <section className="rounded-3xl bg-card p-2 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
            <Link icon={<BookOpen size={16} />} label="주역이란, 괘와 효, 점치는 방법" onClick={() => jump("about")} />
            <Link icon={<Mail size={16} />} label="문의하기" onClick={() => jump("about", "inquiry")} />
          </section>
          <p className="px-2 pb-1 text-center text-xs text-muted">
            <a href="terms/" className="underline">이용약관</a> <span className="mx-1">|</span> <a href="privacy/" className="underline">개인정보처리방침</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Link({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition hover:bg-background">
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className="text-muted">›</span>
    </button>
  );
}
