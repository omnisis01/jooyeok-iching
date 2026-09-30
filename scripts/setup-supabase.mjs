#!/usr/bin/env node
// Supabase 백엔드를 처음부터 끝까지 자동 설정하는 스크립트
// 실행: node scripts/setup-supabase.mjs   (액세스 토큰은 실행 중 화면에 안 보이게 입력받는다)
//
// 하는 일: 프로젝트 생성 → 스키마 적용 → 이메일 로그인 설정 → VAPID 키 생성 → Edge Function 배포와 비밀값 등록
//          → 매일 아침 푸시 예약 → GitHub Secrets 등록 → 배포 워크플로 실행
// 비밀값은 화면에 출력하지 않는다. 필요한 값은 변수명과 "설정됨"만 표시한다.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { getSupabaseToken } from "./token.mjs";
import { randomBytes } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.supabase.com";
const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || "jooyeok-master";
const REGION = process.env.SUPABASE_REGION || "ap-northeast-2";
const SITE_URL = "https://omnisis01.github.io/jooyeok-iching/";
const LOCAL_URL = "http://localhost:3000/";
const GITHUB_REPO = "omnisis01/jooyeok-iching";

function log(step, msg) {
  console.log(`\n[${step}] ${msg}`);
}

function fail(msg) {
  console.error(`\n오류: ${msg}`);
  process.exit(1);
}

async function askHidden(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (ch) => {
      const c = ch.toString();
      if (c === "\n" || c === "\r" || c === "\u0004") process.stdin.removeListener("data", onData);
    };
    process.stdin.on("data", onData);
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
    // 입력 글자를 화면에 표시하지 않는다
    rl._writeToOutput = () => {};
  });
}

async function api(token, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!res.ok) throw new Error(`${method} ${path} 실패 (${res.status}): ${typeof json === "string" ? json.slice(0, 200) : JSON.stringify(json).slice(0, 300)}`);
  return json;
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: opts.quiet ? ["ignore", "pipe", "pipe"] : "inherit", encoding: "utf8", env: { ...process.env, ...(opts.env || {}) }, cwd: ROOT, shell: false });
  if (r.status !== 0) throw new Error(`${cmd} ${args.filter((a) => !a.includes("=")).join(" ")} 실패${r.stderr ? ": " + r.stderr.slice(0, 300) : ""}`);
  return r.stdout || "";
}

/** 표준 입력으로 값을 넘긴다 (비밀값을 명령행 인자에 두지 않기 위해) */
function runWithInput(cmd, args, input, env = {}) {
  const r = spawnSync(cmd, args, { input, encoding: "utf8", env: { ...process.env, ...env }, cwd: ROOT });
  if (r.status !== 0) throw new Error(`${cmd} 실패: ${(r.stderr || "").slice(0, 200)}`);
  return r.stdout || "";
}

