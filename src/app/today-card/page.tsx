// 오늘의 괘 세로 카드를 자동으로 그려 보여 주는 페이지. 매일 이미지를 뽑는 자동화(GitHub Actions)가 이 페이지를 연다
// 주소에 ?date=2026-10-01 을 붙이면 그 날짜의 카드를 그린다
import type { Metadata } from "next";
import TodayCard from "./TodayCard";

export const metadata: Metadata = { title: "오늘의 괘 카드", robots: { index: false } };

export default function TodayCardPage() {
  return <TodayCard />;
}
