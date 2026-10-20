#!/usr/bin/env node
// 마이그레이션 파일 하나를 Supabase에 올린다(키체인의 토큰 사용)
// 실행: node scripts/apply-sql.mjs supabase/migrations/0010_ops.sql
import { readFileSync } from "node:fs";
import { getSupabaseToken, renewSupabaseToken } from "./token.mjs";

const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || "jooyeok-master";
const file = process.argv[2];
if (!file) {
  console.error("올릴 SQL 파일 경로를 적어 주세요");
  process.exit(1);
}

async function call(token, method, path, body) {
  const res = await fetch("https://api.supabase.com" + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} 실패 (${res.status}): ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

let token = await getSupabaseToken();
let projects;
try {
  projects = await call(token, "GET", "/v1/projects");
} catch (e) {
  if (!String(e.message).includes("(401)")) throw e;
  token = await renewSupabaseToken();
  projects = await call(token, "GET", "/v1/projects");
}
const project = projects.find((p) => p.name === PROJECT_NAME);
if (!project) throw new Error(`프로젝트 ${PROJECT_NAME}가 없습니다`);
await call(token, "POST", `/v1/projects/${project.id}/database/query`, { query: readFileSync(file, "utf8") });
console.log(`${file} 를 올렸습니다`);
