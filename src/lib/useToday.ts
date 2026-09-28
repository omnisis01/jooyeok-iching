// 브라우저에서만 오늘 날짜와 시각을 알려 주는 훅. 정적 빌드의 HTML과 불일치를 막기 위해 마운트 뒤에 채운다
"use client";

import { useEffect, useState } from "react";
import { todayString } from "./yukhyo";

export function useToday(): { today: string | null; hour: number | null } {
  const [state, setState] = useState<{ today: string | null; hour: number | null }>({ today: null, hour: null });
  useEffect(() => {
    const t = window.setTimeout(() => setState({ today: todayString(), hour: new Date().getHours() }), 0);
    return () => window.clearTimeout(t);
  }, []);
  return state;
}
