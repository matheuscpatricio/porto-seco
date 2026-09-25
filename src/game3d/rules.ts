export type ScriptKind = "invasao" | "entrega" | "perseguicao" | "escolta" | "fuga" | "confronto" | "mar";

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
  if (index % 5 === 3) return "mar";
  return (["invasao", "entrega", "perseguicao", "escolta"] as const)[index % 5];
}

/** Police cars roll in after the hack on street jobs, not on the sea getaway. */
export function policeAfterHack(kind: ScriptKind, boss: boolean): boolean {
  if (boss) return false;
  return kind === "invasao" || kind === "entrega";
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
    case "mar":
      return ["hack", "jet"];
  }
}

export type DoorPlace = "home" | "shop" | "target" | "central" | "street";
export type DoorStep = "none" | "hack" | "other";

export function doorOpen(place: DoorPlace, step: DoorStep): boolean {
  if (place === "street") return false;
  if (place === "central") return true;
  if (place === "target") return step === "hack";
  return step === "none";
}

export type RoomGap = "east" | "west" | "plusZ" | "minusZ";
export type RoomBox = { minX: number; maxX: number; minZ: number; maxZ: number; gap: RoomGap };

/** Cole's house, on the southwest lot, door facing the south sidewalk. */
export const HOME: RoomBox = { minX: 17, maxX: 26, minZ: 17, maxZ: 25.6, gap: "minusZ" };
export const HOME_STUDY = { x: 21.5, z: 21.3 };
/** Parked on the sidewalk in front of the door, off the driving lane. */
export const BIKE_PARK = { x: 21.5, z: 15.4 };
/** Corner shop on the southeast lot, door toward the south sidewalk. */
export const SHOP_A: RoomBox = { minX: 136.6, maxX: 145.4, minZ: 16.6, maxZ: 24.2, gap: "minusZ" };
/** Corner shop on the northwest lot, door toward the west sidewalk. */
export const SHOP_B: RoomBox = { minX: 16.6, maxX: 24.2, minZ: 136.6, maxZ: 145.4, gap: "west" };
/** Maya's skyscraper, in the center block. The shaft is the roof you stand on. */
export const TOWER = { x: 82, z: 82 };
export const ROOF = 140;
/** Hideout floor, raised off the shaft cap so the two surfaces do not share a plane. */
export const DECK = ROOF + 0.16;
export const CENTRAL: RoomBox = { minX: 76, maxX: 88, minZ: 66, maxZ: 90, gap: "minusZ" };
export const ELEVATOR = { x: 82, z: 74.2 };
export const HIDEOUT = { x: 82, z: 82 };
/** Maya's chair, facing +Z into the monitors. */
export const DANI_CHAIR = { x: 82, z: 85.85 };
/** Where Cole stands to enter the computer. South of the chair, inside the room. */
export const CENTRAL_PHONE = { x: 82, z: 83.4 };
/** Cargo ships sit in the water, past the beach. */
export const BERTHS = [
  { x: 58, z: -42 },
  { x: 106, z: -46 },
] as const;
export const ROOMS: RoomBox[] = [HOME, SHOP_A, SHOP_B, CENTRAL];
/** Walkable dock over the south beach. The driving lanes stay on the island. */
export const QUAY = { minX: 58, maxX: 102, minZ: -7, maxZ: 0.2 };
export const PIER = { minX: 72, maxX: 88, minZ: -24, maxZ: 0.2 };
export const JET = { x: 76, z: -3.2 };
export const BUOY = { x: 80, z: -36 };
export const PORT_GATE = { x: 80, z: 15.2 };

export function onPier(x: number, z: number): boolean {
  const quay = x > QUAY.minX && x < QUAY.maxX && z > QUAY.minZ && z < QUAY.maxZ;
  const pier = x > PIER.minX && x < PIER.maxX && z > PIER.minZ && z < PIER.maxZ;
  return quay || pier;
}
export const SHOPS = [
  { kind: "armas" as const, x: (SHOP_A.minX + SHOP_A.maxX) / 2, z: (SHOP_A.minZ + SHOP_A.maxZ) / 2 },
  { kind: "motos" as const, x: (SHOP_B.minX + SHOP_B.maxX) / 2, z: (SHOP_B.minZ + SHOP_B.maxZ) / 2 },
];

export function indoors(x: number, z: number): boolean {
  return ROOMS.some((room) => x > room.minX && x < room.maxX && z > room.minZ && z < room.maxZ);
}

/** Stand in front of the door so a closed door cannot trap Cole inside. */
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

/** 0 south, 1 east, 2 north, 3 west. Meters of land outside the city grid. */
export function coastReach(side: 0 | 1 | 2 | 3, along: number): number {
  const t = along / ISLAND;
  const a = Math.sin(t * Math.PI * 2 + side * 1.3) * 6;
  const b = Math.sin(t * Math.PI * 4.5 + side * 2.1) * 3.5;
  const c = Math.sin(t * Math.PI * 1.1 + 0.6) * 2;
  let reach = 20 + a + b + c;
  if (side === 0) reach = 22 + a * 0.45;
  return Math.max(16, Math.min(28, reach));
}

