// 점괘 결과를 SNS 공유용 이미지 카드(PNG)로 그리는 캔버스 유틸
import { getLineText, lineTitle } from "@/data/lineTexts";
import { trigramsOf, type Reading } from "@/lib/iching";
import { adaptAdvice, adviceHeading } from "@/lib/period";
import { summaryOf } from "@/data/summaries";
import { categoryOf } from "@/lib/categories";
import { categoryReading } from "@/data/categoryReadings";
import { formatCastAt } from "@/lib/castTime";

export const SITE_URL = "https://omnisis01.github.io/jooyeok-iching/";
const SITE_LABEL = "omnisis01.github.io/jooyeok-iching";

export const W = 1080;
/** 기본 높이(4:5). 내용이 길면 이보다 늘어난다 */
const H_MIN = 1350;
const H_MAX = 1800;
const FONT = '"Pretendard Variable", Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

export const C = {
  bg: "#f5f0e8",
  card: "#ffffff",
  border: "#e8e1d6",
  paper: "#1f1d1a",
  gold: "#b9862b",
  goldSoft: "#a8781f",
  vermilion: "#d8452b",
  jade: "#2f8f6b",
  muted: "#837c70",
};

export function font(weight: number, size: number) {
  return `${weight} ${size}px ${FONT}`;
}

/** 한국어는 어절 단위 줄바꿈이 어색할 때가 많아 글자 단위로 폭을 재며 자른다 */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    const next = current + ch;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = ch === " " ? "" : ch;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && ctx.measureText(lines[maxLines - 1] + "…").width > maxWidth + 1) {
    lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + "…";
  }
  return lines;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawHexagram(
  ctx: CanvasRenderingContext2D,
  lines: string,
  changing: number[],
  cx: number,
  top: number,
  width: number,
  lineH: number,
  gap: number,
  color: string,
) {
  const half = (width - width * 0.18) / 2;
  for (let i = 0; i < 6; i++) {
    const y = top + (5 - i) * (lineH + gap);
    ctx.fillStyle = changing.includes(i) ? C.vermilion : color;
    const x = cx - width / 2;
    if (lines[i] === "1") {
      roundRect(ctx, x, y, width, lineH, lineH / 5);
      ctx.fill();
    } else {
      roundRect(ctx, x, y, half, lineH, lineH / 5);
      ctx.fill();
      roundRect(ctx, x + width - half, y, half, lineH, lineH / 5);
      ctx.fill();
    }
  }
}

/** 본괘, 변효 이름, 지괘를 한 줄로 그린다. 그린 높이를 돌려준다 */
export function drawFlow(
  ctx: CanvasRenderingContext2D,
  reading: Reading,
  cx: number,
  top: number,
  figW: number,
  lineH: number,
  gap: number,
  colors: { primary: string; resulting: string; text: string; muted: string; changing: string },
  fontScale = 1,
): number {
  const { primary, resulting, changingLines } = reading;
  const figH = 6 * lineH + 5 * gap;
  const nameSize = Math.round(30 * fontScale);
  const smallSize = Math.round(22 * fontScale);
  if (!resulting) {
    drawHexagram(ctx, primary.lines, changingLines, cx, top, figW, lineH, gap, colors.primary);
    return figH;
  }
  const colGap = figW * 0.9;
  const leftX = cx - figW / 2 - colGap / 2;
  const rightX = cx + figW / 2 + colGap / 2;
  drawHexagram(ctx, primary.lines, changingLines, leftX, top, figW, lineH, gap, colors.primary);
  drawHexagram(ctx, resulting.lines, [], rightX, top, figW, lineH, gap, colors.resulting);
  // 가운데 화살촉
  const my = top + figH / 2;
  const s = figW * 0.11;
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = Math.max(3, s / 4);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - s / 2, my - s);
  ctx.lineTo(cx + s / 2, my);
  ctx.lineTo(cx - s / 2, my + s);
  ctx.stroke();
  // 이름표
  ctx.textAlign = "center";
  let y = top + figH + Math.round(38 * fontScale);
  ctx.fillStyle = colors.muted;
  ctx.font = font(500, smallSize);
  ctx.fillText("지금, 본괘", leftX, y);
  ctx.fillText("앞으로, 지괘", rightX, y);
  y += Math.round(38 * fontScale);
  ctx.fillStyle = colors.text;
  ctx.font = font(800, nameSize);
  ctx.fillText(primary.name, leftX, y);
  ctx.fillText(resulting.name, rightX, y);
  ctx.fillStyle = colors.changing;
  ctx.font = font(700, smallSize);
  ctx.fillText(`변효 ${changingLines.map((i) => lineTitle(primary.lines, i)).join(", ")}`, cx, y);
  return y - top;
}

