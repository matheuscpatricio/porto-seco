import type { Level } from "@/content/types";
import { BLOCK, blockStart, Layout, Spot, streetCenter } from "@/game3d/world";
import * as THREE from "three";

export type ScriptKind = "invasao" | "entrega" | "perseguicao" | "escolta" | "fuga" | "confronto";

export type Step =
  | { k: "go"; to: THREE.Vector3; text: string; arrive: string; spawnBoss?: boolean }
  | { k: "contact"; to: THREE.Vector3; text: string; arrive: string }
  | { k: "hack" }
  | { k: "chase"; text: string }
  | { k: "escort"; path: THREE.Vector3[]; text: string }
  | { k: "boss"; text: string }
  | { k: "car"; text: string };

export type Mission = {
  kind: ScriptKind;
  title: string;
  steps: Step[];
  terminal: THREE.Vector3 | null;
  pickup: { pos: THREE.Vector3; yaw: number } | null;
  bossAt: THREE.Vector3 | null;
  gate: boolean;
  alarmAfterHack: boolean;
  chasePath: THREE.Vector3[];
  escortWave: THREE.Vector3[];
};

export const SCRIPT_LABEL: Record<ScriptKind, string> = {
  invasao: "Invasão",
  entrega: "Entrega",
  perseguicao: "Perseguição",
  escolta: "Escolta",
  fuga: "Fuga a pé",
  confronto: "Confronto",
};

const CYCLE: ScriptKind[] = ["invasao", "entrega", "perseguicao", "escolta", "fuga"];

export function scriptFor(level: Level, index: number, bossOrder: number): ScriptKind {
  if (level.boss) return bossOrder % 2 === 0 ? "invasao" : "confronto";
  return CYCLE[index % CYCLE.length];
}

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const far = (spots: Spot[], from: THREE.Vector3, minD: number, r: () => number) => {
  const ok = spots.filter((s) => s.pos.distanceTo(from) > minD);
  const pool = ok.length ? ok : spots;
  return pool[Math.floor(r() * pool.length)];
};

/** Pickup parked at the curb beside a sidewalk spot, facing -Z (right-hand traffic) so the escape drives off down the street. */
function pickupNear(s: Spot) {
  const i = Math.round((s.pos.x - blockStart(0)) / (BLOCK + 14));
  return { pos: new THREE.Vector3(streetCenter(i) + 4.9, 0, s.pos.z - 7), yaw: Math.PI };
}

function grid(v: number) {
  let best = 0;
  for (let i = 1; i < 4; i++) if (Math.abs(streetCenter(i) - v) < Math.abs(streetCenter(best) - v)) best = i;
  return streetCenter(best);
}

export function buildMission(kind: ScriptKind, level: Level, L: Layout, index: number, bossName: string | null): Mission {
  const r = rng(index * 31 + 7);
  const m: Mission = { kind, title: SCRIPT_LABEL[kind], steps: [], terminal: null, pickup: null, bossAt: null, gate: false, alarmAfterHack: false, chasePath: [], escortWave: [] };
  const car = { k: "car" as const, text: "Carro de fuga do Tio Rui" };
  switch (kind) {
    case "invasao":
      m.gate = true;
      m.steps = [{ k: "hack" }];
      if (level.boss) m.steps.push({ k: "boss", text: `Entre no pátio e derrube ${bossName}` });
      m.steps.push(car);
      break;
    case "entrega": {
      const a = far(L.spots, L.spawn, 30, r);
      const b = far(L.spots, a.pos, 45, r);
      m.terminal = b.pos.clone();
      m.pickup = pickupNear(far(L.spots, b.pos, 30, r));
      m.steps = [
        { k: "contact", to: a.pos.clone().add(new THREE.Vector3(-1.4, 0, 0)), text: `Encontre o contato da Dani na ${a.area}`, arrive: `Contato: "Toma o pendrive. O terminal fica na ${b.area}. Some daqui!"` },
        { k: "hack" },
        car,
      ];
      break;
    }
    case "perseguicao": {
      const path: THREE.Vector3[] = [];
      let i = 1;
      let j = 0;
      path.push(new THREE.Vector3(streetCenter(i), 0, streetCenter(j) + 10));
      const moves = [
        [0, 1],
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, 1],
        [1, 0],
      ];
      for (const [di, dj] of moves) {
        const ni = Math.max(0, Math.min(3, i + di + (r() < 0.3 ? di : 0)));
        const nj = Math.max(0, Math.min(3, j + dj));
        if (ni === i && nj === j) continue;
        i = ni;
        j = nj;
        path.push(new THREE.Vector3(streetCenter(i), 0, streetCenter(j)));
      }
      m.chasePath = path;
      m.steps = [{ k: "chase", text: "Alcance o carro do mensageiro (atire nos pneus!)" }, { k: "hack" }, car];
      break;
    }
    case "escolta": {
      const s = far(L.spots, L.spawn, 55, r);
      m.terminal = s.pos.clone();
      const gx = grid(s.pos.x - 7);
      const path = [new THREE.Vector3(9, 0, 9), new THREE.Vector3(gx, 0, 9), new THREE.Vector3(gx, 0, s.pos.z), new THREE.Vector3(s.pos.x - 1.8, 0, s.pos.z + 1.2)];
      m.escortWave = [path[1].clone().lerp(path[2], 0.25), path[1].clone().lerp(path[2], 0.6), path[2].clone().add(new THREE.Vector3(3, 0, -6))];
      m.pickup = pickupNear(s);
      m.steps = [{ k: "escort", path, text: `Proteja a Dani até a ${s.area}` }, { k: "hack" }, car];
      break;
    }
    case "fuga": {
      const s = far(L.spots, L.spawn, 35, r);
      m.terminal = s.pos.clone();
      m.alarmAfterHack = true;
      m.pickup = pickupNear(far(L.spots, s.pos, 60, r));
      m.steps = [{ k: "hack" }, { k: "car", text: "Alarme! Corra até o Tio Rui do outro lado do bairro" }];
      break;
    }
    case "confronto": {
      const plaza = far(L.spots, L.spawn, 50, r);
      const t = far(L.spots, plaza.pos, 25, r);
      m.bossAt = new THREE.Vector3(grid(plaza.pos.x - 7), 0, plaza.pos.z);
      m.terminal = t.pos.clone();
      m.pickup = pickupNear(t);
      m.steps = [
        { k: "go", to: m.bossAt.clone().add(new THREE.Vector3(0, 0, -14)), text: `${bossName} está esperando na ${plaza.area}`, arrive: `${bossName}: "Você de novo, moleque? Hoje acaba."`, spawnBoss: true },
        { k: "boss", text: `Derrube ${bossName}` },
        { k: "hack" },
        car,
      ];
      break;
    }
  }
  return m;
}
