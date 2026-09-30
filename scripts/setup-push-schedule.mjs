#!/usr/bin/env node
// 푸시 알림 함수를 다시 배포하고 아침(매일 07:30)과 밤(일요일 21:30) 예약을 등록하는 스크립트
// 실행: node scripts/setup-push-schedule.mjs
// 입력(화면에 안 보임): Supabase 액세스 토큰. 이미 setup-supabase.mjs 를 마친 프로젝트에서 씁니다.
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { getSupabaseToken } from "./token.mjs";
import { pushCronSql } from "./setup-supabase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.supabase.com";
const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || "jooyeok-master";

const fail = (m) => {
  console.error(`\n오류: ${m}`);
  process.exit(1);
};

function askHidden(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(prompt, (a) => {
      rl.close();
      process.stdout.write("\n");
      resolve(a.trim());
    });
    rl._writeToOutput = () => {};
  });
}

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

async function main() {
  console.log("푸시 알림 문구와 예약을 새로 올립니다.");
  const token = (await getSupabaseToken());
  if (!token) fail("토큰이 비어 있습니다.");
  const projects = await api(token, "GET", "/v1/projects");
  const project = projects.find((p) => p.name === PROJECT_NAME);
  if (!project) fail(`프로젝트 ${PROJECT_NAME}가 없습니다. 먼저 scripts/setup-supabase.mjs 를 실행하세요.`);
  const ref = project.id;
  const supabaseUrl = `https://${ref}.supabase.co`;

  console.log("\n[1] daily-push 함수를 다시 배포합니다");
  const r = spawnSync("npx", ["-y", "supabase", "functions", "deploy", "daily-push", "--no-verify-jwt", "--use-api", "--project-ref", ref], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
    cwd: ROOT,
  });
  if (r.status !== 0) fail(`배포 실패: ${(r.stderr || "").slice(0, 300)}`);
  console.log("배포 완료");

  console.log("\n[2] 아침과 밤 예약을 등록합니다");
  await api(token, "POST", `/v1/projects/${ref}/database/query`, { query: `create extension if not exists pg_cron; create extension if not exists pg_net; ${pushCronSql(supabaseUrl)}` });
  console.log("예약 완료: 매일 한국 07:30 아침 알림, 일요일 한국 21:30 밤 알림");

  console.log("\n[3] 시험 발송 (아침 문구)");
  const test = await api(token, "GET", `/v1/projects/${ref}/api-keys?reveal=true`).catch(() => null);
  const service = Array.isArray(test) ? (test.find((k) => k.type === "secret")?.api_key ?? test.find((k) => k.name === "service_role")?.api_key) : null;
  if (service) {
    // 예약 작업이 쓰는 금고(vault) 키도 같은 값으로 맞춘다
    await api(token, "POST", `/v1/projects/${ref}/database/query`, {
      query: `do $$ begin
        if exists (select 1 from vault.secrets where name = 'service_role_key') then perform vault.update_secret((select id from vault.secrets where name = 'service_role_key'), '${service}');
        else perform vault.create_secret('${service}', 'service_role_key'); end if; end $$;`,
    });
  }
  if (service) {
    const res = await fetch(`${supabaseUrl}/functions/v1/daily-push`, { method: "POST", headers: { Authorization: `Bearer ${service}`, "Content-Type": "application/json" }, body: JSON.stringify({ slot: "morning" }) });
    console.log("응답:", (await res.text()).slice(0, 300));
  } else {
    console.log("서비스 키를 읽지 못해 시험 발송은 건너뜁니다. 대시보드 > Edge Functions > daily-push > Invoke 에서 {\"slot\":\"morning\"} 으로 시험할 수 있어요.");
  }
  console.log("\n완료. 알림을 켜 둔 기기로 문구가 왔는지 확인하세요.");
}

main().catch((e) => fail(e.message));
