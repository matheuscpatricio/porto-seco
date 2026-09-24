import type { Look } from "@/game/characters";
import type { Pose3, Rig } from "@/game3d/human";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

type Bones = {
  spine: THREE.Bone | null;
  head: THREE.Bone | null;
  armL: THREE.Bone | null;
  armR: THREE.Bone | null;
  foreL: THREE.Bone | null;
  foreR: THREE.Bone | null;
  upL: THREE.Bone | null;
  upR: THREE.Bone | null;
  shinL: THREE.Bone | null;
  shinR: THREE.Bone | null;
  handR: THREE.Bone | null;
};

type Template = {
  scene: THREE.Object3D;
  clips: THREE.AnimationClip[];
  scale: number;
  drop: number;
};

type Atlas = { ids: Uint8Array; shade: Uint8Array; size: number };

const FACE = 1;
const HAIR = 2;
const SLEEVE = 3;
const PANTS = 4;
const SHOE = 5;
const HAND = 6;
const TORSO = 7;
const SCLERA = 8;
const IRIS = 9;
const ATLAS = 512;

const templates = new Map<string, Template>();
const xbotAtlases: Atlas[] = [];
const paintCache = new Map<string, THREE.CanvasTexture[]>();
const photoCache = new Map<string, THREE.CanvasTexture>();
let michelleSrc: ImageData | null = null;
let soldierSrc: ImageData | null = null;
let soldierFace: { x0: number; y0: number; x1: number; y1: number } | null = null;
let clothNormal: THREE.Texture | null = null;

const gunGeo = {
  slide: new THREE.BoxGeometry(0.045, 0.055, 0.16),
  barrel: new THREE.CylinderGeometry(0.011, 0.011, 0.09, 12),
  grip: new THREE.BoxGeometry(0.04, 0.09, 0.045),
};

function kindFor(look: Look) {
  const woman = look.hairStyle === "ponytail" || (look.hairStyle === "curly" && look.build !== "big");
  if (woman) return "michelle";
  if (look.extras.includes("vest")) return "soldier";
  return "xbot";
}

function bone(root: THREE.Object3D, name: string) {
  const o = root.getObjectByName(name);
  return o && (o as THREE.Bone).isBone ? (o as THREE.Bone) : null;
}

function firstSkin(root: THREE.Object3D) {
  const found: { mesh: THREE.SkinnedMesh | null } = { mesh: null };
  root.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (mesh.isSkinnedMesh && !found.mesh) found.mesh = mesh;
  });
  return found.mesh;
}

function prepare(gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] }, face: number): Template {
  const scene = gltf.scene;
  scene.rotation.y = face;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const h = Math.max(0.01, box.max.y - box.min.y);
  const scale = 1.75 / h;
  return { scene, clips: gltf.animations, scale, drop: -box.min.y * scale };
}

/**
 * Michelle stands because her hip rest rotation cancels a 90° parent tilt.
 * Copying Xbot quaternions outright lays her on the ground. The walk is the
 * Xbot delta applied on top of her own rest pose. Position tracks stay out:
 * Xbot's hip height is in another unit. Do not call skeleton.pose() after this.
 */
