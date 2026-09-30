"use client";

import { useEffect, useState } from "react";
import { dailyHexagram } from "@/lib/daily";
import { renderDailyStoryCard, storyFileName } from "@/lib/storyCard";

function kstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function TodayCard() {
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const date = new URLSearchParams(window.location.search).get("date") || kstToday();
    const hex = dailyHexagram(date);
    let objectUrl: string | null = null;
    renderDailyStoryCard(hex, date)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setName(storyFileName("오늘의괘", hex));
        // 자동화가 완료를 알아채도록 표시한다
        document.documentElement.dataset.cardReady = "1";
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "이미지를 만들지 못했어요"));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <div className="app-backdrop flex min-h-screen flex-col items-center gap-4 px-5 py-8">
      {url ? (
        <>
          {/* 캔버스로 만든 blob URL이라 next/image 최적화 대상이 아니다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img id="today-card" src={url} alt="오늘의 괘 세로 카드" className="max-h-[80vh] w-auto rounded-2xl shadow-2xl" />
          <a href={url} download={name} className="rounded-full bg-vermilion px-6 py-3 font-bold text-card">
            이미지 내려받기
          </a>
        </>
      ) : error ? (
        <p className="text-vermilion">{error}</p>
      ) : (
        <p className="text-muted">오늘의 괘 카드를 만드는 중</p>
      )}
      <a href="../" className="text-sm text-muted underline">앱으로 돌아가기</a>
    </div>
  );
}
