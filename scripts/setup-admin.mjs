#!/usr/bin/env node
// 관리자 설정: 관리자 표와 함수(0007_admin.sql)를 올리고, 이메일로 관리자를 추가하거나 뺀다
// 실행: node scripts/setup-admin.mjs                 (이메일을 물어본다)
//       node scripts/setup-admin.mjs 메일주소          (바로 추가)
//       node scripts/setup-admin.mjs --remove 메일주소 (관리자에서 빼기)
//       node scripts/setup-admin.mjs --list           (관리자 목록)
// 그 이메일로 사이트에 한 번 이상 로그인한 뒤에 실행해야 한다(계정이 있어야 추가된다)
import { readFileSync } from "node:fs";
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

const quote = (s) => `'${s.replace(/'/g, "''")}'`;

async function main() {
  const args = process.argv.slice(2);
  const remove = args[0] === "--remove";
  const list = args[0] === "--list";
  let email = (remove ? args[1] : list ? "" : args[0]) ?? "";

  let token = await getSupabaseToken();
  if (!token) fail("토큰이 비어 있습니다.");
  let projects;
  try {
    projects = await api(token, "GET", "/v1/projects");
  } catch (e) {
    if (!String(e.message).includes("(401)")) throw e;
    token = await renewSupabaseToken();
    if (!token) fail("토큰이 비어 있습니다.");
    projects = await api(token, "GET", "/v1/projects");
  }
  const project = projects.find((p) => p.name === PROJECT_NAME);
  if (!project) fail(`프로젝트 ${PROJECT_NAME}가 없습니다.`);
  const sql = (query) => api(token, "POST", `/v1/projects/${project.id}/database/query`, { query });

  console.log("[1] 관리자 표와 함수를 올립니다");
  await sql(readFileSync(join(ROOT, "supabase/migrations/0007_admin.sql"), "utf8"));
  console.log("완료");

  if (list) {
    const rows = await sql("select u.email, a.created_at from admins a join auth.users u on u.id = a.user_id order by a.created_at");
    console.log("\n관리자 목록");
    for (const r of rows) console.log(`- ${r.email}`);
    if (!rows.length) console.log("(없음)");
    return;
  }

  while (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    email = await ask(`\n[2] ${remove ? "관리자에서 뺄" : "관리자로 쓸"} 이메일 주소 (사이트에 로그인할 때 쓰는 주소): `);
  }
  const found = await sql(`select id from auth.users where lower(email) = lower(${quote(email)})`);
  if (!found.length) fail("이 이메일로 로그인한 계정이 없습니다. 먼저 사이트 홈의 계정 카드에서 이 이메일로 로그인한 뒤 다시 실행하세요.");

  if (remove) {
    await sql(`delete from admins where user_id = ${quote(found[0].id)}`);
    console.log(`\n${email} 계정을 관리자에서 뺐습니다.`);
  } else {
    await sql(`insert into admins (user_id) values (${quote(found[0].id)}) on conflict do nothing`);
    console.log(`\n${email} 계정을 관리자로 등록했습니다. 사이트를 새로 고치면 홈의 계정 카드에 "관리자 모드" 버튼이 보입니다.`);
  }
}

main().catch((e) => fail(e.message));