function bakeFemaleClips(xbot: { scene: THREE.Group; animations: THREE.AnimationClip[] }, michelle: { scene: THREE.Group }) {
  const src = firstSkin(xbot.scene);
  const tgt = firstSkin(michelle.scene);
  if (!src || !tgt) return [] as THREE.AnimationClip[];
  const srcRest = new Map(src.skeleton.bones.map((b) => [b.name, b.quaternion.clone()]));
  const srcPos = new Map(src.skeleton.bones.map((b) => [b.name, b.position.clone()]));
  const tgtRest = new Map(tgt.skeleton.bones.map((b) => [b.name, b.quaternion.clone()]));
  const names = tgt.skeleton.bones.map((b) => b.name).filter((n) => srcRest.has(n));
  const mixer = new THREE.AnimationMixer(xbot.scene);
  const q = new THREE.Quaternion();
  const out = new THREE.Quaternion();
  const clips: THREE.AnimationClip[] = [];
  for (const wanted of ["idle", "walk", "run"]) {
    const srcClip = xbot.animations.find((c) => c.name.toLowerCase() === wanted);
    if (!srcClip || srcClip.duration <= 0) continue;
    const action = mixer.clipAction(srcClip);
    action.play();
    const frames = Math.max(8, Math.round(srcClip.duration * 30));
    const times = new Float32Array(frames + 1);
    const series = new Map<string, Float32Array>();
    for (const name of names) series.set(name, new Float32Array((frames + 1) * 4));
    for (let i = 0; i <= frames; i++) {
      const t = (i / frames) * srcClip.duration;
      times[i] = t;
      mixer.setTime(t >= srcClip.duration ? 0 : t);
      for (const name of names) {
        const srcBone = src.skeleton.getBoneByName(name);
        const srcQ = srcRest.get(name);
        const tgtQ = tgtRest.get(name);
        if (!srcBone || !srcQ || !tgtQ) continue;
        q.copy(srcQ).invert().multiply(srcBone.quaternion);
        out.copy(tgtQ).multiply(q);
        const arr = series.get(name)!;
        const o = i * 4;
        arr[o] = out.x;
        arr[o + 1] = out.y;
        arr[o + 2] = out.z;
        arr[o + 3] = out.w;
      }
    }
    action.stop();
    const tracks = [...series.entries()].map(([name, values]) => new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values));
    clips.push(new THREE.AnimationClip(wanted, srcClip.duration, tracks));
  }
  mixer.stopAllAction();
  for (const b of src.skeleton.bones) {
    const p = srcPos.get(b.name);
    const rq = srcRest.get(b.name);
    if (p) b.position.copy(p);
    if (rq) b.quaternion.copy(rq);
  }
  src.skeleton.update();
  return clips;
}

function partOf(name: string) {
  const n = name.toLowerCase();
  if (n.includes("toe") || n.includes("foot")) return SHOE;
  if (n.includes("hand") || n.includes("thumb") || n.includes("index") || n.includes("middle") || n.includes("ring") || n.includes("pinky")) return HAND;
  if (n.includes("upleg") || n.includes("leg") || n.includes("hips")) return PANTS;
  if (n.includes("head") || n.includes("neck")) return FACE;
  if (n.includes("arm") || n.includes("shoulder")) return SLEEVE;
  if (n.includes("spine")) return TORSO;
  return TORSO;
}

function dominant(geo: THREE.BufferGeometry, bones: THREE.Bone[], i: number) {
  const si = geo.attributes.skinIndex;
  const sw = geo.attributes.skinWeight;
  if (!si || !sw) return "";
  let best = -1;
  let bi = 0;
  for (let k = 0; k < 4; k++) {
    const w = sw.getComponent(i, k);
    if (w > best) {
      best = w;
      bi = si.getComponent(i, k) | 0;
    }
  }
  return bones[bi]?.name ?? "";
}

