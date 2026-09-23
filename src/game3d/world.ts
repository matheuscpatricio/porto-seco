import * as THREE from "three";

export type Collider = { minX: number; maxX: number; minZ: number; maxZ: number; top: number; gate?: boolean };

export type Theme = {
  sky: string;
  fog: string;
  sun: string;
  sunIntensity: number;
  hemi: [string, string, number];
  ground: string;
  road: string;
  kind: "houses" | "towers" | "containers" | "sheds" | "corporate";
  palette: string[];
  heights: [number, number];
  night: boolean;
};

export const THEMES: Record<string, Theme> = {
  w1: { sky: "#f08a4b", fog: "#e8905a", sun: "#ffd2a1", sunIntensity: 2.2, hemi: ["#ffd9b8", "#5a3a2a", 1.1], ground: "#8a6a55", road: "#3b3533", kind: "houses", palette: ["#e76f51", "#f4a261", "#e9c46a", "#2a9d8f", "#d62828", "#90be6d", "#f1faee"], heights: [4, 10], night: false },
  w2: { sky: "#1d2553", fog: "#1d2553", sun: "#b4c6ff", sunIntensity: 1.2, hemi: ["#8fa8ff", "#1b1b2e", 0.9], ground: "#4b5563", road: "#1f2430", kind: "towers", palette: ["#334155", "#1e3a8a", "#475569", "#0f766e", "#3f3f46"], heights: [18, 48], night: true },
  w3: { sky: "#6aa8b0", fog: "#8fb5b8", sun: "#fff4e0", sunIntensity: 2.0, hemi: ["#cfe8ea", "#2e3a3a", 1.0], ground: "#6b7280", road: "#374151", kind: "containers", palette: ["#b91c1c", "#1d4ed8", "#15803d", "#ca8a04", "#ea580c", "#0e7490"], heights: [2.6, 10.4], night: false },
  w4: { sky: "#b98545", fog: "#a57a45", sun: "#ffcf8a", sunIntensity: 1.8, hemi: ["#f2d3a0", "#3a2a1a", 1.0], ground: "#6b5b4b", road: "#3a3430", kind: "sheds", palette: ["#78716c", "#57534e", "#a8a29e", "#92400e", "#44403c"], heights: [5, 9], night: false },
  w5: { sky: "#1a1033", fog: "#1a1033", sun: "#c4b5fd", sunIntensity: 1.0, hemi: ["#a78bfa", "#120a22", 0.9], ground: "#3f3f46", road: "#18181b", kind: "corporate", palette: ["#312e81", "#1e1b4b", "#3b0764", "#27272a", "#4c1d95"], heights: [22, 60], night: true },
  w6: { sky: "#2a0a12", fog: "#2a0a12", sun: "#fda4af", sunIntensity: 1.0, hemi: ["#fb7185", "#14060a", 0.85], ground: "#3f3f46", road: "#141414", kind: "corporate", palette: ["#1c1917", "#27272a", "#450a0a", "#18181b"], heights: [24, 64], night: true },
};

export const BLOCK = 36;
export const STREET = 14;
export const SIZE = 3 * BLOCK + 4 * STREET;
export const streetCenter = (i: number) => STREET / 2 + i * (BLOCK + STREET);
const blockStart = (i: number) => STREET + i * (BLOCK + STREET);

export type Layout = {
  colliders: Collider[];
  spawn: THREE.Vector3;
  allySpots: THREE.Vector3[];
  terminal: THREE.Vector3;
  terminalFacing: number;
  gate: { x: number; z: number; width: number; mesh: THREE.Group; collider: Collider; lights: THREE.Mesh[] };
  car: THREE.Group;
  carStart: THREE.Vector3;
  compound: { minX: number; maxX: number; minZ: number; maxZ: number };
  patrols1: [THREE.Vector3, THREE.Vector3][];
  patrols2: THREE.Vector3[];
  droneSpots: THREE.Vector3[];
  screen: { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture };
  beacon: THREE.Mesh;
};

