// 384개 효사(64괘 × 6효)를 모아 조회하는 진입점
import { LINES_01_16 } from "./lines-01-16";
import { LINES_17_32 } from "./lines-17-32";
import { LINES_33_48 } from "./lines-33-48";
import { LINES_49_64 } from "./lines-49-64";

export type LineText = {
  /** 효사 원문(요지) */
  hanja: string;
  /** 쉬운 풀이 */
  text: string;
  /** 조언 */
  advice: string;
};

const ALL: Record<number, LineText[]> = { ...LINES_01_16, ...LINES_17_32, ...LINES_33_48, ...LINES_49_64 };

/** 괘 번호(1~64)와 효 인덱스(0 = 초효)로 효사 조회 */
export function getLineText(hexNumber: number, lineIndex: number): LineText {
  const lines = ALL[hexNumber];
  if (!lines || !lines[lineIndex]) throw new Error(`No line text for hexagram ${hexNumber} line ${lineIndex}`);
  return lines[lineIndex];
}

export function getAllLineTexts(hexNumber: number): LineText[] {
  return ALL[hexNumber] ?? [];
}

/** 전통 효 이름: 양은 구(九), 음은 육(六). 예) 초구, 육이, 상육 */
export function lineTitle(lines: string, index: number): string {
  const yang = lines[index] === "1";
  const num = yang ? "구" : "육";
  if (index === 0) return `초${num}`;
  if (index === 5) return `상${num}`;
  return `${num}${["", "이", "삼", "사", "오"][index]}`;
}

/**
 * 변효 개수에 따라 무엇을 중심으로 읽는지 알려주는 전통 규칙(주자 계몽 기준).
 */
export function changingLinesRule(count: number): string | null {
  switch (count) {
    case 0:
      return null;
    case 1:
      return "변효가 하나이니 그 효사를 중심으로 읽습니다.";
    case 2:
      return "변효가 둘이면 위쪽 효사를 중심으로, 아래 효사를 참고로 읽습니다.";
    case 3:
      return "변효가 셋이면 본괘와 지괘의 뜻을 함께 봅니다. 본괘가 현재, 지괘가 앞으로의 흐름입니다.";
    case 4:
    case 5:
      return "변효가 많으니 지괘를 중심으로 읽되, 변하지 않은 효를 눈여겨보세요. 상황이 크게 바뀌는 때입니다.";
    default:
      return "여섯 효가 모두 변하니 지괘의 뜻이 곧 답입니다. 완전히 새로운 국면입니다.";
  }
}