function buildAtlas(mesh: THREE.SkinnedMesh): Atlas | null {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  if (!pos || !uv) return null;
  mesh.skeleton.update();
  mesh.updateMatrixWorld(true);
  const bones = mesh.skeleton.bones;
  const left = mesh.skeleton.getBoneByName("mixamorigLeftEye");
  const right = mesh.skeleton.getBoneByName("mixamorigRightEye");
  const le = new THREE.Vector3();
  const re = new THREE.Vector3();
  left?.getWorldPosition(le);
  right?.getWorldPosition(re);
  const v = new THREE.Vector3();
  const head: { i: number; y: number; d: number }[] = [];
  for (let i = 0; i < pos.count; i++) {
    if (!dominant(geo, bones, i).toLowerCase().includes("head")) continue;
    v.fromBufferAttribute(pos, i);
    mesh.applyBoneTransform(i, v);
    v.applyMatrix4(mesh.matrixWorld);
    const d = left && right ? Math.min(v.distanceTo(le), v.distanceTo(re)) : 99;
    head.push({ i, y: v.y, d });
  }
  const ys = head.map((h) => h.y).sort((a, b) => a - b);
  const hairCut = ys.length ? ys[Math.min(ys.length - 1, Math.floor(ys.length * 0.72))] : 99;
  const near = new Map(head.map((h) => [h.i, h]));
  const vertPart = new Uint8Array(pos.count);
  const vertShade = new Uint8Array(pos.count);
  const normal = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const name = dominant(geo, bones, i);
    const hit = near.get(i);
    let part = partOf(name);
    if (hit) {
      if (hit.d < 0.058) part = SCLERA;
      else if (hit.y > hairCut) part = HAIR;
      else part = FACE;
    }
    vertPart[i] = part;
    const ny = normal ? normal.getY(i) : 0.4;
    vertShade[i] = Math.round((0.78 + 0.22 * Math.min(1, Math.max(0, ny * 0.5 + 0.5))) * 255);
  }
  const ids = new Uint8Array(ATLAS * ATLAS);
  const shade = new Uint8Array(ATLAS * ATLAS);
  const index = geo.index;
  const triCount = index ? index.count / 3 : pos.count / 3;
  const at = (t: number, k: number) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  for (let t = 0; t < triCount; t++) {
    const ia = at(t, 0);
    const ib = at(t, 1);
    const ic = at(t, 2);
    const u0 = uv.getX(ia);
    const v0 = uv.getY(ia);
    const u1 = uv.getX(ib);
    const v1 = uv.getY(ib);
    const u2 = uv.getX(ic);
    const v2 = uv.getY(ic);
    if (Math.hypot(u0 - u1, v0 - v1) > 0.22 || Math.hypot(u1 - u2, v1 - v2) > 0.22 || Math.hypot(u2 - u0, v2 - v0) > 0.22) continue;
    const ax = u0 * (ATLAS - 1);
    const ay = (1 - v0) * (ATLAS - 1);
    const bx = u1 * (ATLAS - 1);
    const by = (1 - v1) * (ATLAS - 1);
    const cx = u2 * (ATLAS - 1);
    const cy = (1 - v2) * (ATLAS - 1);
    const minx = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const maxx = Math.min(ATLAS - 1, Math.ceil(Math.max(ax, bx, cx)));
    const miny = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxy = Math.min(ATLAS - 1, Math.ceil(Math.max(ay, by, cy)));
    if ((maxx - minx + 1) * (maxy - miny + 1) > 14000) continue;
    const part = vertPart[ia] === vertPart[ib] || vertPart[ia] === vertPart[ic] ? vertPart[ia] : vertPart[ib] === vertPart[ic] ? vertPart[ib] : vertPart[ia];
    const sh = Math.round((vertShade[ia] + vertShade[ib] + vertShade[ic]) / 3);
    for (let y = miny; y <= maxy; y++) {
      for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const w0 = (bx - px) * (cy - py) - (by - py) * (cx - px);
        const w1 = (cx - px) * (ay - py) - (cy - py) * (ax - px);
        const w2 = (ax - px) * (by - py) - (ay - py) * (bx - px);
        const inside = (w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0);
        if (!inside) continue;
        const p = y * ATLAS + x;
        if (!ids[p]) {
          ids[p] = part;
          shade[p] = sh;
        }
      }
    }
  }
  for (let pass = 0; pass < 6; pass++) {
    const rev = pass % 2 === 1;
    for (let y = rev ? ATLAS - 2 : 1; rev ? y > 0 : y < ATLAS - 1; rev ? y-- : y++) {
      for (let x = rev ? ATLAS - 2 : 1; rev ? x > 0 : x < ATLAS - 1; rev ? x-- : x++) {
        const i = y * ATLAS + x;
        if (ids[i]) continue;
        const left = ids[i - 1];
        const right = ids[i + 1];
        const up = ids[i - ATLAS];
        const down = ids[i + ATLAS];
        const n = left || right || up || down;
        if (!n) continue;
        ids[i] = n;
        shade[i] = left ? shade[i - 1] : right ? shade[i + 1] : up ? shade[i - ATLAS] : shade[i + ATLAS];
      }
    }
  }
  stampIrises(ids);
  return { ids, shade, size: ATLAS };
}

