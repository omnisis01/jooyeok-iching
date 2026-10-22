// 관리자 모드의 문의, 결제, 후기 탭. 모든 동작은 서버의 관리자 함수가 권한을 다시 확인한다
"use client";

import { useEffect, useState } from "react";
import { Mail, Star } from "lucide-react";
import {
  INQUIRY_LABEL,
  adminFeatureReview,
  adminGrantPro,
  adminInquiries,
  adminPayments,
  adminReplyInquiry,
  adminReviews,
  type AdminPayments,
  type Inquiry,
  type Review,
} from "@/lib/ops";
import { HEXAGRAMS } from "@/data/hexagrams";
import { categoryOf } from "@/lib/categories";

const card = "rounded-3xl bg-card p-5 shadow-[0_6px_30px_rgba(31,29,26,0.06)]";
const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function InquiriesPanel() {
  const [filter, setFilter] = useState<"new" | "all">("new");
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (f = filter) => {
    setError(null);
    try {
      setItems(await adminInquiries(f === "new" ? "new" : null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오지 못했어요");
    }
  };

  useEffect(() => {
    let alive = true;
    adminInquiries("new")
      .then((r) => alive && setItems(r))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "불러오지 못했어요"));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <p className="font-bold">문의함</p>
        <div className="flex gap-1 rounded-full bg-background p-1 text-xs font-semibold">
          {(["new", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                void load(f);
              }}
              className={`rounded-full px-3 py-1 ${filter === f ? "bg-foreground text-card" : "text-muted"}`}
            >
              {f === "new" ? "새 문의" : "전체"}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-vermilion">{error}</p> : null}
      {items && !items.length ? <p className="mt-3 text-sm text-muted">{filter === "new" ? "새 문의가 없어요." : "문의가 없어요."}</p> : null}
      <div className="mt-3 space-y-3">
        {items?.map((q) => <InquiryItem key={q.id} q={q} onDone={() => load()} />)}
      </div>
    </section>
  );
}

function InquiryItem({ q, onDone }: { q: Inquiry; onDone: () => void }) {
  const [reply, setReply] = useState(q.reply ?? "");
  const [busy, setBusy] = useState(false);
  const save = async (status: Inquiry["status"]) => {
    setBusy(true);
    try {
      await adminReplyInquiry(q.id, reply, status);
      onDone();
    } finally {
      setBusy(false);
    }
  };
  const mailto = q.email ? `mailto:${q.email}?subject=${encodeURIComponent("[하늘주역] 문의 답변")}&body=${encodeURIComponent(`${reply}\n\n----- 보내 주신 문의 -----\n${q.message}`)}` : null;
  return (
    <div className="rounded-2xl bg-background p-4 text-sm leading-relaxed">
      <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          <b className="text-foreground">{INQUIRY_LABEL[q.category]}</b> {when(q.created_at)} {q.email ?? ""} {q.member ? "(회원)" : "(비회원)"}
        </span>
        <span>{q.status === "new" ? "새 문의" : q.status === "answered" ? "답변 완료" : "마무리"}</span>
      </p>
      <p className="mt-2 whitespace-pre-wrap">{q.message}</p>
      <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} placeholder="답변(회원은 앱의 내 문의에서 보여요)" className="mt-2 w-full resize-none rounded-xl bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-vermilion/30" />
      <div className="mt-2 flex flex-wrap gap-2">
        <button disabled={busy || !reply.trim()} onClick={() => save("answered")} className="rounded-full bg-foreground px-4 py-1.5 text-xs font-bold text-card disabled:opacity-40">
          답변 저장
        </button>
        <button disabled={busy} onClick={() => save("closed")} className="rounded-full bg-card px-4 py-1.5 text-xs font-semibold">
          마무리
        </button>
        {mailto && !q.member ? (
          <a href={mailto} className="inline-flex items-center gap-1 rounded-full bg-card px-4 py-1.5 text-xs font-semibold">
            <Mail size={12} /> 메일로 답장 쓰기
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function PaymentsPanel() {
  const [data, setData] = useState<AdminPayments | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(30);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () =>
    adminPayments()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "불러오지 못했어요"));

  useEffect(() => {
    let alive = true;
    adminPayments()
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "불러오지 못했어요"));
    return () => {
      alive = false;
    };
  }, []);

  const grant = async (d: number) => {
    setMsg(null);
    try {
      const r = await adminGrantPro(email, d);
      setMsg(r.premium_until ? `${email}: ${new Date(r.premium_until).toLocaleDateString("ko-KR")}까지 Pro` : `${email}: Pro를 거뒀어요`);
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "처리하지 못했어요");
    }
  };

  return (
    <div className="space-y-5">
      <section className={card}>
        <p className="font-bold">Pro 손으로 주기</p>
        <p className="mt-1 text-xs text-muted">오류 보상, 이벤트 당첨 등에 써요. 이미 Pro면 남은 기간에 더해져요. 0일은 Pro를 거둬요.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="가입한 이메일" className="min-w-0 flex-1 rounded-2xl bg-background px-4 py-2.5 text-sm outline-none" />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-2xl bg-background px-3 py-2.5 text-sm">
            {[7, 30, 90, 365].map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
          <button disabled={!email.includes("@")} onClick={() => grant(days)} className="rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-card disabled:opacity-40">
            주기
          </button>
          <button disabled={!email.includes("@")} onClick={() => window.confirm(`${email}의 Pro를 거둘까요?`) && grant(0)} className="rounded-full bg-background px-4 py-2.5 text-sm font-semibold disabled:opacity-40">
            거두기
          </button>
        </div>
        {msg ? <p className="mt-2 text-sm text-gold-soft">{msg}</p> : null}
      </section>

      <section className={card}>
        <p className="font-bold">Pro 이용 중 {data ? `${data.pro.length}명` : ""}</p>
        {error ? <p className="mt-2 text-sm text-vermilion">{error}</p> : null}
        <ul className="mt-2 space-y-1 text-sm">
          {data?.pro.map((p) => (
            <li key={p.email} className="flex justify-between rounded-xl bg-background px-3 py-2">
              <span className="truncate">{p.email}</span>
              <span className="shrink-0 text-muted">
                {new Date(p.premium_until).toLocaleDateString("ko-KR")}까지{p.billing_status ? `, ${p.billing_status}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <p className="font-bold">최근 결제</p>
        <p className="mt-1 text-xs text-muted">환불은 토스페이먼츠 상점관리자에서 하고, 필요하면 위에서 Pro를 거둬요.</p>
        {data && !data.payments.length ? <p className="mt-2 text-sm text-muted">아직 결제가 없어요.</p> : null}
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <tbody>
              {data?.payments.map((p) => (
                <tr key={p.order_id} className="border-t border-border">
                  <td className="py-2 text-muted">{when(p.created_at)}</td>
                  <td className="py-2">{p.email ?? "-"}</td>
                  <td className="py-2 text-right tabular-nums">{p.amount.toLocaleString("ko-KR")}원</td>
                  <td className={`py-2 pl-3 ${p.status === "DONE" ? "text-jade" : "text-vermilion"}`}>{p.status === "DONE" ? "완료" : p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function ReviewsPanel() {
  const [items, setItems] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    adminReviews()
      .then((r) => alive && setItems(r))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "불러오지 못했어요"));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = async (r: Review) => {
    await adminFeatureReview(r.id, !r.featured);
    setItems((prev) => prev?.map((x) => (x.id === r.id ? { ...x, featured: !x.featured && x.public_ok } : x)) ?? null);
  };

  const avg = items?.length ? (items.reduce((a, r) => a + r.rating, 0) / items.length).toFixed(1) : null;

  return (
    <section className={card}>
      <p className="font-bold">
        후기 {items ? `${items.length}개` : ""} {avg ? <span className="font-normal text-muted">평균 {avg}점</span> : null}
      </p>
      <p className="mt-1 text-xs text-muted">공개에 동의한 후기만 &ldquo;홈에 보이기&rdquo;를 켤 수 있어요. 켠 것만 홈의 이용 후기에 나와요.</p>
      {error ? <p className="mt-2 text-sm text-vermilion">{error}</p> : null}
      {items && !items.length ? <p className="mt-3 text-sm text-muted">아직 후기가 없어요.</p> : null}
      <div className="mt-3 space-y-2">
        {items?.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 rounded-2xl bg-background px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-xs text-muted">
                <Star size={12} className="fill-gold text-gold" /> {r.rating}점, {r.category ? categoryOf(r.category).label : ""} {r.hexagram ? HEXAGRAMS.find((h) => h.number === r.hexagram)?.name : ""}, {when(r.created_at)}
              </p>
              <p className="mt-1 break-keep">{r.comment ?? <span className="text-muted">(한마디 없음)</span>}</p>
            </div>
            {r.public_ok && r.comment ? (
              <button onClick={() => toggle(r)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${r.featured ? "bg-jade text-card" : "bg-card"}`}>
                {r.featured ? "홈에 보이는 중" : "홈에 보이기"}
              </button>
            ) : (
              <span className="shrink-0 text-xs text-muted">비공개</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
