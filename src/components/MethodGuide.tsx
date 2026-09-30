// 점치는 방식(척전법·산통점·시초점)의 유래와 절차를 접었다 펼치는 설명 패널
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, ChevronDown } from "lucide-react";

export type Method = "coin" | "santong" | "yarrow";
export type GuideMethod = Method | "yukhyo";

type Guide = {
  title: string;
  origin: string;
  steps: string[];
  note: string;
};

const GUIDES: Record<GuideMethod, Guide> = {
  coin: {
    title: "동전 세 개, 척전법(擲錢法)",
    origin:
      "시초점을 간단하게 줄인 방법으로, 중국 한나라 무렵부터 쓰였다고 전해집니다. 오늘날 책과 앱에서 '주역 점'이라고 하면 대부분 이 방식입니다.",
    steps: [
      "동전 세 개를 한꺼번에 던집니다. 앞면은 3점, 뒷면은 2점으로 칩니다.",
      "세 동전의 합은 6, 7, 8, 9 중 하나입니다. 홀수(7, 9)는 이어진 선인 양, 짝수(6, 8)는 끊어진 선인 음입니다.",
      "세 개가 모두 앞면(9)이거나 모두 뒷면(6)이면 힘이 끝까지 찬 줄이라 곧 반대로 바뀝니다. 이것이 변효(變爻)예요. 앞뒤가 섞인 7과 8은 그대로 머무는 줄입니다.",
      "여섯 번 던져 맨 아래 초효부터 위로 쌓으면 괘 하나가 완성됩니다.",
    ],
    note: "변효가 있으면 그 효를 뒤집은 괘(지괘)가 '앞으로의 흐름'이 됩니다. 변효가 여러 개 나올 수 있어 풀이가 풍부합니다.",
  },
  santong: {
    title: "산통 흔들기, 산통점(算筒占)",
    origin:
      "산가지(算木)를 담은 통을 흔들어 뽑는 우리나라 민간 점법입니다. 옛 점집 앞에 산통이 걸려 있었고, '산통을 깨다'라는 말도 여기서 나왔습니다.",
    steps: [
      "1~8번 산가지 여덟 개를 통에 넣고 흔들어 하나를 뽑습니다. 번호는 선천 팔괘 순서(건, 태, 리, 진, 손, 감, 간, 곤)이며, 이것이 하괘(아래 세 효)가 됩니다.",
      "다시 흔들어 하나를 뽑아 상괘(위 세 효)를 정합니다. 두 괘를 겹치면 64괘 중 하나가 나옵니다.",
      "마지막으로 1~6번 산가지 여섯 개 중 하나를 뽑아 움직이는 효(동효)를 정합니다.",
    ],
    note: "세 번만 뽑으면 끝나 빠르고 직관적입니다. 주역 원전의 방식이라기보다 팔괘를 이용한 민속 점법에 가깝습니다.",
  },
  yarrow: {
    title: "산가지 50개, 시초점(蓍草占)",
    origin:
      "주역 계사전에 적힌 가장 오래된 정통 방식입니다. 대연의 수 50에서 하나를 태극으로 빼 두고 49개를 씁니다. 원래는 시초라는 풀줄기를 썼고, 지금은 대나무 산가지로 대신합니다.",
    steps: [
      "분이(分二): 49개를 두 무더기로 무심히 나눕니다. 하늘과 땅을 뜻합니다.",
      "괘일(掛一): 오른쪽 무더기에서 하나를 뽑아 손가락 사이에 낍니다. 사람을 뜻합니다.",
      "설사(揲四): 왼쪽과 오른쪽 무더기를 각각 4개씩 셉니다. 사계절을 뜻합니다. 남는 것이 없으면 4개가 남은 것으로 봅니다.",
      "귀기(歸奇): 손가락에 낀 하나와 양쪽에서 남은 것을 모아 따로 둡니다. 처음에는 5개 또는 9개, 이후에는 4개 또는 8개가 덜어집니다.",
      "이 네 단계가 한 번의 '변(變)'입니다. 세 번 반복하면 남은 개수가 36, 32, 28, 24 중 하나가 되고, 4로 나누면 9, 8, 7, 6이라는 효값이 나옵니다.",
      "효 하나에 3변, 괘 하나에 18변이 필요합니다. 그래서 정성을 들이는 점법입니다.",
    ],
    note: "확률이 동전과 다릅니다. 열여섯 번 중 바뀌는 음(6)이 1, 그대로인 양(7)이 5, 그대로인 음(8)이 7, 바뀌는 양(9)이 3의 비율이라, 음이 바뀌는 일은 드물고 양이 바뀌는 일은 잦습니다.",
  },
  yukhyo: {
    title: "육효점(六爻占), 납갑서법",
    origin:
      "주역의 64괘 모양을 빌려 쓰되 효사 대신 간지와 오행으로 푸는 점법입니다. 한나라 경방에서 시작해 명나라와 청나라 때 복서정종 같은 책으로 정리되었습니다. 우리나라 역술가들이 가장 널리 쓰는 방식입니다.",
    steps: [
      "동전 세 개를 여섯 번 던져 괘를 뽑습니다. 여기까지는 주역점과 같습니다.",
      "여섯 효마다 간지를 붙입니다(납갑). 예를 들어 건괘의 초효는 갑자, 곤괘의 초효는 을미입니다.",
      "괘가 속한 궁의 오행과 각 효의 오행을 견주어 부모, 형제, 자손, 처재, 관귀라는 육친을 정하고, 나를 뜻하는 세효와 상대를 뜻하는 응효를 찾습니다.",
      "질문에 맞는 육친을 용신으로 삼습니다. 돈은 처재, 직장과 시험은 관귀, 문서와 학업은 부모, 자녀는 자손, 친구는 형제입니다.",
      "점친 날의 월건과 일진이 용신을 돕는지, 움직이는 효가 용신을 낳는지 누르는지, 공망에 들었는지를 따져 힘의 크기를 정합니다.",
      "용신이 힘이 있으면 이루어지고 약하면 어렵다고 보며, 용신의 지지에 해당하는 날이나 달을 응기로 봅니다.",
    ],
    note: "같은 괘라도 점친 날짜에 따라 풀이가 달라지는 것이 육효의 특징입니다. 이 앱은 기본 규칙을 따르되 세부 이론(진신, 퇴신, 삼합, 복신 등)은 간략하게 다룹니다.",
  },
};

export default function MethodGuide({ method }: { method: GuideMethod }) {
  const [open, setOpen] = useState(false);
  const g = GUIDES[method];

  return (
    <div className="rounded-2xl bg-card shadow-[0_6px_30px_rgba(31,29,26,0.06)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm transition"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 font-bold text-foreground">
          <BookOpen size={16} className="text-vermilion" /> {g.title}
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
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-vermilion/10 text-[11px] font-bold text-vermilion">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <p className="rounded-xl bg-background p-3 text-muted">{g.note}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
