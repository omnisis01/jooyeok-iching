// 관리자 모드: 운영 현황(사용자, 결제, 알림)과 최근 사용 기록. 관리자 계정으로 로그인했을 때만 열린다
"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { fetchAdminDashboard, fetchIsAdmin, type AdminDashboard } from "@/lib/admin";
import { cloudEnabled } from "@/lib/supabase";

// 하루 표에 보일 지표: [기록 이름, 제목, 사람 수로 셀지]
const COLUMNS: [string, string, boolean][] = [
  ["app_open", "방문", true],
  ["cast_done", "점 완료", false],
  ["quota_exhausted", "횟수 소진", true],
  ["login_done", "로그인", true],
  ["share_image", "이미지 공유", false],
  ["deep_view", "유료 카드 노출", true],
  ["deep_buy_click", "구매 클릭", false],
];

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export default function AdminScreen() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await fetchAdminDashboard(14));
    } catch (e) {
      setError(e instanceof Error ? e.message : "운영 현황을 불러오지 못했어요");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetchIsAdmin().then((v) => {
      if (!alive) return;
      setAdmin(v);
      if (v) void load();
    });
    return () => {
      alive = false;
    };
  }, []);

  if (admin === null) return <p className="py-10 text-center text-sm text-muted">확인하는 중…</p>;
  if (!cloudEnabled || !admin)
    return (
      <section className="rounded-3xl bg-card p-6 text-center shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <ShieldCheck size={28} className="mx-auto text-muted" />
        <p className="mt-3 font-bold">관리자 계정으로 로그인해야 열 수 있어요</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">홈의 계정 카드에서 관리자로 등록한 이메일로 로그인해 주세요.</p>
        <a href="#home" className="mt-4 inline-block rounded-full bg-background px-5 py-2 text-sm font-semibold">
          홈으로
        </a>
      </section>
    );

  // 날짜별로 지표를 모은다
  const byDay = new Map<string, Record<string, { n: number; people: number }>>();
  for (const r of data?.days ?? []) {
    const row = byDay.get(r.day) ?? {};
    row[r.name] = { n: r.n, people: r.people };
    byDay.set(r.day, row);
  }
  const days = [...byDay.keys()].sort().reverse();
  const supabaseRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1];

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-bold">
            <ShieldCheck size={18} className="text-vermilion" /> 관리자 모드
          </p>
          <button onClick={load} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
            <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> 새로 고침
          </button>
        </div>
        <ul className="mt-3 space-y-1 text-sm leading-relaxed text-foreground/80">
          <li>이 계정은 점 횟수 제한이 없어요.</li>
          <li>결과 화면의 &ldquo;육효로 더 깊이 들여다보기&rdquo;가 결제 없이 열려요. 결제를 켜기 전에도 미리 볼 수 있어요.</li>
        </ul>
        {error ? <p className="mt-3 text-sm text-vermilion">{error}</p> : null}
      </section>

      {data ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="전체 가입자" value={`${data.users}명`} sub={`오늘 +${data.users_today}`} />
            <Stat label="Pro 이용 중" value={`${data.pro}명`} />
            <Stat label="아침 알림 구독" value={`${data.push_subs}개`} />
            <Stat label="건별 결제" value={`${data.unlocks}건`} sub={`오늘 ${data.unlocks_today}건`} />
            <Stat label="결제 금액" value={won(data.paid_total)} sub={`오늘 ${won(data.paid_today)}`} />
            <Stat label="기준일" value={data.today} sub="한국 시간" />
          </section>

          <section className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
            <p className="font-bold">최근 14일 사용 기록</p>
            <p className="mt-1 text-xs text-muted">방문, 횟수 소진, 로그인, 유료 카드 노출은 사람 수, 나머지는 횟수예요.</p>
            {days.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-right text-sm">
                  <thead>
                    <tr className="text-xs text-muted">
                      <th className="py-2 text-left font-semibold">날짜</th>
                      {COLUMNS.map(([k, t]) => (
                        <th key={k} className="px-2 py-2 font-semibold">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((d) => (
                      <tr key={d} className="border-t border-border">
                        <td className="py-2 text-left font-semibold">{d.slice(5)}</td>
                        {COLUMNS.map(([k, , people]) => {
                          const v = byDay.get(d)?.[k];
                          return (
                            <td key={k} className="px-2 py-2 tabular-nums">
                              {v ? (people ? v.people : v.n) : 0}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">아직 기록이 없어요.</p>
            )}
          </section>
        </>
      ) : null}

      {supabaseRef ? (
        <section className="rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
          <p className="font-bold">바로 가기</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Shortcut href={`https://supabase.com/dashboard/project/${supabaseRef}/auth/users`} label="가입자 목록 (Supabase)" />
            <Shortcut href={`https://supabase.com/dashboard/project/${supabaseRef}/editor`} label="데이터 표 (Supabase)" />
            <Shortcut href="https://github.com/omnisis01/jooyeok-iching/actions" label="배포 상태 (GitHub)" />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

function Shortcut({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-sm font-semibold transition hover:bg-border/60">
      {label} <ExternalLink size={13} />
    </a>
  );
}
