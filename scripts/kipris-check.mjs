#!/usr/bin/env node
// KIPRIS 상표 검색(상표명칭 TN) 자동 확인. 이름마다 건수와 앞 결과(이름, 상품분류, 상태, 출원인)를 보여 준다
// 실행: node scripts/kipris-check.mjs 역문당 효답 일괘
// Playwright가 필요하다(스크래치 폴더나 전역에 설치). 결과 0건이어도 비슷한 소리의 상표는 따로 봐야 한다
import { chromium } from "playwright";

const names = process.argv.slice(2);
if (!names.length) {
  console.error("확인할 이름을 적어 주세요");
  process.exit(1);
}
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
for (const name of names) {
  await p.goto("https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  // 상세검색 창을 열고 상표명칭(TN) 칸에 넣는다(보이는 요소만 다룬다)
  let ok = true;
  try {
    const open = p.getByRole("button", { name: "상세검색" }).filter({ visible: true }).first();
    if (await open.count()) await open.click();
    await p.waitForTimeout(1200);
    const inp = p.getByLabel(/상표명칭\(TN\)/).filter({ visible: true }).first();
    await inp.fill(name);
    await p.getByRole("button", { name: "검색하기" }).filter({ visible: true }).first().click();
  } catch {
    ok = false;
  }
  await p.waitForTimeout(5000);
  const text = await p.locator("main").innerText();
  const m = text.match(/총\s*([\d,]+)건이 검색되었습니다/);
  const count = text.includes("검색결과가 없습니다") ? 0 : m ? m[1] : "?";
  console.log(`\n${name}: ${count}건`);
  if (count !== 0) {
    const lines = text.split("\n").map((x) => x.trim());
    let shown = 0;
    for (let i = 0; i < lines.length && shown < 10; i++) {
      if (/^\[\d+\]$/.test(lines[i])) {
        const nm = lines[i + 2] ?? "", cls = lines[i + 4] ?? "", ap = lines[i + 6] ?? "", st = lines[i - 1] ?? "";
        console.log(`  - ${nm} | ${cls}류 | ${st} | ${ap}`);
        shown++;
      }
    }
  }
}
await b.close();
