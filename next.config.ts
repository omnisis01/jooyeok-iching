import type { NextConfig } from "next";

// GitHub Pages에 정적 사이트로 배포한다. 2026-10-24부터 자체 도메인(https://skyjooyeok.com)을 쓰므로 루트 경로
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
