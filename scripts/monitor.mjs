#!/usr/bin/env node
// 장애 감시: 사이트와 서버 상태를 보고 문제가 있으면 GitHub 이슈를 연다(GitHub가 대표님 메일로 알린다)
// 정상으로 돌아오면 같은 이슈에 알리고 닫는다. GitHub Actions(.github/workflows/monitor.yml)가 30분마다 실행한다
// 필요한 환경 변수: HEALTH_URL, HEALTH_TOKEN, GITHUB_TOKEN, GITHUB_REPOSITORY
const SITE = "https://skyjooyeok.com/";
const problems = [];
const notes = [];

async function check(name, fn) {
  try {
    await fn();
  } catch (e) {
    problems.push(`${name}: ${e.message}`);
  }
}

async function get(url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

await check("사이트 첫 화면", async () => {
  const r = await get(SITE);
  if (!r.ok) throw new Error(`응답 ${r.status}`);
  if (!(await r.text()).includes("주역")) throw new Error("내용이 비어 있어요");
});
await check("64괘 페이지", async () => {
  const r = await get(SITE + "hexagram/1/");
  if (!r.ok) throw new Error(`응답 ${r.status}`);
});

let h = null;
await check("서버(Supabase)", async () => {
  const r = await get(process.env.HEALTH_URL, { headers: { Authorization: `Bearer ${process.env.HEALTH_TOKEN}` } });
  if (!r.ok) throw new Error(`상태 함수 응답 ${r.status}`);
  h = await r.json();
  if (!h.ok) throw new Error("데이터베이스 응답 오류");
});

if (h) {
  if (!h.ai_key) problems.push("AI 풀이: 서버에 Anthropic 키가 없어요. 모두 기본 풀이로 나가는 중");
  if (h.ai_broken_2h > 0) problems.push(`AI 풀이: 최근 2시간에 AI 연결 실패 ${h.ai_broken_2h}건(키 만료, 크레딧 소진, Anthropic 오류일 수 있음). 이유: ${JSON.stringify(h.ai_fallback_reasons_24h)}`);
  const total = h.ai_done_24h + h.ai_fallback_24h;
  if (total >= 5 && h.ai_fallback_24h / total > 0.3) notes.push(`AI 풀이 대체 비율이 높아요: 24시간 ${h.ai_fallback_24h}/${total}`);
  if (h.push_subscribers > 0) {
    const last = h.push_last_run;
    const ageH = last ? (Date.now() - Date.parse(last.at)) / 3600e3 : Infinity;
    if (ageH > 26) problems.push(`아침 알림: 마지막 발송 기록이 ${Number.isFinite(ageH) ? Math.round(ageH) + "시간 전" : "없음"}이에요`);
    else if (last.props && last.props.total > 0 && !last.props.skipped && last.props.sent === 0) problems.push(`아침 알림: 마지막 발송에서 ${last.props.total}명 중 한 명도 받지 못했어요`);
  }
}

const repo = process.env.GITHUB_REPOSITORY;
const gh = async (path, init = {}) => {
  const r = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`GitHub ${path} ${r.status}`);
  return r.json();
};
const TITLE = "[장애 감시] 문제가 생겼어요";
const open = (await gh(`/issues?state=open&labels=monitor&per_page=5`)).filter((i) => i.title === TITLE);
const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

if (problems.length) {
  const body = `${now} 기준\n\n${problems.map((p) => `- ${p}`).join("\n")}${notes.length ? `\n\n참고\n${notes.map((n) => `- ${n}`).join("\n")}` : ""}\n\n상태: ${h ? "```json\n" + JSON.stringify(h, null, 2) + "\n```" : "서버 상태를 받지 못했어요"}`;
  if (open.length) await gh(`/issues/${open[0].number}/comments`, { method: "POST", body: JSON.stringify({ body: `아직 문제가 있어요.\n\n${body}` }) });
  else await gh(`/issues`, { method: "POST", body: JSON.stringify({ title: TITLE, body, labels: ["monitor"] }) });
  console.log("문제 발견:\n" + problems.join("\n"));
} else {
  for (const i of open) {
    await gh(`/issues/${i.number}/comments`, { method: "POST", body: JSON.stringify({ body: `${now} 기준 모두 정상으로 돌아왔어요.` }) });
    await gh(`/issues/${i.number}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
  }
  console.log("정상" + (notes.length ? `\n참고: ${notes.join(" / ")}` : ""));
}
