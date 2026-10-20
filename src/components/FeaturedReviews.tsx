// 홈의 이용 후기: 쓴 사람이 공개에 동의하고 관리자가 고른 것만. 하나도 없으면 보이지 않는다
"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { featuredReviews, type FeaturedReview } from "@/lib/ops";
import { HEXAGRAMS } from "@/data/hexagrams";
import { categoryOf } from "@/lib/categories";

export default function FeaturedReviews() {
  const [items, setItems] = useState<FeaturedReview[]>([]);

  useEffect(() => {
    let alive = true;
    featuredReviews().then((r) => alive && setItems(r));
    return () => {
      alive = false;
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <p className="font-bold">이용 후기</p>
      <div className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {items.map((r, i) => (
          <figure key={i} className="w-64 shrink-0 snap-start rounded-2xl bg-background p-4">
            <div className="flex gap-0.5" aria-label={`${r.rating}점`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={14} className={n <= r.rating ? "fill-gold text-gold" : "text-border"} />
              ))}
            </div>
            <blockquote className="mt-2 break-keep text-[15px] leading-relaxed">&ldquo;{r.comment}&rdquo;</blockquote>
            <figcaption className="mt-2 text-xs text-muted">
              {r.category ? `${categoryOf(r.category).label}, ` : ""}
              {r.hexagram ? `${HEXAGRAMS.find((h) => h.number === r.hexagram)?.name}, ` : ""}
              {Number(r.day.slice(5, 7))}월 {Number(r.day.slice(8, 10))}일
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
