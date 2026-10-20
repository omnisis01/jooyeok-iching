// AI 풀이 이미지 시험 페이지(검색 비노출): 예시 풀이로 저장 이미지를 그려 본다
import type { Metadata } from "next";
import AiCardLab from "./AiCardLab";

export const metadata: Metadata = { title: "AI 풀이 이미지 시안", robots: { index: false } };

export default function AiCardLabPage() {
  return <AiCardLab />;
}
