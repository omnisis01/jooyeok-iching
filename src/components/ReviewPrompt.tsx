// 결과 아래 한 줄 후기: 별점(필수)과 한마디(선택). 공개 동의한 것 가운데 관리자가 고른 것만 홈에 보인다
"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { Reading } from "@/lib/iching";
import { readingKey } from "@/lib/unlock";
import { submitReview } from "@/lib/ops";
import { cloudEnabled } from "@/lib/supabase";
import { track } from "@/lib/track";

const DONE_KEY = "jooyeok-master-reviewed-v1";

function reviewed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

function remember(key: string) {
  try {
    const s = reviewed();
    s.add(key);
    localStorage.setItem(DONE_KEY, JSON.stringify([...s].slice(-200)));
  } catch {
    // 저장이 안 되어도 후기는 이미 보냈다
  }
}

export default function ReviewPrompt({ reading }: { reading: Reading }) {
  const key = readingKey(reading);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [publicOk, setPublicOk] = useState(true);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(() => (typeof window !== "undefined" && reviewed().has(key) ? "done" : "idle"));
  const [error, setError] = useState<string | null>(null);

  if (!cloudEnabled) return null;
  if (state === "done") return <p className="text-center text-sm text-muted">후기 고마워요. 더 나은 풀이를 만드는 데 쓸게요.</p>;

  const send = async () => {
    setState("sending");
    setError(null);
    try {
      await submitReview(key, reading.primary.number, reading.category ?? "overall", rating, comment, publicOk);
      track("review_submit", { rating });
      remember(key);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "후기를 보내지 못했어요");
      setState("error");
    }
  };

  return (
    <section className="rounded-3xl bg-card p-5 text-center shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <p className="font-bold">이 풀이, 어땠나요?</p>
      <div className="mt-3 flex justify-center gap-1" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} role="radio" aria-checked={rating === n} aria-label={`${n}점`} className="p-1">
            <Star size={30} className={n <= rating ? "fill-gold text-gold" : "text-border"} />
          </button>
        ))}
      </div>
      {rating ? (
        <div className="mt-3 space-y-2 text-left">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 120))}
            placeholder="한마디 남겨 주세요 (선택)"
            className="w-full rounded-2xl bg-background px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
          />
          <label className="flex items-center gap-2 px-1 text-xs text-muted">
            <input type="checkbox" checked={publicOk} onChange={(e) => setPublicOk(e.target.checked)} className="accent-vermilion" />
            다른 분들께 보여 줘도 괜찮아요 (이름과 이메일은 나오지 않아요)
          </label>
          <button onClick={send} disabled={state === "sending"} className="w-full rounded-full bg-foreground py-3 font-bold text-card disabled:opacity-50">
            후기 보내기
          </button>
          {error ? <p className="text-center text-xs text-vermilion">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
