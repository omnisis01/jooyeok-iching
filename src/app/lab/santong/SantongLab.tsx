// 산통 시험 페이지: 앱의 산통 화면을 따로 띄워 흔들어 본다. 결과는 괘 이름만 간단히 보여 준다
"use client";

import { useState } from "react";
import type { Reading } from "@/lib/iching";
import SantongCasting from "@/components/SantongCasting";

export default function SantongLab() {
  const [reading, setReading] = useState<Reading | null>(null);
  const [key, setKey] = useState(0);
  return (
    <main className="mx-auto max-w-md px-4 py-8 text-center">
      {reading ? (
        <div className="py-16">
          <p className="font-serif text-sm text-muted">{reading.primary.hanja}</p>
          <h1 className="mt-1 text-3xl font-bold">{reading.primary.name}</h1>
          <p className="mt-2 text-sm text-muted">{reading.primary.keyword}</p>
          <button
            onClick={() => {
              setReading(null);
              setKey((k) => k + 1);
            }}
            className="mt-8 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-card"
          >
            다시 해 보기
          </button>
        </div>
      ) : (
        <SantongCasting key={key} onComplete={setReading} />
      )}
      <a href="../../" className="mt-6 inline-block text-sm text-muted underline">
        앱으로 돌아가기
      </a>
    </main>
  );
}
