import { SIGN_FONTS } from "@/game/sign-fonts";
import type { RideId } from "@/lib/progress-rules";
import { photoMaterial } from "@/game3d/pbr";
import { BERTHS, BIKE_PARK, BLOCK, CENTRAL, COAST, coastReach, DANI_CHAIR, DECK, districtAt, ELEVATOR, GREEN, GRID, HIDEOUT, HOME, ISLAND, JET, pastShore, PIER, QUAY, ROOF, SHOP_A, SHOP_B, STREET, TOWER, type RoomGap } from "@/game3d/rules";
import { takeBike, takeCar } from "@/game3d/vehicles";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type DoorPlace = "home" | "shop" | "target" | "central";
export type Collider = { minX: number; maxX: number; minZ: number; maxZ: number; top: number; gate?: boolean; door?: DoorPlace; shut?: number; above?: number; bottom?: number; ride?: boolean; mark?: number };

export type SignalLamps = { red: THREE.MeshStandardMaterial; yellow: THREE.MeshStandardMaterial; green: THREE.MeshStandardMaterial };

export { BLOCK, COAST, GREEN, GRID, STREET };
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
  w1: { sky: ["#100818", "#3d2d68"], fog: "#1a1028", sun: "#d6c7ff", sunIntensity: 1.15, hemi: ["#9b8ec9", "#140c22", 0.85], kind: "houses", palette: ["#d9826b", "#e8b77a", "#e6d3a3", "#7fb3a8", "#c65b4f", "#a8c48a", "#efe7da"], heights: [10, 24], night: true, peds: 84, traffic: 18 },
  w2: { sky: ["#070b1f", "#2b3566"], fog: "#1b2246", sun: "#b8c8ff", sunIntensity: 0.9, hemi: ["#8ea6ff", "#1b1b2e", 0.45], kind: "towers", palette: ["#5b6778", "#3e4b63", "#6f7b8a", "#44615d", "#57565e"], heights: [32, 68], night: true, peds: 30, traffic: 8 },
  w3: { sky: ["#5d97c9", "#cfe0e2"], fog: "#a9c3c6", sun: "#fff3dc", sunIntensity: 2.4, hemi: ["#d6ecee", "#3a4545", 0.65], kind: "containers", palette: ["#a8322b", "#2c5aa0", "#2f7a47", "#c08f1e", "#cf6a2a", "#2a7c8c"], heights: [2.6, 10.4], night: false, peds: 28, traffic: 6 },
  w4: { sky: ["#7f8fa6", "#e0b27a"], fog: "#b89468", sun: "#ffd29a", sunIntensity: 2.2, hemi: ["#f2d3a0", "#3a2a1a", 0.65], kind: "sheds", palette: ["#8d8680", "#6b6661", "#aaa39c", "#8c4a1f", "#57524d"], heights: [9, 18], night: false, peds: 30, traffic: 6 },
  w5: { sky: ["#07040f", "#2a1a4a"], fog: "#1b1233", sun: "#c9bbff", sunIntensity: 0.8, hemi: ["#a78bfa", "#120a22", 0.45], kind: "corporate", palette: ["#4a4d6b", "#35344f", "#51405f", "#3b3b40", "#5a4c7a"], heights: [36, 74], night: true, peds: 32, traffic: 9 },
  w6: { sky: ["#0a0306", "#3b1018"], fog: "#2a0c12", sun: "#fdb4be", sunIntensity: 0.8, hemi: ["#fb7185", "#14060a", 0.4], kind: "corporate", palette: ["#3a3432", "#3b3b40", "#5a2a2a", "#2e2e33"], heights: [38, 78], night: true, peds: 28, traffic: 9 },
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
  elevator: THREE.Group;
  ads: { mesh: THREE.Mesh; frames: THREE.CanvasTexture[]; cursor: number; next: number }[];
  parked: THREE.Group[];
  sky: THREE.Mesh;
  signals: { ns: SignalLamps; ew: SignalLamps };
  rideCol: Collider;
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
    const lit = r() < (night ? 0.9 : 0.74);
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
      glass.addColorStop(0, "#e0f2fe");
      glass.addColorStop(1, "#38bdf8");
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
      ge.fillStyle = "#38bdf8";
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
  return { map: tex(c), bump: tex(b, 1, 1, false), emissive: tex(e) };
}

/** Equirectangular map for a sky dome. Canvas top is the north pole (uv.y = 1, flipY). */
function skyTexture(top: string, mid: string, fog: string, night: boolean) {
  const W = night ? 1024 : 16;
  const H = night ? 512 : 16;
  const [c, g] = canvas(W, H);
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, top);
  grd.addColorStop(0.34, mid);
  grd.addColorStop(0.5, fog);
  grd.addColorStop(1, fog);
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  if (night) {
    const star = rng(90210);
    g.fillStyle = "#f7f3ff";
    for (let i = 0; i < 720; i++) {
      const x = star() * W;
      const elevStar = (3 + star() * star() * 28) * (Math.PI / 180);
      const y = ((Math.PI / 2 - elevStar) / Math.PI) * H;
      const s = star() < 0.06 ? 2.2 : 1;
      g.globalAlpha = 0.4 + star() * 0.6;
      g.fillRect(x, y, s, s);
    }
    g.globalAlpha = 1;
    const elev = (12 * Math.PI) / 180;
    const u = 0.107;
    const mx = u * W;
    const my = ((Math.PI / 2 - elev) / Math.PI) * H;
    const glow = g.createRadialGradient(mx, my, 6, mx, my, 46);
    glow.addColorStop(0, "#fffaf2");
    glow.addColorStop(0.34, "#f4e8ff");
    glow.addColorStop(1, "rgba(244,232,255,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(mx, my, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff9f0";
    g.beginPath();
    g.arc(mx, my, 13, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skyDome(top: string, mid: string, fog: string, night: boolean) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(340, 48, 24),
    new THREE.MeshBasicMaterial({ map: skyTexture(top, mid, fog, night), side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }),
  );
  mesh.name = "sky";
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}

function signalMaterial(hex: string) {
  return new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.04, roughness: 0.4, toneMapped: false });
}

function buildSignals(scene: THREE.Scene) {
  const count = (GRID + 1) * (GRID + 1);
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 4.1, 6);
  const headGeo = new THREE.BoxGeometry(0.32, 0.98, 0.28);
  const bulbGeo = new THREE.SphereGeometry(0.09, 8, 6);
  const poleMat = std({ color: "#1c1917", roughness: 0.7, metalness: 0.35 });
  const headMat = std({ color: "#0c0a09", roughness: 0.55, metalness: 0.25 });
  const ns: SignalLamps = { red: signalMaterial("#ef4444"), yellow: signalMaterial("#facc15"), green: signalMaterial("#22c55e") };
  const ew: SignalLamps = { red: signalMaterial("#ef4444"), yellow: signalMaterial("#facc15"), green: signalMaterial("#22c55e") };
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, count * 2);
  const headsN = new THREE.InstancedMesh(headGeo, headMat, count);
  const headsE = new THREE.InstancedMesh(headGeo, headMat, count);
  const bulb = (mat: THREE.Material) => new THREE.InstancedMesh(bulbGeo, mat, count);
  const nsBulb = { red: bulb(ns.red), yellow: bulb(ns.yellow), green: bulb(ns.green) };
  const ewBulb = { red: bulb(ew.red), yellow: bulb(ew.yellow), green: bulb(ew.green) };
  const dummy = new THREE.Object3D();
  let n = 0;
  const place = (x: number, z: number, head: THREE.InstancedMesh, lamps: { red: THREE.InstancedMesh; yellow: THREE.InstancedMesh; green: THREE.InstancedMesh }, poleIndex: number) => {
    dummy.position.set(x, 2.25, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(poleIndex, dummy.matrix);
    dummy.position.set(x, 4.5, z);
    dummy.updateMatrix();
    head.setMatrixAt(n, dummy.matrix);
    (["red", "yellow", "green"] as const).forEach((key, i) => {
      dummy.position.set(x, 4.78 - i * 0.28, z);
      dummy.updateMatrix();
      lamps[key].setMatrixAt(n, dummy.matrix);
    });
  };
  for (let i = 0; i <= GRID; i++) {
    for (let j = 0; j <= GRID; j++) {
      const sx = streetCenter(i);
      const sz = streetCenter(j);
      place(sx + 6.15, sz - 6.15, headsN, nsBulb, n * 2);
      place(sx - 6.15, sz + 6.15, headsE, ewBulb, n * 2 + 1);
      n++;
    }
  }
  for (const mesh of [poles, headsN, headsE, nsBulb.red, nsBulb.yellow, nsBulb.green, ewBulb.red, ewBulb.yellow, ewBulb.green]) {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    scene.add(mesh);
  }
  return { ns, ew };
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

/** One draw for every static copy of a material. Cars, signs and anything that moves stay apart. */
function batchStill(scene: THREE.Scene, moving: Set<THREE.Object3D>) {
  const groups = new Map<string, THREE.Mesh[]>();
  const visit = (o: THREE.Object3D) => {
    if (moving.has(o)) return;
    const mesh = o as THREE.Mesh;
    if (
      mesh.isMesh &&
      !(o as THREE.InstancedMesh).isInstancedMesh &&
      !(o as THREE.SkinnedMesh).isSkinnedMesh &&
      !mesh.castShadow &&
      mesh.children.length === 0 &&
      mesh.geometry &&
      !Array.isArray(mesh.material)
    ) {
      let parked = false;
      for (let p: THREE.Object3D | null = mesh; p; p = p.parent) {
        const u = p.userData;
        if (u && (u.cabin || u.wheels || u.shadowProxy || u.live)) parked = true;
      }
      const mat = mesh.material as THREE.Material;
      if (!parked && !mat.transparent && mat.opacity >= 1) {
        const list = groups.get(mat.uuid);
        if (list) list.push(mesh);
        else groups.set(mat.uuid, [mesh]);
      }
    }
    for (const child of o.children) visit(child);
  };
  for (const child of [...scene.children]) visit(child);
  const alive = new Map<string, number>();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) alive.set(mesh.geometry.uuid, (alive.get(mesh.geometry.uuid) ?? 0) + 1);
  });
  for (const list of groups.values()) {
    if (list.length < 8) continue;
    const keys = Object.keys(list[0].geometry.attributes).sort().join(",");
    const same = list.filter((mesh) => mesh.geometry.index && Object.keys(mesh.geometry.attributes).sort().join(",") === keys);
    if (same.length < 8) continue;
    const geos: THREE.BufferGeometry[] = [];
    for (const mesh of same) {
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      geos.push(geo);
    }
    let merged: THREE.BufferGeometry | null = null;
    try {
      merged = mergeGeometries(geos, false);
    } catch {
      merged = null;
    }
    for (const geo of geos) geo.dispose();
    if (!merged) continue;
    const batch = new THREE.Mesh(merged, list[0].material);
    batch.name = "batch";
    batch.castShadow = false;
    batch.receiveShadow = true;
    batch.matrixAutoUpdate = false;
    scene.add(batch);
    for (const mesh of same) {
      const left = (alive.get(mesh.geometry.uuid) ?? 1) - 1;
      alive.set(mesh.geometry.uuid, left);
      if (left === 0) mesh.geometry.dispose();
      mesh.removeFromParent();
    }
  }
}

