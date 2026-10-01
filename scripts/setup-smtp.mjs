#!/usr/bin/env node
// 로그인 링크 메일을 보낼 발송 서버(SMTP)를 Supabase에 연결하는 스크립트
// 실행: node scripts/setup-smtp.mjs
// Supabase 기본 발송은 프로젝트 팀원 주소로만, 시간당 몇 통만 보내므로 실제 사용자에게 보내려면 이 설정이 필요합니다.
// 가장 간단한 방법은 Gmail 앱 비밀번호(하루 500통)이고, 규모가 커지면 Resend, SendGrid 같은 서비스로 바꾸면 됩니다.
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { getSupabaseToken } from "./token.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
void ROOT;
const API = "https://api.supabase.com";
const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || "jooyeok-master";

const fail = (m) => {
  console.error(`\n오류: ${m}`);
  process.exit(1);
};

function ask(prompt, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(prompt, (a) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(a.trim());
    });
    if (hidden) rl._writeToOutput = () => {};
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
  console.log("나만의 정통주역운세 로그인 메일 발송 서버(SMTP) 설정을 시작합니다.");
  console.log("Gmail을 쓰려면: Google 계정 > 보안 > 2단계 인증 켜기 > 앱 비밀번호 만들기(16자리). 그 비밀번호를 아래에 넣습니다.\n");
  const token = (await getSupabaseToken());
  if (!token) fail("토큰이 비어 있습니다.");
  console.log("Gmail이면 아래 1, 2번은 아무것도 넣지 말고 Enter만 누르세요. 앱 비밀번호는 4번에서만 넣습니다.\n");
  let host = "";
  for (;;) {
    host = (await ask("1) 메일 서버 주소 (Gmail이면 그냥 Enter) [smtp.gmail.com]: ")) || "smtp.gmail.com";
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) break;
    console.log("   서버 주소 형식이 아니에요. 비밀번호라면 여기가 아니라 4번에 넣어 주세요. 다시 입력하거나 Enter를 누르세요.");
  }
  let port = 465;
  for (;;) {
    const v = (await ask("2) 포트 (Gmail이면 그냥 Enter) [465]: ")) || "465";
    if (/^\d{2,5}$/.test(v)) { port = Number(v); break; }
    console.log("   숫자만 넣어 주세요. Gmail이면 Enter를 누르세요.");
  }
  let user = "";
  for (;;) {
    user = await ask("3) Gmail 주소 전체 (예: name@gmail.com): ");
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)) break;
    console.log("   이메일 주소 형식이 아니에요. 다시 넣어 주세요.");
  }
  const pass = await ask("4) 앱 비밀번호 16자리 (화면에 안 보임, 띄어쓰기 있어도 됨): ", true);
  if (!pass) fail("비밀번호가 비어 있습니다.");
  const sender = (await ask(`5) 보내는 사람 주소 (그냥 Enter) [${user}]: `)) || user;
  const senderName = (await ask("6) 보내는 사람 이름 (그냥 Enter) [나만의 정통주역운세]: ")) || "나만의 정통주역운세";

  const projects = await api(token, "GET", "/v1/projects");
  const project = projects.find((p) => p.name === PROJECT_NAME);
  if (!project) fail(`프로젝트 ${PROJECT_NAME}가 없습니다.`);
  const ref = project.id;

  await api(token, "PATCH", `/v1/projects/${ref}/config/auth`, {
    smtp_host: host,
    smtp_port: String(port),
    smtp_user: user,
    smtp_pass: pass.replace(/\s+/g, ""),
    smtp_admin_email: sender,
    smtp_sender_name: senderName,
    smtp_max_frequency: 30,
    rate_limit_email_sent: 60,
    mailer_subjects_magic_link: "나만의 정통주역운세 로그인 링크예요",
  });
  console.log("\n완료. 이제 로그인 링크가 이 발송 서버로 나갑니다(시간당 최대 60통).");
  console.log("확인: 앱 홈의 계정 카드에 다른 이메일 주소를 넣고 링크가 오는지 보세요. 스팸함도 확인하세요.");
}

main().catch((e) => fail(e.message));
