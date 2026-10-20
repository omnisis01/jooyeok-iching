#!/usr/bin/env node
// AI 풀이 설정: 표와 권한 함수(0008_ai.sql)를 올리고, 근거 자료를 묶어 서버 함수 ai-reading을 배포한다
// 실행: node scripts/setup-ai.mjs            (배포만. AI 키가 없으면 대체 풀이만 나간다)
//       node scripts/setup-ai.mjs --key      (Anthropic API 키를 화면에 안 보이게 입력받아 서버 비밀값으로 저장)
//       node scripts/setup-ai.mjs --migrate  (처음 설치할 때만: 0008, 0009 표와 함수)
// 키는 출력하거나 파일로 남기지 않는다(잠깐 쓰는 임시 파일은 바로 지운다)
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ask, getSupabaseToken, renewSupabaseToken } from "./token.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.supabase.com";
const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || "jooyeok-master";

const fail = (m) => {
  console.error(`\n오류: ${m}`);
  process.exit(1);
};

async function api(token, method, path, body) {
  const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) throw new Error(`${method} ${path} 실패 (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env: { ...process.env, ...env }, cwd: ROOT });
  if (r.status !== 0) throw new Error(`${cmd} ${args.slice(0, 3).join(" ")} 실패: ${(r.stderr || "").slice(0, 300)}`);
  return r.stdout || "";
}

async function main() {
  const withKey = process.argv.includes("--key");
  let token = await getSupabaseToken();
  if (!token) fail("토큰이 비어 있습니다.");
  let projects;
  try {
    projects = await api(token, "GET", "/v1/projects");
  } catch (e) {
    if (!String(e.message).includes("(401)")) throw e;
    token = await renewSupabaseToken();
    projects = await api(token, "GET", "/v1/projects");
  }
  const project = projects.find((p) => p.name === PROJECT_NAME);
  if (!project) fail(`프로젝트 ${PROJECT_NAME}가 없습니다.`);
  const ref = project.id;
  const envTok = { SUPABASE_ACCESS_TOKEN: token };

  // 표와 함수는 처음 한 번만 올린다(뒤의 마이그레이션이 이벤트 이름 목록 등을 늘려 두었으므로 다시 올리면 덮어쓴다)
  if (process.argv.includes("--migrate")) {
    console.log("[1] AI 풀이 표와 권한 함수를 올립니다");
    await api(token, "POST", `/v1/projects/${ref}/database/query`, { query: readFileSync(join(ROOT, "supabase/migrations/0008_ai.sql"), "utf8") });
    await api(token, "POST", `/v1/projects/${ref}/database/query`, { query: readFileSync(join(ROOT, "supabase/migrations/0009_admin_ai.sql"), "utf8") });
    console.log("완료");
  }

  console.log("[2] 근거 자료를 묶습니다");
  run("node", ["scripts/build-ai-bundle.mjs"]);
  console.log("완료");

  if (withKey) {
    let key = "";
    while (!/^sk-ant-/.test(key)) {
      key = await ask("Anthropic API 키 (sk-ant- 로 시작, 화면에 안 보임): ", true);
      if (!/^sk-ant-/.test(key)) console.log("sk-ant- 로 시작하는 키를 붙여 넣어 주세요.");
    }
    const tmp = mkdtempSync(join(tmpdir(), "jm-ai-"));
    const envFile = join(tmp, "secrets.env");
    writeFileSync(envFile, `ANTHROPIC_API_KEY=${key}\n`, { mode: 0o600 });
    try {
      run("npx", ["-y", "supabase", "secrets", "set", "--env-file", envFile, "--project-ref", ref], envTok);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    console.log("[3] AI 키를 서버 비밀값(ANTHROPIC_API_KEY)으로 저장했습니다");
  }

  console.log("[4] 서버 함수 ai-reading, ai-eval을 배포합니다");
  run("npx", ["-y", "supabase", "functions", "deploy", "ai-reading", "--use-api", "--project-ref", ref], envTok);
  // 품질 시험용(AI_EVAL_TOKEN이 있을 때만 열림, 저장 없음)
  run("npx", ["-y", "supabase", "functions", "deploy", "ai-eval", "--no-verify-jwt", "--use-api", "--project-ref", ref], envTok);
  console.log("완료. 결과 화면의 AI 풀이 카드에서 바로 쓸 수 있습니다.");
}

main().catch((e) => fail(e.message));
