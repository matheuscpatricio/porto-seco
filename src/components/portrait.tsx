"use client";

import type { Who } from "@/content/types";
import { people } from "@/game/characters";
import type { Pose } from "@/game/draw";
import { driveSkinned, preloadCast, trySkinned } from "@/game3d/cast";
import type { Pose3, Rig } from "@/game3d/human";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type Slot = {
  canvas: HTMLCanvasElement;
  who: Who;
  pose: Pose;
  full: boolean;
  rig: Rig | null;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
};

const FULL_BUF = { w: 280, h: 448 };
const BUST_BUF = { w: 256, h: 256 };

function spanOf(rig: Rig) {
  rig.root.updateMatrixWorld(true);
  const head = rig.skinned?.bones.head?.getWorldPosition(new THREE.Vector3());
  let low = head ? head.y : 0;
  rig.root.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    const y = o.getWorldPosition(new THREE.Vector3()).y;
    if (y < low) low = y;
  });
  return { headY: head ? head.y : low + 1.5, low };
}

function frameOf(full: boolean, rig: Rig) {
  const { headY, low } = spanOf(rig);
  const top = headY + (full ? 0.28 : 0.36);
  if (full) {
    const foot = low - 0.08;
    const mid = (top + foot) / 2;
    const halfH = Math.max(0.4, (top - foot) / 2);
    const fov = 24;
    const aspect = FULL_BUF.w / FULL_BUF.h;
    const vTan = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const dist = Math.max(halfH / vTan, 0.62 / (vTan * aspect));
    return { fov, aspect, x: 0.1, y: mid, z: dist, lookY: mid, yaw: 0.2 };
  }
  const chest = headY - 0.46;
  const mid = (top + chest) / 2;
  const half = Math.max((top - chest) / 2, 0.55);
  const fov = 20;
  const vTan = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const dist = half / vTan;
  return { fov, aspect: 1, x: 0.02, y: mid, z: dist, lookY: mid, yaw: 0.05 };
}

const slots = new Set<Slot>();
let renderer: THREE.WebGLRenderer | null = null;
let raf = 0;
let last = 0;
let booting: Promise<void> | null = null;

function pose3(pose: Pose): Pose3 {
  if (pose === "run" || pose === "jump" || pose === "shoot" || pose === "hurt" || pose === "down" || pose === "talk" || pose === "cheer" || pose === "sit") return pose;
  return "idle";
}

function boot() {
  if (!booting) {
    booting = preloadCast().catch((err) => {
      booting = null;
      throw err;
    });
  }
  return booting;
}

function mountRig(slot: Slot) {
  const look = people[slot.who].look;
  const rig = trySkinned(look);
  if (!rig) return;
  rig.armed = false;
  rig.gun.visible = false;
  const idle = rig.skinned?.actions.get("idle");
  if (idle && rig.skinned) {
    idle.reset().play();
    idle.setEffectiveWeight(1);
    rig.skinned.mixer.update(0);
    rig.skinned.clip = "idle";
  }
  const shot = frameOf(slot.full, rig);
  rig.root.rotation.y = shot.yaw;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#e7eeff", "#1a1028", 0.95));
  const key = new THREE.DirectionalLight("#fff6ec", 2.35);
  key.position.set(1.6, 2.8, 2.6);
  const fill = new THREE.DirectionalLight("#7dd3fc", 0.7);
  fill.position.set(-2.1, 1.5, 1.4);
  const rim = new THREE.DirectionalLight("#f0abfc", 0.35);
  rim.position.set(-0.4, 2.2, -2.4);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 28),
    new THREE.MeshBasicMaterial({ color: "#67e8f9", transparent: true, opacity: 0.16 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.012;
  ground.userData.stage = true;
  scene.add(key, fill, rim, rig.root);
  if (slot.full) scene.add(ground);
  rig.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial;
      if (std.envMapIntensity !== undefined) std.envMapIntensity = 0.4;
    }
  });
  const buf = slot.full ? FULL_BUF : BUST_BUF;
  const camera = new THREE.PerspectiveCamera(shot.fov, buf.w / buf.h, 0.05, 20);
  camera.position.set(shot.x, shot.y, shot.z);
  camera.lookAt(0, shot.lookY, 0);
  slot.rig = rig;
  slot.scene = scene;
  slot.camera = camera;
}

function disposeRig(rig: Rig | null) {
  if (!rig) return;
  rig.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) m.dispose();
  });
}

function rendererOf() {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

function loop(now: number) {
  raf = requestAnimationFrame(loop);
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
  last = now;
  const gl = renderer;
  if (!gl) return;
  for (const slot of slots) {
    if (!slot.rig || !slot.scene || !slot.camera) continue;
    const pose = pose3(slot.pose);
    driveSkinned(slot.rig, pose, now / 1000, dt);
    if (pose === "talk") slot.rig.skinned?.bones.head?.rotateX(Math.sin(now / 170) * 0.045);
    const buf = slot.full ? FULL_BUF : BUST_BUF;
    if (gl.domElement.width !== buf.w || gl.domElement.height !== buf.h) gl.setSize(buf.w, buf.h, false);
    gl.render(slot.scene, slot.camera);
    const ctx = slot.canvas.getContext("2d");
    if (!ctx) continue;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, slot.canvas.width, slot.canvas.height);
    ctx.drawImage(gl.domElement, 0, 0, slot.canvas.width, slot.canvas.height);
  }
}

function kick() {
  if (raf) return;
  rendererOf();
  last = 0;
  raf = requestAnimationFrame(loop);
}

function drop(slot: Slot) {
  slots.delete(slot);
  disposeRig(slot.rig);
  slot.scene?.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.userData.stage) return;
    mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) m.dispose();
  });
  slot.rig = null;
  slot.scene = null;
  slot.camera = null;
  if (slots.size > 0 || !raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
  renderer?.dispose();
  renderer = null;
}

export function Portrait({ who, size = 72, pose = "talk", full = false }: { who: Who; size?: number; pose?: Pose; full?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const cssH = full ? size * 1.6 : size;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(cssH * dpr);
    const slot: Slot = { canvas, who, pose, full, rig: null, scene: null, camera: null };
    slots.add(slot);
    let alive = true;
    boot()
      .then(() => {
        if (!alive || !slots.has(slot)) return;
        mountRig(slot);
        kick();
      })
      .catch(() => {});
    return () => {
      alive = false;
      drop(slot);
    };
  }, [who, size, pose, full]);
  const cssH = full ? size * 1.6 : size;
  return <canvas ref={ref} style={{ width: size, height: cssH }} className="shrink-0" aria-label={people[who].name} />;
}
