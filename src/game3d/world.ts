import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Collider = { minX: number; maxX: number; minZ: number; maxZ: number; top: number; gate?: boolean };

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

export const BLOCK = 36;
export const STREET = 14;
export const SIZE = 3 * BLOCK + 4 * STREET;
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

  const asphalt = asphaltTextures();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE + 200, SIZE + 200),
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

  const facades = theme.palette.map((c) => facadeTextures(c, night, theme.kind, r));
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
    const f = facades[Math.floor(r() * facades.length)];
    const unitW = theme.kind === "houses" ? 4 : theme.kind === "containers" ? 6 : 3.2;
    const unitH = theme.kind === "containers" ? h : 3.2;
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
      const m = std({ map: m1, bumpMap: b1, bumpScale: 2.2, roughness: theme.kind === "towers" || theme.kind === "corporate" ? 0.45 : 0.9, metalness: theme.kind === "containers" ? 0.35 : 0 });
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
    const round = theme.kind === "containers" ? 0.05 : 0.25;
    const body = mesh(new RoundedBoxGeometry(w, h, d, 2, round), [md, md, roofMat, roofMat, mw, mw], cx, h / 2, cz, scene);
    body.receiveShadow = true;
    addCol(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, h);

    if (theme.kind === "containers") {
      for (let y = 2.6; y < h; y += 2.6) box(w + 0.05, 0.08, d + 0.05, std({ color: "#1f1f1f" }), cx, y, cz, scene, false);
      return;
    }
    if (theme.kind === "houses") {
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
    if (theme.kind === "sheds") {
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
      if (theme.kind === "corporate" && i === 1 && j === 1) {
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
          const [hmin, hmax] = theme.heights;
          let h = hmin + r() * (hmax - hmin);
          if (theme.kind === "containers") h = 2.6 * (1 + Math.floor(r() * 4));
          const w = theme.kind === "containers" ? 6 : 12 + r() * 3;
          const d = theme.kind === "containers" ? 14 : 12 + r() * 3;
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
      if (theme.kind === "corporate" && i === 1 && j === 1) continue;
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

  const e = 400;
  addCol(-e, 0, -e, SIZE + e, 999);
  addCol(SIZE, SIZE + e, -e, SIZE + e, 999);
  addCol(-e, SIZE + e, -e, 0, 999);
  addCol(-e, SIZE + e, SIZE, SIZE + e, 999);

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

  const spawn = new THREE.Vector3(7, 0, 7);
  const allySpots = [new THREE.Vector3(9.5, 0, 10), new THREE.Vector3(5, 0, 11), new THREE.Vector3(11, 0, 6.5)];

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
  };
}
