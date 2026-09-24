import * as THREE from "three";

const images = new Map<string, THREE.Texture>();
const loader = typeof window === "undefined" ? null : new THREE.TextureLoader();

function map(file: string, srgb: boolean) {
  const hit = images.get(file);
  if (hit) return hit;
  const t = loader ? loader.load(`/textures/${file}`) : new THREE.Texture();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  images.set(file, t);
  return t;
}

function tiled(src: THREE.Texture, rx: number, ry: number) {
  const t = src.clone();
  t.repeat.set(rx, ry);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

/** Photo PBR from Poly Haven (CC0). `disp` is in meters along the surface normal. */
export function photoMaterial(
  id: string,
  rx: number,
  ry: number,
  opts: { disp?: number; color?: string; rough?: number; metal?: number } = {},
) {
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? "#ffffff",
    map: tiled(map(`${id}_diff.jpg`, true), rx, ry),
    normalMap: tiled(map(`${id}_nor_gl.jpg`, false), rx, ry),
    roughnessMap: tiled(map(`${id}_rough.jpg`, false), rx, ry),
    roughness: opts.rough ?? 1,
    metalness: opts.metal ?? 0,
  });
  if (opts.disp) {
    mat.displacementMap = tiled(map(`${id}_disp.jpg`, false), rx, ry);
    mat.displacementScale = opts.disp;
  }
  return mat;
}