/** Meters past the irregular shore. Negative on land. The pier stays dry. */
export function pastShore(x: number, z: number): number {
  if (onPier(x, z)) return -1;
  if (x >= 0 && x <= ISLAND && z >= 0 && z <= ISLAND) return -Math.min(x, z, ISLAND - x, ISLAND - z);
  const outS = -z;
  const outN = z - ISLAND;
  const outW = -x;
  const outE = x - ISLAND;
  const south = outS > 0;
  const north = outN > 0;
  const west = outW > 0;
  const east = outE > 0;
  if ((south || north) && (west || east)) {
    const alongA = Math.max(0, Math.min(ISLAND, x));
    const alongB = Math.max(0, Math.min(ISLAND, z));
    const reachA = coastReach(south ? 0 : 2, alongA);
    const reachB = coastReach(west ? 3 : 1, alongB);
    return Math.hypot(south ? outS : outN, west ? outW : outE) - Math.hypot(reachA, reachB) * 0.82;
  }
  if (south) return outS - coastReach(0, Math.max(0, Math.min(ISLAND, x)));
  if (north) return outN - coastReach(2, Math.max(0, Math.min(ISLAND, x)));
  if (west) return outW - coastReach(3, Math.max(0, Math.min(ISLAND, z)));
  return outE - coastReach(1, Math.max(0, Math.min(ISLAND, z)));
}

/** 0 on land. About 1.75 m roughly 8 m past the shore. */
export function waterDepth(x: number, z: number): number {
  const past = pastShore(x, z);
  if (past <= 0) return 0;
  return past * 0.22;
}

export function inSea(x: number, z: number): boolean {
  return waterDepth(x, z) > 0.05;
}

/** Water past this covers Cole and the shark attacks. */
export const SWIM_HEIGHT = 1.75;

/** Ambient special and federal officers grow with the mission index. */
export function policeRoster(missionsDone: number): { especial: number; federal: number } {
  const n = Math.max(0, missionsDone);
  return {
    especial: Math.min(10, Math.floor(n / 2)),
    federal: Math.min(8, Math.floor(Math.max(0, n - 6) / 3)),
  };
}

/** Pushes two circles apart when they overlap. Returns null when they already clear. */
export function separateCircles(ax: number, az: number, bx: number, bz: number, minDist: number): { ax: number; az: number; bx: number; bz: number } | null {
  let dx = bx - ax;
  let dz = bz - az;
  const dist = Math.hypot(dx, dz);
  if (dist >= minDist) return null;
  if (dist < 1e-6) {
    dx = 1;
    dz = 0;
  }
  const overlap = minDist - dist;
  const nx = dx / Math.hypot(dx, dz);
  const nz = dz / Math.hypot(dx, dz);
  return { ax: ax - nx * overlap * 0.5, az: az - nz * overlap * 0.5, bx: bx + nx * overlap * 0.5, bz: bz + nz * overlap * 0.5 };
}

export const WANTED_SECONDS = 45;
export const PLAYER_MAX_HP = 100;
/** Mission guards, drones and bosses still drop Cole in three hits. */
export const SECURITY_HIT = 34;

export type PoliceRank = "guarda" | "especial" | "federal";

export const POLICE_RANK: Record<PoliceRank, { hp: number; damage: number; speed: number; gap: number; spread: number; name: string; call: string; color: string }> = {
  guarda: { hp: 5, damage: 14, speed: 2.5, gap: 2.15, spread: 0.85, name: "Guarda", call: "A guarda chegou. Arma fraca e pouca vida.", color: "#60a5fa" },
  especial: { hp: 10, damage: 28, speed: 3, gap: 1.65, spread: 0.5, name: "Policial especial", call: "Polícia especial. Mais dano e mais vida.", color: "#f59e0b" },
  federal: { hp: 18, damage: 50, speed: 3.35, gap: 1.2, spread: 0.28, name: "Polícia federal", call: "Polícia federal. Muito dano e muita vida.", color: "#fb7185" },
};

/** 1 = guards, 2 = special, 3 or more = federal. */
export function policeRank(strikes: number): PoliceRank {
  if (strikes >= 3) return "federal";
  if (strikes >= 2) return "especial";
  return "guarda";
}

/** Later chapters send a harder unit on the car chase. */
export function policeRankForMission(index: number): PoliceRank {
  if (index >= 20) return "federal";
  if (index >= 10) return "especial";
  return "guarda";
}

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

export function canMount(place: "street" | "indoor" | "sea", owned: boolean): boolean {
  return owned && place === "street";
}

export const SHIRTS = ["#2563eb", "#ea580c", "#16a34a", "#7c3aed", "#ca8a04", "#dc2626"];

export function shirtFor(chapter: number): string {
  const i = Math.max(0, Math.min(SHIRTS.length - 1, chapter));
  return SHIRTS[i];
}
