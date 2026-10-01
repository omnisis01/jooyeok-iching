// 홈의 계정 카드: 이메일 로그인, 기록 동기화, 오늘의 괘 알림 설정
"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Bell, BellOff, Cloud, LogOut, Mail, RefreshCw } from "lucide-react";
import { cloudEnabled } from "@/lib/supabase";
import { getSession, onAuthChange, pushOne, sendMagicLink, signOut, syncAll } from "@/lib/cloudSync";
import { currentSubscription, pushEnabled, pushSupported, subscribePush, unsubscribePush } from "@/lib/push";
import { loadHistory } from "@/lib/history";

/** 아이폰 사파리에서 홈 화면 앱이 아닌 탭으로 열었는지 */
function iosSafariTab(): boolean {
  if (typeof navigator === "undefined") return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export default function AccountCard() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!cloudEnabled) return;
    let cancelled = false;
    getSession().then((s) => {
      if (!cancelled) setSession(s);
    });
    const off = onAuthChange((s) => setSession(s));
    if (pushSupported()) currentSubscription().then((sub) => !cancelled && setSubscribed(Boolean(sub)));
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  // 로그인 상태에서 새 기록이 생기면 바로 올린다
  useEffect(() => {
    if (!cloudEnabled || !session) return;
    const onChange = () => {
      const latest = loadHistory()[0];
      if (latest) pushOne(latest).catch(() => {});
    };
    window.addEventListener("history-changed", onChange);
    syncAll().catch(() => {});
    return () => window.removeEventListener("history-changed", onChange);
  }, [session]);

  if (!cloudEnabled) return null;

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setStatus(null);
    try {
      setStatus(await fn());
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "문제가 생겼습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="account" className="scroll-mt-24 rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <div className="flex items-center gap-2">
        <Cloud size={18} className="text-vermilion" />
        <p className="font-bold">{session ? "내 계정" : "기록을 안전하게 보관하기"}</p>
      </div>

      {session ? (
        <>
          <p className="mt-1 text-sm text-muted">{session.user.email} 로 로그인했어요. 어느 기기에서 열어도 점 기록이 이어져요.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const r = await syncAll();
                  return `동기화 완료. 받은 기록 ${r.pulled}개`;
                })
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              <RefreshCw size={14} /> 지금 동기화
            </button>
            {pushEnabled && !pushSupported() && iosSafariTab() ? (
              <p className="w-full rounded-2xl bg-background px-4 py-3 text-xs leading-relaxed text-muted">
                아이폰에서 아침 알림을 받으려면 사파리 공유 버튼에서 <b className="text-foreground">홈 화면에 추가</b>를 누른 뒤, 홈 화면의 아이콘으로 열어 주세요. 그 안에서 알림을 켤 수 있어요.
              </p>
            ) : null}
            {pushEnabled && pushSupported() ? (
              subscribed ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await unsubscribePush();
                      setSubscribed(false);
                      return "알림을 껐어요";
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  <BellOff size={14} /> 아침 알림 끄기
                </button>
              ) : (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await subscribePush(session.user.id);
                      setSubscribed(true);
                      return "매일 아침 7시 30분에 뽑을 이유를 담아 보내 드릴게요";
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-vermilion px-4 py-2 text-sm font-semibold text-card disabled:opacity-50"
                >
                  <Bell size={14} /> 아침 알림 받기
                </button>
              )
            ) : null}
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await signOut();
                  return "로그아웃했어요";
                })
              }
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted hover:text-foreground disabled:opacity-50"
            >
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">이메일만 넣으면 비밀번호 없이 로그인 링크를 보내 드려요. 로그인하면 무료 점이 하루 1번에서 3번으로 늘고, 기록이 여러 기기에서 이어집니다.</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.includes("@")) {
                setStatus("이메일 주소를 확인해 주세요");
                return;
              }
              run(async () => {
                await sendMagicLink(email.trim());
                return "로그인 링크를 보냈어요. 메일함을 확인해 주세요";
              });
            }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              className="min-w-0 flex-1 rounded-full bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-vermilion/30"
            />
            <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-card disabled:opacity-50">
              <Mail size={14} /> 링크 받기
            </button>
          </form>
        </>
      )}
      {status ? <p className="mt-3 text-xs text-vermilion">{status}</p> : null}
    </section>
  );
}
