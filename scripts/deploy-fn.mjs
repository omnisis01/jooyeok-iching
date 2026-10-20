#!/usr/bin/env node
// 서버 함수 하나 이상을 배포한다(키체인의 토큰 사용). 예약 작업이나 감시가 부르는 함수는 플랫폼 로그인 확인을 끈다
// 실행: node scripts/deploy-fn.mjs daily-push ai-reading
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getSupabaseToken } from "./token.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NO_JWT = new Set(["daily-push", "health", "ai-eval", "toss-billing-renew"]);
const names = process.argv.slice(2);
if (!names.length) {
  console.error("배포할 함수 이름을 적어 주세요");
  process.exit(1);
}
const token = await getSupabaseToken();
const r0 = await fetch("https://api.supabase.com/v1/projects", { headers: { Authorization: `Bearer ${token}` } });
if (!r0.ok) throw new Error(`프로젝트 목록 실패 (${r0.status})`);
const ref = (await r0.json()).find((p) => p.name === (process.env.SUPABASE_PROJECT_NAME || "jooyeok-master")).id;
for (const n of names) {
  const args = ["-y", "supabase", "functions", "deploy", n, ...(NO_JWT.has(n) ? ["--no-verify-jwt"] : []), "--use-api", "--project-ref", ref];
  const r = spawnSync("npx", args, { encoding: "utf8", cwd: ROOT, env: { ...process.env, SUPABASE_ACCESS_TOKEN: token }, stdio: ["ignore", "pipe", "pipe"] });
  if (r.status !== 0) throw new Error(`${n} 배포 실패: ${(r.stderr || "").slice(0, 300)}`);
  console.log(`${n} 배포 완료`);
}
