// AI 풀이를 이미지 한 장으로: 질문, 괘 흐름, 한 줄 답, 어떻게 변하나요, 효사, 할 일, 조심할 점. 저장해 두고 다시 보거나 보내기 좋게
import type { Reading } from "./iching";
import type { AiReading } from "./aiReading";
import { C, SITE_URL, W, drawFlow, ensureFonts, font, roundRect, wrap as wrapChars } from "./shareCard";
import { formatCastAt } from "./castTime";
import { categoryOf } from "./categories";

const H_MAX = 2600;
const PAD = 110;
const TEXT_W = W - PAD * 2;

/** 어절(띄어쓰기) 단위로 줄을 바꾸고, 한 어절이 너무 길 때만 글자 단위로 자른다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    if (ctx.measureText(word).width > maxWidth) {
      const parts = wrapChars(ctx, word, maxWidth, maxLines);
      lines.push(...parts.slice(0, -1));
      cur = parts[parts.length - 1] ?? "";
    } else cur = word;
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length > maxLines) lines.length = maxLines;
  return lines;
}

export async function renderAiCard(reading: Reading, ai: AiReading, timing: string | null): Promise<Blob> {
  await ensureFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H_MAX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H_MAX);

  ctx.textAlign = "center";
  ctx.fillStyle = C.goldSoft;
  ctx.font = font(600, 26);
  ctx.fillText("나만의 정통주역운세  AI 풀이", W / 2, 110);
  ctx.fillStyle = C.muted;
  ctx.font = font(400, 24);
  ctx.fillText(`${categoryOf(reading.category).label}${reading.castAt ? `, ${formatCastAt(reading.castAt)}` : ""}`, W / 2, 150);

  let y = 205;
  if (reading.question) {
    ctx.fillStyle = C.paper;
    ctx.font = font(600, 32);
    for (const l of wrap(ctx, `“${reading.question}”`, TEXT_W, 2)) {
      ctx.fillText(l, W / 2, y);
      y += 44;
    }
    y += 6;
  }

  // 괘 흐름(본괘, 변효, 지괘)
  const flowH = drawFlow(ctx, reading, W / 2, y + 10, reading.resulting ? 180 : 220, 18, 13, { primary: C.goldSoft, resulting: C.jade, text: C.paper, muted: C.muted, changing: C.vermilion });
  // 괘 이름까지 그린 아래로 충분히 띄운다
  y += flowH + 110;

  // 한 줄 답
  ctx.textAlign = "left";
  ctx.fillStyle = C.paper;
  ctx.font = font(800, 46);
  for (const l of wrap(ctx, ai.answer, TEXT_W, 3)) {
    ctx.fillText(l, PAD, y);
    y += 62;
  }
  y += 20;

  const box = (title: string, body: string, color: string, fill: string, weight = 500, maxLines = 6) => {
    ctx.font = font(weight, 32);
    const lines = wrap(ctx, body, TEXT_W - 60, maxLines);
    const h = 70 + lines.length * 46 + 26;
    ctx.fillStyle = fill;
    roundRect(ctx, PAD - 30, y, TEXT_W + 60, h, 28);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = font(700, 26);
    ctx.fillText(title, PAD, y + 50);
    ctx.fillStyle = C.paper;
    ctx.font = font(weight, 32);
    lines.forEach((l, i) => ctx.fillText(l, PAD, y + 100 + i * 46));
    y += h + 24;
  };

  if (ai.change) box("어떻게 변하나요", ai.change, C.vermilion, "rgba(216,69,43,0.09)", 600, 5);

  // 내가 선 자리: 효사 원문 + 풀이
  if (ai.quote) {
    ctx.fillStyle = C.vermilion;
    ctx.font = font(700, 26);
    ctx.fillText("내가 선 자리", PAD, y + 34);
    ctx.fillStyle = C.goldSoft;
    ctx.font = `500 40px "Noto Serif KR", serif`;
    ctx.fillText(ai.quote, PAD, y + 96);
    y += 160;
  } else {
    ctx.fillStyle = C.vermilion;
    ctx.font = font(700, 26);
    ctx.fillText("내가 선 자리", PAD, y + 34);
    y += 84;
  }
  ctx.fillStyle = C.paper;
  ctx.font = font(400, 31);
  for (const l of wrap(ctx, ai.position, TEXT_W, 5)) {
    ctx.fillText(l, PAD, y);
    y += 46;
  }
  y += 30;

  // 이렇게 해 보세요
  ctx.fillStyle = C.muted;
  ctx.font = font(700, 26);
  ctx.fillText("이렇게 해 보세요", PAD, y);
  y += 24;
  for (const a of ai.actions.slice(0, 3)) {
    ctx.font = font(500, 30);
    const lines = wrap(ctx, a, TEXT_W - 70, 2);
    const h = 36 + lines.length * 42;
    ctx.fillStyle = C.card;
    roundRect(ctx, PAD - 30, y, TEXT_W + 60, h, 22);
    ctx.fill();
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.arc(PAD, y + 34, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.paper;
    lines.forEach((l, i) => ctx.fillText(l, PAD + 24, y + 44 + i * 42));
    y += h + 12;
  }
  y += 18;

  if (timing) box("육효로 본 때", timing, C.jade, "rgba(47,143,107,0.09)", 500, 3);
  box("조심할 점", ai.caution, C.vermilion, "rgba(216,69,43,0.09)", 500, 3);

  const H = Math.min(H_MAX, y + 170);
  ctx.textAlign = "center";
  ctx.fillStyle = C.muted;
  ctx.font = font(400, 22);
  ctx.fillText("주역 풀이는 스스로를 돌아보는 참고 자료예요", W / 2, H - 100);
  ctx.fillStyle = C.gold;
  ctx.font = font(600, 24);
  ctx.fillText(SITE_URL.replace(/^https:\/\//, "").replace(/\/$/, ""), W / 2, H - 60);

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("canvas not supported");
  octx.drawImage(canvas, 0, 0, W, H, 0, 0, W, H);
  octx.strokeStyle = "rgba(185,134,43,0.5)";
  octx.lineWidth = 2;
  roundRect(octx, 36, 36, W - 72, H - 72, 28);
  octx.stroke();
  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

export function aiCardFileName(reading: Reading): string {
  return `AI풀이_${reading.primary.name}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.png`;
}
