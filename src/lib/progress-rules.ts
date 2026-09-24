export type Life = {
  money: number;
  bike: boolean;
};

export const EMPTY_LIFE: Life = { money: 0, bike: false };

export function mergeRecord<T extends Record<string, unknown>>(empty: T, parsed: unknown): T {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...empty };
  return { ...empty, ...(parsed as Partial<T>) };
}

/** First completion pays. A replay pays nothing. */
export function firstClearPay(prevStars: number, levelXp: number): number {
  return prevStars > 0 ? 0 : levelXp * 10;
}

export function buyBike(money: number, owned: boolean): { money: number; bike: boolean; bought: boolean } {
  if (owned) return { money, bike: true, bought: false };
  if (money < 500) return { money, bike: false, bought: false };
  return { money: money - 500, bike: true, bought: true };
}
