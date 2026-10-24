// 카카오 로그인 연결: Supabase 인증에 카카오 제공자를 켠다
// 준비물: 카카오 개발자 콘솔(developers.kakao.com)에서 만든 앱의 REST API 키와 Client Secret
// 사용: node scripts/setup-kakao.mjs  (키는 화면에 안 보이게 입력, 어디에도 저장하지 않음)
import { createInterface } from "node:readline";
import { ask, getSupabaseToken } from "./token.mjs";

const API = "https://api.supabase.com";
const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || "jooyeok-master";

async function api(token, method, path, body) {
  const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

console.log("하늘주역 카카오 로그인 설정을 시작합니다.\n");
const token = await getSupabaseToken();
if (!token) {
  console.log("Supabase 토큰이 없어 멈춥니다.");
  process.exit(1);
}
const projects = await api(token, "GET", "/v1/projects");
const project = projects.find((p) => p.name === PROJECT_NAME);
if (!project) {
  console.log(`프로젝트 ${PROJECT_NAME}가 없습니다.`);
  process.exit(1);
}
const callback = `https://${project.id}.supabase.co/auth/v1/callback`;

console.log("카카오 개발자 콘솔에서 먼저 해 둘 것:");
console.log("  1) 내 애플리케이션 → 앱 추가 (앱 이름: 하늘주역)");
console.log("  2) 앱 설정 → 플랫폼 → Web 사이트 도메인: https://skyjooyeok.com");
console.log("  3) 제품 설정 → 카카오 로그인 → 활성화 ON, Redirect URI에 아래 주소 등록");
console.log(`     ${callback}`);
console.log("  4) 카카오 로그인 → 동의항목: 닉네임(필수), 카카오계정(이메일)(필수, 비즈 앱 필요)");
console.log("  5) 카카오 로그인 → 보안 → Client Secret 생성, 활성화 ON");
console.log("  6) 앱 설정 → 앱 키 → REST API 키 복사\n");

const clientId = (await ask("REST API 키 (화면에 안 보임): ", true)).trim();
const secret = (await ask("Client Secret (화면에 안 보임): ", true)).trim();
if (!clientId || !secret) {
  console.log("값이 비어 멈춥니다. 아무것도 바꾸지 않았어요.");
  process.exit(1);
}

await api(token, "PATCH", `/v1/projects/${project.id}/config/auth`, {
  external_kakao_enabled: true,
  external_kakao_client_id: clientId,
  external_kakao_secret: secret,
});
const cfg = await api(token, "GET", `/v1/projects/${project.id}/config/auth`);
console.log(`\n카카오 로그인 ${cfg.external_kakao_enabled ? "켜졌어요" : "설정 확인 필요"}. 사이트의 설정 → 계정에서 "카카오로 시작하기"를 눌러 확인해 보세요.`);