async function sql(token, ref, query) {
  return api(token, "POST", `/v1/projects/${ref}/database/query`, { query });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 아침(매일)과 밤(일요일) 푸시 예약 SQL. setup-push-schedule.mjs 와 같은 내용 */
export function pushCronSql(supabaseUrl) {
  const job = (name, cron, slot) => `
    do $$ begin
      if exists (select 1 from cron.job where jobname = '${name}') then perform cron.unschedule('${name}'); end if;
    end $$;
    select cron.schedule('${name}', '${cron}', $job$
      select net.http_post(
        url := '${supabaseUrl}/functions/v1/daily-push',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
        body := '{"slot":"${slot}"}'::jsonb
      );
    $job$);`;
  return [
    "do $$ begin if exists (select 1 from cron.job where jobname = 'daily-hexagram-push') then perform cron.unschedule('daily-hexagram-push'); end if; end $$;",
    job("push-morning", "30 22 * * *", "morning"),
    job("push-sunday-night", "30 12 * * 0", "evening"),
  ].join("\n");
}

async function main() {
  console.log("나만의 정통주역운세 Supabase 자동 설정을 시작합니다.");

  // 0. 토큰
  let token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    console.log("\nSupabase 개인 액세스 토큰이 필요합니다. https://supabase.com/dashboard/account/tokens 에서 만든 뒤 붙여 넣으세요.");
    token = await askHidden("액세스 토큰 (입력해도 화면에 보이지 않습니다): ");
  }
  if (!token) fail("토큰이 비어 있습니다.");
  const envTok = { SUPABASE_ACCESS_TOKEN: token };

  // gh 로그인 확인
  const gh = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  if (gh.status !== 0) fail("GitHub CLI에 로그인되어 있지 않습니다. `gh auth login`을 먼저 실행하세요.");

  // 1. 조직
  log(1, "조직을 확인합니다");
  const orgs = await api(token, "GET", "/v1/organizations");
  if (!orgs.length) fail("Supabase 조직이 없습니다. 대시보드에서 먼저 조직을 만드세요.");
  const orgId = process.env.SUPABASE_ORG_ID || orgs[0].id;
  console.log(`조직: ${orgs.find((o) => o.id === orgId)?.name ?? orgId}`);

  // 2. 프로젝트 (있으면 재사용)
  log(2, `프로젝트 "${PROJECT_NAME}"를 확인하거나 만듭니다`);
  let projects = await api(token, "GET", "/v1/projects");
  let project = projects.find((p) => p.name === PROJECT_NAME);
  let dbPass = process.env.SUPABASE_DB_PASSWORD || null;
  if (!project) {
    dbPass = randomBytes(24).toString("base64url");
    project = await api(token, "POST", "/v1/projects", {
      name: PROJECT_NAME,
      organization_id: orgId,
      region: REGION,
      db_pass: dbPass,
      plan: "free",
    });
    console.log("새 프로젝트를 만들었습니다. DB 비밀번호는 아래 GitHub Secret SUPABASE_DB_PASSWORD 에 저장합니다.");
    runWithInput("gh", ["secret", "set", "SUPABASE_DB_PASSWORD", "--repo", GITHUB_REPO], dbPass);
  } else {
    console.log("기존 프로젝트를 재사용합니다.");
  }
  const ref = project.id;

  // 준비될 때까지 대기
  process.stdout.write("프로젝트가 준비되기를 기다립니다");
  for (let i = 0; i < 60; i++) {
    projects = await api(token, "GET", "/v1/projects");
    const p = projects.find((x) => x.id === ref);
    if (p && p.status === "ACTIVE_HEALTHY") break;
    process.stdout.write(".");
    await sleep(5000);
    if (i === 59) fail("프로젝트가 준비되지 않았습니다. 잠시 후 다시 실행하세요.");
  }
  console.log(" 준비됨");

  // 3. API 키
  log(3, "API 키를 가져옵니다");
  const keys = await api(token, "GET", `/v1/projects/${ref}/api-keys?reveal=true`);
  const anon = keys.find((k) => k.name === "anon")?.api_key;
  // 새 형식 비밀 키(sb_secret_)를 우선하고, 없으면 예전 service_role 키. 예전 키는 새 프로젝트에서 꺼져 있을 수 있다
  const service = keys.find((k) => k.type === "secret")?.api_key ?? keys.find((k) => k.name === "service_role")?.api_key;
  if (!anon || !service) fail("anon 또는 service_role 키를 찾지 못했습니다.");
  const supabaseUrl = `https://${ref}.supabase.co`;
  console.log("NEXT_PUBLIC_SUPABASE_URL 준비됨, NEXT_PUBLIC_SUPABASE_ANON_KEY 준비됨, service_role 준비됨(출력하지 않음)");

  // 4. 스키마
  log(4, "테이블과 보안 정책을 적용합니다");
  const migration = readFileSync(join(ROOT, "supabase/migrations/0001_init.sql"), "utf8");
  await sql(token, ref, migration);
  console.log("적용 완료");

  // 5. 이메일 로그인 설정
  log(5, "이메일 링크 로그인과 리디렉션 주소를 설정합니다");
  await api(token, "PATCH", `/v1/projects/${ref}/config/auth`, {
    site_url: SITE_URL,
    uri_allow_list: `${SITE_URL},${LOCAL_URL}`,
    external_email_enabled: true,
    mailer_autoconfirm: true,
  });
  console.log("설정 완료");

  // 6. VAPID 키
  log(6, "푸시 알림용 VAPID 키를 만듭니다");
  const vapidRaw = run("npx", ["-y", "web-push", "generate-vapid-keys", "--json"], { quiet: true });
  const vapid = JSON.parse(vapidRaw.trim());
  console.log("VAPID 공개 키 준비됨, 비밀 키 준비됨(출력하지 않음)");

  // 7. Edge Function 배포 + 비밀값
  log(7, "daily-push 함수를 배포하고 비밀값을 등록합니다");
  run("npx", ["-y", "supabase", "functions", "deploy", "daily-push", "--no-verify-jwt", "--use-api", "--project-ref", ref], { env: envTok, quiet: true });
  const tmp = mkdtempSync(join(tmpdir(), "jm-"));
  const envFile = join(tmp, "secrets.env");
  writeFileSync(envFile, `VAPID_PUBLIC_KEY=${vapid.publicKey}\nVAPID_PRIVATE_KEY=${vapid.privateKey}\nVAPID_SUBJECT=mailto:${process.env.VAPID_SUBJECT_EMAIL || "omnisis01@gmail.com"}\n`, { mode: 0o600 });
  try {
    run("npx", ["-y", "supabase", "secrets", "set", "--env-file", envFile, "--project-ref", ref], { env: envTok, quiet: true });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log("배포와 비밀값 등록 완료");

  // 8. 매일 아침 7시(KST) 예약
  log(8, "매일 아침 7시 푸시를 예약합니다");
  await sql(
    token,
    ref,
    `
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    do $$
    begin
      if exists (select 1 from vault.secrets where name = 'service_role_key') then
        perform vault.update_secret((select id from vault.secrets where name = 'service_role_key'), '${service}');
      else
        perform vault.create_secret('${service}', 'service_role_key');
      end if;
    end $$;
    ${pushCronSql(supabaseUrl)}
    `,
  );
  console.log("예약 완료 (아침 한국 07:30 매일, 밤 한국 21:30 일요일만)");

  // 9. GitHub Secrets
  log(9, "GitHub 저장소에 공개 키를 등록합니다");
  for (const [name, value] of [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anon],
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", vapid.publicKey],
  ]) {
    runWithInput("gh", ["secret", "set", name, "--repo", GITHUB_REPO], value);
    console.log(`${name} 설정됨`);
  }

  // 10. 배포 실행
  log(10, "배포 워크플로를 실행합니다");
  run("gh", ["workflow", "run", "deploy.yml", "--repo", GITHUB_REPO], { quiet: true });
  console.log("실행 요청 완료. 1~2분 뒤 사이트에 로그인 카드가 나타납니다.");

  if (process.argv.includes("--write-env-local")) {
    writeFileSync(join(ROOT, ".env.local"), `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}\n`, { mode: 0o600 });
    console.log("\n.env.local 파일을 만들었습니다(로컬 개발용). 이 폴더가 클라우드 동기화 폴더라면 로컬 폴더로 옮기는 것을 권합니다.");
  }

  console.log(`\n완료. 프로젝트 ref: ${ref}\n확인: ${SITE_URL} 에서 홈의 계정 카드로 로그인 링크를 받아 보세요.`);
  console.log("푸시를 바로 시험하려면 Supabase 대시보드 > Edge Functions > daily-push 에서 Invoke 하세요.");
}

// 다른 스크립트가 pushCronSql 만 가져다 쓸 때는 실행하지 않는다
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => fail(e.message));