function rng(seed: number) {
  let s = (seed * 2654435761) % 4294967296;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function windowTexture(base: string, night: boolean, kind: Theme["kind"], r: () => number) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  if (kind === "containers") {
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let x = 0; x < 128; x += 8) g.fillRect(x, 0, 3, 128);
    g.fillStyle = "rgba(255,255,255,0.15)";
    g.fillRect(0, 0, 128, 4);
    return new THREE.CanvasTexture(c);
  }
  if (kind === "sheds") {
    g.fillStyle = "rgba(0,0,0,0.2)";
    for (let x = 0; x < 128; x += 6) g.fillRect(x, 0, 2, 128);
    g.fillStyle = "rgba(30,20,10,0.6)";
    g.fillRect(40, 70, 48, 58);
    return new THREE.CanvasTexture(c);
  }
  const cols = kind === "houses" ? 2 : 4;
  const rows = kind === "houses" ? 2 : 4;
  const cw = 128 / cols;
  const rh = 128 / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const lit = r() < (night ? 0.45 : 0.15);
      g.fillStyle = lit ? (night ? "#fde68a" : "#fef3c7") : night ? "#0b1020" : "#1e293b";
      g.fillRect(i * cw + cw * 0.22, j * rh + rh * 0.2, cw * 0.56, rh * 0.55);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function buildCar(color: string) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: "#111827" });
  const glass = new THREE.MeshLambertMaterial({ color: "#93c5fd", emissive: "#1e3a8a", emissiveIntensity: 0.3 });
  box(1.9, 0.7, 4.3, paint, 0, 0.65, 0, g);
  box(1.7, 0.6, 2.2, glass, 0, 1.25, -0.2, g);
  box(1.72, 0.08, 2.1, paint, 0, 1.58, -0.2, g);
  const lightF = new THREE.MeshBasicMaterial({ color: "#fef08a" });
  const lightB = new THREE.MeshBasicMaterial({ color: "#ef4444" });
  for (const sx of [-0.65, 0.65]) {
    box(0.35, 0.18, 0.05, lightF, sx, 0.75, 2.16, g, false);
    box(0.35, 0.18, 0.05, lightB, sx, 0.75, -2.16, g, false);
  }
  for (const [x, z] of [
    [-0.95, 1.35],
    [0.95, 1.35],
    [-0.95, -1.35],
    [0.95, -1.35],
  ]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14), dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    w.castShadow = true;
    g.add(w);
  }
  return g;
}

function drawScreen(canvas: HTMLCanvasElement, title: string, body: string[], color: string) {
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#03140c";
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = color;
  g.lineWidth = 6;
  g.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  g.fillStyle = color;
  g.font = "bold 22px monospace";
  g.textAlign = "center";
  g.fillText(title.slice(0, 22), canvas.width / 2, 40);
  g.font = "bold 26px monospace";
  body.slice(0, 4).forEach((l, i) => g.fillText(l.slice(0, 20), canvas.width / 2, 90 + i * 34));
}

export function updateScreen(layout: Layout, title: string, body: string[], color = "#4ade80") {
  drawScreen(layout.screen.canvas, title, body, color);
  layout.screen.texture.needsUpdate = true;
}