const shadeChunkGeo = new THREE.BoxGeometry(1, 1, 1);
const shadeChunkMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const shadeDummy = new THREE.Object3D();
const shadePos = new THREE.Vector3();

/** Bakes static building shadow boxes into one mesh per city block. Same triangles, fewer draws. */
function chunkShadows(scene: THREE.Scene, moving: Set<THREE.Object3D>) {
  const cell = 32;
  const groups = new Map<string, THREE.Mesh[]>();
  const anchored = (o: THREE.Object3D) => {
    for (let p: THREE.Object3D | null = o; p; p = p.parent) {
      if (moving.has(p)) return false;
      const u = p.userData;
      if (u && (u.cabin || u.wheels || u.live)) return false;
    }
    return true;
  };
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.name !== "shadowProxy" || !mesh.castShadow || !anchored(mesh)) return;
    const params = (mesh.geometry as THREE.BoxGeometry).parameters;
    if (!params || typeof params.width !== "number") return;
    mesh.getWorldPosition(shadePos);
    const key = `${Math.floor(shadePos.x / cell)}:${Math.floor(shadePos.z / cell)}`;
    const list = groups.get(key);
    if (list) list.push(mesh);
    else groups.set(key, [mesh]);
  });
  for (const list of groups.values()) {
    const geos: THREE.BufferGeometry[] = [];
    for (const mesh of list) {
      const params = (mesh.geometry as THREE.BoxGeometry).parameters;
      const geo = shadeChunkGeo.clone();
      mesh.updateWorldMatrix(true, false);
      mesh.matrixWorld.decompose(shadeDummy.position, shadeDummy.quaternion, shadeDummy.scale);
      shadeDummy.scale.x *= params.width;
      shadeDummy.scale.y *= params.height;
      shadeDummy.scale.z *= params.depth;
      shadeDummy.updateMatrix();
      geo.applyMatrix4(shadeDummy.matrix);
      geos.push(geo);
    }
    let merged: THREE.BufferGeometry | null = null;
    try {
      merged = mergeGeometries(geos, false);
    } catch {
      merged = null;
    }
    for (const geo of geos) geo.dispose();
    if (!merged) {
      for (const mesh of list) mesh.frustumCulled = true;
      continue;
    }
    merged.computeBoundingSphere();
    const chunk = new THREE.Mesh(merged, shadeChunkMat);
    chunk.name = "shadowChunk";
    chunk.castShadow = true;
    chunk.receiveShadow = false;
    chunk.frustumCulled = true;
    chunk.matrixAutoUpdate = false;
    scene.add(chunk);
    for (const mesh of list) {
      mesh.castShadow = false;
      mesh.removeFromParent();
      mesh.geometry.dispose();
      const mat = mesh.material;
      if (!Array.isArray(mat)) mat.dispose();
    }
  }
}

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, shadow = true, round = 0) {
  const longest = Math.max(w, h, d);
  const rounded = round > 0.02 && (longest >= 4 || round >= 0.1);
  const g = rounded
    ? new RoundedBoxGeometry(w, h, d, 2, Math.min(round, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))
    : new THREE.BoxGeometry(w, h, d);
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

function extrudeSide(points: [number, number][], width: number, bevel: number, segs = 12) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    s.lineTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: segs });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(-Math.PI / 2);
  return g;
}

/** Curved sedan/hatch body built from an extruded side profile; faces +Z, length ~4.3 m. */
export function buildCar(color: string, kind: "sedan" | "hatch" | "van" = "sedan") {
  const scanned = takeCar(color, kind);
  if (scanned) return scanned;
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.32,
    metalness: 0.62,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1,
  });
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