function stampIrises(ids: Uint8Array) {
  const coords: [number, number][] = [];
  for (let i = 0; i < ids.length; i++) if (ids[i] === SCLERA) coords.push([i % ATLAS, (i / ATLAS) | 0]);
  if (coords.length < 8) return;
  coords.sort((a, b) => a[0] - b[0]);
  let gap = 0;
  let at = 0;
  for (let i = 1; i < coords.length; i++) {
    const g = coords[i][0] - coords[i - 1][0];
    if (g > gap) {
      gap = g;
      at = i;
    }
  }
  const groups = gap > 3 ? [coords.slice(0, at), coords.slice(at)] : [coords];
  for (const g of groups) {
    if (g.length < 4) continue;
    let cx = 0;
    let cy = 0;
    for (const p of g) {
      cx += p[0];
      cy += p[1];
    }
    cx /= g.length;
    cy /= g.length;
    let radius = 0;
    for (const p of g) radius = Math.max(radius, Math.hypot(p[0] - cx, p[1] - cy));
    const rad = Math.max(1.6, radius * 0.42);
    for (const p of g) {
      if (Math.hypot(p[0] - cx, p[1] - cy) <= rad) ids[p[1] * ATLAS + p[0]] = IRIS;
    }
  }
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function grain(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return 0.93 + (s - Math.floor(s)) * 0.07;
}

function colorize(atlas: Atlas, look: Look) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = atlas.size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const jacket = look.extras.includes("jacket") && look.jacket ? look.jacket : look.shirt;
  const skin = hexRgb(look.skin);
  const hair = look.hairStyle === "bald" ? skin : hexRgb(look.hair);
  const cloth = hexRgb(jacket);
  const pants = hexRgb(look.pants);
  const shoes = hexRgb(look.shoes);
  const img = ctx.createImageData(atlas.size, atlas.size);
  const d = img.data;
  for (let y = 0; y < atlas.size; y++) {
    for (let x = 0; x < atlas.size; x++) {
      const i = y * atlas.size + x;
      const id = atlas.ids[i];
      const o = i * 4;
      if (!id) {
        d[o + 3] = 0;
        continue;
      }
      const rgb = id === HAIR ? hair : id === SLEEVE || id === TORSO ? cloth : id === PANTS ? pants : id === SHOE ? shoes : id === SCLERA ? [244, 240, 230] : id === IRIS ? [18, 12, 9] : skin;
      const s = (atlas.shade[i] / 255) * grain(x, y);
      d[o] = Math.min(255, rgb[0] * s);
      d[o + 1] = Math.min(255, rgb[1] * s);
      d[o + 2] = Math.min(255, rgb[2] * s);
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function xbotMaps(look: Look) {
  const jacket = look.extras.includes("jacket") && look.jacket ? look.jacket : "";
  const key = [look.skin, look.hair, look.hairStyle === "bald" ? "bald" : "hair", look.shirt, look.pants, look.shoes, jacket].join("|");
  const cached = paintCache.get(key);
  if (cached) return cached;
  const maps = xbotAtlases.map((a) => colorize(a, look)).filter((t): t is THREE.CanvasTexture => !!t);
  paintCache.set(key, maps);
  return maps;
}

function softNormal() {
  if (clothNormal || typeof document === "undefined") return clothNormal;
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(S, S);
  const h = (x: number, y: number) => Math.sin((x / S) * 46) * 0.16 + Math.sin((y / S) * 30 + x * 0.2) * 0.1;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = h(x + 1, y) - h(x - 1, y);
      const dy = h(x, y + 1) - h(x, y - 1);
      const nx = -dx;
      const ny = -dy;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const o = (y * S + x) * 4;
      img.data[o] = (nx / len) * 127 + 128;
      img.data[o + 1] = (ny / len) * 127 + 128;
      img.data[o + 2] = (nz / len) * 127 + 128;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  clothNormal = tex;
  return tex;
}

function readImage(image: CanvasImageSource & { width?: number; height?: number }) {
  const w = image.width ?? 0;
  const h = image.height ?? 0;
  if (!w || !h || typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, w, h);
  } catch {
    return null;
  }
}

function albedoOf(root: THREE.Object3D) {
  const found: { map: THREE.Texture | null } = { map: null };
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || found.map) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat.map || found.map) continue;
      if (mat.name.toLowerCase().includes("visor")) continue;
      found.map = mat.map;
    }
  });
  const image = found.map?.image as (CanvasImageSource & { width?: number; height?: number }) | undefined;
  return image ? readImage(image) : null;
}

