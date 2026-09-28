// 전역 레이아웃: Pretendard 폰트, 앱 메타데이터, 홈 화면 설치용 매니페스트
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "주역 마스터, 세상에서 가장 정확한 점사풀이",
  description: "주역 64괘와 육효로 오늘의 운을 묻습니다. 동전, 산통, 산가지로 괘를 뽑고 쉬운 말로 풀어낸 조언을 받아 보세요.",
  applicationName: "주역 마스터",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "주역 마스터" },
  manifest: "manifest.webmanifest",
  icons: { icon: "icon.svg", apple: "apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#f5f0e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
