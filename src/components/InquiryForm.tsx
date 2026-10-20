// 문의하기: 결제, 오류, 제안, 기타. 로그인했으면 답변을 여기서 볼 수 있고, 아니면 적은 이메일로 답한다
"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { getSession, onAuthChange } from "@/lib/cloudSync";
import { cloudEnabled } from "@/lib/supabase";
import { INQUIRY_LABEL, myInquiries, submitInquiry, type Inquiry, type InquiryCategory } from "@/lib/ops";
import { track } from "@/lib/track";

const STATUS_LABEL: Record<Inquiry["status"], string> = { new: "확인 중", answered: "답변 완료", closed: "마무리" };

export default function InquiryForm() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [category, setCategory] = useState<InquiryCategory>("bug");
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [mine, setMine] = useState<Inquiry[]>([]);

  useEffect(() => {
    if (!cloudEnabled) return;
    let alive = true;
    const load = async () => {
      const s = await getSession();
      if (!alive) return;
      setLoggedIn(Boolean(s));
      setMine(s ? await myInquiries() : []);
    };
    void load();
    const off = onAuthChange(() => void load());
    return () => {
      alive = false;
      off();
    };
  }, []);

  if (!cloudEnabled) return null;

  const send = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await submitInquiry(category, text, email);
      track("inquiry_submit", { category });
      setText("");
      setStatus({ ok: true, text: loggedIn ? "보냈어요. 답변은 아래 '내 문의'에서 볼 수 있어요." : "보냈어요. 적어 주신 이메일로 답장을 드릴게요." });
      if (loggedIn) setMine(await myInquiries());
    } catch (e) {
      setStatus({ ok: false, text: e instanceof Error ? e.message : "문의를 보내지 못했어요" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="inquiry" className="scroll-mt-24 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <h3 className="flex items-center gap-2 font-bold">
        <MessageCircle size={18} className="text-vermilion" /> 문의하기
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">결제가 이상하거나, 화면이 깨지거나, 바라는 기능이 있으면 알려 주세요.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(INQUIRY_LABEL) as InquiryCategory[]).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${category === c ? "bg-foreground text-card" : "bg-background text-foreground hover:bg-border/60"}`}
          >
            {INQUIRY_LABEL[c]}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 1000))}
        rows={4}
        placeholder={category === "payment" ? "결제한 날짜와 금액, 어떤 문제가 있었는지 적어 주세요" : category === "bug" ? "어느 화면에서 무엇을 눌렀을 때 어떻게 됐는지 적어 주세요" : "자유롭게 적어 주세요"}
        className="mt-3 w-full resize-none rounded-2xl bg-background px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
      />
      {!loggedIn ? (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="답장 받을 이메일"
          className="mt-2 w-full rounded-2xl bg-background px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-vermilion/30"
        />
      ) : null}
      <button onClick={send} disabled={busy || text.trim().length < 5 || (!loggedIn && !email.includes("@"))} className="mt-3 w-full rounded-full bg-foreground py-3 font-bold text-card disabled:opacity-40">
        문의 보내기
      </button>
      {status ? <p className={`mt-2 text-center text-sm ${status.ok ? "text-gold-soft" : "text-vermilion"}`}>{status.text}</p> : null}

      {mine.length ? (
        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <p className="text-sm font-bold">내 문의</p>
          {mine.map((q) => (
            <div key={q.id} className="rounded-2xl bg-background px-4 py-3 text-sm leading-relaxed">
              <p className="flex items-center justify-between text-xs text-muted">
                <span>
                  {INQUIRY_LABEL[q.category]}, {new Date(q.created_at).toLocaleDateString("ko-KR")}
                </span>
                <span className={q.status === "new" ? "text-muted" : "font-semibold text-jade"}>{STATUS_LABEL[q.status]}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap">{q.message}</p>
              {q.reply ? <p className="mt-2 whitespace-pre-wrap rounded-xl bg-card px-3 py-2 text-foreground/90">{q.reply}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