function faceRect(src: ImageData) {
  const { width: w, height: h, data } = src;
  const B = 8;
  const hs = Math.floor(h / B);
  const ws = Math.floor(w / B);
  const smooth = new Uint8Array(hs * ws);
  for (let by = 0; by < hs; by++) {
    for (let bx = 0; bx < ws; bx++) {
      let sum = 0;
      let sum2 = 0;
      let skin = 0;
      let n = 0;
      for (let y = by * B; y < (by + 1) * B; y += 2) {
        for (let x = bx * B; x < (bx + 1) * B; x += 2) {
          const o = (y * w + x) * 4;
          const r = data[o];
          const g = data[o + 1];
          const b = data[o + 2];
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          sum += lum;
          sum2 += lum * lum;
          n++;
          if (r > 140 && g > 90 && b > 50 && r - b > 25 && r - g < 80) skin++;
        }
      }
      const mu = sum / n;
      const sd = Math.sqrt(Math.max(0, sum2 / n - mu * mu));
      if (sd < 14 && mu > 100 && mu < 200 && skin / n > 0.55) smooth[by * ws + bx] = 1;
    }
  }
  const seen = new Uint8Array(smooth.length);
  let best: number[] = [];
  for (let i = 0; i < smooth.length; i++) {
    if (!smooth[i] || seen[i]) continue;
    const stack = [i];
    const comp = [i];
    seen[i] = 1;
    while (stack.length) {
      const cur = stack.pop()!;
      const y = (cur / ws) | 0;
      const x = cur - y * ws;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= ws || ny >= hs) continue;
        const ni = ny * ws + nx;
        if (!smooth[ni] || seen[ni]) continue;
        seen[ni] = 1;
        stack.push(ni);
        comp.push(ni);
      }
    }
    if (comp.length > best.length) best = comp;
  }
  if (best.length < 8) return { x0: 410, y0: 120, x1: 680, y1: 300 };
  let x0 = ws;
  let y0 = hs;
  let x1 = 0;
  let y1 = 0;
  for (const i of best) {
    const y = (i / ws) | 0;
    const x = i - y * ws;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + 1);
    y1 = Math.max(y1, y + 1);
  }
  return {
    x0: Math.max(0, x0 * B - 12),
    y0: Math.max(0, y0 * B - 12),
    x1: Math.min(w, x1 * B + 12),
    y1: Math.min(h, y1 * B + 12),
  };
}

