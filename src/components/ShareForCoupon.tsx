// 친구에게 앱을 공유하면 점 쿠폰 1회를 주는 버튼
"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { SITE_URL } from "@/lib/shareCard";
import { grantShareCoupon, quotaState, SHARE_COUPONS_PER_DAY } from "@/lib/quota";

const SHARE_TEXT = "나만의 정통주역운세에서 내 괘를 뽑아 봤어요. 주역 원전 그대로 쉬운 말로 풀어 줘요. 같이 하나 뽑아 봐요.";

type Props = {
  /** 쿠폰을 받은 뒤 할 일 (예: 바로 다시 뽑기) */
  onGranted?: () => void;
  className?: string;
  label?: string;
};

export default function ShareForCoupon({ onGranted, className, label = "친구에게 공유하고 한 번 더 뽑기" }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { canShareForCoupon } = quotaState();

  const share = async () => {
    setBusy(true);
    setStatus(null);
    try {
      let shared = false;
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "나만의 정통주역운세", text: SHARE_TEXT, url: SITE_URL });
          shared = true;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            setStatus("공유를 취소했어요");
            return;
          }
        }
      }
      if (!shared) {
        // 공유 시트가 없는 기기: 초대 글을 복사한다. 클립보드가 막혀 있으면 옛 방식, 그것도 안 되면 직접 복사창
        const text = `${SHARE_TEXT}\n${SITE_URL}`;
        let copied = false;
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch {
          try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            copied = document.execCommand("copy");
            document.body.removeChild(ta);
          } catch {
            copied = false;
          }
        }
        if (!copied) window.prompt("아래 초대 글을 복사해 친구에게 보내 주세요", text);
        shared = true;
        setStatus(copied ? "초대 글과 링크를 복사했어요. 친구에게 붙여 넣어 보내 주세요" : "초대 글을 확인했어요");
      }
      if (shared) {
        if (await grantShareCoupon()) {
          setStatus((s) => (s ? s + ". 쿠폰 1회를 받았어요" : "고마워요. 점 쿠폰 1회를 받았어요"));
          onGranted?.();
        } else {
          setStatus("오늘 받을 수 있는 공유 쿠폰을 다 받았어요. 내일 또 만나요");
        }
      }
    } catch {
      setStatus("공유하지 못했어요. 잠시 후 다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={share}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-bold text-card transition hover:opacity-90 disabled:opacity-50"
      >
        <Share2 size={16} /> {label}
      </button>
      <p className="mt-2 min-h-4 text-center text-xs text-muted">
        {status ? (
          <span className="inline-flex items-center gap-1 text-vermilion">
            <Check size={12} /> {status}
          </span>
        ) : canShareForCoupon ? (
          `공유할 때마다 오늘 쓸 수 있는 쿠폰 1회를 드려요 (하루 ${SHARE_COUPONS_PER_DAY}회까지)`
        ) : (
          "오늘의 공유 쿠폰은 모두 받았어요"
        )}
      </p>
    </div>
  );
}
