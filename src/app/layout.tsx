// 전역 레이아웃: Pretendard 폰트 로드와 기본 메타데이터
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "오늘의 괘 — 주역 점보기",
  description:
    "주역 64괘를 그림으로 만나고, 동전과 산통으로 오늘의 괘를 뽑아 쉬운 해설과 조언을 받아보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col paper-grain">{children}</body>
    </html>
  );
}