function photoMap(kind: "michelle" | "soldier", look: Look) {
  const src = kind === "michelle" ? michelleSrc : soldierSrc;
  if (!src) return null;
  const key = kind === "soldier" ? `soldier|${look.skin}` : `michelle|${look.skin}|${look.shirt}|${look.hair}`;
  const cached = photoCache.get(key);
  if (cached) return cached;
  const skin = hexRgb(look.skin);
  const shirt = hexRgb(look.shirt);
  const hair = hexRgb(look.hair);
  const { width: w, height: h, data } = src;
  const cls = new Uint8Array(w * h);
  const face = soldierFace;
  let skinN = 0;
  let skinL = 0;
  let clothN = 0;
  let clothL = 0;
  let hairN = 0;
  let hairL = 0;
  let faceN = 0;
  let faceL = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (kind === "soldier") {
        if (face && x >= face.x0 && x < face.x1 && y >= face.y0 && y < face.y1 && r > 70 && g > 40 && b > 25 && r + 15 > g && r > b + 8 && r < 250) {
          cls[i] = 4;
          faceN++;
          faceL += lum;
        }
        continue;
      }
      const isSkin = r > 145 && g > 95 && b > 45 && r + 8 >= g && g + 15 >= b && r - b > 22 && r - g < 95 && b < 200 && b < r + 8;
      const isCloth = !isSkin && b > 75 && b > r + 12 && g > 50 && b + 18 > g;
      const isHair = !isSkin && !isCloth && r > 45 && r < 160 && g < r * 0.78 && b < 90 && r - b > 20 && g > 20 && Math.max(r, g, b) > 40;
      if (isSkin) {
        cls[i] = 1;
        skinN++;
        skinL += lum;
      } else if (isCloth) {
        cls[i] = 2;
        clothN++;
        clothL += lum;
      } else if (isHair) {
        cls[i] = 3;
        hairN++;
        hairL += lum;
      }
    }
  }
  const avg = (n: number, sum: number) => (n > 20 ? sum / n : 180);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const img = ctx.createImageData(w, h);
  img.data.set(data);
  const write = (i: number, rgb: [number, number, number], mean: number) => {
    const o = i * 4;
    const lum = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
    const s = Math.min(1.45, Math.max(0.35, lum / mean));
    img.data[o] = Math.min(255, rgb[0] * s);
    img.data[o + 1] = Math.min(255, rgb[1] * s);
    img.data[o + 2] = Math.min(255, rgb[2] * s);
  };
  const aSkin = avg(skinN, skinL);
  const aCloth = avg(clothN, clothL);
  const aHair = avg(hairN, hairL);
  const aFace = avg(faceN, faceL);
  for (let i = 0; i < cls.length; i++) {
    if (cls[i] === 1) write(i, skin, aSkin);
    else if (cls[i] === 2) write(i, shirt, aCloth);
    else if (cls[i] === 3) write(i, hair, aHair);
    else if (cls[i] === 4) write(i, skin, aFace);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  photoCache.set(key, tex);
  return tex;
}

/** Mixamo heroes. Civilians wear a painted Xbot; vests keep the photographed soldier. */
export async function preloadCast(onStatus?: (label: string, pct: number) => void) {
  if (typeof window === "undefined") return;
  if (templates.size) {
    onStatus?.("A calçada já está cheia", 1);
    return;
  }
  onStatus?.("As pessoas saem de casa", 0.08);
  const loader = new GLTFLoader();
  const [xbot, michelle, soldier] = await Promise.all([
    loader.loadAsync("/models/Xbot.glb"),
    loader.loadAsync("/models/Michelle.glb"),
    loader.loadAsync("/models/Soldier.glb"),
  ]);
  onStatus?.("O passo acerta o chão", 0.46);
  const femaleClips = bakeFemaleClips(xbot, michelle);
  if (femaleClips.length) michelle.animations = femaleClips;
  xbot.scene.updateMatrixWorld(true);
  xbot.scene.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const atlas = buildAtlas(mesh);
    if (atlas) xbotAtlases.push(atlas);
  });
  onStatus?.("Os rostos ganham cor", 0.78);
  const male = prepare(xbot, Math.PI);
  const female = prepare(michelle, Math.PI);
  const guard = prepare(soldier, Math.PI);
  michelleSrc = albedoOf(female.scene);
  soldierSrc = albedoOf(guard.scene);
  if (soldierSrc) soldierFace = faceRect(soldierSrc);
  templates.set("xbot", male);
  templates.set("michelle", female);
  templates.set("soldier", guard);
  onStatus?.("A calçada enche", 1);
}

