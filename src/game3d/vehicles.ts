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
  });
  return g;
}
