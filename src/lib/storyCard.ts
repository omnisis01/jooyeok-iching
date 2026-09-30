// 세로 9:16(1080×1920) 이미지 카드. 인스타그램 스토리, 쇼츠 썸네일용. 어두운 바탕에 큰 괘 그림
// 두 가지: 점 결과(renderStoryCard)와 오늘의 괘(renderDailyStoryCard)
import type { Hexagram } from "@/data/hexagrams";
import { getLineText, lineTitle } from "@/data/lineTexts";
import { summaryOf, MOOD_LABEL } from "@/data/summaries";
import { categoryOf } from "@/lib/categories";
import { categoryReading } from "@/data/categoryReadings";
import { trigramsOf, type Reading } from "@/lib/iching";
import { adaptAdvice } from "@/lib/period";
import { formatCastAt } from "@/lib/castTime";
import { dayInfo } from "@/lib/yukhyo";
import { drawFlow, drawHexagram, ensureFonts, font, roundRect, wrap } from "@/lib/shareCard";

export const SW = 1080;
export const SH = 1920;
const SITE_LABEL = "omnisis01.github.io/jooyeok-iching";
/** 인스타그램 스토리는 위아래 약 250px에 자기 UI를 얹으므로 그 안쪽에만 그린다 */
const SAFE_TOP = 260;
const SAFE_BOTTOM = 1920 - 260;

const D = {
  bg0: "#0b0d14",
  bg1: "#141827",
  ink: "#f4efe6",
  soft: "rgba(244,239,230,0.72)",
  muted: "rgba(244,239,230,0.5)",
  gold: "#e6cf8a",
  vermilion: "#e0553c",
  jade: "#6fae98",
};

function background(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, SH);
  g.addColorStop(0, D.bg1);
  g.addColorStop(1, D.bg0);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SW, SH);
  const glow = ctx.createRadialGradient(SW / 2, 560, 40, SW / 2, 560, 720);
  glow.addColorStop(0, "rgba(224,85,60,0.22)");
  glow.addColorStop(1, "rgba(224,85,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SW, SH);
  // 테두리 선
  ctx.strokeStyle = "rgba(230,207,138,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, 48, SAFE_TOP - 40, SW - 96, SAFE_BOTTOM - SAFE_TOP + 80, 36);
  ctx.stroke();
}

function header(ctx: CanvasRenderingContext2D, small: string, when: string) {
  ctx.textAlign = "center";
  ctx.fillStyle = D.gold;
  ctx.font = font(600, 30);
  ctx.fillText(small, SW / 2, SAFE_TOP + 40);
  ctx.fillStyle = D.muted;
  ctx.font = font(400, 26);
  ctx.fillText(when, SW / 2, SAFE_TOP + 84);
}

function footer(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  ctx.fillStyle = D.muted;
  ctx.font = font(400, 24);
  ctx.fillText("세상에서 가장 정확한 점사풀이", SW / 2, SAFE_BOTTOM - 70);
  ctx.fillStyle = D.gold;
  ctx.font = font(700, 28);
  ctx.fillText(SITE_LABEL, SW / 2, SAFE_BOTTOM - 28);
}

function nameBlock(ctx: CanvasRenderingContext2D, hex: Hexagram, y: number): number {
  const { lower, upper } = trigramsOf(hex);
  ctx.textAlign = "center";
  ctx.fillStyle = D.muted;
  ctx.font = font(400, 28);
  ctx.fillText(`제${hex.number}괘   위 ${upper.symbol} ${upper.nature}   아래 ${lower.symbol} ${lower.nature}`, SW / 2, y);
  y += 92;
  ctx.fillStyle = D.ink;
  ctx.font = font(800, 96);
  ctx.fillText(hex.name, SW / 2, y);
  y += 52;
  ctx.fillStyle = D.soft;
  ctx.font = font(400, 40);
  ctx.fillText(hex.hanja, SW / 2, y);
  y += 60;
  ctx.fillStyle = D.gold;
  ctx.font = font(600, 38);
  ctx.fillText(hex.keyword, SW / 2, y);
  return y + 30;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = SW;
  canvas.height = SH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");
  return [canvas, ctx];
}

