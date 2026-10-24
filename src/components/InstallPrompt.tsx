// 결과를 본 뒤 한 번 권하는 카드: 앱 스토어로 안내(구글 플레이, 앱스토어)와 아침 괘 알림
// 스토어에 올라가기 전에는 "출시 준비 중"으로 보이고, 그동안은 홈 화면에 추가 방법을 작게 안내한다
// 이미 앱으로 열었거나, "나중에"를 눌렀으면 보이지 않는다. 최대 3번까지만
"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Play, Share, Smartphone, X } from "lucide-react";
import { currentSubscription, iosSafariTab, isStandalone, pushEnabled, pushSupported, subscribePush } from "@/lib/push";
import { getSession } from "@/lib/cloudSync";
import { cloudEnabled } from "@/lib/supabase";
import { STORE_IOS, STORE_PLAY } from "@/lib/site";
import { track } from "@/lib/track";

const KEY = "jooyeok-install-prompt";
type Memo = { dismissed?: boolean; shown?: number };

function readMemo(): Memo {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Memo;
  } catch {
    return {};
  }
}
function writeMemo(m: Memo) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {}
}

type Platform = "ios" | "android" | "other";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [iosTab, setIosTab] = useState(false);
  const [pwaHelp, setPwaHelp] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      const memo = readMemo();
      if (memo.dismissed || isStandalone() || (memo.shown ?? 0) >= 3) return;
      const ua = navigator.userAgent;
      setPlatform(/iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "other");
      setIosTab(iosSafariTab());
      if (pushEnabled && pushSupported()) currentSubscription().then((s) => alive && setSubscribed(Boolean(s)));
      else setSubscribed(false);
      setShow(true);
      writeMemo({ ...memo, shown: (memo.shown ?? 0) + 1 });
      track("install_prompt", {}, { oncePerSession: true });
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    writeMemo({ ...readMemo(), dismissed: true });
    track("install_dismiss");
    setShow(false);
  };
  const open = (store: "play" | "ios", url: string) => {
    track("install_add", { how: store });
    window.open(url, "_blank", "noopener");
  };
  const push = async () => {
    try {
      const s = await getSession();
      await subscribePush(s?.user.id ?? null);
      track("push_on", { from: "install_prompt" });
      setSubscribed(true);
      setMsg("매일 아침 7시 30분에 오늘의 괘를 보내 드릴게요");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "알림을 켜지 못했어요. 브라우저 설정에서 알림을 허용해 주세요");
    }
  };

  const showPlay = platform !== "ios";
  const showIos = platform !== "android";
  const canPush = cloudEnabled && pushEnabled && subscribed === false && !iosTab;

  return (
    <section className="break-keep rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">앱으로 받으면 더 편해요</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">아이콘으로 바로 열고, 아침마다 오늘의 괘를 받고, 기록이 이어져요.</p>
        </div>
        <button onClick={dismiss} className="shrink-0 rounded-full p-1.5 text-muted hover:bg-background" aria-label="나중에">
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {showPlay ? <StoreButton label="Google Play" icon={<Play size={16} />} url={STORE_PLAY} when="11월 출시" onClick={() => open("play", STORE_PLAY)} /> : null}
        {showIos ? <StoreButton label="App Store" icon={<Smartphone size={16} />} url={STORE_IOS} when="12월 출시" onClick={() => open("ios", STORE_IOS)} /> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canPush ? (
          <button onClick={push} className="inline-flex items-center gap-1.5 rounded-full bg-vermilion px-4 py-2.5 text-sm font-bold text-card">
            <Bell size={15} /> 아침 괘 알림 받기
          </button>
        ) : subscribed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2.5 text-sm font-semibold text-muted">
            <Check size={15} /> 아침 알림 켜짐
          </span>
        ) : null}
        {!STORE_PLAY && !STORE_IOS ? (
          <button onClick={() => setPwaHelp((v) => !v)} className="text-xs font-semibold text-muted underline-offset-2 hover:underline">
            출시 전엔 홈 화면에 추가로 앱처럼 쓸 수 있어요
          </button>
        ) : null}
      </div>
      {pwaHelp ? (
        <p className="mt-3 rounded-2xl bg-background px-4 py-3 text-sm leading-relaxed text-foreground/85">
          {platform === "ios" ? (
            <>
              사파리 아래의 공유 버튼 <Share size={14} className="inline align-text-bottom" /> 을 누르고 <b>홈 화면에 추가</b>를 고르세요. 아이폰은 홈 화면 앱에서만 아침 알림을 받을 수 있어요.
            </>
          ) : (
            <>
              브라우저 메뉴(⋮)에서 <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 고르세요.
            </>
          )}
        </p>
      ) : null}
      {msg ? <p className="mt-2 text-xs text-gold-soft">{msg}</p> : null}
    </section>
  );
}

function StoreButton({ label, icon, url, when, onClick }: { label: string; icon: React.ReactNode; url: string; when: string; onClick: () => void }) {
  if (!url)
    return (
      <span className="inline-flex items-center justify-between gap-2 rounded-2xl bg-background px-4 py-3 text-sm font-semibold text-muted">
        <span className="inline-flex items-center gap-2">
          {icon} {label}
        </span>
        <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-gold-soft">{when} 준비 중</span>
      </span>
    );
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-3 text-sm font-bold text-card">
      {icon} {label}에서 받기
    </button>
  );
}
