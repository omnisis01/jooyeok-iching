#!/usr/bin/env node
// AI 풀이 서버 함수가 쓸 근거 자료와 검증 코드를 한 파일로 묶는다
// 실행: node scripts/build-ai-bundle.mjs  (src/lib/aiReading.ts와 그 자료를 고친 뒤마다)
// 결과: supabase/functions/_shared/aiReading.js (직접 고치지 않는다)
import { build } from "esbuild";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
await build({
  entryPoints: [join(ROOT, "src/lib/aiReading.ts")],
  outfile: join(ROOT, "supabase/functions/_shared/aiReading.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  tsconfig: join(ROOT, "tsconfig.json"),
  banner: { js: "// 자동 생성 파일: scripts/build-ai-bundle.mjs 가 src/lib/aiReading.ts 에서 만든다. 직접 고치지 않는다" },
  logLevel: "warning",
});
console.log("supabase/functions/_shared/aiReading.js 를 만들었습니다");