function pistol() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: "#2a2e33", metalness: 0.72, roughness: 0.32 });
  const grip = new THREE.MeshStandardMaterial({ color: "#1a120e", roughness: 0.72 });
  const slide = new THREE.Mesh(gunGeo.slide, metal);
  const barrel = new THREE.Mesh(gunGeo.barrel, metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.1;
  const handle = new THREE.Mesh(gunGeo.grip, grip);
  handle.position.set(0, -0.06, -0.03);
  handle.rotation.x = 0.35;
  g.add(slide, barrel, handle);
  return g;
}

function blank(): Rig {
  const o = () => new THREE.Group();
  return {
    root: new THREE.Group(),
    body: new THREE.Group(),
    hips: o(),
    chest: o(),
    head: o(),
    shoulderL: o(),
    shoulderR: o(),
    elbowL: o(),
    elbowR: o(),
    hipL: o(),
    hipR: o(),
    kneeL: o(),
    kneeR: o(),
    gun: new THREE.Group(),
    materials: [],
    flash: 0,
    armed: true,
  };
}

function dressXbot(model: THREE.Object3D, look: Look, rig: Rig) {
  const maps = xbotMaps(look);
  const normal = softNormal();
  let i = 0;
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const map = maps[i++] ?? maps[0];
    const mat = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map: map ?? null,
      roughness: 0.58,
      metalness: 0.03,
      sheen: 0.28,
      sheenRoughness: 0.62,
      sheenColor: new THREE.Color("#fff4ec"),
      normalMap: normal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      envMapIntensity: 0.42,
    });
    if (!map) mat.color.set(look.skin);
    mesh.material = mat;
    mesh.castShadow = true;
    mesh.frustumCulled = true;
    rig.materials.push(mat);
  });
}

function dressPhoto(model: THREE.Object3D, look: Look, kind: "michelle" | "soldier", rig: Rig) {
  const map = photoMap(kind, look);
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.frustumCulled = true;
    const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const mats = source.map((m) => {
      const copy = m.clone() as THREE.MeshStandardMaterial;
      const n = copy.name.toLowerCase();
      const visor = n.includes("visor") || n.includes("glass");
      if (!visor && map && copy.map) {
        copy.map = map;
        copy.color.set("#ffffff");
      }
      rig.materials.push(copy);
      return copy;
    });
    mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
  });
}

export function trySkinned(look: Look): Rig | null {
  const kind = kindFor(look);
  const src = templates.get(kind);
  if (!src) return null;
  const model = cloneSkeleton(src.scene);
  model.scale.setScalar(src.scale * (look.build === "big" ? 1.06 : look.build === "slim" ? 0.94 : 1));
  model.position.y = src.drop;
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map<string, THREE.AnimationAction>();
  for (const clip of src.clips) {
    const action = mixer.clipAction(clip);
    actions.set(clip.name.toLowerCase(), action);
  }
  const rig = blank();
  rig.root.userData.cast = kind;
  rig.root.userData.skin = look.skin;
  rig.body.add(model);
  rig.root.add(rig.body);
  if (kind === "xbot") dressXbot(model, look, rig);
  else dressPhoto(model, look, kind, rig);
  const gun = pistol();
  const hand = bone(model, "mixamorigRightHand");
  if (hand) {
    gun.position.set(0.02, 0.08, 0.04);
    gun.rotation.set(-Math.PI / 2, 0, 0);
    hand.add(gun);
  } else rig.body.add(gun);
  rig.gun = gun;
  rig.skinned = {
    mixer,
    actions,
    clip: "",
    bones: {
      spine: bone(model, "mixamorigSpine"),
      head: bone(model, "mixamorigHead"),
      armL: bone(model, "mixamorigLeftArm"),
      armR: bone(model, "mixamorigRightArm"),
      foreL: bone(model, "mixamorigLeftForeArm"),
      foreR: bone(model, "mixamorigRightForeArm"),
      upL: bone(model, "mixamorigLeftUpLeg"),
      upR: bone(model, "mixamorigRightUpLeg"),
      shinL: bone(model, "mixamorigLeftLeg"),
      shinR: bone(model, "mixamorigRightLeg"),
      handR: hand,
    },
  };
  return rig;
}

