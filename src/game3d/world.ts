import type { RideId } from "@/lib/progress-rules";
import { BIKE_PARK, BLOCK, CENTRAL, COAST, districtAt, GREEN, HIDEOUT, HOME, ISLAND, JET, PIER, QUAY, ROOF, SAND, SHOP_A, SHOP_B, STREET, type RoomGap } from "@/game3d/rules";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type DoorPlace = "home" | "shop" | "target" | "central";
export type Collider = { minX: number; maxX: number; minZ: number; maxZ: number; top: number; gate?: boolean; door?: DoorPlace; shut?: number };

export { BLOCK, COAST, GREEN, STREET };
export const SIZE = ISLAND;

export type Theme = {
  sky: [string, string];
  fog: string;
  sun: string;
  sunIntensity: number;
  hemi: [string, string, number];
  kind: "houses" | "towers" | "containers" | "sheds" | "corporate";
  palette: string[];
  heights: [number, number];
  night: boolean;
  peds: number;
  traffic: number;
};

export const THEMES: Record<string, Theme> = {
  w1: { sky: ["#6d9fd6", "#f5c08a"], fog: "#e7b98f", sun: "#ffd9ae", sunIntensity: 2.6, hemi: ["#ffe2c4", "#6b5040", 0.7], kind: "houses", palette: ["#d9826b", "#e8b77a", "#e6d3a3", "#7fb3a8", "#c65b4f", "#a8c48a", "#efe7da"], heights: [5, 11], night: false, peds: 22, traffic: 7 },
  w2: { sky: ["#070b1f", "#2b3566"], fog: "#1b2246", sun: "#b8c8ff", sunIntensity: 0.9, hemi: ["#8ea6ff", "#1b1b2e", 0.45], kind: "towers", palette: ["#5b6778", "#3e4b63", "#6f7b8a", "#44615d", "#57565e"], heights: [18, 48], night: true, peds: 14, traffic: 8 },
  w3: { sky: ["#5d97c9", "#cfe0e2"], fog: "#a9c3c6", sun: "#fff3dc", sunIntensity: 2.4, hemi: ["#d6ecee", "#3a4545", 0.65], kind: "containers", palette: ["#a8322b", "#2c5aa0", "#2f7a47", "#c08f1e", "#cf6a2a", "#2a7c8c"], heights: [2.6, 10.4], night: false, peds: 12, traffic: 6 },
  w4: { sky: ["#7f8fa6", "#e0b27a"], fog: "#b89468", sun: "#ffd29a", sunIntensity: 2.2, hemi: ["#f2d3a0", "#3a2a1a", 0.65], kind: "sheds", palette: ["#8d8680", "#6b6661", "#aaa39c", "#8c4a1f", "#57524d"], heights: [5, 9], night: false, peds: 14, traffic: 6 },
  w5: { sky: ["#07040f", "#2a1a4a"], fog: "#1b1233", sun: "#c9bbff", sunIntensity: 0.8, hemi: ["#a78bfa", "#120a22", 0.45], kind: "corporate", palette: ["#4a4d6b", "#35344f", "#51405f", "#3b3b40", "#5a4c7a"], heights: [22, 60], night: true, peds: 16, traffic: 9 },
  w6: { sky: ["#0a0306", "#3b1018"], fog: "#2a0c12", sun: "#fdb4be", sunIntensity: 0.8, hemi: ["#fb7185", "#14060a", 0.4], kind: "corporate", palette: ["#3a3432", "#3b3b40", "#5a2a2a", "#2e2e33"], heights: [24, 64], night: true, peds: 12, traffic: 9 },
};

export const LANE = 2.2;
export const streetCenter = (i: number) => STREET / 2 + i * (BLOCK + STREET);
export const blockStart = (i: number) => STREET + i * (BLOCK + STREET);

/** A place a mission can put a terminal, meeting or pickup. Terminals sit at `pos` with their screen facing -X. */
export type Spot = { pos: THREE.Vector3; area: string };

export type Layout = {
  colliders: Collider[];
  spawn: THREE.Vector3;
  allySpots: THREE.Vector3[];
  terminal: THREE.Vector3;
  kiosk: THREE.Group;
  kioskCollider: Collider;
  gate: { x: number; z: number; width: number; mesh: THREE.Group; collider: Collider; lights: THREE.Mesh[] };
  car: THREE.Group;
  carStart: THREE.Vector3;
  compound: { minX: number; maxX: number; minZ: number; maxZ: number };
  patrols1: [THREE.Vector3, THREE.Vector3][];
  patrols2: THREE.Vector3[];
  droneSpots: THREE.Vector3[];
  spots: Spot[];
  pedLoops: THREE.Vector3[][];
  screen: { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture };
  beacon: THREE.Mesh;
  night: boolean;
  bike: THREE.Group;
  bikes: Record<RideId, THREE.Group>;
  jet: THREE.Group;
  ships: THREE.Group[];
};

