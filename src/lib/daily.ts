// 날짜마다 하나씩 정해지는 오늘의 괘 (같은 날은 누구에게나 같은 괘)
import { HEXAGRAMS, type Hexagram } from "@/data/hexagrams";

export function dailyHexagram(dateStr: string): Hexagram {
  let h = 0;
  for (const ch of dateStr) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
  return HEXAGRAMS[h % HEXAGRAMS.length];
}
