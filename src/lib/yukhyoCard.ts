// 육효 결과를 공유용 이미지 카드로 그리는 캔버스 유틸
import { BEASTS, BRANCHES_HANJA, CATEGORIES, STEMS_HANJA, branchLabel, type YukhyoResult } from "@/lib/yukhyo";
import { C, W, ensureFonts, font, roundRect, wrap, SITE_URL } from "@/lib/shareCard";

const SITE_LABEL = "omnisis01.github.io/jooyeok-iching";

export async function renderYukhyoCard(r: YukhyoResult): Promise<Blob> {
  await ensureFonts();
  const H_MAX = 1900;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H_MAX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");
  const category = CATEGORIES.find((c) => c.key === r.input.category)!;

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H_MAX);
  const glow = ctx.createRadialGradient(W / 2, 80, 20, W / 2, 80, 900);
  glow.addColorStop(0, "rgba(216,69,43,0.12)");
  glow.addColorStop(1, "rgba(216,69,43,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H_MAX);

  ctx.textAlign = "center";
  ctx.fillStyle = C.goldSoft;
  ctx.font = font(500, 26);
  ctx.fillText("주역 마스터  육효점", W / 2, 110);
  ctx.fillStyle = C.muted;
  ctx.font = font(400, 24);
  const [y0, m0, d0] = r.day.date.split("-").map(Number);
  ctx.fillText(`${y0}년 ${m0}월 ${d0}일  ${r.day.label}`, W / 2, 150);

  let y = 200;
  ctx.fillStyle = C.paper;
  ctx.font = font(600, 32);
  const qLines = wrap(ctx, r.input.question ? `${category.label}  “${r.input.question}”` : category.label, W - 200, 2);
  qLines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 44));
  y += qLines.length * 44 + 24;

  // 종합
  const levelColor = r.verdict.level === "길" ? C.jade : r.verdict.level === "평" ? C.gold : C.vermilion;
  ctx.fillStyle = levelColor;
  roundRect(ctx, W / 2 - 60, y - 40, 120, 60, 30);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = font(800, 34);
  ctx.fillText(r.verdict.level, W / 2, y + 2);
  y += 70;
  ctx.fillStyle = C.paper;
  ctx.font = font(800, 44);
  ctx.fillText(r.verdict.title, W / 2, y);
  y += 56;
  ctx.font = font(500, 30);
  const vLines = wrap(ctx, r.verdict.text, W - 200, 4);
  vLines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 44));
  y += vLines.length * 44 + 30;

  // 괘와 도표
  ctx.fillStyle = C.paper;
  ctx.font = font(700, 36);
  ctx.fillText(`${r.hexagram.name}  ${r.hexagram.hanja}${r.changedHexagram ? `   변하면 ${r.changedHexagram.name}` : ""}`, W / 2, y);
  y += 30;
  const tableTop = y;
  const rowH = 58;
  ctx.fillStyle = C.card;
  roundRect(ctx, 90, tableTop, W - 180, rowH * 6 + 24, 24);
  ctx.fill();
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 2;
  roundRect(ctx, 90, tableTop, W - 180, rowH * 6 + 24, 24);
  ctx.stroke();
  const lines = [...r.lines].reverse();
  lines.forEach((l, i) => {
    const ry = tableTop + 12 + i * rowH;
    const isUse = r.useLine?.index === l.index;
    if (isUse) {
      ctx.fillStyle = "rgba(216,69,43,0.08)";
      ctx.fillRect(92, ry, W - 184, rowH);
    }
    ctx.textAlign = "left";
    ctx.fillStyle = C.muted;
    ctx.font = font(400, 24);
    ctx.fillText(BEASTS[l.beast], 120, ry + 38);
    ctx.fillStyle = isUse ? C.vermilion : C.paper;
    ctx.font = font(isUse ? 700 : 500, 28);
    ctx.fillText(`${l.relation} ${STEMS_HANJA[l.stem]}${BRANCHES_HANJA[l.branch]} ${l.element}${l.isVoid ? " 공망" : ""}`, 230, ry + 39);
    // 효 그림
    const bx = 620;
    ctx.fillStyle = isUse ? C.vermilion : C.paper;
    if (l.yang) {
      roundRect(ctx, bx, ry + 22, 140, 16, 4);
      ctx.fill();
    } else {
      roundRect(ctx, bx, ry + 22, 58, 16, 4);
      ctx.fill();
      roundRect(ctx, bx + 82, ry + 22, 58, 16, 4);
      ctx.fill();
    }
    ctx.fillStyle = C.paper;
    ctx.font = font(700, 26);
    ctx.fillText(l.isWorld ? "세" : l.isResponse ? "응" : "", 800, ry + 39);
    if (l.changing && l.changed) {
      ctx.fillStyle = C.vermilion;
      ctx.font = font(700, 24);
      ctx.fillText(`動 ${l.changed.relation} ${BRANCHES_HANJA[l.changed.branch]}`, 850, ry + 38);
    }
  });
  y = tableTop + rowH * 6 + 24 + 40;
  ctx.textAlign = "center";

  // 용신 판단 요약
  ctx.fillStyle = C.vermilion;
  ctx.font = font(700, 26);
  const useLabel = r.useRelation === "세" ? "세효" : r.useRelation === "응" ? "응효" : r.useRelation;
  ctx.fillText(`용신 ${useLabel}${r.useLine ? ` ${branchLabel(r.useLine.branch)}` : ""}  힘 점수 ${r.useJudgement.score}`, W / 2, y);
  y += 40;
  ctx.fillStyle = C.paper;
  ctx.font = font(400, 26);
  for (const reason of r.useJudgement.reasons.slice(0, 3)) {
    const ls = wrap(ctx, reason, W - 220, 2);
    ls.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 36));
    y += ls.length * 36 + 6;
  }
  if (r.timing.length) {
    y += 14;
    ctx.fillStyle = C.gold;
    ctx.font = font(600, 26);
    const ts = wrap(ctx, r.timing[0], W - 220, 2);
    ts.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 36));
    y += ts.length * 36;
  }

  const H = Math.min(H_MAX, Math.max(1350, y + 150));
  ctx.fillStyle = C.muted;
  ctx.font = font(400, 22);
  ctx.fillText("세상에서 가장 정확한 점사풀이, 주역 마스터", W / 2, H - 96);
  ctx.fillStyle = C.gold;
  ctx.font = font(600, 24);
  ctx.fillText(SITE_LABEL, W / 2, H - 58);

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const octx = out.getContext("2d")!;
  octx.drawImage(canvas, 0, 0, W, H, 0, 0, W, H);
  octx.strokeStyle = "rgba(185,134,43,0.5)";
  octx.lineWidth = 2;
  roundRect(octx, 36, 36, W - 72, H - 72, 28);
  octx.stroke();
  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}

export function yukhyoFileName(r: YukhyoResult): string {
  return `육효_${r.hexagram.name}_${r.day.date.replace(/-/g, "")}.png`;
}

export function yukhyoShareText(r: YukhyoResult): string {
  const category = CATEGORIES.find((c) => c.key === r.input.category)!;
  return [`육효점 ${category.label}: ${r.hexagram.name}, ${r.verdict.level} ${r.verdict.title}`, r.verdict.text, SITE_URL].join("\n");
}
