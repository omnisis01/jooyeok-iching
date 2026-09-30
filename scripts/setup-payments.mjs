#!/usr/bin/env node
// Stripe 결제(프리미엄)를 자동 설정하는 스크립트
// 실행: node scripts/setup-payments.mjs   (Supabase 액세스 토큰과 Stripe 비밀 키를 화면에 안 보이게 입력받는다)
// 하는 일: 상품과 가격 생성 → 웹훅 등록 → 두 Edge Function 배포와 비밀값 등록 → 스키마 확장 → GitHub Secret 등록 → 배포
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
const PRICE_KRW = Number(process.env.PREMIUM_PRICE_KRW || 4900);

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

async function stripe(key, method, path, form) {
  const res = await fetch("https://api.stripe.com" + path, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form ? new URLSearchParams(form).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path} 실패: ${json.error?.message ?? res.status}`);
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
  console.log("주역으로 보는 나의 운세 결제(프리미엄) 자동 설정을 시작합니다.");
  let token = process.env.SUPABASE_ACCESS_TOKEN || (await askHidden("Supabase 액세스 토큰 (화면에 안 보임): "));
  if (!token) fail("토큰이 비어 있습니다.");
  console.log("Stripe 대시보드 > 개발자 > API 키 에서 '비밀 키'(sk_test_ 로 시작하는 테스트 키)를 복사해 넣으세요.");
  const stripeKey = process.env.STRIPE_SECRET_KEY || (await askHidden("Stripe 비밀 키 (화면에 안 보임): "));
  if (!stripeKey.startsWith("sk_")) fail("Stripe 비밀 키 형식이 아닙니다. sk_test_ 또는 sk_live_ 로 시작해야 합니다.");
  const envTok = { SUPABASE_ACCESS_TOKEN: token };

  log(1, "Supabase 프로젝트를 찾습니다");
  const projects = await api(token, "GET", "/v1/projects");
  const project = projects.find((p) => p.name === PROJECT_NAME);
  if (!project) fail(`프로젝트 ${PROJECT_NAME}가 없습니다. 먼저 scripts/setup-supabase.mjs 를 실행하세요.`);
  const ref = project.id;
  const fnBase = `https://${ref}.supabase.co/functions/v1`;

  log(2, "Stripe 상품과 월 요금을 만듭니다 (이미 있으면 재사용)");
  const products = await stripe(stripeKey, "GET", "/v1/products?active=true&limit=100");
  let product = products.data.find((p) => p.metadata?.app === "jooyeok-master");
  if (!product) product = await stripe(stripeKey, "POST", "/v1/products", { name: "프리미엄", "metadata[app]": "jooyeok-master" });
  const prices = await stripe(stripeKey, "GET", `/v1/prices?product=${product.id}&active=true&limit=10`);
  let price = prices.data.find((p) => p.recurring?.interval === "month" && p.currency === "krw" && p.unit_amount === PRICE_KRW);
  if (!price) price = await stripe(stripeKey, "POST", "/v1/prices", { product: product.id, currency: "krw", unit_amount: String(PRICE_KRW), "recurring[interval]": "month" });
  console.log(`상품과 가격 준비됨 (월 ${PRICE_KRW}원)`);

  log(3, "Stripe 웹훅을 등록합니다");
  const hooks = await stripe(stripeKey, "GET", "/v1/webhook_endpoints?limit=100");
  const hookUrl = `${fnBase}/stripe-webhook`;
  let hook = hooks.data.find((h) => h.url === hookUrl);
  let whSecret = null;
  if (hook) {
    // 기존 웹훅의 서명 비밀은 다시 볼 수 없어 새로 만든다
    await stripe(stripeKey, "DELETE", `/v1/webhook_endpoints/${hook.id}`);
  }
  hook = await stripe(stripeKey, "POST", "/v1/webhook_endpoints", {
    url: hookUrl,
    "enabled_events[0]": "checkout.session.completed",
    "enabled_events[1]": "invoice.paid",
    "enabled_events[2]": "customer.subscription.updated",
    "enabled_events[3]": "customer.subscription.deleted",
  });
  whSecret = hook.secret;
  console.log("웹훅 등록 완료 (서명 비밀 준비됨, 출력하지 않음)");

  log(4, "스키마를 확장합니다");
  await api(token, "POST", `/v1/projects/${ref}/database/query`, { query: readFileSync(join(ROOT, "supabase/migrations/0002_premium.sql"), "utf8") });

  log(5, "결제 함수 두 개를 배포하고 비밀값을 등록합니다");
  run("npx", ["-y", "supabase", "functions", "deploy", "create-checkout", "--use-api", "--project-ref", ref], envTok);
  run("npx", ["-y", "supabase", "functions", "deploy", "stripe-webhook", "--no-verify-jwt", "--use-api", "--project-ref", ref], envTok);
  const tmp = mkdtempSync(join(tmpdir(), "jm-pay-"));
  const envFile = join(tmp, "secrets.env");
  writeFileSync(envFile, `STRIPE_SECRET_KEY=${stripeKey}\nSTRIPE_WEBHOOK_SECRET=${whSecret}\nSTRIPE_PRICE_ID=${price.id}\nSITE_URL=${SITE_URL}\n`, { mode: 0o600 });
  try {
    run("npx", ["-y", "supabase", "secrets", "set", "--env-file", envFile, "--project-ref", ref], envTok);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  console.log("배포와 비밀값 등록 완료");

  log(6, "앱에 결제 기능을 켭니다");
  runWithInput("gh", ["secret", "set", "NEXT_PUBLIC_PAYMENTS_ENABLED", "--repo", GITHUB_REPO], "true");
  run("gh", ["workflow", "run", "deploy.yml", "--repo", GITHUB_REPO]);
  console.log("NEXT_PUBLIC_PAYMENTS_ENABLED 설정됨, 배포 요청 완료");

  console.log(`\n완료. 1~2분 뒤 ${SITE_URL} 홈에 프리미엄 카드가 나타납니다.`);
  console.log("테스트 결제: 카드번호 4242 4242 4242 4242, 만료일은 미래 아무 날짜, CVC 아무 세 자리.");
  console.log("실제 판매를 시작하려면 Stripe 계정 활성화(사업자 정보) 후 라이브 키로 이 스크립트를 다시 실행하세요.");
}

main().catch((e) => fail(e.message));
