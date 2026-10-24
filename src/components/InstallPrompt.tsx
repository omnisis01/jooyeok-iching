// 첫 결과를 본 뒤 한 번 권하는 카드: 홈 화면에 추가(앱처럼 열기)와 아침 괘 알림. 설치형 앱 흐름의 핵심
// 이미 앱으로 열었거나, 두 가지를 다 했거나, "나중에"를 눌렀으면 보이지 않는다. 최대 3번까지만 보여 준다
"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Share, Smartphone, X } from "lucide-react";
import { currentSubscription, iosSafariTab, isStandalone, pushEnabled, pushSupported, subscribePush } from "@/lib/push";
import { getSession } from "@/lib/cloudSync";
import { cloudEnabled } from "@/lib/supabase";
import { track } from "@/lib/track";

const KEY = "jooyeok-install-prompt";
type Memo = { dismissed?: boolean; shown?: number; added?: boolean };
type Installer = { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

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

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [installer, setInstaller] = useState<Installer | null>(null);
  const [iosHelp, setIosHelp] = useState(false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [added, setAdded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const w = window as Window & { __installer?: Installer };
    let alive = true;
    const onInstaller = () => alive && setInstaller(w.__installer ?? null);
    // 화면이 그려진 뒤에 판단한다(렌더 중 상태 변경을 피한다)
    const t = window.setTimeout(() => {
      const memo = readMemo();
      if (memo.dismissed || isStandalone() || (memo.shown ?? 0) >= 3) return;
      setInstaller(w.__installer ?? null);
      setIos(iosSafariTab());
      setAdded(Boolean(memo.added));
      window.addEventListener("installer-ready", onInstaller);
      if (pushEnabled && pushSupported()) currentSubscription().then((s) => alive && setSubscribed(Boolean(s)));
      else setSubscribed(false);
      setShow(true);
      writeMemo({ ...memo, shown: (memo.shown ?? 0) + 1 });
      track("install_prompt", {}, { oncePerSession: true });
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(t);
      window.removeEventListener("installer-ready", onInstaller);
    };
  }, []);

  if (!show) return null;
  const canAdd = !added && (installer || ios);
  const canPush = cloudEnabled && pushEnabled && subscribed === false && !ios;
  if (!canAdd && !canPush) return null;

  const dismiss = () => {
    writeMemo({ ...readMemo(), dismissed: true });
    track("install_dismiss");
    setShow(false);
  };

  const add = async () => {
    if (installer) {
      await installer.prompt();
      const { outcome } = await installer.userChoice;
      if (outcome === "accepted") {
        track("install_add", { how: "android" });
        writeMemo({ ...readMemo(), added: true });
        setAdded(true);
        setMsg("홈 화면에 추가됐어요. 다음부터는 아이콘으로 열어 주세요");
      }
      return;
    }
    setIosHelp((v) => !v);
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

  return (
    <section className="break-keep rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">앱처럼 쓰면 더 편해요</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">홈 화면 아이콘으로 바로 열고, 아침마다 오늘의 괘를 받아 보세요.</p>
        </div>
        <button onClick={dismiss} className="shrink-0 rounded-full p-1.5 text-muted hover:bg-background" aria-label="나중에">
          <X size={16} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {canAdd ? (
          <button onClick={add} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-card">
            <Smartphone size={15} /> 홈 화면에 추가
          </button>
        ) : added ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2.5 text-sm font-semibold text-muted">
            <Check size={15} /> 홈 화면에 추가됨
          </span>
        ) : null}
        {canPush ? (
          <button onClick={push} className="inline-flex items-center gap-1.5 rounded-full bg-vermilion px-4 py-2.5 text-sm font-bold text-card">
            <Bell size={15} /> 아침 괘 알림 받기
          </button>
        ) : subscribed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2.5 text-sm font-semibold text-muted">
            <Check size={15} /> 아침 알림 켜짐
          </span>
        ) : null}
      </div>
      {iosHelp ? (
        <p className="mt-3 rounded-2xl bg-background px-4 py-3 text-sm leading-relaxed text-foreground/85">
          사파리 아래의 공유 버튼 <Share size={14} className="inline align-text-bottom" /> 을 누르고 <b>홈 화면에 추가</b>를 고르세요. 아이폰은 홈 화면 앱에서만 아침 알림을 받을 수 있어요.
        </p>
      ) : null}
      {msg ? <p className="mt-2 text-xs text-gold-soft">{msg}</p> : null}
    </section>
  );
}
