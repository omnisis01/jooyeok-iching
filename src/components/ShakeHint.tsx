// 던지기 버튼 아래의 한 줄 안내. 아이폰은 눌러서 허락을 받는다
"use client";

import { Smartphone } from "lucide-react";
import type { ShakeState } from "@/lib/useShake";

export default function ShakeHint({ state, onEnable, verb = "던질" }: { state: ShakeState; onEnable: () => void; verb?: string }) {
  if (state === "unsupported") return null;
  if (state === "needs-permission") {
    return (
      <button onClick={onEnable} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted underline decoration-dotted underline-offset-4">
        <Smartphone size={13} /> 폰을 흔들어서 {verb} 수 있어요. 눌러서 켜기
      </button>
    );
  }
  if (state === "denied") return <p className="text-xs text-muted">흔들기 감지가 꺼져 있어요. 버튼으로 {verb} 수 있어요.</p>;
  if (state === "listening-soon") return <p className="inline-flex items-center gap-1.5 text-xs text-muted"><Smartphone size={13} /> 화면을 한 번 누르면 흔들어서 {verb} 수 있어요</p>;
  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-muted">
      <Smartphone size={13} /> 폰을 흔들어서 {verb} 수 있어요
    </p>
  );
}
