#!/usr/bin/env node
// 장애 감시 설정: 0011 마이그레이션, health와 daily-push 함수 배포, 감시용 비밀값(HEALTH_TOKEN)을 Supabase와 GitHub에 함께 저장
// 비밀값은 여기서 새로 만들고 화면에 출력하지 않는다. 다시 실행하면 새 값으로 바뀐다
// 실행: node scripts/setup-monitor.mjs
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getSupabaseToken } from "./token.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "omnisis01/jooyeok-iching";
const api = async (token, method, path, body) => {
  const r = await fetch("https://api.supabase.com" + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} 실패 (${r.status}): ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
};
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", cwd: ROOT, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(" ")} 실패: ${(r.stderr || "").slice(0, 300)}`);
  return r.stdout;
};

const token = await getSupabaseToken();
const ref = (await api(token, "GET", "/v1/projects")).find((p) => p.name === "jooyeok-master").id;
const env = { ...process.env, SUPABASE_ACCESS_TOKEN: token };

console.log("[1] 사용 기록 이름(push_run)을 더합니다");
await api(token, "POST", `/v1/projects/${ref}/database/query`, { query: readFileSync(join(ROOT, "supabase/migrations/0011_monitor.sql"), "utf8") });

console.log("[2] 감시용 비밀값을 만들어 Supabase에 저장합니다");
const health = randomBytes(32).toString("hex");
await api(token, "POST", `/v1/projects/${ref}/secrets`, [{ name: "HEALTH_TOKEN", value: health }]);

console.log("[3] health, daily-push 함수를 배포합니다");
run("npx", ["-y", "supabase", "functions", "deploy", "health", "--no-verify-jwt", "--use-api", "--project-ref", ref], { env, stdio: ["ignore", "pipe", "pipe"] });
run("npx", ["-y", "supabase", "functions", "deploy", "daily-push", "--no-verify-jwt", "--use-api", "--project-ref", ref], { env, stdio: ["ignore", "pipe", "pipe"] });

console.log("[4] GitHub 비밀값과 이슈 라벨을 만듭니다");
run("gh", ["secret", "set", "HEALTH_TOKEN", "--repo", REPO], { input: health });
run("gh", ["secret", "set", "HEALTH_URL", "--repo", REPO], { input: `https://${ref}.supabase.co/functions/v1/health` });
spawnSync("gh", ["label", "create", "monitor", "--repo", REPO, "--color", "D8452B", "--description", "장애 감시가 연 이슈"], { encoding: "utf8", cwd: ROOT });
console.log("완료. 30분마다 감시가 돌고, 문제가 생기면 GitHub 이슈와 메일로 알립니다.");
