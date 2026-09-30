// 무료 사용자에게만 보이는 광고 한 칸 (구글 애드센스). 게시자 ID가 없으면 아무것도 그리지 않는다
"use client";

import { useEffect, useRef } from "react";
import { isPremiumNow } from "@/lib/quota";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT; // 예) ca-pub-1234567890123456
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

export const adsEnabled = Boolean(CLIENT && SLOT);

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptLoaded = false;
function loadScript() {
  if (scriptLoaded || typeof document === "undefined") return;
  scriptLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  document.head.appendChild(s);
}

export default function AdSlot({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLModElement>(null);
  const premium = isPremiumNow();

  useEffect(() => {
    if (!adsEnabled || premium) return;
    loadScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // 광고 차단기 등으로 실패해도 화면에는 영향이 없다
    }
  }, [premium]);

  if (!adsEnabled || premium) return null;
  return (
    <div className={`overflow-hidden rounded-2xl bg-card/60 ${className}`}>
      <p className="px-3 pt-2 text-[10px] text-muted">광고</p>
      <ins ref={ref} className="adsbygoogle block" style={{ display: "block" }} data-ad-client={CLIENT} data-ad-slot={SLOT} data-ad-format="auto" data-full-width-responsive="true" />
    </div>
  );
}