function rng(seed: number) {
  let s = (seed * 2654435761) % 4294967296;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function canvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function speckle(g: CanvasRenderingContext2D, w: number, h: number, n: number, dark: number, light: number, size = 2) {
  for (let i = 0; i < n; i++) {
    const v = Math.random();
    g.fillStyle = v < 0.5 ? `rgba(0,0,0,${dark * Math.random()})` : `rgba(255,255,255,${light * Math.random()})`;
    g.fillRect(Math.random() * w, Math.random() * h, size * Math.random() + 0.5, size * Math.random() + 0.5);
  }
}

function tex(c: HTMLCanvasElement, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function asphaltTextures() {
  const [c, g] = canvas(512);
  const [b, gb] = canvas(512);
  g.fillStyle = "#3a3a3c";
  g.fillRect(0, 0, 512, 512);
  gb.fillStyle = "#808080";
  gb.fillRect(0, 0, 512, 512);
  speckle(g, 512, 512, 26000, 0.5, 0.18, 2);
  speckle(gb, 512, 512, 26000, 0.6, 0.6, 2);
  for (let k = 0; k < 18; k++) {
    g.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.1})`;
    g.beginPath();
    g.ellipse(Math.random() * 512, Math.random() * 512, 20 + Math.random() * 60, 10 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let k = 0; k < 7; k++) {
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    g.strokeStyle = "rgba(15,15,15,0.7)";
    gb.strokeStyle = "#202020";
    g.lineWidth = gb.lineWidth = 1.5;
    g.beginPath();
    gb.beginPath();
    g.moveTo(x, y);
    gb.moveTo(x, y);
    for (let s = 0; s < 12; s++) {
      x += (Math.random() - 0.5) * 30;
      y += (Math.random() - 0.5) * 30;
      g.lineTo(x, y);
      gb.lineTo(x, y);
    }
    g.stroke();
    gb.stroke();
  }
  return { map: tex(c, 18, 18), bump: tex(b, 18, 18, false) };
}

function pavementTextures(base: string, night: boolean) {
  const [c, g] = canvas(256);
  const [b, gb] = canvas(256);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  gb.fillStyle = "#303030";
  gb.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    for (let x = (y / 16) % 2 ? -8 : 0; x < 256; x += 16) {
      const wave = Math.sin((x + y) / 40) > 0.3;
      const l = night ? 40 + Math.random() * 15 : wave ? 30 + Math.random() * 10 : 78 + Math.random() * 12;
      g.fillStyle = `hsl(35,8%,${l}%)`;
      g.beginPath();
      g.roundRect(x + 1.5, y + 1.5, 13, 13, 4);
      g.fill();
      gb.fillStyle = `hsl(0,0%,${70 + Math.random() * 20}%)`;
      gb.beginPath();
      gb.roundRect(x + 1.5, y + 1.5, 13, 13, 4);
      gb.fill();
    }
  }
  speckle(g, 256, 256, 3000, 0.3, 0.1, 1.5);
  return { map: tex(c), bump: tex(b, 1, 1, false) };
}

function facadeTextures(base: string, night: boolean, kind: Theme["kind"], r: () => number) {
  const S = 256;
  const [c, g] = canvas(S);
  const [b, gb] = canvas(S);
  const [e, ge] = canvas(S);
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  gb.fillStyle = "#909090";
  gb.fillRect(0, 0, S, S);
  ge.fillStyle = "#000";
  ge.fillRect(0, 0, S, S);
  speckle(g, S, S, 9000, 0.14, 0.1, 2.5);
  speckle(gb, S, S, 9000, 0.4, 0.4, 2.5);
  const grime = g.createLinearGradient(0, 0, 0, S);
  grime.addColorStop(0, "rgba(0,0,0,0)");
  grime.addColorStop(1, "rgba(30,20,10,0.18)");
  g.fillStyle = grime;
  g.fillRect(0, 0, S, S);

  if (kind === "containers" || kind === "sheds") {
    const step = kind === "containers" ? 16 : 12;
    for (let x = 0; x < S; x += step) {
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.fillRect(x, 0, 4, S);
      g.fillStyle = "rgba(255,255,255,0.12)";
      g.fillRect(x + 4, 0, 2, S);
      gb.fillStyle = "#505050";
      gb.fillRect(x, 0, 4, S);
      gb.fillStyle = "#c0c0c0";
      gb.fillRect(x + 4, 0, 2, S);
    }
    for (let k = 0; k < 10; k++) {
      g.fillStyle = `rgba(120,60,20,${0.1 + Math.random() * 0.15})`;
      g.fillRect(Math.random() * S, Math.random() * S, 10 + Math.random() * 30, 3 + Math.random() * 40);
    }
    return { map: tex(c), bump: tex(b, 1, 1, false), emissive: null };
  }

  const glassTower = kind === "towers" || kind === "corporate";
  const cols = glassTower ? 2 : 1;
  const cw = S / cols;
  for (let i = 0; i < cols; i++) {
    const x0 = i * cw;
    const wx = x0 + cw * (glassTower ? 0.08 : 0.24);
    const ww = cw * (glassTower ? 0.84 : 0.52);
    const wy = S * (glassTower ? 0.12 : 0.22);
    const wh = S * (glassTower ? 0.74 : 0.52);
    const lit = r() < (night ? 0.35 : 0.08);
    if (!glassTower) {
      g.fillStyle = "rgba(240,235,225,0.85)";
      g.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(wx - 12, wy + wh + 6, ww + 24, 8);
      g.fillStyle = "rgba(245,240,230,0.95)";
      g.fillRect(wx - 12, wy + wh + 2, ww + 24, 7);
      gb.fillStyle = "#d0d0d0";
      gb.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
      gb.fillStyle = "#f0f0f0";
      gb.fillRect(wx - 12, wy + wh + 2, ww + 24, 7);
    }
    const glass = g.createLinearGradient(wx, wy, wx + ww, wy + wh);
    if (lit) {
      glass.addColorStop(0, "#ffe8b0");
      glass.addColorStop(1, "#f2b765");
    } else if (night) {
      glass.addColorStop(0, "#0d1426");
      glass.addColorStop(1, "#1a2440");
    } else {
      glass.addColorStop(0, "#9fb9d0");
      glass.addColorStop(0.5, "#39516b");
      glass.addColorStop(1, "#1f2d3d");
    }
    g.fillStyle = glass;
    g.fillRect(wx, wy, ww, wh);
    gb.fillStyle = "#383838";
    gb.fillRect(wx, wy, ww, wh);
    if (lit) {
      ge.fillStyle = "#ffd28a";
      ge.fillRect(wx, wy, ww, wh);
      if (r() < 0.5) {
        g.fillStyle = "rgba(90,50,30,0.5)";
        g.fillRect(wx, wy, ww * 0.35, wh);
      }
    }
    g.fillStyle = glassTower ? "rgba(40,45,55,0.9)" : "rgba(235,230,220,0.95)";
    g.fillRect(wx + ww / 2 - 3, wy, 6, wh);
    g.fillRect(wx, wy + wh * 0.4, ww, 5);
    if (!lit && !night) {
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.beginPath();
      g.moveTo(wx, wy + wh * 0.3);
      g.lineTo(wx + ww * 0.3, wy);
      g.lineTo(wx + ww * 0.45, wy);
      g.lineTo(wx, wy + wh * 0.5);
      g.fill();
    }
  }
  return { map: tex(c), bump: tex(b, 1, 1, false), emissive: night ? tex(e) : null };
}

function roofTiles() {
  const [c, g] = canvas(128);
  g.fillStyle = "#9a4a2e";
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) {
    for (let x = (y / 16) % 2 ? -8 : 0; x < 128; x += 16) {
      const grd = g.createLinearGradient(0, y, 0, y + 16);
      grd.addColorStop(0, `hsl(15,${45 + Math.random() * 15}%,${36 + Math.random() * 8}%)`);
      grd.addColorStop(1, "hsl(15,45%,22%)");
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(x + 8, y + 8, 7.5, 9, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  return tex(c);
}

function skyTexture(top: string, bottom: string, sun: string, night: boolean) {
  const [c, g] = canvas(16, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, top);
  grd.addColorStop(0.62, bottom);
  grd.addColorStop(1, bottom);
  g.fillStyle = grd;
  g.fillRect(0, 0, 16, 512);
  if (!night) {
    const glow = g.createLinearGradient(0, 260, 0, 330);
    glow.addColorStop(0, "rgba(255,255,255,0)");
    glow.addColorStop(1, sun + "55");
    g.fillStyle = glow;
    g.fillRect(0, 260, 16, 70);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });

function mesh(g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x: number, y: number, z: number, parent: THREE.Object3D, shadow = true) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = shadow;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, shadow = true, round = 0) {
  const g = round > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(round, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)) : new THREE.BoxGeometry(w, h, d);
  return mesh(g, mat, x, y, z, parent, shadow);
}

const carShared = {
  tire: std({ color: "#141414", roughness: 0.9 }),
  rim: std({ color: "#c7cbd1", roughness: 0.25, metalness: 0.9 }),
  glass: std({ color: "#0e1620", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 }),
  chrome: std({ color: "#d4d4d8", roughness: 0.2, metalness: 1 }),
  head: new THREE.MeshStandardMaterial({ color: "#fffbe8", emissive: "#fff3c4", emissiveIntensity: 1.2 }),
  tail: new THREE.MeshStandardMaterial({ color: "#7f1d1d", emissive: "#ef4444", emissiveIntensity: 0.8 }),
  dark: std({ color: "#1a1a1a", roughness: 0.6 }),
  tireGeo: new THREE.TorusGeometry(0.28, 0.12, 12, 24),
  rimGeo: new THREE.CylinderGeometry(0.22, 0.22, 0.22, 18),
};

function extrudeSide(points: [number, number][], width: number, bevel: number) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    s.lineTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 12 });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

/** Curved sedan/hatch body built from an extruded side profile; faces +Z, length ~4.3 m. */
export function buildCar(color: string, kind: "sedan" | "hatch" | "van" = "sedan") {
  const g = new THREE.Group();
  const paint = std({ color, roughness: 0.28, metalness: 0.55 });
  const L = kind === "hatch" ? 3.8 : kind === "van" ? 4.8 : 4.4;
  const h = L / 2;
  const roofH = kind === "van" ? 2.1 : 1.45;
  const body = kind === "van"
    ? [[-h, 0.35], [h - 0.15, 0.35], [h, 0.55], [h, 0.95], [h - 0.6, 1.25], [h - 1.1, roofH], [-h + 0.1, roofH], [-h, roofH - 0.1], [-h, 0.35]]
    : [[-h, 0.35], [h - 0.1, 0.35], [h, 0.5], [h - 0.05, 0.8], [h - 0.9, 0.92], [h - 1.55, roofH], [-h + (kind === "hatch" ? 0.35 : 1.1), roofH], [-h + (kind === "hatch" ? 0.05 : 0.45), 0.95], [-h, 0.88], [-h, 0.35]];
  const shell = new THREE.Mesh(extrudeSide(body as [number, number][], 1.78, 0.12), paint);
  shell.castShadow = shell.receiveShadow = true;
  g.add(shell);
  const win = kind === "van"
    ? [[h - 0.7, 1.28], [h - 1.12, roofH - 0.08], [h - 1.9, roofH - 0.08], [h - 1.9, 1.28]]
    : [[h - 0.95, 0.97], [h - 1.52, roofH - 0.06], [-h + (kind === "hatch" ? 0.42 : 1.15), roofH - 0.06], [-h + (kind === "hatch" ? 0.12 : 0.55), 0.97]];
  const glass = new THREE.Mesh(extrudeSide(win as [number, number][], 1.84, 0.03), carShared.glass);
  g.add(glass);
  box(1.7, 0.16, 0.14, carShared.dark, 0, 0.42, h + 0.04, g, false, 0.06);
  box(1.7, 0.16, 0.14, carShared.dark, 0, 0.42, -h - 0.04, g, false, 0.06);
  for (const sx of [-0.62, 0.62]) {
    box(0.36, 0.14, 0.06, carShared.head, sx, 0.7, h + 0.02, g, false, 0.05);
    box(0.34, 0.12, 0.06, carShared.tail, sx, 0.75, -h - 0.02, g, false, 0.04);
  }
  for (const sx of [-0.95, 0.95]) {
    const mirror = box(0.12, 0.09, 0.16, paint, sx, 1.02, h - 1.05, g, false, 0.03);
    mirror.rotation.y = sx * 0.2;
    box(0.02, 0.03, 0.3, carShared.chrome, sx * 0.94, 0.9, -0.3, g, false);
  }
  const wheels: THREE.Group[] = [];
  const axle = h - 0.85;
  for (const [x, z] of [
    [-0.8, axle],
    [0.8, axle],
    [-0.8, -axle],
    [0.8, -axle],
  ]) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(carShared.tireGeo, carShared.tire);
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    w.add(tire);
    const rim = new THREE.Mesh(carShared.rimGeo, carShared.rim);
    rim.rotation.z = Math.PI / 2;
    w.add(rim);
    w.position.set(x, 0.4, z);
    g.add(w);
    wheels.push(w);
  }
  g.userData.wheels = wheels;
  g.userData.length = L;
  return g;
}

function buildTree(r: () => number, night: boolean) {
  const g = new THREE.Group();
  const bark = std({ color: "#5b4332", roughness: 1 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.6, 10), bark);
  trunk.position.y = 1.3;
  trunk.rotation.z = (r() - 0.5) * 0.12;
  trunk.castShadow = true;
  g.add(trunk);
  const leaf = std({ color: night ? "#1d3324" : ["#4f7a3a", "#5d8a42", "#3f6b35"][Math.floor(r() * 3)], roughness: 0.95 });
  const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const s = 0.8 + r() * 0.8;
    const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), leaf);
    blob.position.set((r() - 0.5) * 1.6, 3 + r() * 1.4, (r() - 0.5) * 1.6);
    blob.scale.y = 0.8;
    blob.castShadow = true;
    g.add(blob);
  }
  const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 16), std({ color: "#3b2f25" }));
  bed.position.y = 0.2;
  g.add(bed);
  return g;
}

function addCoast(scene: THREE.Scene, night: boolean) {
  const cols: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  const c = rng(19);
  type Spot = { x: number; z: number; kind: "bush" | "palm" | "rock"; s: number };
  const spots: Spot[] = [];
  const side = (axis: "x" | "z", sign: -1 | 1) => {
    for (let t = 8; t < ISLAND - 8; t += 8) {
      const along = t + (c() - 0.5) * 2.4;
      if (axis === "z" && sign < 0 && along > QUAY.minX - 2 && along < QUAY.maxX + 2) continue;
      const bush = 2.4 + c() * 4;
      const palm = 6.5 + c() * 5.5;
      const rock = GREEN + 3 + c() * (SAND - 5);
      const at = (dist: number) => (sign < 0 ? -dist : ISLAND + dist);
      const put = (dist: number, kind: Spot["kind"], s: number) => {
        if (axis === "z") spots.push({ x: along, z: at(dist), kind, s });
        else spots.push({ x: at(dist), z: along, kind, s });
      };
      put(bush, "bush", 0.55 + c() * 0.55);
      if (c() > 0.35) put(bush + 2.2, "bush", 0.4 + c() * 0.4);
      put(palm, "palm", 0.85 + c() * 0.35);
      if (c() > 0.55) put(rock, "rock", 0.35 + c() * 0.45);
    }
  };
  side("z", -1);
  side("z", 1);
  side("x", -1);
  side("x", 1);

  const bushes = spots.filter((s) => s.kind === "bush");
  const palms = spots.filter((s) => s.kind === "palm");
  const rocks = spots.filter((s) => s.kind === "rock");
  const bushGeo = new THREE.IcosahedronGeometry(1, 0);
  const bushMat = std({ color: night ? "#1d3324" : "#2f6b38", roughness: 1 });
  const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, bushes.length);
  const m4 = new THREE.Matrix4();
  bushes.forEach((s, i) => {
    bushMesh.setMatrixAt(i, m4.makeScale(s.s, s.s * 0.7, s.s).setPosition(s.x, 0.35 * s.s, s.z));
  });
  bushMesh.castShadow = true;
  scene.add(bushMesh);

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 4.4, 6);
  const trunkMat = std({ color: "#6a4a32", roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palms.length);
  palms.forEach((s, i) => trunks.setMatrixAt(i, m4.makeScale(s.s, s.s, s.s).setPosition(s.x, 2.2 * s.s, s.z)));
  trunks.castShadow = true;
  scene.add(trunks);
  const frondGeo = new THREE.ConeGeometry(0.28, 2.2, 4);
  const frondMat = std({ color: night ? "#214428" : "#2f8a3e", roughness: 0.9 });
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, palms.length * 6);
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  palms.forEach((s, i) => {
    for (let k = 0; k < 6; k++) {
      q.setFromEuler(new THREE.Euler(Math.PI / 2.5, (k / 6) * Math.PI * 2, 0));
      v.set(s.x, 4.15 * s.s, s.z);
      fronds.setMatrixAt(i * 6 + k, m4.compose(v, q, new THREE.Vector3(s.s, s.s, s.s)));
    }
    cols.push({ minX: s.x - 0.2, maxX: s.x + 0.2, minZ: s.z - 0.2, maxZ: s.z + 0.2 });
  });
  fronds.castShadow = true;
  scene.add(fronds);

  const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
  const rockMat = std({ color: "#b7aa96", roughness: 0.95 });
  const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, Math.max(1, rocks.length));
  rocks.forEach((s, i) => rockMesh.setMatrixAt(i, m4.makeScale(s.s, s.s * 0.55, s.s).setPosition(s.x, 0.2, s.z)));
  rockMesh.count = rocks.length;
  scene.add(rockMesh);
  return cols;
}

function buildPort(scene: THREE.Scene, addCol: (minX: number, maxX: number, minZ: number, maxZ: number, top: number) => void) {
  const concrete = std({ color: "#9aa0a6", roughness: 0.92 });
  const wood = std({ color: "#8a5a32", roughness: 0.85 });
  concrete.polygonOffset = true;
  concrete.polygonOffsetFactor = -1;
  concrete.polygonOffsetUnits = -1;
  wood.polygonOffset = true;
  wood.polygonOffsetFactor = -1;
  wood.polygonOffsetUnits = -1;
  const slab = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = false;
    scene.add(m);
  };
  const quayTop = 0.22;
  const quayH = 0.16;
  const quayZ0 = QUAY.minZ;
  const quayZ1 = 0.35;
  slab(QUAY.maxX - QUAY.minX, quayH, quayZ1 - quayZ0, (QUAY.minX + QUAY.maxX) / 2, quayTop - quayH / 2, (quayZ0 + quayZ1) / 2, concrete);
  addCol(QUAY.minX, QUAY.maxX, quayZ0, quayZ1, quayTop);
  const pierTop = 0.26;
  const pierH = 0.2;
  const pierZ1 = quayZ0 - 0.04;
  slab(PIER.maxX - PIER.minX, pierH, pierZ1 - PIER.minZ, (PIER.minX + PIER.maxX) / 2, pierTop - pierH / 2, (PIER.minZ + pierZ1) / 2, wood);
  addCol(PIER.minX, PIER.maxX, PIER.minZ, pierZ1, pierTop);
  for (let i = 0; i < 8; i++) {
    const z = -9 - i * 1.7;
    mesh(new THREE.BoxGeometry(PIER.maxX - PIER.minX - 0.4, 0.035, 0.16), std({ color: "#6b4428", roughness: 0.8 }), 80, pierTop + 0.04, z, scene, false);
  }
  for (const x of [QUAY.minX + 4, QUAY.maxX - 4, 74, 86]) {
    mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 8), std({ color: "#1f2937", metalness: 0.4, roughness: 0.5 }), x, quayTop + 0.35, -1.4, scene, true);
  }
  const postMat = std({ color: "#374151", metalness: 0.6, roughness: 0.4 });
  for (const x of [77.4, 82.6]) {
    mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.15, 8), postMat, x, quayTop + 1.57, 0.15, scene, true);
    mesh(new THREE.BoxGeometry(0.28, 0.12, 0.28), concrete, x, quayTop + 0.06, 0.15, scene, true);
  }
  mesh(new THREE.BoxGeometry(5.6, 0.1, 0.1), postMat, 80, quayTop + 3.15, 0.15, scene, true);
  mesh(new THREE.BoxGeometry(4.7, 0.95, 0.12), std({ color: "#0b1220", roughness: 0.7 }), 80, quayTop + 2.55, 0.15, scene, true);
  const sign = labelPlane("PORTO", "#fbbf24");
  sign.position.set(80, quayTop + 2.55, 0.23);
  scene.add(sign);
  const ships = [buildShip("#1e3a5f"), buildShip("#7f1d1d")];
  ships[0].position.set(56, 0.35, -20);
  ships[1].position.set(104, 0.35, -21);
  ships.forEach((s) => scene.add(s));
  return ships;
}

function labelPlane(text: string, color: string) {
  const [c, g] = canvas(512, 96);
  g.fillStyle = "#0b1220";
  g.fillRect(0, 0, 512, 96);
  g.fillStyle = color;
  g.font = "bold 42px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 256, 48);
  const map = tex(c);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.82), new THREE.MeshBasicMaterial({ map, toneMapped: false, side: THREE.DoubleSide }));
  panel.position.z = 0.01;
  return panel;
}

function shipHull(color: string) {
  const sections = [
    { x: 13.2, b: 0.12, k: -0.05, d: 0.45 },
    { x: 10.4, b: 1.25, k: -1.05, d: 1.15 },
    { x: 6.2, b: 2.15, k: -1.85, d: 1.55 },
    { x: 1.2, b: 2.4, k: -2.15, d: 1.62 },
    { x: -4.2, b: 2.3, k: -2.0, d: 1.7 },
    { x: -8.6, b: 1.85, k: -1.45, d: 1.9 },
    { x: -12.4, b: 1.05, k: -0.75, d: 2.05 },
  ];
  const ringOf = (s: (typeof sections)[number]) => [
    [s.x, s.k, 0],
    [s.x, s.k * 0.25, s.b * 0.96],
    [s.x, 0.05, s.b],
    [s.x, s.d, s.b * 0.78],
    [s.x, s.d, -s.b * 0.78],
    [s.x, 0.05, -s.b],
    [s.x, s.k * 0.25, -s.b * 0.96],
  ];
  const rings = sections.map(ringOf);
  const n = rings[0].length;
  const positions: number[] = [];
  const indices: number[] = [];
  rings.forEach((ring, i) => {
    for (const p of ring) positions.push(p[0], p[1], p[2]);
    if (i === 0) return;
    const a0 = (i - 1) * n;
    const b0 = i * n;
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      indices.push(a0 + k, b0 + k2, b0 + k, a0 + k, a0 + k2, b0 + k2);
    }
  });
  const cap = (ringIndex: number, bow: boolean) => {
    const base = ringIndex * n;
    const c = positions.length / 3;
    const s = sections[ringIndex];
    positions.push(s.x, (s.k + s.d) * 0.5, 0);
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      if (bow) indices.push(c, base + k, base + k2);
      else indices.push(c, base + k2, base + k);
    }
  };
  cap(0, true);
  cap(sections.length - 1, false);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const hull = new THREE.Mesh(geo, std({ color, roughness: 0.42, metalness: 0.35, side: THREE.DoubleSide }));
  hull.castShadow = true;
  hull.receiveShadow = true;
  return hull;
}

function buildShip(hullColor: string) {
  const g = new THREE.Group();
  g.add(shipHull(hullColor));
  const white = std({ color: "#f5f5f4", roughness: 0.55 });
  const glass = std({ color: "#0f172a", roughness: 0.08, metalness: 0.45, emissive: "#38bdf8", emissiveIntensity: 0.35 });
  const dark = std({ color: "#1c1917", roughness: 0.7, metalness: 0.2 });
  box(6.2, 1.7, 3.5, white, -6.4, 2.55, 0, g, true, 0.06);
  box(4.4, 1.35, 3.1, white, -6.8, 3.9, 0, g, true, 0.05);
  box(3.2, 1.05, 2.6, white, -7.1, 5.0, 0, g, true, 0.04);
  box(2.6, 0.55, 0.08, glass, -7.1, 5.15, 1.28, g, false);
  box(2.6, 0.55, 0.08, glass, -7.1, 5.15, -1.28, g, false);
  box(0.08, 0.7, 2.2, glass, -5.5, 4.05, 0, g, false);
  box(1.1, 1.5, 1.1, std({ color: "#b45309", roughness: 0.5, metalness: 0.3 }), -5.2, 6.15, 0, g, true, 0.04);
  box(0.7, 0.25, 0.7, dark, -5.2, 7.0, 0, g, true);
  const boxes: [string, number][] = [
    ["#dc2626", 2.2],
    ["#1d4ed8", 4.6],
    ["#15803d", 7.0],
    ["#ca8a04", 3.4],
    ["#7c3aed", 5.8],
  ];
  boxes.forEach(([color, x], i) => {
    const z = i % 2 === 0 ? -0.85 : 0.85;
    box(2.05, 1.15, 1.45, std({ color, roughness: 0.6, metalness: 0.15 }), x, 2.15, z, g, true, 0.03);
  });
  box(0.12, 4.2, 0.12, dark, 8.6, 3.6, 0, g, true);
  mesh(new THREE.TorusGeometry(0.55, 0.04, 6, 16), dark, 8.6, 5.5, 0, g, true).rotation.x = Math.PI / 2;
  box(1.6, 0.45, 0.7, std({ color: "#f97316", roughness: 0.6 }), -3.2, 2.15, 1.7, g, true, 0.04);
  for (const z of [-2.15, 2.15]) {
    for (let i = 0; i < 9; i++) {
      mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), dark, 10.5 - i * 1.7, 1.85, z, g, false);
    }
    mesh(new THREE.BoxGeometry(15, 0.04, 0.04), dark, 2.5, 2.05, z, g, false);
  }
  mesh(new THREE.SphereGeometry(0.18, 10, 8), std({ color: "#ef4444", emissive: "#ef4444", emissiveIntensity: 0.8 }), -12.2, 2.3, 1.15, g, false);
  mesh(new THREE.SphereGeometry(0.18, 10, 8), std({ color: "#22c55e", emissive: "#22c55e", emissiveIntensity: 0.8 }), -12.2, 2.3, -1.15, g, false);
  return g;
}

function buildBike(style: RideId = "entrega") {
  const g = new THREE.Group();
  const paintColor = style === "esportiva" ? "#22d3ee" : style === "noturna" ? "#6d28d9" : "#b91c1c";
  const paint = std({ color: paintColor, metalness: style === "noturna" ? 0.75 : 0.55, roughness: 0.32, emissive: style === "noturna" ? "#4c1d95" : "#000000", emissiveIntensity: style === "noturna" ? 0.35 : 0 });
  const dark = std({ color: "#111827", metalness: 0.45, roughness: 0.4 });
  const rubber = std({ color: "#141414", roughness: 0.92 });
  const chrome = std({ color: "#e5e7eb", metalness: 0.92, roughness: 0.18 });
  const wheel = (z: number) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.075, 12, 28), rubber);
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 18), chrome);
    rim.rotation.z = Math.PI / 2;
    w.add(rim);
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.34, 0.012), chrome);
      spoke.rotation.z = (i / 5) * Math.PI;
      w.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 10), dark);
    hub.rotation.z = Math.PI / 2;
    w.add(hub);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.015, 16), std({ color: "#9ca3af", metalness: 0.8, roughness: 0.25 }));
    disc.rotation.z = Math.PI / 2;
    disc.position.x = 0.05;
    w.add(disc);
    w.position.set(0, 0.33, z);
    g.add(w);
    return w;
  };
  const front = wheel(0.86);
  const rear = wheel(-0.78);
  box(0.08, 0.08, 1.15, dark, 0, 0.48, 0.05, g, true);
  box(0.42, 0.32, 0.38, std({ color: "#1f2937", metalness: 0.7, roughness: 0.35 }), 0, 0.46, 0.02, g, true, 0.04);
  box(0.55, 0.28, 0.85, paint, 0, 0.78, 0.22, g, true, 0.08);
  box(0.42, 0.1, 0.48, dark, 0, 0.86, -0.22, g, true, 0.03);
  box(0.12, 0.16, 0.7, dark, 0.16, 0.4, -0.35, g, true);
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), chrome, 0.22, 0.32, -0.55, g, true).rotation.x = Math.PI / 2;
  box(0.5, 0.08, 0.7, dark, 0, 0.5, 0.72, g, true, 0.02);
  box(0.06, 0.42, 0.06, chrome, 0.1, 0.78, 0.5, g, true);
  box(0.06, 0.42, 0.06, chrome, -0.1, 0.78, 0.5, g, true);
  mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 8), chrome, 0, 1.02, 0.42, g, true).rotation.z = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.045, 10, 8), rubber, 0.32, 1.02, 0.42, g, false);
  mesh(new THREE.SphereGeometry(0.045, 10, 8), rubber, -0.32, 1.02, 0.42, g, false);
  mesh(new THREE.SphereGeometry(0.09, 12, 8), std({ color: "#f8fafc", emissive: "#fff7d6", emissiveIntensity: 0.7 }), 0, 0.84, 1.02, g, false);
  box(0.16, 0.1, 0.22, paint, 0, 0.62, -0.95, g, true, 0.02);
  mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), std({ color: "#ef4444", emissive: "#ef4444", emissiveIntensity: 0.6 }), 0, 0.7, -1.05, g, false);
  box(0.08, 0.04, 0.16, dark, 0.18, 0.36, 0.15, g, false);
  box(0.08, 0.04, 0.16, dark, -0.18, 0.36, 0.15, g, false);
  if (style === "esportiva") {
    box(0.46, 0.28, 0.08, std({ color: "#e0f2fe", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 }), 0, 1.12, 0.72, g, false);
  }
  if (style === "noturna") {
    mesh(new THREE.BoxGeometry(0.5, 0.04, 0.9), std({ color: "#c4b5fd", emissive: "#a78bfa", emissiveIntensity: 1.4 }), 0, 0.96, 0.15, g, false);
  }
  g.userData.wheels = [front, rear];
  if (style === "esportiva") g.scale.setScalar(1.06);
  if (style === "noturna") g.scale.setScalar(1.14);
  return g;
}

function buildJet() {
  const g = new THREE.Group();
  box(1.7, 0.28, 0.55, std({ color: "#f97316", roughness: 0.45, metalness: 0.2 }), 0, 0.35, 0, g, true, 0.08);
  box(0.45, 0.35, 0.4, std({ color: "#111827" }), -0.35, 0.6, 0, g, true, 0.05);
  return g;
}

function buildLamp(night: boolean) {
  const g = new THREE.Group();
  const metal = std({ color: "#3b4148", roughness: 0.5, metalness: 0.7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 6, 10), metal);
  pole.position.y = 3;
  pole.castShadow = true;
  g.add(pole);
  const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 5.9, 0), new THREE.Vector3(0, 6.7, 0), new THREE.Vector3(-0.6, 6.8, 0), new THREE.Vector3(-1.6, 6.5, 0));
  const arm = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.05, 8), metal);
  arm.castShadow = true;
  g.add(arm);
  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.4, 6, 12), metal);
  head.rotation.z = Math.PI / 2;
  head.position.set(-1.75, 6.45, 0);
  g.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshStandardMaterial({ color: "#fff3c4", emissive: "#ffd98a", emissiveIntensity: night ? 3 : 0.4 }));
  bulb.scale.set(1.8, 0.5, 1);
  bulb.position.set(-1.75, 6.33, 0);
  g.add(bulb);
  if (night) {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshBasicMaterial({ color: "#ffcf7a", transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-1.75, 0.2, 0);
    g.add(pool);
  }
  return g;
}

function drawScreen(canvasEl: HTMLCanvasElement, title: string, body: string[], color: string) {
  const g = canvasEl.getContext("2d")!;
  g.fillStyle = "#03140c";
  g.fillRect(0, 0, canvasEl.width, canvasEl.height);
  g.strokeStyle = color;
  g.lineWidth = 6;
  g.strokeRect(4, 4, canvasEl.width - 8, canvasEl.height - 8);
  g.fillStyle = color;
  g.font = "bold 22px monospace";
  g.textAlign = "center";
  g.fillText(title.slice(0, 22), canvasEl.width / 2, 40);
  g.font = "bold 26px monospace";
  body.slice(0, 4).forEach((l, i) => g.fillText(l.slice(0, 20), canvasEl.width / 2, 90 + i * 34));
}

export function updateScreen(layout: Layout, title: string, body: string[], color = "#4ade80") {
  drawScreen(layout.screen.canvas, title, body, color);
  layout.screen.texture.needsUpdate = true;
}

function furnishHome(scene: THREE.Scene, addCol: (minX: number, maxX: number, minZ: number, maxZ: number, top: number) => void) {
  const wood = std({ color: "#8a5a32", roughness: 0.75 });
  const cloth = std({ color: "#1d4ed8", roughness: 0.85 });
  const sheet = std({ color: "#e2e8f0", roughness: 0.9 });
  const dark = std({ color: "#1f2937", roughness: 0.6 });
  box(2.2, 0.35, 1.5, wood, 19.3, 0.45, 23.7, scene, true, 0.04);
  box(2.05, 0.16, 1.35, sheet, 19.3, 0.68, 23.7, scene, false);
  box(2.05, 0.18, 0.45, std({ color: "#bfdbfe" }), 19.3, 0.78, 24.15, scene, false);
  addCol(18.2, 20.4, 22.9, 24.5, 0.85);
  box(0.7, 1.7, 1.5, wood, 24.6, 1.15, 24.1, scene, true, 0.03);
  addCol(24.2, 25.0, 23.3, 24.9, 1.9);
  box(2.2, 0.45, 0.8, cloth, 24.0, 0.55, 19.7, scene, true, 0.05);
  box(2.2, 0.4, 0.15, cloth, 24.0, 0.85, 20.05, scene, false);
  addCol(22.8, 25.2, 19.3, 20.2, 0.9);
  box(0.9, 0.45, 0.4, dark, 18.5, 0.55, 19.5, scene, true);
  box(1.1, 0.7, 0.06, std({ color: "#0f172a", emissive: "#38bdf8", emissiveIntensity: 0.35 }), 18.5, 1.25, 19.35, scene, false);
  addCol(18.0, 19.1, 19.2, 19.8, 0.8);
  box(1.5, 0.08, 0.8, wood, 21.5, 0.78, 22.15, scene, true);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), wood, 21.1, 0.4, 21.85, scene, true);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8), wood, 21.9, 0.4, 22.45, scene, true);
  addCol(20.7, 22.3, 21.7, 22.6, 0.85);
  box(0.4, 0.45, 0.4, dark, 21.5, 0.5, 21.15, scene, true);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.2), std({ color: "#7f1d1d", roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(21.6, 0.28, 20.4);
  scene.add(rug);
}

function buildHideout(scene: THREE.Scene, addCol: (minX: number, maxX: number, minZ: number, maxZ: number, top: number) => Collider) {
  const concrete = std({ color: "#1e293b", roughness: 0.8 });
  const trim = std({ color: "#334155", metalness: 0.3, roughness: 0.5 });
  const { minX, maxX, minZ, maxZ } = CENTRAL;
  const midX = (minX + maxX) / 2;
  const wallT = 0.35;
  const wallH = ROOF + 1.2;
  const wall = (x0: number, x1: number, z0: number, z1: number) => {
    box(x1 - x0, wallH, z1 - z0, concrete, (x0 + x1) / 2, wallH / 2, (z0 + z1) / 2, scene, true);
    addCol(x0, x1, z0, z1, wallH);
  };
  wall(minX, minX + wallT, minZ, maxZ);
  wall(maxX - wallT, maxX, minZ, maxZ);
  wall(minX, maxX, maxZ - wallT, maxZ);
  wall(minX, midX - 1.1, minZ, minZ + wallT);
  wall(midX + 1.1, maxX, minZ, minZ + wallT);
  const door = addCol(midX - 1.1, midX + 1.1, minZ, minZ + wallT, 2.6);
  door.door = "central";
  door.shut = 2.6;
  const step = (x: number, z: number, top: number) => {
    box(1.35, 0.16, 0.38, trim, x, top - 0.08, z, scene, true);
    addCol(x - 0.68, x + 0.68, z - 0.2, z + 0.2, top);
  };
  for (let i = 0; i < 15; i++) step(37.4, 19.3 + i * 0.42, 0.34 * (i + 1));
  box(3.4, 0.2, 1.5, trim, 38.6, 5.15, 26.0, scene, true);
  addCol(36.9, 40.3, 25.2, 26.8, 5.25);
  for (let i = 0; i < 15; i++) step(39.4, 25.8 - i * 0.4, 5.55 + i * 0.34);
  box(6.2, 0.22, 8.2, std({ color: "#0f172a", roughness: 0.7 }), 43.0, ROOF - 0.08, 22.6, scene, true);
  addCol(40.35, 45.7, 18.5, 26.85, ROOF);
  addCol(39.7, 40.5, 19.9, 21.1, ROOF);
  const lip = ROOF + 0.85;
  const rail = (x0: number, x1: number, z0: number, z1: number) => {
    box(Math.max(0.12, x1 - x0), 0.7, Math.max(0.12, z1 - z0), trim, (x0 + x1) / 2, ROOF + 0.45, (z0 + z1) / 2, scene, true);
    addCol(x0, x1, z0, z1, lip);
  };
  rail(40.4, 45.7, 18.5, 18.7);
  rail(45.5, 45.7, 18.5, 26.8);
  rail(40.4, 45.7, 26.6, 26.85);
  const screen = std({ color: "#082f49", emissive: "#22d3ee", emissiveIntensity: 0.85, roughness: 0.2 });
  box(2.4, 0.12, 1.1, std({ color: "#111827" }), 42.6, ROOF + 0.75, 23.5, scene, true);
  addCol(41.5, 43.8, 23.0, 24.1, ROOF + 0.9);
  box(1.5, 1.35, 0.08, screen, 42.15, ROOF + 1.7, 23.95, scene, false);
  box(1.5, 1.35, 0.08, screen, 43.7, ROOF + 1.7, 23.95, scene, false);
  box(0.45, 0.9, 0.7, std({ color: "#020617", metalness: 0.4 }), 41.5, ROOF + 0.7, 23.2, scene, true);
  mesh(new THREE.SphereGeometry(0.08, 10, 8), std({ color: "#22d3ee", emissive: "#22d3ee", emissiveIntensity: 2 }), 41.5, ROOF + 1.05, 23.45, scene, false);
  const pole = mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), trim, HIDEOUT.x, ROOF + 1.8, 19.3, scene, true);
  pole.castShadow = true;
  mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshBasicMaterial({ color: "#38bdf8", toneMapped: false }), HIDEOUT.x, ROOF + 3.5, 19.3, scene, false);
}

export function buildWorld(scene: THREE.Scene, themeId: string, seed: number, target: string): Layout {
  const theme = THEMES[themeId] ?? THEMES.w1;
  const night = theme.night;
  const r = rng(seed + 11);
  const colliders: Collider[] = [];
  const addCol = (minX: number, maxX: number, minZ: number, maxZ: number, top: number) => {
    const c: Collider = { minX, maxX, minZ, maxZ, top };
    colliders.push(c);
    return c;
  };

  scene.background = skyTexture(theme.sky[0], theme.sky[1], theme.sun, night);
  scene.fog = new THREE.Fog(theme.fog, 45, night ? 140 : 190);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE + 240, SIZE + 240),
    std({ color: "#1a4a68", roughness: 0.28, metalness: 0.2 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(SIZE / 2, -0.12, SIZE / 2);
  scene.add(water);
  const sandMat = std({ color: "#e6d2a4", roughness: 1 });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(SIZE + COAST * 2, SIZE + COAST * 2), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(SIZE / 2, -0.06, SIZE / 2);
  sand.receiveShadow = true;
  scene.add(sand);
  const grassMat = std({ color: "#3c7a46", roughness: 1 });
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(SIZE + GREEN * 2, SIZE + GREEN * 2), grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(SIZE / 2, -0.03, SIZE / 2);
  grass.receiveShadow = true;
  scene.add(grass);
  const wetMat = std({ color: "#c9b48a", roughness: 0.72 });
  const wet = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), wetMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, -0.045, z);
    m.receiveShadow = true;
    scene.add(m);
  };
  const lip = 4.5;
  wet(SIZE + COAST * 2, lip, SIZE / 2, -COAST + lip / 2);
  wet(SIZE + COAST * 2, lip, SIZE / 2, SIZE + COAST - lip / 2);
  wet(lip, SIZE, -COAST + lip / 2, SIZE / 2);
  wet(lip, SIZE, SIZE + COAST - lip / 2, SIZE / 2);
  const asphalt = asphaltTextures();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE),
    std({ map: asphalt.map, bumpMap: asphalt.bump, bumpScale: 1.2, roughness: 0.92, color: night ? "#9aa0b0" : "#ffffff" }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(SIZE / 2, 0, SIZE / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const pave = pavementTextures(themeId === "w1" ? "#d9cfc0" : "#9d9a95", night);
  pave.map.repeat.set(10, 10);
  pave.bump.repeat.set(10, 10);
  const sidewalk = std({ map: pave.map, bumpMap: pave.bump, bumpScale: 1.5, roughness: 0.9 });
  const curbMat = std({ color: "#b7b2aa", roughness: 0.8 });
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const cx = blockStart(i) + BLOCK / 2;
      const cz = blockStart(j) + BLOCK / 2;
      box(BLOCK + 3.4, 0.16, BLOCK + 3.4, curbMat, cx, 0.08, cz, scene, false, 0.08);
      const s = mesh(new THREE.BoxGeometry(BLOCK + 3, 0.2, BLOCK + 3), sidewalk, cx, 0.1, cz, scene, false);
      s.receiveShadow = true;
    }
  }
  const decals = (color: string, rects: [number, number, number, number][]) => {
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), std({ color, roughness: 0.6 }), rects.length);
    const m4 = new THREE.Matrix4();
    rects.forEach(([x, z, w, d], k) => m.setMatrixAt(k, m4.makeScale(w, 1, d).setPosition(x, 0.012, z)));
    m.receiveShadow = true;
    scene.add(m);
  };
  const yellowR: [number, number, number, number][] = [];
  const whiteR: [number, number, number, number][] = [];
  const inCross = (v: number) => [0, 1, 2, 3].some((j) => Math.abs(v - streetCenter(j)) < STREET / 2 + 0.5);
  for (let i = 0; i < 4; i++) {
    const sc = streetCenter(i);
    for (let k = 0; k < SIZE; k += 5) {
      if (inCross(k + 1.25)) continue;
      for (const o of [-0.12, 0.12]) {
        yellowR.push([sc + o, k + 1.25, 0.14, 2.5]);
        yellowR.push([k + 1.25, sc + o, 2.5, 0.14]);
      }
    }
    for (let j = 0; j < 4; j++) {
      const sj = streetCenter(j);
      for (let s = -5; s <= 5; s += 1.2) {
        for (const side of [-1, 1]) {
          whiteR.push([sc + s, sj + side * 6, 0.6, 2.2]);
          whiteR.push([sc + side * 6, sj + s, 2.2, 0.6]);
        }
      }
    }
  }
  decals("#e0b43a", yellowR);
  decals("#e8e4d8", whiteR);

  const facadeCache = new Map<string, ReturnType<typeof facadeTextures>[]>();
  const facadesFor = (id: string) => {
    const hit = facadeCache.get(id);
    if (hit) return hit;
    const th = THEMES[id] ?? theme;
    const list = th.palette.map((c) => facadeTextures(c, th.night, th.kind, r));
    facadeCache.set(id, list);
    return list;
  };
  const roofMat = std({ color: night ? "#1b1b20" : "#6a645e", roughness: 0.95 });
  const trimMat = std({ color: night ? "#6b6b72" : "#efe9df", roughness: 0.7 });
  const tiles = roofTiles();
  const tileMat = std({ map: tiles, roughness: 0.8, color: night ? "#777" : "#fff" });
  const awningColors = ["#b91c1c", "#15803d", "#1d4ed8", "#ca8a04", "#7c2d12"];
  const railMat = std({ color: "#2b2f35", roughness: 0.4, metalness: 0.8 });
  const tankMat = std({ color: "#3a6ea5", roughness: 0.5 });
  const acMat = std({ color: "#d4d4d8", roughness: 0.5, metalness: 0.3 });

  const compound = { minX: blockStart(2), maxX: blockStart(2) + BLOCK, minZ: blockStart(2), maxZ: blockStart(2) + BLOCK };

  const building = (cx: number, cz: number, w: number, d: number, h: number) => {
    const district = THEMES[districtAt(cx, cz)] ?? theme;
    const facades = facadesFor(districtAt(cx, cz));
    const f = facades[Math.floor(r() * facades.length)];
    const unitW = district.kind === "houses" ? 4 : district.kind === "containers" ? 6 : 3.2;
    const unitH = district.kind === "containers" ? h : 3.2;
    const map = f.map.clone();
    const bump = f.bump.clone();
    const reps = (face: number) => [Math.max(1, Math.round(face / unitW)), Math.max(1, Math.round(h / unitH))] as const;
    const sideMat = (face: number) => {
      const [rx, ry] = reps(face);
      const m1 = map.clone();
      m1.repeat.set(rx, ry);
      m1.needsUpdate = true;
      const b1 = bump.clone();
      b1.repeat.set(rx, ry);
      b1.needsUpdate = true;
      const m = std({ map: m1, bumpMap: b1, bumpScale: 2.2, roughness: district.kind === "towers" || district.kind === "corporate" ? 0.45 : 0.9, metalness: district.kind === "containers" ? 0.35 : 0 });
      if (f.emissive) {
        const e1 = f.emissive.clone();
        e1.repeat.set(rx, ry);
        e1.needsUpdate = true;
        m.emissiveMap = e1;
        m.emissive = new THREE.Color("#ffffff");
        m.emissiveIntensity = 0.55;
      }
      return m;
    };
    const mw = sideMat(w);
    const md = sideMat(d);
    const round = district.kind === "containers" ? 0.05 : 0.25;
    const body = mesh(new RoundedBoxGeometry(w, h, d, 2, round), [md, md, roofMat, roofMat, mw, mw], cx, h / 2, cz, scene);
    body.receiveShadow = true;
    addCol(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, h);

    if (district.kind === "containers") {
      for (let y = 2.6; y < h; y += 2.6) box(w + 0.05, 0.08, d + 0.05, std({ color: "#1f1f1f" }), cx, y, cz, scene, false);
      return;
    }
    if (district.kind === "houses") {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2 - 0.5, 0);
      shape.lineTo(0, 2.4);
      shape.lineTo(w / 2 + 0.5, 0);
      shape.closePath();
      const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: d + 0.8, bevelEnabled: false }), tileMat);
      roof.position.set(cx, h, cz - d / 2 - 0.4);
      roof.castShadow = true;
      scene.add(roof);
    } else {
      box(w + 0.5, 0.4, d + 0.5, trimMat, cx, h + 0.1, cz, scene, true, 0.12);
      if (r() < 0.6) {
        const tank = mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 18), tankMat, cx + (r() - 0.5) * (w - 3), h + 1.1, cz + (r() - 0.5) * (d - 3), scene);
        tank.castShadow = true;
      }
      for (let k = 0; k < 2; k++) box(1, 0.7, 0.8, acMat, cx + (r() - 0.5) * (w - 2), h + 0.6, cz + (r() - 0.5) * (d - 2), scene, true, 0.08);
    }
    if (district.kind === "sheds") {
      const door = std({ color: "#5b5550", roughness: 0.6, metalness: 0.5 });
      box(0.1, 4, 5, door, cx - w / 2 - 0.05, 2, cz, scene, false);
      return;
    }
    box(w + 0.2, 0.25, d + 0.2, trimMat, cx, 3.4, cz, scene, false, 0.08);
    const faces: [number, number, number, number][] = [
      [cx - w / 2, cz, -1, 0],
      [cx + w / 2, cz, 1, 0],
      [cx, cz - d / 2, 0, -1],
      [cx, cz + d / 2, 0, 1],
    ];
    for (const [fx, fz, nx, nz] of faces) {
      const along = nx !== 0 ? d : w;
      if (r() < 0.65) {
        const col = awningColors[Math.floor(r() * awningColors.length)];
        const aw = new THREE.Mesh(new RoundedBoxGeometry(along * 0.6, 0.06, 1.3, 2, 0.02), std({ color: col, roughness: 0.9 }));
        aw.rotation.y = Math.atan2(nx, nz);
        aw.rotateX(0.35);
        aw.position.set(fx + nx * 0.62, 2.75, fz + nz * 0.62);
        aw.castShadow = true;
        scene.add(aw);
        const shop = std({ color: night ? "#ffd08a" : "#223040", emissive: night ? "#ffb85c" : "#000000", emissiveIntensity: night ? 0.45 : 0, roughness: 0.1, metalness: 0.3 });
        if (nx !== 0) box(0.06, 2.1, along * 0.5, shop, fx + nx * 0.04, 1.35, fz, scene, false);
        else box(along * 0.5, 2.1, 0.06, shop, fx, 1.35, fz + nz * 0.04, scene, false);
      }
      if (h > 7 && r() < 0.5) {
        for (let y = 6.4; y < h - 1; y += 3.2) {
          const bw = Math.min(3, along * 0.3);
          const px = fx + nx * 0.55;
          const pz = fz + nz * 0.55;
          if (nx !== 0) {
            box(1.1, 0.15, bw, trimMat, px, y - 1.5, pz, scene, true, 0.05);
            box(0.05, 0.9, bw, railMat, px + nx * 0.52, y - 1.0, pz, scene, false);
          } else {
            box(bw, 0.15, 1.1, trimMat, px, y - 1.5, pz, scene, true, 0.05);
            box(bw, 0.9, 0.05, railMat, px, y - 1.0, pz + nz * 0.52, scene, false);
          }
        }
      }
    }
  };

  const crateMat = std({ color: "#8a5a2b", roughness: 0.95 });
  const binMat = std({ color: "#2f5d3a", roughness: 0.6 });
  const barrelMat = std({ color: "#1d4ed8", roughness: 0.5, metalness: 0.4 });
  const prop = (x: number, z: number, y = 0) => {
    const k = r();
    if (k < 0.4) {
      box(1.2, 1.2, 1.2, crateMat, x, y + 0.6, z, scene, true, 0.06);
      addCol(x - 0.6, x + 0.6, z - 0.6, z + 0.6, y + 1.2);
    } else if (k < 0.75 || y > 0) {
      mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.1, 18), barrelMat, x, y + 0.55, z, scene);
      addCol(x - 0.42, x + 0.42, z - 0.42, z + 0.42, y + 1.1);
    } else {
      box(0.9, 1.1, 0.8, binMat, x, 0.55, z, scene, true, 0.08);
      box(0.95, 0.08, 0.85, binMat, x, 1.14, z, scene, false, 0.03);
      addCol(x - 0.45, x + 0.45, z - 0.4, z + 0.4, 1.2);
    }
  };

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 2 && j === 2) continue;
      const bx = blockStart(i);
      const bz = blockStart(j);
      const lot = THEMES[districtAt(bx + 8, bz + 8)] ?? theme;
      if (lot.kind === "corporate" && i === 1 && j === 1) {
        const h = 140;
        const f = facadeTextures("#3a3f5c", true, "towers", r);
        f.map.repeat.set(10, 44);
        f.bump.repeat.set(10, 44);
        f.emissive!.repeat.set(10, 44);
        const mat = std({ map: f.map, emissiveMap: f.emissive!, emissive: "#ffffff", emissiveIntensity: 1.2, roughness: 0.25, metalness: 0.6 });
        const tower = mesh(new THREE.CylinderGeometry(14, 16, h, 8), mat, bx + BLOCK / 2, h / 2, bz + BLOCK / 2, scene);
        tower.castShadow = true;
        const logo = mesh(new THREE.TorusGeometry(14.5, 0.8, 8, 32), new THREE.MeshStandardMaterial({ color: themeId === "w6" ? "#e11d48" : "#8b5cf6", emissive: themeId === "w6" ? "#e11d48" : "#8b5cf6", emissiveIntensity: 2 }), bx + BLOCK / 2, h - 8, bz + BLOCK / 2, scene, false);
        logo.rotation.x = Math.PI / 2;
        addCol(bx + 4, bx + BLOCK - 4, bz + 4, bz + BLOCK - 4, h);
        continue;
      }
      for (let li = 0; li < 2; li++) {
        for (let lj = 0; lj < 2; lj++) {
          const cx = bx + 9 + li * 18;
          const cz = bz + 9 + lj * 18;
          const homeLot = i === 0 && j === 0 && li === 0 && lj === 0;
          const centralLot = i === 0 && j === 0 && li === 1 && lj === 0;
          const shopLot = (i === 2 && j === 0 && li === 1 && lj === 0) || (i === 0 && j === 2 && li === 0 && lj === 1);
          if (homeLot || centralLot || shopLot) continue;
          const roll = r();
          if (roll < 0.2 && !(i === 0 && j === 0)) {
            for (let k = 0; k < 3; k++) {
              const x = cx - 5 + r() * 10;
              const z = cz - 5 + r() * 10;
              prop(x, z);
              if (r() > 0.6) prop(x, z, 1.2);
            }
            const tree = buildTree(r, night);
            tree.position.set(cx + 4, 0.2, cz - 4);
            scene.add(tree);
            addCol(cx + 3.8, cx + 4.2, cz - 4.2, cz - 3.8, 3);
            continue;
          }
          const [hmin, hmax] = lot.heights;
          let h = hmin + r() * (hmax - hmin);
          if (lot.kind === "containers") h = 2.6 * (1 + Math.floor(r() * 4));
          const w = lot.kind === "containers" ? 6 : 12 + r() * 3;
          const d = lot.kind === "containers" ? 14 : 12 + r() * 3;
          building(cx, cz, w, d, h);
        }
      }
    }
  }

  const spots: Spot[] = [];
  const areaName = (i: number, j: number) => ["Rua da Feira", "Av. do Porto", "Travessa Seca", "Rua das Palmeiras", "Largo do Mercado", "Rua do Cais", "Av. Central", "Beco do Sal"][(i * 3 + j) % 8];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 2 && j === 2) continue;
      if ((THEMES[districtAt(blockStart(i) + 8, blockStart(j) + 8)] ?? theme).kind === "corporate" && i === 1 && j === 1) continue;
      spots.push({ pos: new THREE.Vector3(blockStart(i) + 0.7, 0, blockStart(j) + BLOCK / 2 + (r() - 0.5) * 8), area: areaName(i, j) });
    }
  }

  const pedLoops: THREE.Vector3[][] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const o = -1.15;
      const x0 = blockStart(i) + o;
      const z0 = blockStart(j) + o;
      const x1 = blockStart(i) + BLOCK - o;
      const z1 = blockStart(j) + BLOCK - o;
      pedLoops.push([new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 0, z0), new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x0, 0, z1)]);
    }
  }

  const nearSpot = (x: number, z: number, d: number) => spots.some((s) => Math.hypot(s.pos.x - x, s.pos.z - z) < d);

  const carColors = ["#2a2f36", "#b8bcc2", "#8e1b1b", "#1f3f8a", "#f1f1ef", "#1d5a45", "#c7a14a"];
  const kinds = ["sedan", "hatch", "sedan", "van"] as const;
  for (let n = 0; n < 16; n++) {
    const alongX = r() > 0.5;
    const line = Math.floor(r() * 4);
    const pos = 20 + r() * (SIZE - 40);
    const side = r() > 0.5 ? 1 : -1;
    const x = alongX ? pos : streetCenter(line) + side * 4.9;
    const z = alongX ? streetCenter(line) + side * 4.9 : pos;
    if (Math.hypot(x - 7, z - 7) < 18) continue;
    if (x > compound.minX - 16 && z > compound.minZ - 16) continue;
    if ([0, 1, 2, 3].some((j) => Math.abs((alongX ? x : z) - streetCenter(j)) < 9)) continue;
    const car = buildCar(carColors[n % carColors.length], kinds[n % kinds.length]);
    car.position.set(x, 0, z);
    car.rotation.y = alongX ? Math.PI / 2 : 0;
    scene.add(car);
    const hl = car.userData.length / 2;
    if (alongX) addCol(x - hl, x + hl, z - 0.95, z + 0.95, 1.5);
    else addCol(x - 0.95, x + 0.95, z - hl, z + hl, 1.5);
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = streetCenter(i) + 6.6;
      const z = streetCenter(j) + 6.6;
      const lamp = buildLamp(night);
      lamp.position.set(x, 0.2, z);
      lamp.rotation.y = Math.PI / 4 + Math.PI;
      scene.add(lamp);
      addCol(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 6);
    }
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 2 && j === 2) continue;
      for (let k = 0; k < 2; k++) {
        const x = blockStart(i) + 8 + k * 20;
        const z = blockStart(j) - 0.25;
        if (nearSpot(x, z, 3)) continue;
        const tree = buildTree(r, night);
        tree.position.set(x, 0.2, z);
        tree.scale.setScalar(0.8);
        scene.add(tree);
        addCol(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 3);
      }
    }
  }

  const wallTex = facadeTextures("#6b6560", false, "sheds", r);
  wallTex.map.repeat.set(8, 1);
  const wallMat = std({ map: wallTex.map, bumpMap: wallTex.bump, bumpScale: 1.5, roughness: 0.95 });
  const stripeMat = std({ color: "#e3b928", roughness: 0.5 });
  const wireMat = std({ color: "#9ca3af", roughness: 0.4, metalness: 0.8 });
  const { minX, maxX, minZ, maxZ } = compound;
  const gateZ = (minZ + maxZ) / 2;
  const gateW = 6;
  const wall = (x1: number, x2: number, z1: number, z2: number) => {
    const w = Math.max(0.8, x2 - x1);
    const d = Math.max(0.8, z2 - z1);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    box(w, 4, d, wallMat, cx, 2, cz, scene, true, 0.1);
    box(w + 0.1, 0.2, d + 0.1, trimMat, cx, 4.05, cz, scene, false, 0.05);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 4, 12), wireMat);
    const len = Math.max(w, d);
    const inst = new THREE.InstancedMesh(coil.geometry, wireMat, Math.floor(len / 0.3));
    const m4 = new THREE.Matrix4();
    for (let k = 0; k < inst.count; k++) {
      const p = -len / 2 + k * 0.3;
      m4.makeRotationY(w > d ? Math.PI / 2 : 0).setPosition(w > d ? cx + p : cx, 4.4, w > d ? cz : cz + p);
      inst.setMatrixAt(k, m4);
    }
    scene.add(inst);
    addCol(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, 4);
  };
  wall(minX, maxX, minZ - 0.4, minZ + 0.4);
  wall(minX, maxX, maxZ - 0.4, maxZ + 0.4);
  wall(maxX - 0.4, maxX + 0.4, minZ, maxZ);
  wall(minX - 0.4, minX + 0.4, minZ, gateZ - gateW / 2);
  wall(minX - 0.4, minX + 0.4, gateZ + gateW / 2, maxZ);
  const signCol = themeId === "w6" ? "#e11d48" : "#7c3aed";
  box(0.3, 1.2, 8, new THREE.MeshStandardMaterial({ color: signCol, emissive: signCol, emissiveIntensity: 0.8 }), minX - 0.5, 5, gateZ, scene, false, 0.1);
  for (let k = 0; k < 5; k++) {
    const tree = buildTree(r, night);
    tree.position.set(minX + 6 + k * 6, 0, maxZ - 3);
    tree.scale.setScalar(0.7);
    scene.add(tree);
  }

  const gateMesh = new THREE.Group();
  const gateMetal = std({ color: "#5e646c", roughness: 0.45, metalness: 0.7 });
  box(0.3, 3.8, gateW, gateMetal, 0, 1.9, 0, gateMesh, true, 0.05);
  for (let k = 0; k < 12; k++) mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.8, 8), gateMetal, 0.2, 1.9, -gateW / 2 + 0.25 + k * 0.5, gateMesh, false);
  for (let k = 0; k < 4; k++) box(0.34, 0.2, gateW, stripeMat, 0, 0.6 + k * 0.9, 0, gateMesh, false);
  gateMesh.position.set(minX, 0, gateZ);
  scene.add(gateMesh);
  const gateCollider = addCol(minX - 0.4, minX + 0.4, gateZ - gateW / 2, gateZ + gateW / 2, 4);
  gateCollider.gate = true;

  const terminal = new THREE.Vector3(minX - 2.6, 0, gateZ - 6.5);
  const kiosk = new THREE.Group();
  box(0.6, 1.3, 0.9, std({ color: "#2e3a4a", roughness: 0.4, metalness: 0.6 }), 0, 0.65, 0, kiosk, true, 0.08);
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 256;
  screenCanvas.height = 192;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(-0.31, 1.55, 0);
  screen.rotation.y = -Math.PI / 2;
  kiosk.add(screen);
  const hood = box(0.7, 0.8, 1.0, std({ color: "#1b2330", roughness: 0.5, metalness: 0.5 }), 0.05, 1.55, 0, kiosk, true, 0.05);
  hood.scale.set(0.3, 1, 1);
  kiosk.position.copy(terminal);
  scene.add(kiosk);
  const kioskCollider = addCol(terminal.x - 0.35, terminal.x + 0.35, terminal.z - 0.5, terminal.z + 0.5, 1.9);
  const layoutScreen = { canvas: screenCanvas, texture: screenTex };
  drawScreen(screenCanvas, target.toUpperCase(), ["BLOQUEADO", "aperte E"], "#f87171");
  screenTex.needsUpdate = true;

  const carStart = new THREE.Vector3(minX + 20, 0, gateZ);
  const car = buildCar("#b3121b");
  car.position.copy(carStart);
  car.rotation.y = -Math.PI / 2;
  scene.add(car);
  const carCol = addCol(carStart.x - 2.2, carStart.x + 2.2, carStart.z - 1, carStart.z + 1, 1.5);
  carCol.gate = false;
  car.userData.collider = carCol;

  for (let k = 0; k < 6; k++) prop(minX + 6 + r() * 24, minZ + 4 + r() * 6);
  for (let k = 0; k < 4; k++) prop(minX + 6 + r() * 24, maxZ - 7 - r() * 4);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 60, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: "#4ade80", transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
  );
  beacon.position.set(terminal.x, 30, terminal.z);
  scene.add(beacon);

  const patrols1: [THREE.Vector3, THREE.Vector3][] = [];
  for (let n = 0; n < 40 && patrols1.length < 12; n++) {
    const alongX = r() > 0.5;
    const line = Math.floor(r() * 4);
    const pos = 20 + r() * (SIZE - 40);
    const off = (r() > 0.5 ? 1 : -1) * 5.6;
    const a = alongX ? new THREE.Vector3(pos - 10, 0, streetCenter(line) + off) : new THREE.Vector3(streetCenter(line) + off, 0, pos - 10);
    const b = alongX ? new THREE.Vector3(pos + 10, 0, streetCenter(line) + off) : new THREE.Vector3(streetCenter(line) + off, 0, pos + 10);
    if (a.distanceTo(new THREE.Vector3(7, 0, 7)) < 32) continue;
    if (a.x > minX - 4 && a.z > minZ - 4) continue;
    patrols1.push([a, b]);
  }
  const patrols2 = [new THREE.Vector3(minX + 10, 0, gateZ - 8), new THREE.Vector3(minX + 10, 0, gateZ + 8), new THREE.Vector3(minX + 26, 0, gateZ - 10), new THREE.Vector3(minX + 28, 0, gateZ + 10)];
  const droneSpots: THREE.Vector3[] = [];
  for (let n = 0; n < 6; n++) droneSpots.push(new THREE.Vector3(streetCenter(1 + (n % 3)), 7, 30 + r() * (SIZE - 60)));

  const roomWall = std({ color: "#e7d3b0", roughness: 0.85 });
  const shopMat = std({ color: "#d6d3d1", roughness: 0.8 });
  const placeRoom = (minX: number, maxX: number, minZ: number, maxZ: number, door: "home" | "shop" | "central", gap: RoomGap) => {
    const mat = door === "home" ? roomWall : door === "central" ? std({ color: "#dbe7f0", roughness: 0.7 }) : shopMat;
    const midX = (minX + maxX) / 2;
    const midZ = (minZ + maxZ) / 2;
    box(maxX - minX, 0.1, maxZ - minZ, mat, midX, 0.26, midZ, scene, false);
    const t = 0.28;
    const h = 2.8;
    const slab = (x0: number, x1: number, z0: number, z1: number, tagged = false) => {
      if (x1 - x0 < 0.2 || z1 - z0 < 0.2) return;
      if (!tagged) box(x1 - x0, h, z1 - z0, mat, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, scene, true, 0.04);
      const col = addCol(x0, x1, z0, z1, h);
      if (tagged) {
        col.door = door;
        col.shut = h;
      }
    };
    if (gap !== "west") slab(minX, minX + t, minZ, maxZ);
    if (gap !== "east") slab(maxX - t, maxX, minZ, maxZ);
    if (gap !== "minusZ") slab(minX, maxX, minZ, minZ + t);
    if (gap !== "plusZ") slab(minX, maxX, maxZ - t, maxZ);
    if (gap === "east") {
      slab(maxX - t, maxX, minZ, midZ - 1.1);
      slab(maxX - t, maxX, midZ + 1.1, maxZ);
      slab(maxX - t, maxX, midZ - 1.1, midZ + 1.1, true);
    } else if (gap === "west") {
      slab(minX, minX + t, minZ, midZ - 1.1);
      slab(minX, minX + t, midZ + 1.1, maxZ);
      slab(minX, minX + t, midZ - 1.1, midZ + 1.1, true);
    } else if (gap === "plusZ") {
      slab(minX, midX - 1.1, maxZ - t, maxZ);
      slab(midX + 1.1, maxX, maxZ - t, maxZ);
      slab(midX - 1.1, midX + 1.1, maxZ - t, maxZ, true);
    } else {
      slab(minX, midX - 1.1, minZ, minZ + t);
      slab(midX + 1.1, maxX, minZ, minZ + t);
      slab(midX - 1.1, midX + 1.1, minZ, minZ + t, true);
    }
    if (door === "home") {
      const shape = new THREE.Shape();
      shape.moveTo(-((maxX - minX) / 2 + 0.4), 0);
      shape.lineTo(0, 1.8);
      shape.lineTo((maxX - minX) / 2 + 0.4, 0);
      shape.closePath();
      const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: maxZ - minZ + 0.6, bevelEnabled: false }), tileMat);
      roof.position.set(midX, h, minZ - 0.3);
      roof.castShadow = true;
      scene.add(roof);
    }
  };
  placeRoom(HOME.minX, HOME.maxX, HOME.minZ, HOME.maxZ, "home", HOME.gap);
  furnishHome(scene, addCol);
  placeRoom(SHOP_A.minX, SHOP_A.maxX, SHOP_A.minZ, SHOP_A.maxZ, "shop", SHOP_A.gap);
  placeRoom(SHOP_B.minX, SHOP_B.maxX, SHOP_B.minZ, SHOP_B.maxZ, "shop", SHOP_B.gap);
  const armas = labelPlane("ARMAS", "#f87171");
  armas.position.set((SHOP_A.minX + SHOP_A.maxX) / 2, 2.7, SHOP_A.minZ - 0.06);
  scene.add(armas);
  const motos = labelPlane("MOTOS", "#38bdf8");
  motos.position.set(SHOP_B.minX - 0.06, 2.7, (SHOP_B.minZ + SHOP_B.maxZ) / 2);
  motos.rotation.y = -Math.PI / 2;
  scene.add(motos);
  box(2.2, 0.9, 0.5, std({ color: "#7f1d1d", roughness: 0.6 }), (SHOP_A.minX + SHOP_A.maxX) / 2, 0.7, (SHOP_A.minZ + SHOP_A.maxZ) / 2 + 1.2, scene, true);
  box(0.5, 0.9, 2.2, std({ color: "#0e7490", roughness: 0.55 }), (SHOP_B.minX + SHOP_B.maxX) / 2 + 1.2, 0.7, (SHOP_B.minZ + SHOP_B.maxZ) / 2, scene, true);
  buildHideout(scene, addCol);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), grassMat);
  yard.rotation.x = -Math.PI / 2;
  yard.position.set(23.2, 0.22, 23.2);
  yard.receiveShadow = true;
  scene.add(yard);
  const yardRng = rng(41);
  for (const [tx, tz] of [
    [29.2, 20.4],
    [19.2, 29.4],
  ] as const) {
    const tree = buildTree(yardRng, night);
    tree.position.set(tx, 0.2, tz);
    scene.add(tree);
    addCol(tx - 0.25, tx + 0.25, tz - 0.25, tz + 0.25, 3);
  }
  const bikes = {
    entrega: buildBike("entrega"),
    esportiva: buildBike("esportiva"),
    noturna: buildBike("noturna"),
  };
  for (const id of ["entrega", "esportiva", "noturna"] as const) {
    bikes[id].position.set(BIKE_PARK.x, 0, BIKE_PARK.z);
    bikes[id].visible = id === "entrega";
    scene.add(bikes[id]);
  }
  const bike = bikes.entrega;
  const port = buildPort(scene, addCol);
  const jet = buildJet();
  jet.position.set(JET.x, 0, JET.z);
  scene.add(jet);
  for (const c of addCoast(scene, night)) addCol(c.minX, c.maxX, c.minZ, c.maxZ, 3);

  const spawn = new THREE.Vector3(BIKE_PARK.x + 2.2, 0, BIKE_PARK.z);
  const allySpots = [
    new THREE.Vector3(BIKE_PARK.x - 2.4, 0, BIKE_PARK.z),
    new THREE.Vector3(HOME.minX + 1.2, 0, HOME.minZ - 1.5),
    new THREE.Vector3(HOME.maxX - 1.2, 0, HOME.minZ - 1.5),
  ];

  return {
    colliders,
    spawn,
    allySpots,
    terminal,
    kiosk,
    kioskCollider,
    gate: { x: minX, z: gateZ, width: gateW, mesh: gateMesh, collider: gateCollider, lights: [] },
    car,
    carStart,
    compound,
    patrols1,
    patrols2,
    droneSpots,
    spots,
    pedLoops,
    screen: layoutScreen,
    beacon,
    night,
    bike,
    bikes,
    jet,
    ships: port,
  };
}
