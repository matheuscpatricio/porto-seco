export type ScriptKind = "invasao" | "entrega" | "perseguicao" | "escolta" | "fuga" | "confronto";

export const BLOCK = 36;
export const STREET = 14;
export const GRID = 3;
export const ISLAND = GRID * BLOCK + (GRID + 1) * STREET;
/** Grass and palms between the curb and the sand. */
export const GREEN = 14;
/** Sand between the grass and the water. The sea starts past GREEN + this. */
export const SAND = 16;
export const COAST = GREEN + SAND;

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

export type RoomGap = "east" | "west" | "plusZ" | "minusZ";
export type RoomBox = { minX: number; maxX: number; minZ: number; maxZ: number; gap: RoomGap };

/** Léo's house, on the southwest lot, door facing the south sidewalk. */
export const HOME: RoomBox = { minX: 17, maxX: 26, minZ: 17, maxZ: 25.6, gap: "minusZ" };
export const HOME_STUDY = { x: 21.5, z: 21.3 };
/** Parked on the sidewalk in front of the door, off the driving lane. */
export const BIKE_PARK = { x: 21.5, z: 15.4 };
/** Corner shop on the southeast lot, door toward the south sidewalk. */
export const SHOP_A: RoomBox = { minX: 136.6, maxX: 145.4, minZ: 16.6, maxZ: 24.2, gap: "minusZ" };
/** Corner shop on the northwest lot, door toward the west sidewalk. */
export const SHOP_B: RoomBox = { minX: 16.6, maxX: 24.2, minZ: 136.6, maxZ: 145.4, gap: "west" };
export const ROOMS: RoomBox[] = [HOME, SHOP_A, SHOP_B];
export const SHOPS = [
  { x: (SHOP_A.minX + SHOP_A.maxX) / 2, z: (SHOP_A.minZ + SHOP_A.maxZ) / 2 },
  { x: (SHOP_B.minX + SHOP_B.maxX) / 2, z: (SHOP_B.minZ + SHOP_B.maxZ) / 2 },
];

export function indoors(x: number, z: number): boolean {
  return ROOMS.some((room) => x > room.minX && x < room.maxX && z > room.minZ && z < room.maxZ);
}

/** Stand in front of the door so a closed door cannot trap Léo inside. */
export function roomExit(x: number, z: number): { x: number; z: number } | null {
  for (const room of ROOMS) {
    if (x <= room.minX || x >= room.maxX || z <= room.minZ || z >= room.maxZ) continue;
    const mx = (room.minX + room.maxX) / 2;
    const mz = (room.minZ + room.maxZ) / 2;
    if (room.gap === "minusZ") return { x: mx, z: room.minZ - 1.4 };
    if (room.gap === "plusZ") return { x: mx, z: room.maxZ + 1.4 };
    if (room.gap === "west") return { x: room.minX - 1.4, z: mz };
    return { x: room.maxX + 1.4, z: mz };
  }
  return null;
}

const STREET_BANDS = [0, 1, 2, 3].map((i) => {
  const a = i * (BLOCK + STREET);
  return [a, a + STREET] as const;
});

/** True when a box crosses a driving lane. Sidewalks past the lane are clear. */
export function overlapsStreet(box: { minX: number; maxX: number; minZ: number; maxZ: number }): boolean {
  const hitX = STREET_BANDS.some(([a, b]) => box.minX < b && box.maxX > a);
  const hitZ = STREET_BANDS.some(([a, b]) => box.minZ < b && box.maxZ > a);
  return hitX || hitZ;
}

export function inSea(x: number, z: number): boolean {
  const min = -COAST + 1.2;
  const max = ISLAND + COAST - 1.2;
  return x < min || z < min || x > max || z > max;
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
