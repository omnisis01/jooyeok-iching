// 점치는 방식(척전법·산통점·시초점)의 유래와 절차를 접었다 펼치는 설명 패널
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ChevronDown } from "lucide-react";

export type Method = "coin" | "santong" | "yarrow";

type Guide = {
  title: string;
  origin: string;
  steps: string[];
  note: string;
};

const GUIDES: Record<Method, Guide> = {
  coin: {
    title: "척전법(擲錢法) · 동전 세 개",
    origin:
      "시초점을 간단하게 줄인 방법으로, 중국 한나라 무렵부터 쓰였다고 전해집니다. 오늘날 책과 앱에서 '주역 점'이라고 하면 대부분 이 방식입니다.",
    steps: [
      "동전 세 개를 한꺼번에 던집니다. 앞면은 3점, 뒷면은 2점으로 칩니다.",
      "세 동전의 합은 6·7·8·9 중 하나입니다. 홀수(7, 9)는 양(—), 짝수(6, 8)는 음(- -)입니다.",
      "6과 9는 '늙은' 음양이라 곧 반대로 바뀌는 효, 즉 변효(變爻)가 됩니다. 7과 8은 그대로 머무는 효입니다.",
      "여섯 번 던져 맨 아래 초효부터 위로 쌓으면 괘 하나가 완성됩니다.",
    ],
    note: "변효가 있으면 그 효를 뒤집은 괘(지괘)가 '앞으로의 흐름'이 됩니다. 변효가 여러 개 나올 수 있어 풀이가 풍부합니다.",
  },
  santong: {
    title: "산통점(算筒占) · 산가지 뽑기",
    origin:
      "산가지(算木)를 담은 통을 흔들어 뽑는 우리나라 민간 점법입니다. 옛 점집 앞에 산통이 걸려 있었고, '산통을 깨다'라는 말도 여기서 나왔습니다.",
    steps: [
      "1~8번 산가지 여덟 개를 통에 넣고 흔들어 하나를 뽑습니다. 번호는 선천 팔괘 순서(건·태·리·진·손·감·간·곤)이며, 이것이 하괘(아래 세 효)가 됩니다.",
      "다시 흔들어 하나를 뽑아 상괘(위 세 효)를 정합니다. 두 괘를 겹치면 64괘 중 하나가 나옵니다.",
      "마지막으로 1~6번 산가지 여섯 개 중 하나를 뽑아 움직이는 효(동효)를 정합니다.",
    ],
    note: "세 번만 뽑으면 끝나 빠르고 직관적입니다. 주역 원전의 방식이라기보다 팔괘를 이용한 민속 점법에 가깝습니다.",
  },
  yarrow: {
    title: "시초점(蓍草占) · 오십 개의 산가지",
    origin:
      "주역 계사전에 적힌 가장 오래된 정통 방식입니다. '대연의 수 50'에서 하나를 태극으로 빼 두고 49개를 씁니다. 원래는 시초라는 풀줄기를 썼고, 지금은 대나무 산가지로 대신합니다.",
    steps: [
      "분이(分二): 49개를 두 무더기로 무심히 나눕니다. 하늘과 땅을 뜻합니다.",
      "괘일(掛一): 오른쪽 무더기에서 하나를 뽑아 손가락 사이에 낍니다. 사람을 뜻합니다.",
      "설사(揲四): 왼쪽과 오른쪽 무더기를 각각 4개씩 셉니다. 사계절을 뜻합니다. 남는 것이 없으면 4개가 남은 것으로 봅니다.",
      "귀기(歸奇): 손가락에 낀 하나와 양쪽에서 남은 것을 모아 따로 둡니다. 처음에는 5개 또는 9개, 이후에는 4개 또는 8개가 덜어집니다.",
      "이 네 단계가 한 번의 '변(變)'입니다. 세 번 반복하면 남은 개수가 36·32·28·24 중 하나가 되고, 4로 나누면 9·8·7·6이라는 효값이 나옵니다.",
      "효 하나에 3변, 괘 하나에 18변이 필요합니다. 그래서 정성을 들이는 점법입니다.",
    ],
    note: "확률이 동전과 다릅니다. 노음 1 : 소양 5 : 소음 7 : 노양 3 (분모 16)으로, 음이 변하는 일은 드물고 양이 변하는 일은 잦습니다.",
  },
};

export default function MethodGuide({ method }: { method: Method }) {
  const [open, setOpen] = useState(false);
  const g = GUIDES[method];

  return (
    <div className="rounded-2xl border border-border bg-card/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm transition hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 font-semibold text-gold-soft">
          <BookOpen size={16} /> {g.title} 는 어떻게 하나요?
        </span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-5 pb-5 text-sm leading-relaxed text-foreground/85">
              <p>{g.origin}</p>
              <ol className="space-y-2">
                {g.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[11px] font-bold text-gold-soft">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <p className="rounded-xl border border-border bg-background/50 p-3 text-muted">{g.note}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
