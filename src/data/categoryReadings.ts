// 64괘 × 6운세 괘사 풀이를 모아 조회하는 진입점
import type { Category } from "@/lib/categories";
import { CATEGORY_READINGS_01_32 } from "./categoryReadings-01-32";
import { CATEGORY_READINGS_33_64 } from "./categoryReadings-33-64";

export type CategoryReading = Record<Category, string>;

const ALL: Record<number, CategoryReading> = { ...CATEGORY_READINGS_01_32, ...CATEGORY_READINGS_33_64 };

export function categoryReading(hexNumber: number, category: Category): string {
  const r = ALL[hexNumber];
  if (!r) throw new Error(`No category reading for hexagram ${hexNumber}`);
  return r[category];
}
