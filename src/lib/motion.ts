// 아이폰 흔들기 권한을 기억한다. 아이폰 사파리는 페이지를 열 때마다 "누른 순간"에 권한을 다시 확인해야 하지만,
// 한 번 허락한 사이트라면 창 없이 바로 통과한다. 그래서 한 번 허락했으면 다음부터는 다른 버튼을 누를 때 조용히 다시 켠다.
type MotionCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

const KEY = "jooyeok-master-motion";
let grantedThisPage = false;

export function needsMotionPermission(): boolean {
  if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return false;
  return typeof (window.DeviceMotionEvent as MotionCtor).requestPermission === "function";
}

export function motionGrantedBefore(): boolean {
  try {
    return localStorage.getItem(KEY) === "granted";
  } catch {
    return false;
  }
}

export function motionReady(): boolean {
  return !needsMotionPermission() || grantedThisPage;
}

/** 사용자가 무언가를 누른 순간에만 부른다. 결과를 기억한다 */
export async function requestMotion(): Promise<boolean> {
  if (!needsMotionPermission()) return true;
  try {
    const r = await (window.DeviceMotionEvent as MotionCtor).requestPermission!();
    grantedThisPage = r === "granted";
    try {
      localStorage.setItem(KEY, r);
    } catch {
      // 저장 못 해도 이번에는 쓴다
    }
    window.dispatchEvent(new Event("motion-permission"));
    return grantedThisPage;
  } catch {
    return false;
  }
}

/** 예전에 허락했으면, 화면의 아무 버튼이나 누를 때 조용히 다시 켠다 */
export function rearmMotionOnNextTap(): () => void {
  if (!needsMotionPermission() || grantedThisPage || !motionGrantedBefore()) return () => {};
  const onTap = () => {
    requestMotion();
    window.removeEventListener("pointerup", onTap, true);
  };
  window.addEventListener("pointerup", onTap, true);
  return () => window.removeEventListener("pointerup", onTap, true);
}
