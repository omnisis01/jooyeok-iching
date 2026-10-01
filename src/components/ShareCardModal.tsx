// 결과 이미지 카드를 미리 보고 저장하거나 기기 공유 시트로 보내는 모달
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Download, ImageDown, Link2, X } from "lucide-react";
import { SITE_URL } from "@/lib/shareCard";

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
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  // 손가락으로 쓰는 기기(휴대폰, 태블릿)인지: 길게 눌러 저장 안내를 보여 준다
  const [touch, setTouch] = useState(false);
  const [format, setFormatState] = useState<"card" | "story">("card");
  const setFormat = (f: "card" | "story") => {
    if (f === format) return;
    setBlob(null);
    setUrl(null);
    setStatus(null);
    setFormatState(f);
  };
  const fileName = format === "story" && reading?.storyFileName ? reading.storyFileName : reading?.fileName ?? "";

  useEffect(() => {
    if (!reading) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    // 모달은 닫힐 때 언마운트되므로 열 때마다 상태가 초기값에서 시작한다. 형식을 바꿀 때는 이전 이미지를 지운다
    const render = format === "story" && reading.renderStory ? reading.renderStory : reading.render;
    render()
      .then((b) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
        const file = new File([b], reading.fileName, { type: "image/png" });
        setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
        setTouch(window.matchMedia("(pointer: coarse)").matches);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "이미지를 만들지 못했습니다");
      });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [reading, onClose, format]);

  const download = () => {
    if (!url || !reading) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setStatus(touch ? "다운로드 폴더에 파일로 저장했어요. 사진첩에 넣으려면 이미지를 길게 누르세요" : "이미지를 저장했어요");
  };

  const share = async () => {
    if (!blob || !reading) return;
    const file = new File([blob], fileName, { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: "나만의 정통주역운세", text: reading.text });
      setStatus("보냈어요. 사진첩에 넣었다면 앨범에서 확인해 보세요");
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우는 오류가 아니다
      if (!(e instanceof DOMException && e.name === "AbortError")) setStatus("공유에 실패했습니다. 이미지를 저장해서 올려 주세요");
    }
  };

  const copyLink = async () => {
    if (!reading) return;
    try {
      await navigator.clipboard.writeText(reading.text);
      setStatus("결과 글과 링크를 복사했습니다");
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
            <div className="mt-4 flex min-h-[240px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-background">
              {url ? (
                // 캔버스로 만든 blob URL이라 next/image 최적화 대상이 아니다
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="오늘의 괘 결과 카드" className="max-h-[56vh] w-auto object-contain" />
              ) : error ? (
                <p className="p-6 text-center text-sm text-vermilion">{error}</p>
              ) : (
                <p className="text-sm text-muted">이미지를 만드는 중…</p>
              )}
            </div>

            {touch && url ? <p className="mt-2 text-center text-xs text-muted">이미지를 길게 누르면 사진첩에 바로 저장할 수 있어요</p> : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              {canShareFiles ? (
                <>
                  <button
                    onClick={share}
                    disabled={!blob}
                    className="col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-vermilion px-4 py-3.5 text-base font-bold text-card transition hover:brightness-105 disabled:opacity-50"
                  >
                    <ImageDown size={18} /> 사진에 저장하거나 보내기
                  </button>
                  <button
                    onClick={download}
                    disabled={!url}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-border/60 disabled:opacity-50"
                  >
                    <Download size={16} /> 파일로 내려받기
                  </button>
                </>
              ) : (
                <button
                  onClick={download}
                  disabled={!url}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-card transition hover:opacity-90 disabled:opacity-50"
                >
                  <Download size={16} /> 이미지 저장
                </button>
              )}
              <button
                onClick={copyLink}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-border/60"
              >
                <Link2 size={16} /> 글로 복사
              </button>
            </div>
            <p className="mt-3 min-h-[1.25rem] text-center text-xs text-muted">
              {status ? (
                <span className="inline-flex items-center gap-1 text-gold-soft">
                  <Check size={12} /> {status}
                </span>
              ) : canShareFiles ? (
                "위 버튼을 누르면 사진 앱에 저장하거나 카카오톡, 인스타그램으로 보낼 수 있어요."
              ) : (
                "이 브라우저에서는 사진 앱에 바로 넣을 수 없어 파일로 내려받아요."
              )}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
