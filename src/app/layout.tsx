// 전역 레이아웃: Pretendard 폰트, 앱 메타데이터, 홈 화면 설치용 매니페스트
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

// 하위 경로 페이지(64괘 페이지 등)에서도 아이콘과 매니페스트를 찾도록 절대 경로로 둔다
const BASE = "";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "하늘주역, 하늘에 묻고, 주역으로 답하다",
  description: "주역 64괘와 384효로 하늘의 뜻을 묻습니다. 산통을 흔들어 괘를 뽑고, AI가 내 질문에 맞춰 효사 원문으로 풀어 드려요.",
  openGraph: {
    title: "하늘주역, 하늘에 묻고, 주역으로 답하다",
    description: "질문을 적고 괘를 뽑으면, 3천년 주역 원문을 근거로 내 질문에 꼭 맞는 AI 점사 분석이 바로 나와요.",
    url: SITE_URL,
    siteName: "하늘주역",
    locale: "ko_KR",
    type: "website",
    images: [{ url: `${SITE_URL}og.png`, width: 1200, height: 630, alt: "하늘주역" }],
  },
  twitter: { card: "summary_large_image", title: "하늘주역, 하늘에 묻고, 주역으로 답하다", images: [`${SITE_URL}og.png`] },
  applicationName: "하늘주역",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "하늘주역" },
  manifest: `${BASE}/manifest.webmanifest`,
  icons: { icon: `${BASE}/icon-v3.svg`, apple: `${BASE}/apple-touch-icon-v3.png` },
};

export const viewport: Viewport = {
  themeColor: "#0b0d14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased" data-theme="dark" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* 저장된 테마를 첫 그림 전에 적용해 흰 화면이 번쩍이지 않게 한다 */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("jooyeok-master-theme");document.documentElement.dataset.theme=(t==="light")?"light":"dark";document.documentElement.dataset.text=localStorage.getItem("jooyeok-master-text")==="large"?"large":"normal";}catch(e){document.documentElement.dataset.theme="dark";}`}
        </Script>
        {children}
      </body>
    </html>
  );
}
