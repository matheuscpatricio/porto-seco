import type { RideId } from "@/lib/progress-rules";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let carRoot: THREE.Group | null = null;

/** CC-BY-4.0 concept car (Khronos glTF Sample Assets). Logos on the plate and the wheel emblem stay hidden. */
export async function preloadCar() {
  if (carRoot || typeof window === "undefined") return;
  const gltf = await new GLTFLoader().loadAsync("/models/CarConcept.glb");
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.x > size.z) root.rotation.y = Math.PI / 2;
  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const scale = 4.45 / Math.max(fittedSize.x, fittedSize.z, 0.001);
  root.scale.setScalar(scale);
  root.position.y = -fitted.min.y * scale;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.name === "License Plate" || mesh.name === "InteriorSteeringEmblem") mesh.visible = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const phys = m as THREE.MeshPhysicalMaterial;
      if (phys.transmission) {
        phys.transmission = 0;
        phys.transparent = true;
        phys.opacity = 0.42;
        phys.roughness = Math.min(phys.roughness, 0.08);
      }
    }
  });
  carRoot = root;
}

export function takeCar(color: string, kind: "sedan" | "hatch" | "van" = "sedan") {
  if (!carRoot) return null;
  const g = new THREE.Group();
  const model = carRoot.clone(true);
  const s = kind === "van" ? 1.12 : kind === "hatch" ? 0.9 : 1;
  model.scale.multiplyScalar(s);
  g.add(model);
  g.userData.wheels = ["WheelFrontL", "WheelFrontR", "WheelRearL", "WheelRearR"]
    .map((n) => model.getObjectByName(n))
    .filter((o): o is THREE.Object3D => !!o);
  g.userData.length = 4.45 * s;
  const cabin: THREE.Object3D[] = [];
  const rims: THREE.Object3D[] = [];
  const tint = new THREE.Color(color);
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const paint = (m: THREE.Material) => {
      if (!m.name.startsWith("Paint")) return m;
      const copy = m.clone() as THREE.MeshStandardMaterial;
      copy.color.copy(tint);
      return copy;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(paint) : paint(mesh.material);
    mesh.castShadow = false;
    let detail = false;
    for (let p: THREE.Object3D | null = mesh; p; p = p.parent) {
      const n = p.name || "";
      if (n.startsWith("Interior") || n.includes("Brake") || n.includes("Wiper") || n.includes("HoodInterior")) detail = true;
    }
    if (detail) cabin.push(mesh);
  });
  g.userData.cabin = cabin;
  g.userData.rims = rims;
  const lods: THREE.Object3D[] = [];
  g.updateMatrixWorld(true);
  for (const w of g.userData.wheels as THREE.Object3D[]) {
    const spokes: THREE.Mesh[] = [];
    w.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      let named = false;
      for (let p: THREE.Object3D | null = mesh; p && p !== w; p = p.parent) {
        if ((p.name || "").includes("Rim")) named = true;
      }
      if (named) spokes.push(mesh);
    });
    if (!spokes.length) continue;
    rims.push(...spokes);
    let radius = 0;
    const center = new THREE.Vector3();
    for (const mesh of spokes) {
      const geo = mesh.geometry;
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      const sphere = geo.boundingSphere!;
      const el = mesh.matrixWorld.elements;
      const s = Math.hypot(el[0], el[1], el[2]);
      const r = sphere.radius * s;
      if (r <= radius) continue;
      radius = r;
      center.copy(sphere.center).applyMatrix4(mesh.matrixWorld);
    }
    w.worldToLocal(center);
    const ws = Math.hypot(w.matrixWorld.elements[0], w.matrixWorld.elements[1], w.matrixWorld.elements[2]) || 1;
    const localR = radius / ws;
    if (!lodWheelGeo) lodWheelGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
    const lod = new THREE.Mesh(lodWheelGeo, lodWheelMat);
    lod.scale.set(localR * 0.92, localR * 0.38, localR * 0.92);
    lod.rotation.z = Math.PI / 2;
    lod.position.copy(center);
    lod.castShadow = false;
    lod.receiveShadow = false;
    lod.visible = false;
    lod.name = "lodWheel";
    w.add(lod);
    lods.push(lod);
  }
  g.userData.lodWheels = lods;
  const proxy = shadowBox(1.85 * s, 1.25, 4.15 * s);
  g.userData.shadowProxy = proxy;
  g.add(proxy);
  return g;
}

/** A box stands in for the high-poly mesh inside the shadow map. The car and the bike still draw in full. */
function shadowBox(w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.name = "shadowProxy";
  return mesh;
}

const lodWheelMat = new THREE.MeshStandardMaterial({ color: "#161616", roughness: 0.86, metalness: 0.18 });
let lodWheelGeo: THREE.CylinderGeometry | null = null;

const RIDE_PAINT: Record<RideId, string> = {
  entrega: "#dc2626",
  esportiva: "#2563eb",
  noturna: "#7c3aed",
};

