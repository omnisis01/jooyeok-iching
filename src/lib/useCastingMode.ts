// 점을 뽑는 화면에 있는 동안 표시를 남긴다. 떠 있는 "괘와 효?" 버튼이 흔들기 버튼을 가리지 않게 숨기는 데 쓴다
"use client";

import { useEffect } from "react";

export function useCastingMode() {
  useEffect(() => {
    document.body.dataset.casting = "1";
    return () => {
      delete document.body.dataset.casting;
    };
  }, []);
}
