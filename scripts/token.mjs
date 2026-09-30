// Supabase 액세스 토큰을 구하는 공용 함수. 순서: 환경 변수 → macOS 키체인 → 화면에 안 보이는 입력(그 뒤 키체인에 저장 제안)
// 토큰 값은 절대 출력하거나 파일에 쓰지 않는다. 키체인 항목 이름: jooyeok-supabase-token
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const SERVICE = "jooyeok-supabase-token";

export function ask(prompt, hidden = false) {
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

function fromKeychain() {
  if (process.platform !== "darwin") return null;
  const r = spawnSync("security", ["find-generic-password", "-s", SERVICE, "-w"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

function toKeychain(token) {
  if (process.platform !== "darwin") return false;
  const r = spawnSync("security", ["add-generic-password", "-U", "-s", SERVICE, "-a", process.env.USER || "user", "-w", token], { encoding: "utf8" });
  return r.status === 0;
}

/** 토큰을 돌려준다. 새로 입력받았으면 키체인에 저장할지 묻는다 */
export async function getSupabaseToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const saved = fromKeychain();
  if (saved) {
    console.log("키체인에 저장된 Supabase 토큰을 씁니다.");
    return saved;
  }
  const token = await ask("Supabase 액세스 토큰 (화면에 안 보임): ", true);
  if (!token) return "";
  if (process.platform === "darwin") {
    const yes = (await ask("이 맥의 키체인에 저장해 다음부터 묻지 않게 할까요? [Y/n]: ")).toLowerCase();
    if (yes === "" || yes === "y") console.log(toKeychain(token) ? "키체인에 저장했어요." : "키체인 저장에 실패했어요. 이번만 씁니다.");
  }
  return token;
}