let bikeRoot: THREE.Group | null = null;
let bikePixels: ImageData | null = null;
const bikePaint = new Map<RideId, THREE.CanvasTexture>();

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Colored bodywork keeps its shading. Tires, chrome and leather stay. */
function paintMap(style: RideId) {
  if (!bikePixels) return null;
  const cached = bikePaint.get(style);
  if (cached) return cached;
  const target = hexRgb(RIDE_PAINT[style]);
  const { width: w, height: h, data } = bikePixels;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(w, h);
  img.data.set(data);
  let ar = 0;
  let ag = 0;
  let ab = 0;
  let n = 0;
  const paint: number[] = [];
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 70 || max - min < 28) continue;
    paint.push(i);
    ar += r;
    ag += g;
    ab += b;
    n++;
  }
  const avg = n > 20 ? [ar / n, ag / n, ab / n] : [180, 150, 40];
  for (const i of paint) {
    const o = i * 4;
    img.data[o] = Math.min(255, (data[o] * target[0]) / Math.max(12, avg[0]));
    img.data[o + 1] = Math.min(255, (data[o + 1] * target[1]) / Math.max(12, avg[1]));
    img.data[o + 2] = Math.min(255, (data[o + 2] * target[2]) / Math.max(12, avg[2]));
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  bikePaint.set(style, tex);
  return tex;
}

function sliceGeo(src: THREE.BufferGeometry, ids: number[]) {
  const dst = new THREE.BufferGeometry();
  for (const name of Object.keys(src.attributes)) {
    const attr = src.getAttribute(name);
    const item = attr.itemSize;
    const arr = new Float32Array(ids.length * item);
    for (let i = 0; i < ids.length; i++) {
      for (let k = 0; k < item; k++) arr[i * item + k] = attr.getComponent(ids[i], k);
    }
    dst.setAttribute(name, new THREE.BufferAttribute(arr, item, attr.normalized));
  }
  return dst;
}

function wheelFrom(geo: THREE.BufferGeometry, ids: number[], material: THREE.Material) {
  const part = sliceGeo(geo, ids);
  part.computeBoundingBox();
  const center = part.boundingBox!.getCenter(new THREE.Vector3());
  part.translate(-center.x, -center.y, -center.z);
  const group = new THREE.Group();
  group.position.copy(center);
  group.userData.wheel = true;
  const mesh = new THREE.Mesh(part, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/** CC-BY-4.0 sport motorcycle (Chenchanchong). Length sits on +Z, like the cars. */
export async function preloadBike() {
  if (bikeRoot || typeof window === "undefined") return;
  const gltf = await new GLTFLoader().loadAsync("/models/Motorcycle.glb");
  const src = gltf.scene;
  src.rotation.y = -Math.PI / 2;
  src.updateMatrixWorld(true);
  const holder = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  src.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrixWorld);
    mesh.geometry = geo;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.push(mesh);
  });
  for (const mesh of meshes) {
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    holder.add(mesh);
  }

  const wheelMesh = meshes.reduce((a, b) => (a.geometry.getAttribute("position").count <= b.geometry.getAttribute("position").count ? a : b));
  const body = wheelMesh.geometry.index ? wheelMesh.geometry.toNonIndexed() : wheelMesh.geometry;
  const pos = body.getAttribute("position");
  body.computeBoundingBox();
  const mid = (body.boundingBox!.min.z + body.boundingBox!.max.z) / 2;
  const front: number[] = [];
  const rear: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const bucket = z >= mid ? front : rear;
    bucket.push(i, i + 1, i + 2);
  }
  const material = wheelMesh.material as THREE.Material;
  if (front.length > 30 && rear.length > 30) {
    holder.remove(wheelMesh);
    holder.add(wheelFrom(body, front, material));
    holder.add(wheelFrom(body, rear, material));
  }

  const box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3());
  const scale = 2.2 / Math.max(size.x, size.z, 0.001);
  holder.scale.setScalar(scale);
  holder.position.y = -box.min.y * scale;
  holder.position.x = -((box.min.x + box.max.x) / 2) * scale;
  holder.position.z = -((box.min.z + box.max.z) / 2) * scale;

  holder.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const image = mat.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
    if (!image || bikePixels || typeof image.width !== "number") return;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    bikePixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  });
  bikeRoot = holder;
}

export function takeBike(style: RideId) {
  if (!bikeRoot) return null;
  const g = new THREE.Group();
  const model = bikeRoot.clone(true);
  const tint = paintMap(style);
  const wheels: THREE.Object3D[] = [];
  model.traverse((o) => {
    if (o.userData.wheel) wheels.push(o);
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material as THREE.MeshStandardMaterial;
    const copy = source.clone();
    if (tint && !o.parent?.userData.wheel) {
      copy.map = tint;
      copy.color.set("#ffffff");
    }
    mesh.material = copy;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
  });
  g.add(model);
  const proxy = shadowBox(0.72, 1.15, 2.15);
  g.userData.shadowProxy = proxy;
  g.add(proxy);
  g.userData.wheels = wheels;
  g.userData.length = 2.2;
  return g;
}