export async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(font(800, 72)),
      document.fonts.load(font(700, 40)),
      document.fonts.load(font(500, 34)),
      document.fonts.load(font(400, 30)),
    ]);
    await document.fonts.ready;
  } catch {
    // 폰트 로드 실패 시 시스템 폰트로 그린다
  }
}

export async function renderShareCard(reading: Reading, opts: { premium?: boolean } = {}): Promise<Blob> {
  await ensureFonts();
  const { primary, resulting, changingLines, question, period, periodDate } = reading;
  const { lower, upper } = trigramsOf(primary);
  const advice = adaptAdvice(primary.advice, period, periodDate);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H_MAX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");

  // 배경
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H_MAX);
  const glow = ctx.createRadialGradient(W / 2, 80, 20, W / 2, 80, 900);
  glow.addColorStop(0, "rgba(216,69,43,0.12)");
  glow.addColorStop(1, "rgba(216,69,43,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H_MAX);

  // 상단
  ctx.textAlign = "center";
  ctx.fillStyle = C.goldSoft;
  ctx.font = font(500, 26);
  ctx.fillText("나만의 정통주역운세", W / 2, 110);
  ctx.fillStyle = C.muted;
  ctx.font = font(400, 24);
  const when = reading.castAt ? formatCastAt(reading.castAt) : new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  ctx.fillText(when, W / 2, 150);

  let y = 200;
  if (question) {
    ctx.fillStyle = C.paper;
    ctx.font = font(500, 30);
    const qLines = wrap(ctx, `“${question}”`, W - 200, 2);
    qLines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 42));
    y += qLines.length * 42 + 10;
  }

  // 본괘, 변효, 지괘 흐름
  const figTop = y + 10;
  const flowH = drawFlow(ctx, reading, W / 2, figTop, resulting ? 230 : 300, resulting ? 22 : 28, resulting ? 16 : 20, { primary: C.goldSoft, resulting: C.jade, text: C.paper, muted: C.muted, changing: C.vermilion });
  y = figTop + flowH + 50;

  // 이름
  ctx.fillStyle = C.muted;
  ctx.font = font(400, 26);
  ctx.fillText(`제${primary.number}괘   위 ${upper.symbol} ${upper.nature}   아래 ${lower.symbol} ${lower.nature}`, W / 2, y);
  y += 78;
  ctx.fillStyle = C.paper;
  ctx.font = font(800, 76);
  const nameW = ctx.measureText(primary.name).width;
  ctx.font = font(400, 40);
  const hanjaW = ctx.measureText(primary.hanja).width;
  const totalW = nameW + 18 + hanjaW;
  ctx.textAlign = "left";
  ctx.font = font(800, 76);
  ctx.fillStyle = C.paper;
  ctx.fillText(primary.name, W / 2 - totalW / 2, y);
  ctx.font = font(400, 40);
  ctx.fillStyle = C.muted;
  ctx.fillText(primary.hanja, W / 2 - totalW / 2 + nameW + 18, y);
  ctx.textAlign = "center";
  y += 56;
  ctx.fillStyle = C.goldSoft;
  ctx.font = font(600, 36);
  ctx.fillText(primary.keyword, W / 2, y);
  y += 44;

  // 운세 분류별 괘사 풀이
  const cat = categoryOf(reading.category);
  ctx.fillStyle = C.vermilion;
  ctx.font = font(700, 26);
  ctx.fillText(`${cat.label}으로 보면`, W / 2, y);
  y += 38;
  ctx.fillStyle = C.paper;
  ctx.font = font(500, 30);
  const catLines = wrap(ctx, categoryReading(primary.number, cat.key), W - 200, 3);
  catLines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 42));
  y += catLines.length * 42 + 10;

  // 한마디 결론
  const oneLiner = adaptAdvice(summaryOf(primary.number).lines[0], period, periodDate);
  ctx.fillStyle = C.paper;
  ctx.font = font(800, 40);
  const olLines = wrap(ctx, oneLiner, W - 200, 2);
  olLines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 50));
  y += olLines.length * 50 + 18;

  // 오늘의 조언 박스
  ctx.font = font(500, 32);
  const adviceLines = wrap(ctx, advice, W - 220, 4);
  const boxH = adviceLines.length * 48 + 96;
  ctx.fillStyle = "rgba(216,69,43,0.07)";
  ctx.strokeStyle = "rgba(216,69,43,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, 90, y, W - 180, boxH, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = font(500, 22);
  ctx.fillText(adviceHeading(period, periodDate), W / 2, y + 44);
  ctx.fillStyle = C.paper;
  ctx.font = font(500, 32);
  adviceLines.forEach((l, i) => ctx.fillText(l, W / 2, y + 96 + i * 48));
  y += boxH + 48;

  // 변효 + 지괘
  if (changingLines.length && resulting) {
    const focus = changingLines.length === 1 ? changingLines[0] : Math.max(...changingLines);
    const lt = getLineText(primary.number, focus);
    ctx.fillStyle = C.vermilion;
    ctx.font = font(700, 26);
    ctx.fillText(`변효  ${changingLines.map((i) => lineTitle(primary.lines, i)).join(", ")}`, W / 2, y);
    y += 44;
    ctx.fillStyle = C.goldSoft;
    ctx.font = font(500, 28);
    ctx.fillText(lt.hanja, W / 2, y);
    y += 44;
    ctx.fillStyle = C.paper;
    ctx.font = font(400, 27);
    const ltLines = wrap(ctx, lt.text, W - 220, 2);
    ltLines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 38));
    y += ltLines.length * 38 + 30;

    // 지괘 한 줄
    ctx.fillStyle = C.jade;
    ctx.font = font(700, 26);
    ctx.fillText(`앞으로의 흐름, 지괘  ${resulting.name} ${resulting.hanja}`, W / 2, y + 10);
    ctx.fillStyle = C.goldSoft;
    ctx.font = font(500, 26);
    ctx.fillText(resulting.keyword, W / 2, y + 48);
    y += 70;
  } else {
    ctx.fillStyle = C.muted;
    ctx.font = font(400, 26);
    ctx.fillText("움직이는 효가 없어 본괘의 뜻이 그대로 이어집니다.", W / 2, y);
    y += 30;
  }

  // 하단: 내용이 기본 높이에 들어가면 4:5 비율을 유지하고, 넘치면 그만큼 늘린다
  const H = Math.min(H_MAX, Math.max(H_MIN, y + 150));
  ctx.fillStyle = C.muted;
  ctx.font = font(400, 22);
  ctx.fillText("나만의 정통주역운세, 원전 그대로 쉬운 말로", W / 2, H - 96);
  if (!opts.premium) {
    ctx.fillStyle = C.gold;
    ctx.font = font(600, 24);
    ctx.fillText(SITE_LABEL, W / 2, H - 58);
  }

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

  return new Promise((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}

export function shareFileName(reading: Reading): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `오늘의괘_${reading.primary.number}_${reading.primary.name}_${ymd}.png`;
}

export function shareText(reading: Reading): string {
  const { primary, resulting } = reading;
  return [
    `오늘의 괘: 제${primary.number}괘 ${primary.name}(${primary.hanja}), ${primary.keyword}`,
    `${categoryOf(reading.category).label}: ${categoryReading(primary.number, categoryOf(reading.category).key)}`,
    adaptAdvice(primary.advice, reading.period, reading.periodDate),
    resulting ? `앞으로의 흐름: ${resulting.name}, ${resulting.keyword}` : null,
    SITE_URL,
  ]
    .filter(Boolean)
    .join("\n");
}