export function buildWorld(scene: THREE.Scene, themeId: string, seed: number, target: string): Layout {
  const theme = THEMES[themeId] ?? THEMES.w1;
  const r = rng(seed + 11);
  const colliders: Collider[] = [];
  const addCol = (minX: number, maxX: number, minZ: number, maxZ: number, top: number) => {
    const c: Collider = { minX, maxX, minZ, maxZ, top };
    colliders.push(c);
    return c;
  };

  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.fog, 40, theme.night ? 130 : 170);

  const groundMat = new THREE.MeshLambertMaterial({ color: theme.road });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SIZE + 200, SIZE + 200), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(SIZE / 2, 0, SIZE / 2);
  ground.receiveShadow = true;
  scene.add(ground);

  const sidewalk = new THREE.MeshLambertMaterial({ color: theme.ground });
  const lane = new THREE.MeshBasicMaterial({ color: "#e5e7eb" });
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(BLOCK + 3, 0.15, BLOCK + 3), sidewalk);
      s.position.set(blockStart(i) + BLOCK / 2, 0.075, blockStart(j) + BLOCK / 2);
      s.receiveShadow = true;
      scene.add(s);
    }
  }
  for (let i = 0; i < 4; i++) {
    for (let k = 0; k < SIZE; k += 6) {
      const a = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 2.5), lane);
      a.rotation.x = -Math.PI / 2;
      a.position.set(streetCenter(i), 0.02, k + 1.5);
      scene.add(a);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.25), lane);
      b.rotation.x = -Math.PI / 2;
      b.position.set(k + 1.5, 0.02, streetCenter(i));
      scene.add(b);
    }
  }

  const textures = theme.palette.map((c) => windowTexture(c, theme.night, theme.kind, r));
  const roofMat = new THREE.MeshLambertMaterial({ color: theme.night ? "#0f0f14" : "#3f3a36" });

  const compound = { minX: blockStart(2), maxX: blockStart(2) + BLOCK, minZ: blockStart(2), maxZ: blockStart(2) + BLOCK };

  const building = (cx: number, cz: number, w: number, d: number, h: number) => {
    const tex = textures[Math.floor(r() * textures.length)].clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const unit = theme.kind === "houses" ? 5 : theme.kind === "containers" ? 6 : 6;
    tex.repeat.set(Math.max(1, Math.round(w / unit)), Math.max(1, Math.round(h / (theme.kind === "houses" ? 4 : 4))));
    tex.needsUpdate = true;
    const side = new THREE.MeshLambertMaterial({ map: tex });
    if (theme.night) {
      side.emissive = new THREE.Color("#ffffff");
      side.emissiveMap = tex;
      side.emissiveIntensity = 0.35;
    }
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roofMat, roofMat, side, side]);
    m.position.set(cx, h / 2, cz);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    addCol(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, h);
  };

  const crateMat = new THREE.MeshLambertMaterial({ color: "#a16207" });
  const crate = (x: number, z: number, y = 0) => {
    box(1.2, 1.2, 1.2, crateMat, x, y + 0.6, z, scene);
    addCol(x - 0.6, x + 0.6, z - 0.6, z + 0.6, y + 1.2);
  };

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (i === 2 && j === 2) continue;
      const bx = blockStart(i);
      const bz = blockStart(j);
      if (theme.kind === "corporate" && i === 1 && j === 1) {
        const h = 140;
        const tex = windowTexture("#1e1b4b", true, "towers", r);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(6, 30);
        const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 0.5 });
        const tower = new THREE.Mesh(new THREE.BoxGeometry(28, h, 28), mat);
        tower.position.set(bx + BLOCK / 2, h / 2, bz + BLOCK / 2);
        tower.castShadow = true;
        scene.add(tower);
        const logo = new THREE.Mesh(new THREE.BoxGeometry(29, 3, 29), new THREE.MeshBasicMaterial({ color: themeId === "w6" ? "#e11d48" : "#8b5cf6" }));
        logo.position.set(bx + BLOCK / 2, h - 8, bz + BLOCK / 2);
        scene.add(logo);
        addCol(bx + 4, bx + BLOCK - 4, bz + 4, bz + BLOCK - 4, h);
        continue;
      }
      for (let li = 0; li < 2; li++) {
        for (let lj = 0; lj < 2; lj++) {
          const cx = bx + 9 + li * 18;
          const cz = bz + 9 + lj * 18;
          const roll = r();
          if (roll < 0.22 && !(i === 0 && j === 0)) {
            for (let k = 0; k < 3; k++) {
              const x = cx - 5 + r() * 10;
              const z = cz - 5 + r() * 10;
              crate(x, z);
              if (r() > 0.5) crate(x, z, 1.2);
            }
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

  const carColors = ["#1f2937", "#9ca3af", "#b91c1c", "#1d4ed8", "#f5f5f4", "#065f46"];
  for (let n = 0; n < 12; n++) {
    const alongX = r() > 0.5;
    const line = Math.floor(r() * 4);
    const pos = 20 + r() * (SIZE - 40);
    const side = r() > 0.5 ? 1 : -1;
    const x = alongX ? pos : streetCenter(line) + side * 4.6;
    const z = alongX ? streetCenter(line) + side * 4.6 : pos;
    if (Math.hypot(x - 7, z - 7) < 18) continue;
    if (x > compound.minX - 16 && z > compound.minZ - 16) continue;
    const car = buildCar(carColors[n % carColors.length]);
    car.position.set(x, 0, z);
    car.rotation.y = alongX ? Math.PI / 2 : 0;
    scene.add(car);
    if (alongX) addCol(x - 2.2, x + 2.2, z - 1, z + 1, 1.6);
    else addCol(x - 1, x + 1, z - 2.2, z + 2.2, 1.6);
  }
  for (let n = 0; n < 14; n++) {
    const i = Math.floor(r() * 4);
    const x = streetCenter(i) + (r() > 0.5 ? 5.8 : -5.8);
    const z = 16 + r() * (SIZE - 50);
    if (Math.hypot(x - 7, z - 7) < 14) continue;
    crate(x, z);
    if (r() > 0.6) crate(x, z, 1.2);
  }

  const poleMat = new THREE.MeshLambertMaterial({ color: "#374151" });
  const bulbMat = new THREE.MeshBasicMaterial({ color: "#fde68a" });
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = streetCenter(i) + 6.3;
      const z = streetCenter(j) + 6.3;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 6, 8), poleMat);
      pole.position.set(x, 3, z);
      pole.castShadow = true;
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), bulbMat);
      bulb.position.set(x, 6.1, z);
      scene.add(bulb);
      addCol(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 6);
    }
  }

  const wallMat = new THREE.MeshLambertMaterial({ color: "#44403c" });
  const stripeMat = new THREE.MeshLambertMaterial({ color: "#facc15" });
  const { minX, maxX, minZ, maxZ } = compound;
  const gateZ = (minZ + maxZ) / 2;
  const gateW = 6;
  const wall = (x1: number, x2: number, z1: number, z2: number) => {
    const w = Math.max(0.8, x2 - x1);
    const d = Math.max(0.8, z2 - z1);
    box(w, 4, d, wallMat, (x1 + x2) / 2, 2, (z1 + z2) / 2, scene);
    addCol((x1 + x2) / 2 - w / 2, (x1 + x2) / 2 + w / 2, (z1 + z2) / 2 - d / 2, (z1 + z2) / 2 + d / 2, 4);
  };
  wall(minX, maxX, minZ - 0.4, minZ + 0.4);
  wall(minX, maxX, maxZ - 0.4, maxZ + 0.4);
  wall(maxX - 0.4, maxX + 0.4, minZ, maxZ);
  wall(minX - 0.4, minX + 0.4, minZ, gateZ - gateW / 2);
  wall(minX - 0.4, minX + 0.4, gateZ + gateW / 2, maxZ);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 8), new THREE.MeshBasicMaterial({ color: themeId === "w6" ? "#e11d48" : "#7c3aed" }));
  sign.position.set(minX - 0.5, 5, gateZ);
  scene.add(sign);

  const gateMesh = new THREE.Group();
  const panel = box(0.5, 3.8, gateW, new THREE.MeshLambertMaterial({ color: "#6b7280" }), 0, 1.9, 0, gateMesh);
  panel.castShadow = true;
  for (let k = 0; k < 4; k++) box(0.55, 0.25, gateW, stripeMat, 0, 0.6 + k * 0.9, 0, gateMesh, false);
  gateMesh.position.set(minX, 0, gateZ);
  scene.add(gateMesh);
  const gateCollider = addCol(minX - 0.4, minX + 0.4, gateZ - gateW / 2, gateZ + gateW / 2, 4);
  gateCollider.gate = true;

  const lights: THREE.Mesh[] = [];

  const terminal = new THREE.Vector3(minX - 2.6, 0, gateZ - 6.5);
  const kiosk = new THREE.Group();
  box(0.6, 1.3, 0.9, new THREE.MeshLambertMaterial({ color: "#334155" }), 0, 0.65, 0, kiosk);
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 256;
  screenCanvas.height = 192;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.set(-0.31, 1.55, 0);
  screen.rotation.y = -Math.PI / 2;
  kiosk.add(screen);
  const hood = box(0.7, 0.8, 1.0, new THREE.MeshLambertMaterial({ color: "#1e293b" }), 0.05, 1.55, 0, kiosk);
  hood.scale.set(0.3, 1, 1);
  kiosk.position.copy(terminal);
  scene.add(kiosk);
  addCol(terminal.x - 0.35, terminal.x + 0.35, terminal.z - 0.5, terminal.z + 0.5, 1.9);
  const layoutScreen = { canvas: screenCanvas, texture: screenTex };
  drawScreen(screenCanvas, target.toUpperCase(), ["BLOQUEADO", "aperte E"], "#f87171");
  screenTex.needsUpdate = true;

  const carStart = new THREE.Vector3(minX + 20, 0, gateZ);
  const car = buildCar("#dc2626");
  car.position.copy(carStart);
  car.rotation.y = -Math.PI / 2;
  scene.add(car);
  const carCol = addCol(carStart.x - 2.2, carStart.x + 2.2, carStart.z - 1, carStart.z + 1, 1.6);
  carCol.gate = false;

  for (let k = 0; k < 6; k++) crate(minX + 6 + r() * 24, minZ + 4 + r() * 6);
  for (let k = 0; k < 4; k++) crate(minX + 6 + r() * 24, maxZ - 4 - r() * 6);

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
    const a = alongX ? new THREE.Vector3(pos - 10, 0, streetCenter(line)) : new THREE.Vector3(streetCenter(line), 0, pos - 10);
    const b = alongX ? new THREE.Vector3(pos + 10, 0, streetCenter(line)) : new THREE.Vector3(streetCenter(line), 0, pos + 10);
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
    terminalFacing: Math.PI / 2,
    gate: { x: minX, z: gateZ, width: gateW, mesh: gateMesh, collider: gateCollider, lights },
    car,
    carStart,
    compound,
    patrols1,
    patrols2,
    droneSpots,
    screen: layoutScreen,
    beacon,
  };
}