function leafTexture() {
  const [c, g] = canvas(128, 160);
  g.clearRect(0, 0, 128, 160);
  g.fillStyle = "#1f6b34";
  g.beginPath();
  g.moveTo(64, 6);
  g.bezierCurveTo(118, 40, 110, 120, 64, 154);
  g.bezierCurveTo(18, 120, 10, 40, 64, 6);
  g.fill();
  g.strokeStyle = "#14532d";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(64, 18);
  g.lineTo(64, 148);
  g.stroke();
  for (let i = 0; i < 6; i++) {
    const y = 36 + i * 18;
    g.beginPath();
    g.moveTo(64, y);
    g.lineTo(36, y + 10);
    g.moveTo(64, y);
    g.lineTo(92, y + 10);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const LEAF_MAP = typeof document === "undefined" ? null : leafTexture();

const treeMats = new Map<string, { bark: THREE.MeshStandardMaterial; leaf: THREE.MeshStandardMaterial }>();

function matsForTree(night: boolean) {
  const key = night ? "night" : "day";
  const hit = treeMats.get(key);
  if (hit) return hit;
  const bark = std({ color: night ? "#3f2e22" : "#6b4a32", roughness: 0.95 });
  const leaf = new THREE.MeshStandardMaterial({
    color: night ? "#16301f" : "#3d7a3a",
    map: LEAF_MAP,
    alphaTest: 0.35,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const pair = { bark, leaf };
  treeMats.set(key, pair);
  return pair;
}

function buildTree(r: () => number, night: boolean) {
  const g = new THREE.Group();
  const { bark, leaf: leafMat } = matsForTree(night);
  let y = 0.15;
  let x = 0;
  let z = 0;
  for (let i = 0; i < 4; i++) {
    const h = 0.7 - i * 0.08;
    const rad = 0.22 - i * 0.035;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.06, rad - 0.03), rad, h, 8), bark);
    seg.position.set(x, y + h / 2, z);
    seg.castShadow = true;
    g.add(seg);
    x += (r() - 0.5) * 0.16;
    z += (r() - 0.5) * 0.16;
    y += h * 0.92;
  }
  const broad = r() > 0.45;
  if (broad) {
    for (let i = 0; i < 14; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.95), leafMat);
      const a = (i / 14) * Math.PI * 2;
      const ring = i < 8 ? 0.7 : 0.35;
      leaf.position.set(x + Math.cos(a) * ring, y + 0.2 + (i % 3) * 0.28, z + Math.sin(a) * ring);
      leaf.lookAt(x, leaf.position.y + 0.2, z);
      leaf.castShadow = false;
      g.add(leaf);
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.15 - i * 0.22, 1.15, 8), leafMat);
      cone.position.set(x, y + i * 0.55, z);
      cone.castShadow = false;
      g.add(cone);
    }
  }
  const bed = new THREE.Mesh(new THREE.CircleGeometry(0.7, 10), std({ color: "#3b2f25", roughness: 1 }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = 0.04;
  g.add(bed);
  return g;
}

function addCoast(scene: THREE.Scene, night: boolean) {
  const cols: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  const c = rng(19);
  type Spot = { x: number; z: number; kind: "bush" | "palm" | "rock"; s: number };
  const spots: Spot[] = [];
  const place = (side: 0 | 1 | 2 | 3) => {
    for (let i = 1; i < 18; i++) {
      const along = (i / 18) * ISLAND + (c() - 0.5) * 3;
      const clamped = Math.max(0, Math.min(ISLAND, along));
      if (side === 0 && clamped > QUAY.minX - 2 && clamped < QUAY.maxX + 2) continue;
      const reach = coastReach(side, clamped);
      const at = (dist: number) => {
        if (side === 0) return { x: clamped, z: -dist };
        if (side === 1) return { x: ISLAND + dist, z: clamped };
        if (side === 2) return { x: clamped, z: ISLAND + dist };
        return { x: -dist, z: clamped };
      };
      const put = (dist: number, kind: Spot["kind"], s: number) => spots.push({ ...at(dist), kind, s });
      put(reach * (0.16 + c() * 0.1), "bush", 0.55 + c() * 0.55);
      if (c() > 0.35) put(reach * (0.28 + c() * 0.08), "bush", 0.4 + c() * 0.4);
      put(reach * (0.42 + c() * 0.1), "palm", 0.85 + c() * 0.35);
      if (c() > 0.5) put(reach * (0.66 + c() * 0.1), "rock", 0.35 + c() * 0.45);
    }
  };
  place(0);
  place(1);
  place(2);
  place(3);

  const bushes = spots.filter((s) => s.kind === "bush");
  const palms = spots.filter((s) => s.kind === "palm");
  const rocks = spots.filter((s) => s.kind === "rock");
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const bushMat = new THREE.MeshStandardMaterial({ color: night ? "#16301f" : "#2f7a3a", roughness: 0.9, map: LEAF_MAP, alphaTest: 0.2 });
  const lobeGeo = new THREE.IcosahedronGeometry(0.48, 1);
  const lobes = new THREE.InstancedMesh(lobeGeo, bushMat, Math.max(1, bushes.length * 5));
  const shrubGeo = new THREE.PlaneGeometry(0.7, 0.85);
  const shrubs = new THREE.InstancedMesh(shrubGeo, bushMat, Math.max(1, bushes.length * 4));
  bushes.forEach((s, i) => {
    const lobesAt: [number, number, number, number][] = [
      [0, 0.42, 0, 1],
      [0.38, 0.28, 0.12, 0.72],
      [-0.34, 0.26, 0.16, 0.66],
      [0.08, 0.55, -0.28, 0.58],
      [-0.12, 0.62, 0.08, 0.5],
    ];
    lobesAt.forEach(([ox, oy, oz, k], n) => {
      lobes.setMatrixAt(i * 5 + n, m4.makeScale(s.s * k, s.s * k * 0.72, s.s * k * 0.9).setPosition(s.x + ox * s.s, oy * s.s, s.z + oz * s.s));
    });
    for (let n = 0; n < 4; n++) {
      const yaw = (n / 4) * Math.PI * 2 + s.x;
      q.setFromEuler(new THREE.Euler(0.35, yaw, 0, "YXZ"));
      v.set(s.x + Math.sin(yaw) * 0.28 * s.s, 0.55 * s.s, s.z + Math.cos(yaw) * 0.28 * s.s);
      shrubs.setMatrixAt(i * 4 + n, m4.compose(v, q, sc.set(s.s * 0.9, s.s * 1.05, 1)));
    }
  });
  lobes.count = bushes.length * 5;
  shrubs.count = bushes.length * 4;
  lobes.castShadow = false;
  shrubs.castShadow = false;
  scene.add(lobes, shrubs);

  const segN = 6;
  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 0.95, 8);
  const trunkMat = std({ color: "#7a5536", roughness: 0.95 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, Math.max(1, palms.length * segN));
  const frondGeo = new THREE.PlaneGeometry(0.42, 1.85);
  const frondMat = new THREE.MeshStandardMaterial({
    color: night ? "#1d4a28" : "#3cb454",
    map: LEAF_MAP,
    alphaTest: 0.35,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, Math.max(1, palms.length * 8));
  const nutGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const nutMat = std({ color: "#6b3f24", roughness: 0.8 });
  const nuts = new THREE.InstancedMesh(nutGeo, nutMat, Math.max(1, palms.length * 3));
  palms.forEach((s, i) => {
    let x = s.x;
    let z = s.z;
    let y = 0.02;
    const lean = (c() - 0.5) * 0.55;
    const leanZ = (c() - 0.5) * 0.4;
    for (let k = 0; k < segN; k++) {
      const h = 0.9 * s.s;
      const taper = 1 - k * 0.08;
      q.setFromEuler(new THREE.Euler(leanZ * 0.18, 0, lean * 0.18));
      v.set(x, y + h * 0.45, z);
      trunks.setMatrixAt(i * segN + k, m4.compose(v, q, sc.set(s.s * taper, s.s, s.s * taper)));
      x += Math.sin(lean) * h * 0.28;
      z += Math.sin(leanZ) * h * 0.28;
      y += h * 0.86;
    }
    for (let k = 0; k < 8; k++) {
      const yaw = (k / 8) * Math.PI * 2 + s.x * 0.2;
      q.setFromEuler(new THREE.Euler(1.18, yaw, 0.08, "YXZ"));
      v.set(x + Math.sin(yaw) * 0.28 * s.s, y + 0.05, z + Math.cos(yaw) * 0.28 * s.s);
      fronds.setMatrixAt(i * 8 + k, m4.compose(v, q, sc.set(s.s * 1.35, s.s * 1.55, 1)));
    }
    for (let k = 0; k < 3; k++) {
      const yaw = (k / 3) * Math.PI * 2;
      nuts.setMatrixAt(i * 3 + k, m4.makeScale(s.s, s.s, s.s).setPosition(x + Math.sin(yaw) * 0.18, y - 0.15, z + Math.cos(yaw) * 0.18));
    }
    cols.push({ minX: s.x - 0.25, maxX: s.x + 0.25, minZ: s.z - 0.25, maxZ: s.z + 0.25 });
  });
  trunks.count = palms.length * segN;
  fronds.count = palms.length * 8;
  nuts.count = palms.length * 3;
  trunks.castShadow = false;
  fronds.castShadow = false;
  scene.add(trunks, fronds, nuts);

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
  const sign = designedSign("PORTO", 5.6, 1.25);
  sign.position.set(80, quayTop + 2.55, 0.23);
  scene.add(sign);
  const ships = [buildShip("#1e3a5f"), buildShip("#7f1d1d")];
  ships[0].position.set(BERTHS[0].x, 0.15, BERTHS[0].z);
  ships[1].position.set(BERTHS[1].x, 0.15, BERTHS[1].z);
  ships.forEach((s, i) => {
    scene.add(s);
    const yaw = i === 0 ? 0.2 : Math.PI - 0.2;
    const cs = Math.abs(Math.cos(yaw));
    const sn = Math.abs(Math.sin(yaw));
    const ex = 13.4 * cs + 2.7 * sn;
    const ez = 13.4 * sn + 2.7 * cs;
    const x = BERTHS[i].x;
    const z = BERTHS[i].z;
    s.userData.hull = addCol(x - ex, x + ex, z - ez, z + ez, 7.4);
  });
  return ships;
}

function designedSign(kind: "PORTO" | "ARMAS" | "MOTOS", w: number, h: number) {
  const [c, g] = canvas(512, 128);
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (kind === "PORTO") {
    g.fillStyle = "#071525";
    g.fillRect(0, 0, 512, 128);
    g.strokeStyle = "#d4af37";
    g.lineWidth = 8;
    g.strokeRect(10, 10, 492, 108);
    g.strokeStyle = "#fbbf24";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(78, 58, 14, 0, Math.PI * 2);
    g.moveTo(78, 44);
    g.lineTo(78, 96);
    g.moveTo(62, 74);
    g.lineTo(94, 74);
    g.moveTo(66, 96);
    g.lineTo(78, 84);
    g.lineTo(90, 96);
    g.stroke();
    g.fillStyle = "#f8e7b0";
    g.font = `700 62px ${SIGN_FONTS.roman}`;
    g.fillText("PORTO", 300, 58);
    g.font = `700 16px ${SIGN_FONTS.serif}`;
    g.fillStyle = "#e7c56a";
    g.fillText("CAIS  ·  MARÉ  ·  CARGA", 300, 96);
  } else if (kind === "ARMAS") {
    g.fillStyle = "#0a0a0a";
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = "#b91c1c";
    for (let i = -2; i < 14; i++) {
      g.beginPath();
      g.moveTo(i * 40, 0);
      g.lineTo(i * 40 + 16, 0);
      g.lineTo(i * 40 + 16 - 36, 128);
      g.lineTo(i * 40 - 36, 128);
      g.fill();
    }
    g.fillStyle = "#111111";
    g.fillRect(108, 16, 388, 96);
    g.strokeStyle = "#fbbf24";
    g.lineWidth = 4;
    g.strokeRect(108, 16, 388, 96);
    g.strokeStyle = "#fecaca";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(28, 48);
    g.lineTo(92, 48);
    g.lineTo(92, 64);
    g.lineTo(58, 64);
    g.lineTo(50, 92);
    g.lineTo(34, 92);
    g.lineTo(40, 64);
    g.lineTo(28, 64);
    g.closePath();
    g.stroke();
    g.fillStyle = "#fff1f2";
    g.font = `600 54px ${SIGN_FONTS.condensed}`;
    g.fillText("ARMAS", 302, 58);
    g.font = `600 16px ${SIGN_FONTS.poster}`;
    g.fillStyle = "#fca5a5";
    g.fillText("OFICINA  ·  MUNIÇÃO", 302, 92);
  } else {
    const sky = g.createLinearGradient(0, 0, 512, 0);
    sky.addColorStop(0, "#082f49");
    sky.addColorStop(1, "#0369a1");
    g.fillStyle = sky;
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = "#e0f2fe";
    g.beginPath();
    g.moveTo(0, 128);
    g.lineTo(150, 0);
    g.lineTo(196, 0);
    g.lineTo(46, 128);
    g.fill();
    g.fillStyle = "#38bdf8";
    g.beginPath();
    g.moveTo(36, 128);
    g.lineTo(186, 0);
    g.lineTo(214, 0);
    g.lineTo(64, 128);
    g.fill();
    g.strokeStyle = "#f8fafc";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(78, 86, 16, 0, Math.PI * 2);
    g.arc(132, 86, 16, 0, Math.PI * 2);
    g.moveTo(94, 86);
    g.lineTo(116, 86);
    g.stroke();
    g.fillStyle = "#f0f9ff";
    g.font = `italic 600 56px ${SIGN_FONTS.condensed}`;
    g.fillText("MOTOS", 330, 58);
    g.font = `italic 700 18px ${SIGN_FONTS.serif}`;
    g.fillStyle = "#bae6fd";
    g.fillText("velocidade na ilha", 330, 96);
  }
  const map = tex(c);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, toneMapped: false, side: THREE.DoubleSide }));
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
  const paint = new THREE.MeshPhysicalMaterial({
    color: paintColor,
    metalness: style === "noturna" ? 0.72 : 0.55,
    roughness: 0.28,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    emissive: style === "noturna" ? "#4c1d95" : "#000000",
    emissiveIntensity: style === "noturna" ? 0.35 : 0,
    envMapIntensity: 0.9,
  });
  const dark = std({ color: "#111827", metalness: 0.45, roughness: 0.4 });
  const rubber = std({ color: "#141414", roughness: 0.92 });
  const chrome = std({ color: "#e5e7eb", metalness: 0.92, roughness: 0.18 });
  const wheel = (z: number) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.075, 28, 72), rubber);
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 48), chrome);
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
  const frameCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.36, -0.68),
    new THREE.Vector3(0, 0.5, -0.12),
    new THREE.Vector3(0, 0.74, 0.32),
    new THREE.Vector3(0, 0.5, 0.58),
    new THREE.Vector3(0, 0.34, 0.12),
    new THREE.Vector3(0, 0.4, -0.42),
  ]);
  const frame = new THREE.Mesh(new THREE.TubeGeometry(frameCurve, 80, 0.026, 16, false), dark);
  frame.castShadow = true;
  g.add(frame);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(0.2, 48, 32), paint);
  tank.scale.set(0.82, 0.62, 1.45);
  tank.position.set(0, 0.76, 0.26);
  tank.castShadow = true;
  g.add(tank);
  const fairingPts: [number, number][] = [
    [-1.02, 0.34],
    [-0.72, 0.48],
    [-0.28, 0.7],
    [0.12, 0.9],
    [0.48, 0.96],
    [0.78, 0.72],
    [1.02, 0.46],
    [0.7, 0.32],
    [0.05, 0.28],
    [-0.55, 0.3],
  ];
  const fairing = new THREE.Mesh(extrudeSide(fairingPts, style === "esportiva" ? 0.62 : 0.5, 0.06, 28), paint);
  fairing.castShadow = true;
  g.add(fairing);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.07, 0.4, 4, 0.02), dark);
  seat.position.set(0, 0.84, -0.1);
  seat.rotation.x = -0.18;
  seat.castShadow = true;
  g.add(seat);
  const engine = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.22, 0.34, 2, 0.04), std({ color: "#1f2937", metalness: 0.65, roughness: 0.38 }));
  engine.position.set(0, 0.46, 0.02);
  engine.castShadow = true;
  g.add(engine);
  const fender = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.028, 8, 18, Math.PI * 0.65), paint);
  fender.rotation.y = Math.PI / 2;
  fender.position.set(0, 0.46, -0.7);
  fender.rotation.x = 0.35;
  g.add(fender);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 10), chrome, 0.2, 0.34, -0.48, g, true).rotation.x = 0.4;
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
  const hullMat = new THREE.MeshPhysicalMaterial({ color: "#f97316", roughness: 0.32, metalness: 0.35, clearcoat: 0.62, clearcoatRoughness: 0.16 });
  const hullPts: [number, number][] = [
    [-1.45, 0.06],
    [-1.2, 0.2],
    [-0.75, 0.34],
    [-0.2, 0.4],
    [0.35, 0.44],
    [0.9, 0.36],
    [1.35, 0.2],
    [1.55, 0.1],
    [1.25, 0.04],
    [0.3, 0.03],
    [-0.7, 0.03],
    [-1.3, 0.04],
  ];
  const hull = new THREE.Mesh(extrudeSide(hullPts, 0.78, 0.05, 24), hullMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  g.add(hull);
  const deck = std({ color: "#111827", roughness: 0.55 });
  const rubber = std({ color: "#1f2937", roughness: 0.9 });
  const chrome = std({ color: "#e5e7eb", metalness: 0.9, roughness: 0.18 });
  box(0.46, 0.08, 0.7, deck, 0, 0.46, -0.15, g, true, 0.03);
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.1, 0.48, 3, 0.03), deck);
  seat.position.set(0, 0.52, -0.28);
  seat.rotation.x = -0.22;
  seat.castShadow = true;
  g.add(seat);
  box(0.5, 0.06, 0.35, rubber, 0, 0.4, 0.35, g, false, 0.02);
  box(0.5, 0.06, 0.28, rubber, 0, 0.38, -0.72, g, false, 0.02);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), chrome, 0.16, 0.62, 0.55, g, true).rotation.x = -0.7;
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), chrome, -0.16, 0.62, 0.55, g, true).rotation.x = -0.7;
  mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), chrome, 0, 0.78, 0.72, g, true).rotation.z = Math.PI / 2;
  mesh(new THREE.SphereGeometry(0.045, 10, 8), rubber, 0.24, 0.78, 0.72, g, false);
  mesh(new THREE.SphereGeometry(0.045, 10, 8), rubber, -0.24, 0.78, 0.72, g, false);
  box(0.42, 0.28, 0.04, std({ color: "#e0f2fe", roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.55 }), 0, 0.72, 0.95, g, false);
  box(0.04, 0.22, 0.16, chrome, 0.2, 0.58, 0.92, g, false);
  box(0.04, 0.22, 0.16, chrome, -0.2, 0.58, 0.92, g, false);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 2.2), new THREE.MeshStandardMaterial({ color: "#fff7ed", emissive: "#fdba74", emissiveIntensity: 0.4 }));
  stripe.position.set(0.22, 0.28, 0.05);
  g.add(stripe);
  mesh(new THREE.SphereGeometry(0.06, 10, 8), std({ color: "#f8fafc", emissive: "#fff7d6", emissiveIntensity: 0.9 }), 0, 0.32, 1.42, g, false);
  box(0.22, 0.16, 0.28, std({ color: "#1f2937", metalness: 0.4, roughness: 0.45 }), 0, 0.22, -1.28, g, true, 0.03);
  mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), std({ color: "#0f172a", metalness: 0.5, roughness: 0.4 }), 0, 0.2, -1.42, g, true).rotation.x = Math.PI / 2;
  box(0.16, 0.08, 0.06, std({ color: "#ef4444", emissive: "#ef4444", emissiveIntensity: 0.7 }), 0, 0.3, -1.48, g, false);
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
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshStandardMaterial({ color: "#e0f2fe", emissive: "#38bdf8", emissiveIntensity: night ? 4.2 : 2.8 }));
  bulb.scale.set(1.8, 0.5, 1);
  bulb.position.set(-1.75, 6.33, 0);
  g.add(bulb);
  {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: night ? 0.22 : 0.14, depthWrite: false, blending: THREE.AdditiveBlending }));
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

