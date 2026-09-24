export type ScriptKind = "invasao" | "entrega" | "perseguicao" | "escolta" | "fuga" | "confronto";

export const BLOCK = 36;
export const STREET = 14;
export const GRID = 3;
export const ISLAND = GRID * BLOCK + (GRID + 1) * STREET;

const DISTRICTS = [
  ["w1", "w2", "w3"],
  ["w4", "w5", "w6"],
  ["w2", "w3", "w6"],
];

export function districtAt(x: number, z: number): string {
  const i = Math.max(0, Math.min(GRID - 1, Math.floor((x - STREET) / (BLOCK + STREET))));
  const j = Math.max(0, Math.min(GRID - 1, Math.floor((z - STREET) / (BLOCK + STREET))));
  return DISTRICTS[j][i];
}

export function endingFor(kind: ScriptKind): "car" | "done" {
  return kind === "perseguicao" || kind === "confronto" ? "car" : "done";
}

/** Non-boss catalog. Index mod 5 equals 4 used to ask for a foot chase that never shipped. */
export function liveScript(index: number): ScriptKind {
  if (index % 5 === 4) return "entrega";
  return (["invasao", "entrega", "perseguicao", "escolta"] as const)[index % 5];
}

export function stepKinds(kind: ScriptKind, boss: boolean): string[] {
  switch (kind) {
    case "invasao":
      return boss ? ["hack", "boss"] : ["hack"];
    case "entrega":
      return ["contact", "hack", "go"];
    case "escolta":
      return ["escort", "hack"];
    case "perseguicao":
      return ["chase", "hack", "car"];
    case "confronto":
      return ["go", "boss", "hack", "car"];
    case "fuga":
      return ["hack", "go"];
  }
}

export type DoorPlace = "home" | "shop" | "target" | "street";
export type DoorStep = "none" | "hack" | "other";

export function doorOpen(place: DoorPlace, step: DoorStep): boolean {
  if (place === "street") return false;
  if (place === "target") return step === "hack";
  return step === "none";
}

export const HOME = { minX: 1.4, maxX: 7.4, minZ: 1.4, maxZ: 7.4 };
export const HOME_STUDY = { x: 4.4, z: 4.4 };
export const BIKE_PARK = { x: 9.2, z: 4.4 };
export const SHOPS = [
  { x: ISLAND - 5, z: 3.8 },
  { x: 4.2, z: ISLAND - 5 },
];

export function indoors(x: number, z: number): boolean {
  return x > HOME.minX && x < HOME.maxX && z > HOME.minZ && z < HOME.maxZ;
}

export function inSea(x: number, z: number): boolean {
  return x < 1.2 || z < 1.2 || x > ISLAND - 1.2 || z > ISLAND - 1.2;
}

export const WANTED_SECONDS = 45;

export function hitWanted(target: "ped" | "ally" | "enemy", wanted: number): number {
  if (target !== "ped") return wanted;
  return Math.max(wanted, WANTED_SECONDS);
}

export function decayWanted(wanted: number, dt: number, phase: "free" | "busy", seen: boolean): number {
  if (wanted <= 0 || phase !== "free" || seen) return wanted;
  return Math.max(0, wanted - dt);
}

export function knockdownWanted(): number {
  return 0;
}

export function canMount(place: "street" | "indoor" | "sea" | "mission", owned: boolean): boolean {
  return owned && place === "street";
}

export const SHIRTS = ["#2563eb", "#ea580c", "#16a34a", "#7c3aed", "#ca8a04", "#dc2626"];

export function shirtFor(chapter: number): string {
  const i = Math.max(0, Math.min(SHIRTS.length - 1, chapter));
  return SHIRTS[i];
}
