// 검색 엔진용 사이트맵. 정적 배포라 빌드 때 한 번 만들어진다
import type { MetadataRoute } from "next";
import { HEXAGRAMS } from "@/data/hexagrams";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}hexagram/`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...HEXAGRAMS.map((h) => ({ url: `${SITE_URL}hexagram/${h.number}/`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE_URL}privacy/`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}terms/`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