function monitorFace(title: string, lines: string[], color: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "#02110c";
  g.fillRect(0, 0, 512, 320);
  g.fillStyle = color;
  g.fillRect(0, 0, 512, 6);
  g.font = "bold 26px monospace";
  g.fillText(title, 22, 42);
  g.font = "22px monospace";
  g.fillStyle = "#d1fae5";
  lines.forEach((line, i) => g.fillText(line.slice(0, 28), 22, 88 + i * 34));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
}

function buildSkyHideout(scene: THREE.Scene, night: boolean, addCol: (minX: number, maxX: number, minZ: number, maxZ: number, top: number) => Collider) {
  const glass = std({ color: "#7dd3fc", emissive: "#38bdf8", emissiveIntensity: night ? 1.5 : 1.15, roughness: 0.18, metalness: 0.62, transparent: true, opacity: 0.82 });
  const steel = std({ color: "#1e293b", metalness: 0.55, roughness: 0.4 });
  const wall = std({ color: "#0b0e14", roughness: 0.92, metalness: 0.04 });
  const dark = std({ color: "#07090d", roughness: 0.88 });
  const lobbyH = 7;
  const glassTop = ROOF - 1.4;
  const glassH = glassTop - lobbyH;
  const tower = mesh(new THREE.CylinderGeometry(12.5, 14.2, glassH, 96, 48, true), glass, TOWER.x, lobbyH + glassH / 2, TOWER.z, scene);
  tower.castShadow = true;
  const crown = mesh(new THREE.TorusGeometry(12.8, 0.55, 16, 80), new THREE.MeshStandardMaterial({ color: "#38bdf8", emissive: "#38bdf8", emissiveIntensity: 1.6 }), TOWER.x, ROOF - 6, TOWER.z, scene, false);
  crown.rotation.x = Math.PI / 2;
  for (const [x, z] of [
    [77.2, 67.4],
    [86.8, 67.4],
    [77.2, 75.2],
    [86.8, 75.2],
  ] as const) {
    mesh(new THREE.CylinderGeometry(0.45, 0.55, lobbyH, 8), steel, x, lobbyH / 2, z, scene, true);
    addCol(x - 0.45, x + 0.45, z - 0.45, z + 0.45, lobbyH);
  }
  const shaftTop = ROOF - 0.5;
  box(11.2, shaftTop, 13, steel, TOWER.x, shaftTop / 2, 82.6, scene, true);
  addCol(76.4, 87.6, 76.2, 89.2, ROOF);
  const slabMat = std({ color: "#161b24", roughness: 0.84, metalness: 0.08 });
  slabMat.polygonOffset = true;
  slabMat.polygonOffsetFactor = -2;
  slabMat.polygonOffsetUnits = -2;
  box(11.8, 0.78, 13.6, slabMat, TOWER.x, DECK - 0.39, 82.6, scene, true);
  const deckCol = addCol(76.3, 87.7, 76.1, 89.3, DECK);
  deckCol.above = ROOF - 1;
  const rail = (x0: number, x1: number, z0: number, z1: number) => {
    box(Math.max(0.18, x1 - x0), 1.05, Math.max(0.18, z1 - z0), steel, (x0 + x1) / 2, DECK + 0.52, (z0 + z1) / 2, scene, true);
    const col = addCol(x0, x1, z0, z1, DECK + 1.1);
    col.above = ROOF - 1;
  };
  rail(76.4, 80.1, 76.2, 76.9);
  rail(83.9, 87.6, 76.2, 76.9);
  rail(87.0, 87.6, 76.2, 89.2);
  rail(76.4, 77.0, 76.2, 89.2);
  rail(76.4, 87.6, 88.6, 89.2);
  const lobby = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), std({ color: "#111827", roughness: 0.9 }));
  lobby.rotation.x = -Math.PI / 2;
  lobby.position.set(TOWER.x, 0.21, 71);
  scene.add(lobby);

  const roomH = 3.2;
  const ceilY = DECK + roomH;
  const wallCol = (x0: number, x1: number, z0: number, z1: number) => {
    box(x1 - x0, roomH + 0.08, z1 - z0, wall, (x0 + x1) / 2, DECK + roomH / 2 - 0.02, (z0 + z1) / 2, scene, true);
    const col = addCol(x0, x1, z0, z1, ceilY);
    col.above = ROOF - 1;
  };
  wallCol(77.25, 77.62, 77.35, 88.2);
  wallCol(86.55, 86.92, 77.35, 88.2);
  wallCol(77.25, 86.92, 87.85, 88.22);
  wallCol(77.25, 81.1, 77.35, 77.72);
  wallCol(82.9, 86.92, 77.35, 77.72);
  box(1.8, 0.85, 0.37, wall, 82, DECK + roomH - 0.42, 77.53, scene, true);
  const ceiling = box(9.8, 0.22, 11.05, dark, 82.08, ceilY + 0.04, 82.75, scene, true);
  ceiling.receiveShadow = true;
  const lid = addCol(77.25, 86.92, 77.35, 88.22, ceilY + 0.2);
  lid.bottom = ceilY;
  lid.above = ROOF - 1;

  const tileMat = std({ color: "#10141c", roughness: 0.78 });
  tileMat.polygonOffset = true;
  tileMat.polygonOffsetFactor = -4;
  tileMat.polygonOffsetUnits = -4;
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(8.7, 10.2), tileMat);
  tile.rotation.x = -Math.PI / 2;
  tile.position.set(82.05, DECK + 0.015, 82.8);
  tile.receiveShadow = true;
  scene.add(tile);

  const rack = std({ color: "#111827", metalness: 0.35, roughness: 0.45 });
  box(0.7, 1.85, 0.85, rack, 78.15, DECK + 0.95, 84.2, scene, true);
  const rackCol = addCol(77.75, 78.55, 83.7, 84.7, DECK + 1.9);
  rackCol.above = ROOF - 1;
  const led = new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false });
  for (let i = 0; i < 6; i++) box(0.08, 0.08, 0.04, i % 2 ? led : new THREE.MeshBasicMaterial({ color: "#38bdf8", toneMapped: false }), 78.52, DECK + 0.4 + i * 0.24, 84.55, scene, false);

  const deskMat = std({ color: "#1c1917", roughness: 0.55, metalness: 0.15 });
  box(5.4, 0.08, 1.25, deskMat, 82.15, DECK + 0.78, 86.85, scene, true);
  box(0.08, 0.74, 1.15, deskMat, 79.5, DECK + 0.4, 86.85, scene, true);
  box(0.08, 0.74, 1.15, deskMat, 84.8, DECK + 0.4, 86.85, scene, true);
  const desk = addCol(79.4, 84.95, 86.2, 87.5, DECK + 0.86);
  desk.above = ROOF - 1;
  box(0.46, 0.62, 0.7, std({ color: "#020617", metalness: 0.4 }), 79.85, DECK + 0.36, 86.55, scene, true);
  box(0.55, 0.04, 0.22, std({ color: "#0f172a" }), 81.7, DECK + 0.84, 86.35, scene, false);
  box(0.12, 0.03, 0.18, std({ color: "#334155" }), 82.35, DECK + 0.83, 86.4, scene, false);
  mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 12), std({ color: "#44403c" }), 84.15, DECK + 0.88, 86.55, scene, false);

  const cloth = std({ color: "#1e293b", roughness: 0.8 });
  box(0.52, 0.08, 0.5, cloth, DANI_CHAIR.x, DECK + 0.46, DANI_CHAIR.z, scene, true);
  box(0.52, 0.62, 0.08, cloth, DANI_CHAIR.x, DECK + 0.78, DANI_CHAIR.z - 0.24, scene, true);
  for (const [sx, sz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]] as const) {
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 8), steel, DANI_CHAIR.x + sx, DECK + 0.22, DANI_CHAIR.z + sz, scene, true);
  }
  const chair = addCol(DANI_CHAIR.x - 0.4, DANI_CHAIR.x + 0.4, DANI_CHAIR.z - 0.4, DANI_CHAIR.z + 0.35, DECK + 0.7);
  chair.above = ROOF - 1;

  const bezel = std({ color: "#020617", metalness: 0.5, roughness: 0.35 });
  const screens: [number, number, number, number, string, string, string[]][] = [
    [80.15, 1.55, 1.35, 0.95, "variavel.py", "#34d399", ["nome = \"Cole\"", "idade = 23", "print(nome)"]],
    [81.85, 1.72, 1.55, 1.15, "if porta", "#22d3ee", ["if aberta:", "    entrar()", "else:", "    esperar()"]],
    [83.55, 1.55, 1.35, 0.95, "for item", "#a3e635", ["for item in lista:", "    print(item)"]],
    [82.0, 2.5, 2.2, 0.48, "MAYA // AULA", "#67e8f9", ["escolha um modulo"]],
    [84.85, 1.7, 0.72, 1.2, "log", "#fbbf24", ["> ok", "> passo 1", "> passo 2"]],
  ];
  for (const [x, h, w, ht, title, color, lines] of screens) {
    box(w + 0.08, ht + 0.08, 0.08, bezel, x, DECK + h, 87.48, scene, false);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, ht), monitorFace(title, lines, color));
    face.position.set(x, DECK + h, 87.42);
    face.rotation.y = Math.PI;
    scene.add(face);
  }
  box(0.08, 0.35, 0.08, bezel, 81.85, DECK + 1.05, 87.4, scene, false);
  box(0.08, 0.35, 0.08, bezel, 83.55, DECK + 1.05, 87.4, scene, false);

  for (let i = 0; i < 3; i++) {
    box(0.55, 0.06, 0.28, new THREE.MeshBasicMaterial({ color: i === 1 ? "#67e8f9" : "#1e293b", toneMapped: false }), 80.4 + i * 1.7, ceilY - 0.08, 83.2, scene, false);
  }
  box(0.06, 0.04, 2.4, std({ color: "#27272a" }), 80.4, DECK + 0.04, 85.4, scene, false);
  box(2.2, 0.04, 0.06, std({ color: "#27272a" }), 81.2, DECK + 0.05, 86.2, scene, false);

  const screenLight = new THREE.PointLight("#67e8f9", 18, 8, 2);
  screenLight.position.set(82, DECK + 1.9, 86.2);
  scene.add(screenLight);
  const lamp = new THREE.PointLight("#fdba74", 4, 3.2, 2);
  lamp.position.set(84.3, DECK + 1.2, 86.3);
  scene.add(lamp);

  mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshBasicMaterial({ color: "#38bdf8", toneMapped: false }), HIDEOUT.x, DECK + 4.4, 76.6, scene, false);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), steel, HIDEOUT.x, DECK + 3.7, 76.6, scene, true);

  const car = new THREE.Group();
  const cab = std({ color: "#e0f2fe", emissive: "#7dd3fc", emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.45 });
  box(3.1, 2.7, 2.2, cab, 0, 0, 0, car, false);
  box(3.2, 0.12, 2.3, steel, 0, -1.35, 0, car, true);
  box(0.12, 2.5, 2.2, steel, -1.55, 0, 0, car, true);
  box(0.12, 2.5, 2.2, steel, 1.55, 0, 0, car, true);
  car.position.set(ELEVATOR.x, 1.7, 66.6);
  scene.add(car);
  return car;
}

