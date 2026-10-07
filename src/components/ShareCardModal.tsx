// 결과 이미지 카드를 미리 보고 저장하거나 기기 공유 시트로 보내는 모달
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ImageDown, Link2, Send, X } from "lucide-react";
import { SITE_URL } from "@/lib/shareCard";
import { track } from "@/lib/track";

export type ShareJob = {
  render: () => Promise<Blob>;
  fileName: string;
  text: string;
  /** 있으면 세로(9:16, 스토리용) 형식을 고를 수 있다 */
  renderStory?: () => Promise<Blob>;
  storyFileName?: string;
};

type Props = {
  /** 열려 있을 때만 값이 있다 */
  job: ShareJob | null;
  onClose: () => void;
};

export default function ShareCardModal({ job, onClose }: Props) {
  const reading = job;
  type Format = "card" | "story";
  // 두 형식을 열 때 함께 만들어 두고, 탭을 바꾸면 이미 만든 이미지로 바로 넘어간다
  const [images, setImages] = useState<Partial<Record<Format, { blob: Blob; url: string }>>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  // 손가락으로 쓰는 기기(휴대폰, 태블릿)인지
  const [touch, setTouch] = useState(false);
  // 아이폰, 아이패드: 웹에서 사진 앱에 바로 쓸 수 없어 공유 창의 '이미지 저장'을 거쳐야 한다
  const [ios, setIos] = useState(false);
  const [format, setFormatState] = useState<Format>("card");
  const setFormat = (f: Format) => {
    if (f === format) return;
    setStatus(null);
    setFormatState(f);
  };
  const blob = images[format]?.blob ?? null;
  const url = images[format]?.url ?? null;
  const fileName = format === "story" && reading?.storyFileName ? reading.storyFileName : reading?.fileName ?? "";

  useEffect(() => {
    if (!reading) return;
    const urls: string[] = [];
    let cancelled = false;
    const make = (f: Format, render: () => Promise<Blob>) =>
      render()
        .then((b) => {
          if (cancelled) return;
          const objectUrl = URL.createObjectURL(b);
          urls.push(objectUrl);
          setImages((prev) => ({ ...prev, [f]: { blob: b, url: objectUrl } }));
          if (f === "card") {
            const file = new File([b], reading.fileName, { type: "image/png" });
            setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
            setTouch(window.matchMedia("(pointer: coarse)").matches);
            setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "이미지를 만들지 못했습니다");
        });
    // 기본 카드를 먼저 만들고, 세로 카드는 이어서 만든다
    void make("card", reading.render).then(() => (reading.renderStory && !cancelled ? make("story", reading.renderStory) : undefined));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [reading, onClose]);

  const done = (ok: boolean) =>
    setStatus(ok ? { text: "저장이 완료되었습니다", ok } : { text: "저장하지 못했습니다. 이미지를 길게 눌러 저장해 주세요", ok });

  /** 이미지로 저장: 아이폰은 공유 창의 '이미지 저장'을 거치고, 그 밖의 기기는 바로 내려받는다 */
  const save = async () => {
    if (!blob || !url || !reading) return;
    if (ios && canShareFiles) {
      track("share_image", { via: "save_photos", format });
      const file = new File([blob], fileName, { type: "image/png" });
      try {
        await navigator.share({ files: [file] });
        done(true);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) done(false);
      }
      return;
    }
    track("share_image", { via: "download", format });
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      done(true);
    } catch {
      done(false);
    }
  };

  /** 보내기: 이미지와 소개 글을 함께 카카오톡, 인스타그램 등으로 */
  const send = async () => {
    if (!blob || !reading) return;
    track("share_image", { via: "send", format });
    const file = new File([blob], fileName, { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: "나만의 정통주역운세", text: reading.text });
      setStatus({ text: "보냈어요", ok: true });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setStatus({ text: "보내지 못했어요. 잠시 후 다시 시도해 주세요", ok: false });
    }
  };

  const copyLink = async () => {
    if (!reading) return;
    try {
      await navigator.clipboard.writeText(reading.text);
      setStatus({ text: "결과 글과 링크를 복사했습니다", ok: true });
    } catch {
      window.prompt("아래 내용을 복사하세요", `${reading.text}\n${SITE_URL}`);
    }
  };

  return (
    <AnimatePresence>
      {reading ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="결과 이미지 저장 및 공유"
        >
          <motion.div
            className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold">결과 이미지</h3>
              <button onClick={onClose} className="rounded-full p-2 text-muted transition hover:bg-background hover:text-foreground" aria-label="닫기">
                <X size={20} />
              </button>
            </div>

            {reading.renderStory ? (
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-background p-1 text-sm font-bold">
                {(["card", "story"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`rounded-full py-2 transition ${format === f ? "bg-foreground text-card" : "text-muted"}`}
                    aria-pressed={format === f}
                  >
                    {f === "card" ? "기본 카드" : "세로 (스토리용)"}
                  </button>
                ))}
              </div>
            ) : null}
            {/* 두 이미지를 겹쳐 두고 투명도만 바꿔 깨짐 없이 넘어간다. 높이를 고정해 화면이 들썩이지 않는다 */}
            <div className="relative mt-4 h-[52vh] max-h-[520px] min-h-[240px] overflow-hidden rounded-2xl bg-background">
              {(["card", "story"] as const).map((f) =>
                images[f] ? (
                  // 캔버스로 만든 blob URL이라 next/image 최적화 대상이 아니다
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={f}
                    src={images[f]!.url}
                    alt={f === "card" ? "결과 카드" : "세로 결과 카드"}
                    className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${format === f ? "opacity-100" : "pointer-events-none opacity-0"}`}
                    aria-hidden={format !== f}
                  />
                ) : null,
              )}
              {!url ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  {error ? <p className="p-6 text-center text-sm text-vermilion">{error}</p> : <p className="text-sm text-muted">이미지를 만드는 중…</p>}
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={save}
                disabled={!url}
                className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-vermilion px-4 py-3.5 text-base font-bold text-card transition hover:brightness-105 disabled:opacity-50"
              >
                <ImageDown size={18} /> 이미지로 저장
              </button>
              {canShareFiles ? (
                <button
                  onClick={send}
                  disabled={!blob}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-border/60 disabled:opacity-50"
                >
                  <Send size={16} /> 보내기
                </button>
              ) : null}
              <button
                onClick={copyLink}
                className={`${canShareFiles ? "" : "col-span-2 "}inline-flex items-center justify-center gap-2 rounded-full bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-border/60`}
              >
                <Link2 size={16} /> 글로 복사
              </button>
            </div>
            <p className="mt-3 min-h-[1.25rem] text-center text-xs text-muted">
              {status ? (
                <span className={`inline-flex items-center gap-1 ${status.ok ? "text-gold-soft" : "text-vermilion"}`} role="status">
                  {status.ok ? <Check size={12} /> : null} {status.text}
                </span>
              ) : ios && canShareFiles ? (
                "아이폰은 저장 창에서 \u2018이미지 저장\u2019을 한 번 더 눌러 주세요. 보내기는 카카오톡, 인스타그램으로 바로 보내요."
              ) : canShareFiles ? (
                "보내기를 누르면 카카오톡, 인스타그램으로 바로 보내요."
              ) : touch ? (
                "이 브라우저에서는 사진첩에 바로 넣을 수 없어요. 위 이미지를 길게 눌러 저장해 주세요."
              ) : null}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
