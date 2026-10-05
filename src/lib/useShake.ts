// 휴대폰을 흔들면 알려 주는 훅. 아이폰은 사용자가 한 번 눌러 허락해야 해서 상태를 함께 돌려준다
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motionGrantedBefore, motionReady, rearmMotionOnNextTap, requestMotion } from "./motion";

export type ShakeState = "unsupported" | "needs-permission" | "listening-soon" | "listening" | "denied";

const THRESHOLD = 16; // m/s², 세게 한 번 흔드는 정도
const COOLDOWN_MS = 1500;

export function useShake(onShake: () => void, enabled = true) {
  const [state, setState] = useState<ShakeState>("unsupported");
  const last = useRef(0);
  const prev = useRef<{ x: number; y: number; z: number } | null>(null);
  const cb = useRef(onShake);
  useEffect(() => {
    cb.current = onShake;
  }, [onShake]);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
    // 손가락으로 쓰는 기기에서만 흔들기를 안내한다
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const decide = () => setState(motionReady() ? "listening" : motionGrantedBefore() ? "listening-soon" : "needs-permission");
    const t = window.setTimeout(decide, 0);
    // 예전에 허락했다면 다음 터치에서 조용히 다시 켠다(던지기 버튼을 누르는 순간 등)
    const off = rearmMotionOnNextTap();
    window.addEventListener("motion-permission", decide);
    return () => {
      window.clearTimeout(t);
      off();
      window.removeEventListener("motion-permission", decide);
    };
  }, []);

  useEffect(() => {
    if (state !== "listening" || !enabled) return;
    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const cur = { x: a.x, y: a.y, z: a.z };
      if (prev.current) {
        const d = Math.abs(cur.x - prev.current.x) + Math.abs(cur.y - prev.current.y) + Math.abs(cur.z - prev.current.z);
        const now = Date.now();
        if (d > THRESHOLD && now - last.current > COOLDOWN_MS) {
          last.current = now;
          cb.current();
        }
      }
      prev.current = cur;
    };
    window.addEventListener("devicemotion", handler);
    return () => window.removeEventListener("devicemotion", handler);
  }, [state, enabled]);

  /** 아이폰: 사용자가 누른 순간에만 허락을 물을 수 있다 */
  /** 아이폰: 사용자가 누른 순간에만 허락을 물을 수 있다. 한 번 허락하면 기억한다 */
  const requestPermission = useCallback(async () => {
    const ok = await requestMotion();
    setState(ok ? "listening" : "denied");
  }, []);

  return { state, requestPermission };
}