/** RGBA coast mask. Canvas row py maps to world Z with Three's default flipY. */
function coastTex(span: number, origin: number, mode: "sand" | "grass" | "depth") {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const img = g.createImageData(S, S);
  const px = img.data;
  for (let py = 0; py < S; py++) {
    for (let x = 0; x < S; x++) {
      const wx = origin + (x / (S - 1)) * span;
      const wz = origin + (py / (S - 1)) * span;
      const past = pastShore(wx, wz);
      const i = (py * S + x) * 4;
      if (mode === "depth") {
        const w = Math.max(0, Math.min(1, past / 7));
        px[i] = px[i + 1] = px[i + 2] = Math.round(w * 255);
        px[i + 3] = 255;
      } else if (mode === "grass") {
        const land = past < -1.15;
        px[i] = 62;
        px[i + 1] = 124;
        px[i + 2] = 70;
        px[i + 3] = land ? 255 : 0;
      } else {
        const land = past < 0.4;
        const wet = past > -2.4;
        const grit = Math.sin(wx * 3.7 + wz * 2.1) * 14 + Math.sin(wx * 11.3) * Math.cos(wz * 9.1) * 8;
        px[i] = Math.max(0, Math.min(255, (wet ? 168 : 214) + grit));
        px[i + 1] = Math.max(0, Math.min(255, (wet ? 148 : 190) + grit * 0.85));
        px[i + 2] = Math.max(0, Math.min(255, (wet ? 104 : 142) + grit * 0.55));
        px[i + 3] = land ? 255 : 0;
      }
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = mode === "depth" ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Grayscale land mask. Three reads alphaMap from the green channel. */
function coastMask(span: number, origin: number, mode: "sand" | "grass") {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const img = g.createImageData(S, S);
  const px = img.data;
  for (let py = 0; py < S; py++) {
    for (let x = 0; x < S; x++) {
      const wx = origin + (x / (S - 1)) * span;
      const wz = origin + (py / (S - 1)) * span;
      const past = pastShore(wx, wz);
      const land = mode === "grass" ? past < -1.15 : past < 0.4;
      const v = land ? 255 : 0;
      const i = (py * S + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const SEA_SPAN = SIZE + 240;
const SEA_ORIGIN = SIZE / 2 - SEA_SPAN / 2;

function seaMaterial() {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uTime: { value: 0 },
      uDepth: { value: coastTex(SEA_SPAN, SEA_ORIGIN, "depth") },
    },
    transparent: true,
    vertexShader: `
      out vec2 vUv;
      out vec3 vWorld;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(p.x * 0.31 + uTime * 1.3) * cos(p.y * 0.24 + uTime) * 0.035;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      in vec2 vUv;
      in vec3 vWorld;
      uniform float uTime;
      uniform sampler2D uDepth;
      out vec4 fragColor;
      void main() {
        float depth = texture(uDepth, vUv).r;
        vec3 shallow = vec3(0.20, 0.62, 0.66);
        vec3 mid = vec3(0.06, 0.28, 0.42);
        vec3 deep = vec3(0.015, 0.07, 0.14);
        vec3 col = mix(shallow, mid, smoothstep(0.0, 0.4, depth));
        col = mix(col, deep, smoothstep(0.32, 0.9, depth));
        float spark = sin(vWorld.x * 0.75 + uTime * 1.8) * sin(vWorld.z * 0.62 - uTime * 1.4);
        col += vec3(0.18, 0.24, 0.26) * smoothstep(0.78, 1.0, spark) * (1.0 - depth * 0.65);
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
        col = mix(col, vec3(0.62, 0.78, 0.84), fres * 0.5);
        fragColor = vec4(col, 0.94);
      }
    `,
  });
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

  const sky = skyDome(theme.sky[0], theme.sky[1], theme.fog, night);
  scene.add(sky);
  scene.background = new THREE.Color(theme.fog);
  scene.fog = new THREE.Fog(theme.fog, night ? 32 : 96, night ? 270 : 340);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(SEA_SPAN, SEA_SPAN), seaMaterial());
  water.name = "sea";
  water.rotation.x = -Math.PI / 2;
  water.position.set(SIZE / 2, -0.1, SIZE / 2);
  scene.add(water);
  const sandSpan = SIZE + COAST * 2;
  const sandMat = photoMaterial("coast_sand_01", 32, 32, { disp: 0.045, rough: 0.96 });
  sandMat.alphaMap = coastMask(sandSpan, -COAST, "sand");
  sandMat.alphaTest = 0.45;
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(sandSpan, sandSpan, 80, 80), sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(SIZE / 2, -0.08, SIZE / 2);
  sand.receiveShadow = true;
  scene.add(sand);
  const grassSpan = SIZE + GREEN * 2;
  const grassMat = photoMaterial("grass_ground", 26, 26, { disp: 0.02, rough: 0.95 });
  grassMat.alphaMap = coastMask(grassSpan, -GREEN, "grass");
  grassMat.alphaTest = 0.45;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(grassSpan, grassSpan, 72, 72), grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(SIZE / 2, -0.045, SIZE / 2);
  grass.receiveShadow = true;
  scene.add(grass);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE, SIZE, 96, 96),
    photoMaterial("asphalt_02", 46, 46, { disp: 0.028, color: night ? "#8e97a6" : "#ffffff", rough: 0.94 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(SIZE / 2, 0, SIZE / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const sidewalk = photoMaterial("concrete_floor_02", 8, 8, { rough: 0.88, color: night ? "#b7b2a8" : themeId === "w1" ? "#f3efe8" : "#d4d0cb" });
  const curbMat = std({ color: night ? "#8d8880" : "#b7b2aa", roughness: 0.8 });
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const cx = blockStart(i) + BLOCK / 2;
      const cz = blockStart(j) + BLOCK / 2;
      box(BLOCK + 3.4, 0.16, BLOCK + 3.4, curbMat, cx, 0.08, cz, scene, false, 0.08);
      const s = mesh(new THREE.BoxGeometry(BLOCK + 3, 0.2, BLOCK + 3), sidewalk, cx, 0.1, cz, scene, false);
      s.receiveShadow = true;
      addCol(cx - (BLOCK + 3) / 2, cx + (BLOCK + 3) / 2, cz - (BLOCK + 3) / 2, cz + (BLOCK + 3) / 2, 0.2);
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
  const avenues = GRID + 1;
  const inCross = (v: number) => Array.from({ length: avenues }, (_, j) => j).some((j) => Math.abs(v - streetCenter(j)) < STREET / 2 + 0.5);
  for (let i = 0; i < avenues; i++) {
    const sc = streetCenter(i);
    for (let k = 0; k < SIZE; k += 5) {
      if (inCross(k + 1.25)) continue;
      for (const o of [-0.12, 0.12]) {
        yellowR.push([sc + o, k + 1.25, 0.14, 2.5]);
        yellowR.push([k + 1.25, sc + o, 2.5, 0.14]);
      }
    }
    for (let j = 0; j < avenues; j++) {
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

  const roofMat = photoMaterial("concrete_floor_02", 4, 4, { color: night ? "#8a8a90" : "#e7e2da", rough: 0.9 });
  const trimMat = std({ color: night ? "#6b6b72" : "#efe9df", roughness: 0.7 });
  const tileMat = photoMaterial("clay_roof_tiles", 3, 2, { color: night ? "#9a8078" : "#ffffff", rough: 0.82 });
  const darkWins: THREE.Matrix4[] = [];
  const litWins: THREE.Matrix4[] = [];
  const deepWins: THREE.Matrix4[] = [];
  const ledCyan: THREE.Matrix4[] = [];
  const ledMag: THREE.Matrix4[] = [];
  const ledAmber: THREE.Matrix4[] = [];
  const ledWhite: THREE.Matrix4[] = [];
  const ads: Layout["ads"] = [];
  const ledBox = (list: THREE.Matrix4[], x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz)));
  };
  const dressLeds = (cx: number, cz: number, w: number, d: number, h: number) => {
    const bands = Math.max(2, Math.floor(h / 3.2));
    const colors = [ledCyan, ledMag, ledAmber];
    for (let b = 0; b < bands; b++) {
      const y = 1.6 + (b * Math.max(2.4, h - 2.4)) / bands;
      const list = colors[b % 3];
      ledBox(list, cx, y, cz - d / 2 - 0.1, w * 0.94, 0.18, 0.1);
      ledBox(list, cx, y, cz + d / 2 + 0.1, w * 0.94, 0.18, 0.1);
      ledBox(list, cx - w / 2 - 0.1, y, cz, 0.1, 0.18, d * 0.94);
      ledBox(list, cx + w / 2 + 0.1, y, cz, 0.1, 0.18, d * 0.94);
    }
    for (const [x, z] of [
      [cx - w / 2, cz - d / 2],
      [cx + w / 2, cz - d / 2],
      [cx - w / 2, cz + d / 2],
      [cx + w / 2, cz + d / 2],
    ] as const) ledBox(ledWhite, x, h / 2, z, 0.16, h, 0.16);
    ledBox(ledCyan, cx, h + 0.12, cz, w + 0.35, 0.14, d + 0.35);
  };
  const campaigns: { title: string; sub: string; titleFont: string; subFont: string; a: string; b: string; ink: string; accent: string; badge: string }[][] = [
    [
      { title: "VÉRTICE", sub: "A ILHA NÃO DORME", titleFont: SIGN_FONTS.poster, subFont: SIGN_FONTS.condensed, a: "#020617", b: "#0e7490", ink: "#f8fafc", accent: "#22d3ee", badge: "24H" },
      { title: "Vértice", sub: "luz no cais", titleFont: SIGN_FONTS.script, subFont: SIGN_FONTS.serif, a: "#1e1b4b", b: "#6d28d9", ink: "#fdf4ff", accent: "#e879f9", badge: "NOITE" },
      { title: "VÉRTICE", sub: "cidade aberta", titleFont: SIGN_FONTS.roman, subFont: SIGN_FONTS.marker, a: "#111827", b: "#1e3a8a", ink: "#e0f2fe", accent: "#fbbf24", badge: "ILHA" },
    ],
    [
      { title: "PORTO SECO", sub: "ABERTO 24H", titleFont: SIGN_FONTS.condensed, subFont: SIGN_FONTS.poster, a: "#082f49", b: "#155e75", ink: "#ecfeff", accent: "#fbbf24", badge: "CAIS" },
      { title: "Porto Seco", sub: "maré e carga", titleFont: SIGN_FONTS.serif, subFont: SIGN_FONTS.script, a: "#0c4a6e", b: "#1e293b", ink: "#fef3c7", accent: "#38bdf8", badge: "MAR" },
      { title: "PORTO", sub: "navios no cais", titleFont: SIGN_FONTS.roman, subFont: SIGN_FONTS.condensed, a: "#0f172a", b: "#7c2d12", ink: "#ffedd5", accent: "#fb923c", badge: "DOCA" },
    ],
    [
      { title: "NEON", sub: "LUZ NO CAIS", titleFont: SIGN_FONTS.poster, subFont: SIGN_FONTS.marker, a: "#2e1065", b: "#0f172a", ink: "#f5f3ff", accent: "#e879f9", badge: "LED" },
      { title: "Neon", sub: "a avenida acende", titleFont: SIGN_FONTS.script, subFont: SIGN_FONTS.serif, a: "#4a044e", b: "#1e1b4b", ink: "#fae8ff", accent: "#22d3ee", badge: "NOITE" },
      { title: "NEON", sub: "faixa na fachada", titleFont: SIGN_FONTS.condensed, subFont: SIGN_FONTS.poster, a: "#020617", b: "#be185d", ink: "#fdf2f8", accent: "#f9a8d4", badge: "ON" },
    ],
    [
      { title: "OPEN", sub: "SISTEMA ONLINE", titleFont: SIGN_FONTS.poster, subFont: SIGN_FONTS.condensed, a: "#022c22", b: "#064e3b", ink: "#ecfdf5", accent: "#34d399", badge: "LIVE" },
      { title: "Open", sub: "rede da ilha", titleFont: SIGN_FONTS.script, subFont: SIGN_FONTS.marker, a: "#052e16", b: "#0f172a", ink: "#d1fae5", accent: "#a3e635", badge: "NET" },
      { title: "ONLINE", sub: "porta aberta", titleFont: SIGN_FONTS.roman, subFont: SIGN_FONTS.serif, a: "#0f172a", b: "#14532d", ink: "#f0fdf4", accent: "#4ade80", badge: "OK" },
    ],
    [
      { title: "NIGHT RUN", sub: "COLE  //  MAYA", titleFont: SIGN_FONTS.condensed, subFont: SIGN_FONTS.poster, a: "#1e1b4b", b: "#9f1239", ink: "#fff1f2", accent: "#fb7185", badge: "RUN" },
      { title: "Night Run", sub: "a moto não para", titleFont: SIGN_FONTS.script, subFont: SIGN_FONTS.serif, a: "#111827", b: "#4c0519", ink: "#ffe4e6", accent: "#fda4af", badge: "MOTO" },
      { title: "COLE", sub: "maya na cobertura", titleFont: SIGN_FONTS.marker, subFont: SIGN_FONTS.script, a: "#18181b", b: "#312e81", ink: "#e0e7ff", accent: "#a5b4fc", badge: "DUO" },
    ],
    [
      { title: "PYTHON", sub: "ESTUDE EM CASA", titleFont: SIGN_FONTS.poster, subFont: SIGN_FONTS.condensed, a: "#172554", b: "#1e3a8a", ink: "#eff6ff", accent: "#fde68a", badge: "PY" },
      { title: "Python", sub: "do zero ao avançado", titleFont: SIGN_FONTS.serif, subFont: SIGN_FONTS.script, a: "#0f172a", b: "#1d4ed8", ink: "#dbeafe", accent: "#93c5fd", badge: "AULA" },
      { title: "estude", sub: "em casa, com calma", titleFont: SIGN_FONTS.script, subFont: SIGN_FONTS.marker, a: "#1e293b", b: "#312e81", ink: "#fef9c3", accent: "#facc15", badge: "CASA" },
    ],
  ];
  const paintBillboard = (frame: (typeof campaigns)[number][number]) => {
    const [c, g] = canvas(512, 256);
    const wash = g.createLinearGradient(0, 0, 512, 256);
    wash.addColorStop(0, frame.a);
    wash.addColorStop(1, frame.b);
    g.fillStyle = wash;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = "rgba(255,255,255,0.07)";
    for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 512, 1);
    g.strokeStyle = frame.accent;
    g.lineWidth = 8;
    g.strokeRect(12, 12, 488, 232);
    g.fillStyle = frame.accent;
    g.fillRect(32, 32, 108, 30);
    g.fillStyle = "#020617";
    g.font = `600 18px ${SIGN_FONTS.condensed}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(frame.badge, 86, 47);
    const titleSize = frame.title.length > 11 ? 46 : frame.titleFont === SIGN_FONTS.script ? 54 : 68;
    g.fillStyle = frame.ink;
    g.font = `700 ${titleSize}px ${frame.titleFont}`;
    g.fillText(frame.title, 256, 128);
    g.strokeStyle = frame.accent;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(96, 168);
    g.lineTo(416, 168);
    g.stroke();
    g.fillStyle = frame.accent;
    g.font = `600 26px ${frame.subFont}`;
    g.fillText(frame.sub, 256, 206);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  };
  const hangAd = (cx: number, cz: number, w: number, d: number, h: number) => {
    if (h < 9 || r() > 0.7) return;
    const set = campaigns[Math.floor(r() * campaigns.length)];
    const frames = set.map(paintBillboard);
    const mat = new THREE.MeshBasicMaterial({ map: frames[0], toneMapped: false, transparent: true, opacity: 1 });
    const bw = Math.min(w, d) * 0.82;
    const bh = Math.min(5.8, Math.max(2.4, h * 0.2));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mat);
    const y = Math.min(h - bh / 2 - 0.6, Math.max(6.2, h * 0.58));
    const face = Math.floor(r() * 4);
    if (face === 0) plane.position.set(cx, y, cz - d / 2 - 0.22);
    else if (face === 1) {
      plane.position.set(cx, y, cz + d / 2 + 0.22);
      plane.rotation.y = Math.PI;
    } else if (face === 2) {
      plane.position.set(cx - w / 2 - 0.22, y, cz);
      plane.rotation.y = -Math.PI / 2;
    } else {
      plane.position.set(cx + w / 2 + 0.22, y, cz);
      plane.rotation.y = Math.PI / 2;
    }
    plane.name = "billboard";
    scene.add(plane);
    ads.push({ mesh: plane, frames, cursor: 0, next: 1.5 + r() * 3 });
  };
  const storefronts = [
    { name: "Café Maré", sub: "grão do cais", font: SIGN_FONTS.script, subFont: SIGN_FONTS.serif, bg: "#1c1410", ink: "#fde68a", accent: "#b45309" },
    { name: "Banco Vértice", sub: "AGÊNCIA CENTRAL", font: SIGN_FONTS.serif, subFont: SIGN_FONTS.condensed, bg: "#0b1220", ink: "#e2e8f0", accent: "#94a3b8" },
    { name: "Hotel Cais", sub: "SUÍTES", font: SIGN_FONTS.roman, subFont: SIGN_FONTS.serif, bg: "#1c1917", ink: "#f5e6c8", accent: "#d6b36a" },
    { name: "Mercado", sub: "aberto agora", font: SIGN_FONTS.marker, subFont: SIGN_FONTS.script, bg: "#14532d", ink: "#ecfccb", accent: "#bef264" },
    { name: "Oficina", sub: "PEÇAS · MOTO", font: SIGN_FONTS.condensed, subFont: SIGN_FONTS.poster, bg: "#111827", ink: "#f8fafc", accent: "#38bdf8" },
    { name: "Farmácia", sub: "24 HORAS", font: SIGN_FONTS.serif, subFont: SIGN_FONTS.condensed, bg: "#052e16", ink: "#bbf7d0", accent: "#4ade80" },
  ];
  const placeShopSign = (cx: number, cz: number, w: number, d: number) => {
    if (r() > 0.72) return;
    const shop = storefronts[Math.floor(r() * storefronts.length)];
    const [c, g] = canvas(512, 160);
    g.fillStyle = shop.bg;
    g.fillRect(0, 0, 512, 160);
    g.strokeStyle = shop.accent;
    g.lineWidth = 8;
    g.strokeRect(8, 8, 496, 144);
    g.fillStyle = shop.accent;
    g.fillRect(24, 24, 496 - 48, 6);
    g.fillStyle = shop.ink;
    g.textAlign = "center";
    g.textBaseline = "middle";
    const size = shop.name.length > 12 ? 42 : 54;
    g.font = `700 ${size}px ${shop.font}`;
    g.fillText(shop.name, 256, 78);
    g.fillStyle = shop.accent;
    g.font = `600 22px ${shop.subFont}`;
    g.fillText(shop.sub, 256, 122);
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    const bw = Math.min(4.2, Math.max(2.4, Math.min(w, d) * 0.55));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(bw, bw * 0.32), new THREE.MeshBasicMaterial({ map, toneMapped: false, side: THREE.DoubleSide }));
    const face = Math.floor(r() * 4);
    const y = 3.15;
    if (face === 0) plane.position.set(cx, y, cz - d / 2 - 0.16);
    else if (face === 1) {
      plane.position.set(cx, y, cz + d / 2 + 0.16);
      plane.rotation.y = Math.PI;
    } else if (face === 2) {
      plane.position.set(cx - w / 2 - 0.16, y, cz);
      plane.rotation.y = -Math.PI / 2;
    } else {
      plane.position.set(cx + w / 2 + 0.16, y, cz);
      plane.rotation.y = Math.PI / 2;
    }
    scene.add(plane);
  };
  const winQ = new THREE.Quaternion();
  const winUp = new THREE.Vector3(0, 0, 1);
  const outward = new THREE.Vector3();
  const awningColors = ["#b91c1c", "#15803d", "#1d4ed8", "#ca8a04", "#7c2d12"];
  const railMat = std({ color: "#2b2f35", roughness: 0.4, metalness: 0.8 });
  const tankMat = std({ color: "#3a6ea5", roughness: 0.5 });
  const acMat = std({ color: "#d4d4d8", roughness: 0.5, metalness: 0.3 });

  const compound = { minX: blockStart(2), maxX: blockStart(2) + BLOCK, minZ: blockStart(2), maxZ: blockStart(2) + BLOCK };

  const building = (cx: number, cz: number, w: number, d: number, h: number, asTower = false) => {
    const base = THEMES[districtAt(cx, cz)] ?? theme;
    const district = asTower ? { ...base, kind: "towers" as const } : base;
    const tint = district.palette[Math.floor(r() * district.palette.length)];
    const glassWall = district.kind === "towers" || district.kind === "corporate";
    const sideMat = (face: number) =>
      photoMaterial("painted_plaster_wall", Math.max(1, face / 2.2), Math.max(1, h / 2.4), {
        color: tint,
        disp: h > 18 ? 0.02 : 0.045,
        rough: glassWall ? 0.32 : district.kind === "containers" ? 0.55 : 0.9,
        metal: glassWall ? 0.46 : district.kind === "containers" ? 0.38 : 0.02,
      });
    const mw = sideMat(w);
    const md = sideMat(d);
    const round = district.kind === "containers" ? 0.05 : 0.18;
    const seg = h > 20 ? 4 : 7;
    const body = mesh(new RoundedBoxGeometry(w, h, d, seg, round), [md, md, roofMat, roofMat, mw, mw], cx, h / 2, cz, scene);
    body.receiveShadow = true;
    body.castShadow = false;
    const shade = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
    shade.castShadow = true;
    shade.receiveShadow = false;
    shade.frustumCulled = true;
    shade.name = "shadowProxy";
    body.add(shade);
    addCol(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, h);
    if (h > 5) placeShopSign(cx, cz, w, d);

    if (district.kind === "containers") {
      for (let y = 2.6; y < h; y += 2.6) box(w + 0.05, 0.08, d + 0.05, std({ color: "#1f1f1f" }), cx, y, cz, scene, false);
      dressLeds(cx, cz, w, d, h);
      hangAd(cx, cz, w, d, h);
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
      box(w + 0.5, 0.4, d + 0.5, trimMat, cx, h + 0.1, cz, scene, false, 0.12);
      if (r() < 0.6) {
        const tank = mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 18), tankMat, cx + (r() - 0.5) * (w - 3), h + 1.1, cz + (r() - 0.5) * (d - 3), scene);
        tank.castShadow = true;
      }
      for (let k = 0; k < 2; k++) box(1, 0.7, 0.8, acMat, cx + (r() - 0.5) * (w - 2), h + 0.6, cz + (r() - 0.5) * (d - 2), scene, true, 0.08);
    }
    if (district.kind === "sheds") {
      const door = std({ color: "#5b5550", roughness: 0.6, metalness: 0.5 });
      box(0.1, 4, 5, door, cx - w / 2 - 0.05, 2, cz, scene, false);
      dressLeds(cx, cz, w, d, h);
      hangAd(cx, cz, w, d, h);
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
        const shop = std({ color: "#bae6fd", emissive: "#38bdf8", emissiveIntensity: night ? 1.6 : 1.15, roughness: 0.1, metalness: 0.3 });
        if (nx !== 0) box(0.06, 2.1, along * 0.5, shop, fx + nx * 0.04, 1.35, fz, scene, false);
        else box(along * 0.5, 2.1, 0.06, shop, fx, 1.35, fz + nz * 0.04, scene, false);
      }
      if (along > 3) {
        const cols = Math.max(1, Math.floor((along - 1.4) / 2.35));
        const rows = Math.max(1, Math.floor((h - 3.4) / 2.7));
        outward.set(nx, 0, nz);
        winQ.setFromUnitVectors(winUp, outward);
        for (let row = 0; row < rows; row++) {
          const y = 3.5 + row * 2.7;
          if (y > h - 0.9) break;
          for (let col = 0; col < cols; col++) {
            const offset = (col - (cols - 1) / 2) * 2.35;
            const px = nx !== 0 ? fx + nx * 0.16 : fx + offset;
            const pz = nz !== 0 ? fz + nz * 0.16 : fz + offset;
            const roll = r();
            const bucket = roll < 0.58 ? litWins : roll < 0.86 ? deepWins : darkWins;
            bucket.push(new THREE.Matrix4().compose(new THREE.Vector3(px, y, pz), winQ, new THREE.Vector3(1.15, 1.55, 1)));
          }
        }
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
    dressLeds(cx, cz, w, d, h);
    hangAd(cx, cz, w, d, h);
  };

  const placeWins = (list: THREE.Matrix4[], mat: THREE.Material) => {
    if (!list.length) return;
    const win = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, list.length);
    list.forEach((m, i) => win.setMatrixAt(i, m));
    win.instanceMatrix.needsUpdate = true;
    scene.add(win);
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

  const lots = 3;
  const overlapsRoom = (cx: number, cz: number, w: number, d: number) => {
    const a0 = cx - w / 2 - 0.8;
    const a1 = cx + w / 2 + 0.8;
    const b0 = cz - d / 2 - 0.8;
    const b1 = cz + d / 2 + 0.8;
    return [HOME, SHOP_A, SHOP_B].some((room) => a0 < room.maxX && a1 > room.minX && b0 < room.maxZ && b1 > room.minZ);
  };
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      if ((i === 2 && j === 2) || (i === 1 && j === 1)) continue;
      const downtown = !(i === 0 && j === 0) && Math.max(Math.abs(i - 1), Math.abs(j - 1)) === 1;
      const bx = blockStart(i);
      const bz = blockStart(j);
      const lot = THEMES[districtAt(bx + 8, bz + 8)] ?? theme;
      const span = BLOCK / lots;
      for (let li = 0; li < lots; li++) {
        for (let lj = 0; lj < lots; lj++) {
          const cx = bx + span * (li + 0.5);
          const cz = bz + span * (lj + 0.5);
          const roll = r();
          if (!downtown && roll < 0.06 && !(i === 0 && j === 0)) {
            for (let k = 0; k < 2; k++) prop(cx - 2 + r() * 4, cz - 2 + r() * 4);
            const tree = buildTree(r, night);
            tree.position.set(cx, 0.2, cz);
            scene.add(tree);
            addCol(cx - 0.2, cx + 0.2, cz - 0.2, cz + 0.2, 3);
            continue;
          }
          const [hmin, hmax] = lot.heights;
          let h = hmin + r() * (hmax - hmin);
          const centerLot = li === 1 && lj === 1;
          if (downtown) h = centerLot ? 66 + r() * 16 : 44 + r() * 26;
          else if (lot.kind === "containers") h = 2.6 * (1 + Math.floor(r() * 4));
          else if ((lot.kind === "towers" || lot.kind === "corporate") && r() > 0.72) h = 20 + r() * 12;
          const w = !downtown && lot.kind === "containers" ? span * 0.5 : span * 0.7;
          const d = !downtown && lot.kind === "containers" ? span * 0.86 : span * 0.7;
          if (overlapsRoom(cx, cz, w, d)) continue;
          building(cx, cz, w, d, h, downtown);
        }
      }
    }
  }
  placeWins(darkWins, new THREE.MeshPhysicalMaterial({ color: "#163044", roughness: 0.06, metalness: 0.55, envMapIntensity: 1.3, transparent: true, opacity: 0.72 }));
  placeWins(litWins, new THREE.MeshStandardMaterial({ color: "#e0f2fe", emissive: "#38bdf8", emissiveIntensity: 3.1, roughness: 0.35 }));
  placeWins(deepWins, new THREE.MeshStandardMaterial({ color: "#1e3a8a", emissive: "#2563eb", emissiveIntensity: 2.2, roughness: 0.4 }));
  const placeLeds = (list: THREE.Matrix4[], color: string) => {
    if (!list.length) return;
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.8, roughness: 0.32, metalness: 0.2 });
    const strip = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, list.length);
    list.forEach((m, i) => strip.setMatrixAt(i, m));
    strip.instanceMatrix.needsUpdate = true;
    scene.add(strip);
  };
  placeLeds(ledCyan, "#22d3ee");
  placeLeds(ledMag, "#e879f9");
  placeLeds(ledAmber, "#fbbf24");
  placeLeds(ledWhite, "#e0f2fe");

  const spots: Spot[] = [];
  const areaName = (i: number, j: number) => ["Rua da Feira", "Av. do Porto", "Travessa Seca", "Rua das Palmeiras", "Largo do Mercado", "Rua do Cais", "Av. Central", "Beco do Sal"][(i * 3 + j) % 8];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      if ((i === 2 && j === 2) || (i === 1 && j === 1)) continue;
      spots.push({ pos: new THREE.Vector3(blockStart(i) + 0.7, 0, blockStart(j) + BLOCK / 2 + (r() - 0.5) * 8), area: areaName(i, j) });
    }
  }

  const pedLoops: THREE.Vector3[][] = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const o = -1.15;
      const x0 = blockStart(i) + o;
      const z0 = blockStart(j) + o;
      const x1 = blockStart(i) + BLOCK - o;
      const z1 = blockStart(j) + BLOCK - o;
      pedLoops.push([new THREE.Vector3(x0, 0, z0), new THREE.Vector3(x1, 0, z0), new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x0, 0, z1)]);
    }
  }

  const nearSpot = (x: number, z: number, d: number) => spots.some((s) => Math.hypot(s.pos.x - x, s.pos.z - z) < d);

  const parked: THREE.Group[] = [];
  const carColors = ["#2a2f36", "#b8bcc2", "#8e1b1b", "#1f3f8a", "#f1f1ef", "#1d5a45", "#c7a14a"];
  const kinds = ["sedan", "hatch", "sedan", "van"] as const;
  for (let n = 0; n < 16; n++) {
    const alongX = r() > 0.5;
    const line = Math.floor(r() * (GRID + 1));
    const pos = 20 + r() * (SIZE - 40);
    const side = r() > 0.5 ? 1 : -1;
    const x = alongX ? pos : streetCenter(line) + side * 4.9;
    const z = alongX ? streetCenter(line) + side * 4.9 : pos;
    if (Math.hypot(x - 7, z - 7) < 18) continue;
    if (x > compound.minX - 16 && z > compound.minZ - 16) continue;
    if (Array.from({ length: GRID + 1 }, (_, j) => j).some((j) => Math.abs((alongX ? x : z) - streetCenter(j)) < 9)) continue;
    const car = buildCar(carColors[n % carColors.length], kinds[n % kinds.length]);
    car.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = false;
    });
    car.position.set(x, 0, z);
    car.rotation.y = alongX ? Math.PI / 2 : 0;
    scene.add(car);
    parked.push(car);
    const hl = car.userData.length / 2;
    if (alongX) addCol(x - hl, x + hl, z - 0.95, z + 0.95, 1.5);
    else addCol(x - 0.95, x + 0.95, z - hl, z + hl, 1.5);
  }
  for (let i = 0; i < GRID + 1; i++) {
    for (let j = 0; j < GRID + 1; j++) {
      const x = streetCenter(i) + 6.6;
      const z = streetCenter(j) + 6.6;
      const lamp = buildLamp(night);
      lamp.position.set(x, 0.2, z);
      lamp.rotation.y = Math.PI / 4 + Math.PI;
      scene.add(lamp);
      addCol(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 6);
    }
  }
  const signals = buildSignals(scene);
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      if ((i === 2 && j === 2) || (i === 1 && j === 1)) continue;
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
    const line = Math.floor(r() * (GRID + 1));
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
    const roomWin = new THREE.MeshStandardMaterial({ color: "#e0f2fe", emissive: "#38bdf8", emissiveIntensity: 2.6, roughness: 0.35 });
    const glow = (x: number, z: number, yaw: number) => {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.95), roomWin);
      pane.position.set(x, 1.65, z);
      pane.rotation.y = yaw;
      scene.add(pane);
    };
    if (gap !== "west") glow(minX - 0.04, (minZ + maxZ) / 2, -Math.PI / 2);
    if (gap !== "east") glow(maxX + 0.04, (minZ + maxZ) / 2, Math.PI / 2);
    if (gap !== "minusZ") glow((minX + maxX) / 2, minZ - 0.04, Math.PI);
    if (gap !== "plusZ") glow((minX + maxX) / 2, maxZ + 0.04, 0);
    const roomLight = new THREE.PointLight("#7dd3fc", 7, 16, 1.6);
    roomLight.position.set(midX, 2.15, midZ);
    scene.add(roomLight);
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
  const armas = designedSign("ARMAS", 3.6, 0.95);
  armas.position.set((SHOP_A.minX + SHOP_A.maxX) / 2, 2.7, SHOP_A.minZ - 0.06);
  scene.add(armas);
  const motos = designedSign("MOTOS", 3.6, 0.95);
  motos.position.set(SHOP_B.minX - 0.06, 2.7, (SHOP_B.minZ + SHOP_B.maxZ) / 2);
  motos.rotation.y = -Math.PI / 2;
  scene.add(motos);
  box(2.2, 0.9, 0.5, std({ color: "#7f1d1d", roughness: 0.6 }), (SHOP_A.minX + SHOP_A.maxX) / 2, 0.7, (SHOP_A.minZ + SHOP_A.maxZ) / 2 + 1.2, scene, true);
  box(0.5, 0.9, 2.2, std({ color: "#0e7490", roughness: 0.55 }), (SHOP_B.minX + SHOP_B.maxX) / 2 + 1.2, 0.7, (SHOP_B.minZ + SHOP_B.maxZ) / 2, scene, true);
  const elevator = buildSkyHideout(scene, night, addCol);
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(18, 18, 24, 24), photoMaterial("grass_ground", 4, 4, { disp: 0.015, rough: 0.95 }));
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
    entrega: takeBike("entrega") ?? buildBike("entrega"),
    esportiva: takeBike("esportiva") ?? buildBike("esportiva"),
    noturna: takeBike("noturna") ?? buildBike("noturna"),
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

  const rideCol: Collider = { minX: BIKE_PARK.x - 0.9, maxX: BIKE_PARK.x + 0.9, minZ: BIKE_PARK.z - 1.28, maxZ: BIKE_PARK.z + 1.28, top: 1.4, ride: true };
  colliders.push(rideCol);
  const moving = new Set<THREE.Object3D>([sky, jet, car, elevator, gateMesh, beacon, ...port, bikes.entrega, bikes.esportiva, bikes.noturna]);
  const freeze = (o: THREE.Object3D) => {
    if (moving.has(o)) return;
    o.updateMatrix();
    o.matrixAutoUpdate = false;
    for (const child of o.children) freeze(child);
  };
  const trimShadow = (o: THREE.Object3D) => {
    if (moving.has(o)) return;
    const m = o as THREE.Mesh;
    if (m.isMesh && m.castShadow) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      if (mats.some((mat) => mat.transparent || mat.alphaTest > 0)) m.castShadow = false;
      else {
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
        if ((m.geometry.boundingSphere?.radius ?? 1) < 2) m.castShadow = false;
      }
    }
    for (const child of o.children) trimShadow(child);
  };
  for (const child of scene.children) {
    freeze(child);
    trimShadow(child);
  }
  scene.updateMatrixWorld(true);
  batchStill(scene, moving);
  chunkShadows(scene, moving);

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
    elevator,
    ads,
    parked,
    sky,
    signals,
    rideCol,
  };
}
