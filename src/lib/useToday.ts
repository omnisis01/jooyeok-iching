// 브라우저에서만 오늘 날짜와 시각을 알려 주는 훅. 정적 빌드의 HTML과 불일치를 막기 위해 마운트 뒤에 채운다
"use client";

import { useEffect, useState } from "react";
import { todayString } from "./yukhyo";
import { kstHour, msUntilKstMidnight } from "./clock";

export function useToday(): { today: string | null; hour: number | null } {
  const [state, setState] = useState<{ today: string | null; hour: number | null }>({ today: null, hour: null });
  useEffect(() => {
    let midnight: number | undefined;
    const update = () => {
      setState({ today: todayString(), hour: kstHour() });
      // 앱을 켜 둔 채 자정을 넘기면 오늘의 괘와 인사말도 바뀐다
      window.clearTimeout(midnight);
      midnight = window.setTimeout(update, msUntilKstMidnight() + 1000);
    };
    const t = window.setTimeout(update, 0);
    window.addEventListener("quota-changed", update);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(midnight);
      window.removeEventListener("quota-changed", update);
    };
  }, []);
  return state;
}
