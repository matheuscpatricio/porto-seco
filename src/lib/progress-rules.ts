export type WeaponId = "choque" | "rajada" | "pesada";
export type RideId = "entrega" | "esportiva" | "noturna";

export type Life = {
  money: number;
  bike: boolean;
  weapon: WeaponId;
  ride: RideId;
  helped: boolean;
};

export const EMPTY_LIFE: Life = { money: 0, bike: true, weapon: "choque", ride: "entrega", helped: false };

export const WEAPONS: Record<WeaponId, { name: string; price: number; cooldown: number; damage: number; blurb: string }> = {
  choque: { name: "Pistola de choque", price: 0, cooldown: 0.28, damage: 1, blurb: "A arma do começo. Um tiro de cada vez." },
  rajada: { name: "Rajada", price: 480, cooldown: 0.12, damage: 2, blurb: "Dispara mais vezes e derruba com o dobro do dano." },
  pesada: { name: "Pesada", price: 980, cooldown: 0.07, damage: 4, blurb: "A mais rápida da loja e a que mais machuca." },
};

export const RIDES: Record<RideId, { name: string; price: number; speed: number; blurb: string }> = {
  entrega: { name: "Entrega", price: 0, speed: 1.65, blurb: "A moto do trabalho, vermelha, já sua." },
  esportiva: { name: "Esportiva", price: 650, speed: 2.25, blurb: "Mais baixa, azul, e bem mais rápida." },
  noturna: { name: "Noturna", price: 1200, speed: 2.85, blurb: "A mais rápida e a mais bonita da loja." },
};

export function mergeRecord<T extends Record<string, unknown>>(empty: T, parsed: unknown): T {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...empty };
  return { ...empty, ...(parsed as Partial<T>) };
}

/** First completion pays. A replay pays nothing. Asking Maya for help also pays nothing. */
export function firstClearPay(prevStars: number, levelXp: number, helped = false): number {
  if (helped || prevStars > 0) return 0;
  return levelXp * 10;
}

export function buyWeapon(money: number, owned: WeaponId, next: WeaponId): { money: number; weapon: WeaponId; bought: boolean } {
  if (owned === next || WEAPONS[next].price <= 0) return { money, weapon: owned, bought: false };
  if (money < WEAPONS[next].price) return { money, weapon: owned, bought: false };
  return { money: money - WEAPONS[next].price, weapon: next, bought: true };
}

export function buyRide(money: number, owned: RideId, next: RideId): { money: number; ride: RideId; bought: boolean } {
  if (owned === next || RIDES[next].price <= 0) return { money, ride: owned, bought: false };
  if (money < RIDES[next].price) return { money, ride: owned, bought: false };
  return { money: money - RIDES[next].price, ride: next, bought: true };
}

export function buyBike(money: number, owned: boolean): { money: number; bike: boolean; bought: boolean } {
  if (owned) return { money, bike: true, bought: false };
  if (money < 500) return { money, bike: false, bought: false };
  return { money: money - 500, bike: true, bought: true };
}
