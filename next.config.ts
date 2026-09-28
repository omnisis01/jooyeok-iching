import type { NextConfig } from "next";

// GitHub Pages(https://<user>.github.io/<repo>/)에 정적 사이트로 배포하기 위한 설정
const repo = "jooyeok-iching";
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: isPages ? `/${repo}` : "",
  assetPrefix: isPages ? `/${repo}/` : undefined,
  trailingSlash: true,
};

export default nextConfig;