/** 점 결과의 세로 카드 */
export async function renderStoryCard(reading: Reading): Promise<Blob> {
  await ensureFonts();
  const { primary, resulting, changingLines, period, periodDate } = reading;
  const [canvas, ctx] = makeCanvas();
  background(ctx);
  header(ctx, "나만의 정통주역운세", reading.castAt ? formatCastAt(reading.castAt) : new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }));

  let y = SAFE_TOP + 130;
  const flowH = drawFlow(ctx, reading, SW / 2, y, resulting ? 230 : 300, resulting ? 22 : 28, resulting ? 16 : 18, { primary: D.gold, resulting: D.jade, text: D.ink, muted: D.muted, changing: D.vermilion }, 1.05);
  y += flowH + 56;
  y = nameBlock(ctx, primary, y);

  // 운세 분류 한 줄과 한마디
  const cat = categoryOf(reading.category);
  ctx.fillStyle = D.vermilion;
  ctx.font = font(700, 30);
  ctx.fillText(`${cat.label}으로 보면`, SW / 2, y + 22);
  y += 68;
  ctx.fillStyle = D.ink;
  ctx.font = font(500, 32);
  const catLines = wrap(ctx, categoryReading(primary.number, cat.key), SW - 200, 3);
  catLines.forEach((l, i) => ctx.fillText(l, SW / 2, y + i * 44));
  y += catLines.length * 44 + 24;

  const oneLiner = adaptAdvice(summaryOf(primary.number).lines[0], period, periodDate);
  ctx.fillStyle = D.ink;
  ctx.font = font(800, 48);
  const olLines = wrap(ctx, oneLiner, SW - 200, 2);
  olLines.forEach((l, i) => ctx.fillText(l, SW / 2, y + i * 60));
  y += olLines.length * 60 + 24;

  if (changingLines.length && resulting) {
    const focus = changingLines.length === 1 ? changingLines[0] : Math.max(...changingLines);
    const lt = getLineText(primary.number, focus);
    ctx.fillStyle = "rgba(224,85,60,0.12)";
    ctx.strokeStyle = "rgba(224,85,60,0.5)";
    ctx.lineWidth = 2;
    ctx.font = font(400, 30);
    const ltLines = wrap(ctx, lt.text, SW - 260, 2);
    const boxH = 118 + ltLines.length * 40;
    roundRect(ctx, 100, y, SW - 200, boxH, 28);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = D.vermilion;
    ctx.font = font(700, 28);
    ctx.fillText(`변효  ${changingLines.map((i) => lineTitle(primary.lines, i)).join(", ")}`, SW / 2, y + 44);
    ctx.fillStyle = D.gold;
    ctx.font = font(500, 30);
    ctx.fillText(lt.hanja, SW / 2, y + 86);
    ctx.fillStyle = D.ink;
    ctx.font = font(400, 30);
    ltLines.forEach((l, i) => ctx.fillText(l, SW / 2, y + 128 + i * 40));
    y += boxH + 36;

    // 지괘는 위 흐름 그림에 있으니 여기서는 한 줄
    ctx.fillStyle = D.jade;
    ctx.font = font(700, 30);
    ctx.fillText(`앞으로의 흐름, 지괘  ${resulting.name} ${resulting.hanja}`, SW / 2, y + 16);
    ctx.fillStyle = D.gold;
    ctx.font = font(500, 28);
    ctx.fillText(resulting.keyword, SW / 2, y + 58);
  } else {
    ctx.fillStyle = D.muted;
    ctx.font = font(400, 28);
    ctx.fillText("움직이는 효가 없어 본괘의 뜻이 그대로 이어집니다.", SW / 2, y + 20);
  }

  footer(ctx);
  return toBlob(canvas);
}

/** 오늘의 괘 세로 카드(홈 카드 저장, 매일 자동 생성용) */
export async function renderDailyStoryCard(hex: Hexagram, dateStr: string): Promise<Blob> {
  await ensureFonts();
  const [canvas, ctx] = makeCanvas();
  background(ctx);
  const d = new Date(dateStr + "T12:00:00");
  const when = `${d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}, ${dayInfo(dateStr).label}`;
  header(ctx, "오늘의 괘", when);

  let y = SAFE_TOP + 160;
  drawHexagram(ctx, hex.lines, [], SW / 2, y, 380, 36, 26, D.gold);
  y += 6 * 36 + 5 * 26 + 80;
  y = nameBlock(ctx, hex, y);

  const s = summaryOf(hex.number);
  ctx.fillStyle = D.vermilion;
  ctx.font = font(700, 30);
  ctx.fillText(MOOD_LABEL[s.mood], SW / 2, y + 16);
  y += 82;
  ctx.fillStyle = D.ink;
  ctx.font = font(800, 56);
  const l0 = wrap(ctx, s.lines[0], SW - 200, 2);
  l0.forEach((l, i) => ctx.fillText(l, SW / 2, y + i * 70));
  y += l0.length * 70 + 20;
  ctx.fillStyle = D.soft;
  ctx.font = font(500, 34);
  for (const line of [s.lines[1], s.lines[2]]) {
    const ls = wrap(ctx, line, SW - 220, 3);
    ls.forEach((l, i) => ctx.fillText(l, SW / 2, y + i * 48));
    y += ls.length * 48 + 22;
  }

  footer(ctx);
  return toBlob(canvas);
}

export function storyFileName(prefix: string, hex: Hexagram): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}_${hex.number}_${hex.name}_${ymd}_story.png`;
}