function play(r: Rig, name: string) {
  const skin = r.skinned;
  if (!skin) return;
  const next = skin.actions.get(name) ?? skin.actions.get("idle") ?? skin.actions.get("walk");
  if (!next) return;
  const key = next.getClip().name.toLowerCase();
  if (skin.clip === key) return;
  const prev = skin.actions.get(skin.clip);
  next.reset().fadeIn(0.18).play();
  prev?.fadeOut(0.18);
  skin.clip = key;
}

function clipFor(pose: Pose3) {
  if (pose === "walk") return "walk";
  if (pose === "run" || pose === "jump") return "run";
  if (pose === "cheer") return "agree";
  if (pose === "hurt" || pose === "cower") return "sad_pose";
  return "idle";
}

function bend(b: THREE.Bone | null, x: number, z = 0) {
  if (!b) return;
  if (x) b.rotateX(x);
  if (z) b.rotateZ(z);
}

/** Plays a Mixamo clip, then bends the skeleton for seats, the bike, the desk and the gun. */
export function driveSkinned(r: Rig, pose: Pose3, t: number, dt: number) {
  const skin = r.skinned;
  if (!skin) return;
  play(r, clipFor(pose));
  const action = skin.actions.get(skin.clip);
  if (action) action.timeScale = pose === "run" || pose === "jump" ? 1.15 : pose === "walk" ? 0.9 : 1;
  skin.mixer.update(dt);
  const b = skin.bones;
  const seated = pose === "sit" || pose === "ride" || pose === "desk";
  if (pose === "down") {
    r.body.rotation.x = -Math.PI / 2;
    r.body.position.y = 0.15;
  } else {
    r.body.rotation.x = pose === "ride" ? 0.35 : 0;
    r.body.position.y = seated ? (pose === "ride" ? -0.08 : -0.42) : 0;
  }
  if (seated) {
    bend(b.upL, -1.2, pose === "ride" ? 0.28 : 0);
    bend(b.upR, -1.2, pose === "ride" ? -0.28 : 0);
    bend(b.shinL, 1.45);
    bend(b.shinR, 1.45);
    bend(b.spine, pose === "desk" ? 0.45 : 0.28);
  }
  if (pose === "ride" || pose === "desk" || pose === "type") {
    bend(b.armL, -0.85);
    bend(b.armR, -0.85);
    const flick = pose === "ride" ? 0 : Math.sin(t * 16) * 0.08;
    bend(b.foreL, -1.05 + flick);
    bend(b.foreR, -1.05 - flick);
    bend(b.head, pose === "desk" ? 0.35 : -0.2);
  }
  if (pose === "shoot") {
    bend(b.armR, -1.35);
    bend(b.foreR, -0.35);
    bend(b.spine, 0.08);
  }
  if (pose === "phone") {
    bend(b.armR, -0.7);
    bend(b.foreR, -1.5);
  }
  if (pose === "cower") {
    bend(b.spine, 0.7);
    bend(b.upL, -0.8);
    bend(b.upR, -0.8);
    bend(b.shinL, 1.4);
    bend(b.shinR, 1.4);
  }
  r.gun.visible = r.armed && (pose === "shoot" || pose === "run" || pose === "walk" || pose === "idle" || pose === "jump");
  r.flash = Math.max(0, r.flash - dt);
  const on = r.flash > 0;
  for (const m of r.materials) {
    if (!m.wireframe && m.emissive) m.emissive.setHex(on ? 0xffffff : 0x000000);
  }
}
