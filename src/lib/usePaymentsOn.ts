// 결제 버튼을 보여 줄지. 토스 키가 시험용(test_)이면 관리자에게만 보이고, 실제 키면 모두에게 보인다
"use client";

import { useEffect, useState } from "react";
import { paymentsEnabled, paymentsTestMode } from "./premium";
import { fetchIsAdmin } from "./admin";

export function usePaymentsOn(): boolean {
  const [on, setOn] = useState(paymentsEnabled && !paymentsTestMode);
  useEffect(() => {
    if (!paymentsEnabled || !paymentsTestMode) return;
    let alive = true;
    fetchIsAdmin().then((v) => alive && setOn(v));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}
