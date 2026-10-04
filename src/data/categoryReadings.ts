// 64괘 × 6운세 괘사 풀이를 모아 조회하는 진입점
import type { Category } from "@/lib/categories";
import { CATEGORY_READINGS_01_32 } from "./categoryReadings-01-32";
import { CATEGORY_READINGS_33_64 } from "./categoryReadings-33-64";
import { BUSINESS_WORK_READINGS } from "./categoryReadings-business-work";
import { LIFE_READINGS } from "./categoryReadings-life";

export type CategoryReading = Record<Category, string>;

const BASE: Record<number, Omit<CategoryReading, "business" | "work" | "move" | "travel" | "family" | "lawsuit">> = { ...CATEGORY_READINGS_01_32, ...CATEGORY_READINGS_33_64 };
const ALL: Record<number, CategoryReading> = Object.fromEntries(
  Object.entries(BASE).map(([n, r]) => [n, { ...r, ...BUSINESS_WORK_READINGS[Number(n)], ...LIFE_READINGS[Number(n)] }]),
) as Record<number, CategoryReading>;

export function categoryReading(hexNumber: number, category: Category): string {
  const r = ALL[hexNumber];
  if (!r) throw new Error(`No category reading for hexagram ${hexNumber}`);
  return r[category];
}
