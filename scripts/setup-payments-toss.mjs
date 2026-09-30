#!/usr/bin/env node
// 토스페이먼츠 정기결제(프리미엄)를 자동 설정하는 스크립트
// 실행: node scripts/setup-payments-toss.mjs
// 입력(화면에 안 보임): Supabase 액세스 토큰, 토스페이먼츠 시크릿 키, 클라이언트 키
// 하는 일: 함수 3개 배포와 비밀값 등록 → 스키마 확장 → 매일 아침 갱신 결제 예약 → GitHub Secrets 등록 → 배포
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { getSupabaseToken } from "./token.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://api.supabase.com";
const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || "jooyeok-master";
const SITE_URL = "https://omnisis01.github.io/jooyeok-iching/";
const GITHUB_REPO = "omnisis01/jooyeok-iching";
const PRICE_KRW = String(process.env.PREMIUM_PRICE_KRW || 4900);
const UNLOCK_KRW = String(process.env.UNLOCK_PRICE_KRW || 1000);

const log = (n, m) => console.log(`\n[${n}] ${m}`);
const fail = (m) => {
  console.error(`\n오류: ${m}`);
  process.exit(1);
};

async function askHidden(prompt) {
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

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", env: { ...process.env, ...env }, cwd: ROOT });
  if (r.status !== 0) throw new Error(`${cmd} 실패: ${(r.stderr || "").slice(0, 300)}`);
  return r.stdout || "";
}
function runWithInput(cmd, args, input) {
  const r = spawnSync(cmd, args, { input, encoding: "utf8", cwd: ROOT });
  if (r.status !== 0) throw new Error(`${cmd} 실패: ${(r.stderr || "").slice(0, 200)}`);
}

async function main() {
  console.log("주역으로 보는 나의 운세 토스페이먼츠 정기결제 자동 설정을 시작합니다.");
  console.log("가입 전이라면 토스페이먼츠 개발자센터(https://developers.tosspayments.com)의 문서용 테스트 키로도 시험할 수 있습니다.");
  const token = (await getSupabaseToken());
  if (!token) fail("토큰이 비어 있습니다.");
  const secretKey = process.env.TOSS_SECRET_KEY || (await askHidden("토스페이먼츠 시크릿 키 (test_sk_ 또는 live_sk_, 화면에 안 보임): "));
  if (!/^(test|live)_sk_/.test(secretKey)) fail("시크릿 키 형식이 아닙니다.");
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || (await askHidden("토스페이먼츠 클라이언트 키 (test_ck_ 또는 live_ck_, 화면에 안 보임): "));
  if (!/^(test|live)_ck_/.test(clientKey)) fail("클라이언트 키 형식이 아닙니다.");
  if (secretKey.startsWith("test_") !== clientKey.startsWith("test_")) fail("시크릿 키와 클라이언트 키는 같은 모드(테스트/라이브)여야 합니다.");
  const envTok = { SUPABASE_ACCESS_TOKEN: token };

  log(1, "Supabase 프로젝트를 찾습니다");
  const projects = await api(token, "GET", "/v1/projects");
  const project = projects.find((p) => p.name === PROJECT_NAME);
  if (!project) fail(`프로젝트 ${PROJECT_NAME}가 없습니다. 먼저 scripts/setup-supabase.mjs 를 실행하세요.`);
  const ref = project.id;
  const fnBase = `https://${ref}.supabase.co/functions/v1`;

  log(2, "스키마를 확장합니다");
  await api(token, "POST", `/v1/projects/${ref}/database/query`, { query: readFileSync(join(ROOT, "supabase/migrations/0002_premium.sql"), "utf8") });
  await api(token, "POST", `/v1/projects/${ref}/database/query`, { query: readFileSync(join(ROOT, "supabase/migrations/0003_toss.sql"), "utf8") });
  await api(token, "POST", `/v1/projects/${ref}/database/query`, { query: readFileSync(join(ROOT, "supabase/migrations/0004_unlocks.sql"), "utf8") });

  log(3, "결제 함수 네 개를 배포하고 비밀값을 등록합니다");
  run("npx", ["-y", "supabase", "functions", "deploy", "toss-payment-confirm", "--use-api", "--project-ref", ref], envTok);
  run("npx", ["-y", "supabase", "functions", "deploy", "toss-billing-confirm", "--use-api", "--project-ref", ref], envTok);
  run("npx", ["-y", "supabase", "functions", "deploy", "toss-billing-cancel", "--use-api", "--project-ref", ref], envTok);
  run("npx", ["-y", "supabase", "functions", "deploy", "toss-billing-renew", "--no-verify-jwt", "--use-api", "--project-ref", ref], envTok);
  const tmp = mkdtempSync(join(tmpdir(), "jm-toss-"));
  const envFile = join(tmp, "secrets.env");
  writeFileSync(envFile, `TOSS_SECRET_KEY=${secretKey}\nPREMIUM_PRICE_KRW=${PRICE_KRW}\nUNLOCK_PRICE_KRW=${UNLOCK_KRW}\nSITE_URL=${SITE_URL}\n`, { mode: 0o600 });
  try {
    run("npx", ["-y", "supabase", "secrets", "set", "--env-file", envFile, "--project-ref", ref], envTok);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log("배포와 비밀값 등록 완료");

  log(4, "매일 아침 6시(KST) 갱신 결제를 예약합니다");
  await api(token, "POST", `/v1/projects/${ref}/database/query`, {
    query: `
    create extension if not exists pg_cron;
    create extension if not exists pg_net;
    do $$ begin
      if exists (select 1 from cron.job where jobname = 'toss-billing-renew') then perform cron.unschedule('toss-billing-renew'); end if;
    end $$;
    select cron.schedule('toss-billing-renew', '0 21 * * *', $job$
      select net.http_post(
        url := '${fnBase}/toss-billing-renew',
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
        body := '{}'::jsonb
      );
    $job$);`,
  });
  console.log("예약 완료");

  log(5, "앱에 결제 기능을 켭니다");
  runWithInput("gh", ["secret", "set", "NEXT_PUBLIC_TOSS_CLIENT_KEY", "--repo", GITHUB_REPO], clientKey);
  runWithInput("gh", ["secret", "set", "NEXT_PUBLIC_PAYMENT_PROVIDER", "--repo", GITHUB_REPO], "toss");
  runWithInput("gh", ["secret", "set", "NEXT_PUBLIC_PREMIUM_PRICE_KRW", "--repo", GITHUB_REPO], PRICE_KRW);
  runWithInput("gh", ["secret", "set", "NEXT_PUBLIC_UNLOCK_PRICE_KRW", "--repo", GITHUB_REPO], UNLOCK_KRW);
  runWithInput("gh", ["secret", "set", "NEXT_PUBLIC_PAYMENTS_ENABLED", "--repo", GITHUB_REPO], "true");
  run("gh", ["workflow", "run", "deploy.yml", "--repo", GITHUB_REPO]);
  console.log("GitHub Secrets 설정됨, 배포 요청 완료");

  console.log(`\n완료. 1~2분 뒤 ${SITE_URL} 홈에 프리미엄 카드가 나타납니다.`);
  console.log("테스트 모드 시험: 카드 등록 창에서 아무 카드번호(예: 4330 1234 5678 9012), 미래 만료일, 생년월일 6자리, 비밀번호 앞 2자리를 넣으면 됩니다. 실제 청구는 되지 않습니다.");
}

main().catch((e) => fail(e.message));
