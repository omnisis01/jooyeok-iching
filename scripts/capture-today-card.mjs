#!/usr/bin/env node
// 배포된 사이트의 오늘의 괘 세로 카드를 PNG로 저장한다 (Playwright 크로미움)
// 실행: node scripts/capture-today-card.mjs [출력 폴더] [YYYY-MM-DD]
// GitHub Actions의 daily-card 워크플로가 매일 아침 이것을 돌려 이미지를 만든다
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SITE = process.env.SITE_URL || "https://omnisis01.github.io/jooyeok-iching/";
const outDir = process.argv[2] || "daily-cards";
const date = process.argv[3] || new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(`${SITE}today-card/?date=${date}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.cardReady === "1", null, { timeout: 60000 });
// 캔버스가 만든 이미지 자체를 받는다 (화면 캡처가 아니라 원본 1080×1920)
const dataUrl = await page.evaluate(async () => {
  const img = document.getElementById("today-card");
  const res = await fetch(img.src);
  const blob = await res.blob();
  return await new Promise((r) => {
    const fr = new FileReader();
    fr.onload = () => r(fr.result);
    fr.readAsDataURL(blob);
  });
});
await browser.close();
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `today-card-${date}.png`);
writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
console.log(`saved ${file}`);
