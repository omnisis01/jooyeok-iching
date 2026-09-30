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
  console.log("주역으로 보는 나의 운세 로그인 메일 발송 서버(SMTP) 설정을 시작합니다.");
  console.log("Gmail을 쓰려면: Google 계정 > 보안 > 2단계 인증 켜기 > 앱 비밀번호 만들기(16자리). 그 비밀번호를 아래에 넣습니다.\n");
  const token = process.env.SUPABASE_ACCESS_TOKEN || (await ask("Supabase 액세스 토큰 (화면에 안 보임): ", true));
  if (!token) fail("토큰이 비어 있습니다.");
  const host = (await ask("SMTP 서버 주소 [smtp.gmail.com]: ")) || "smtp.gmail.com";
  const port = Number((await ask("포트 [465]: ")) || 465);
  const user = await ask("SMTP 사용자(Gmail이면 이메일 주소 전체): ");
  if (!user) fail("사용자가 비어 있습니다.");
  const pass = await ask("SMTP 비밀번호 또는 앱 비밀번호 (화면에 안 보임): ", true);
  if (!pass) fail("비밀번호가 비어 있습니다.");
  const sender = (await ask(`보내는 사람 주소 [${user}]: `)) || user;
  const senderName = (await ask("보내는 사람 이름 [주역으로 보는 나의 운세]: ")) || "주역으로 보는 나의 운세";

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
    mailer_subjects_magic_link: "주역으로 보는 나의 운세 로그인 링크예요",
  });
  console.log("\n완료. 이제 로그인 링크가 이 발송 서버로 나갑니다(시간당 최대 60통).");
  console.log("확인: 앱 홈의 계정 카드에 다른 이메일 주소를 넣고 링크가 오는지 보세요. 스팸함도 확인하세요.");
}

main().catch((e) => fail(e.message));
