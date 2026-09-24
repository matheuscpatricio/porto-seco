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

const templates = new Map<string, Template>();

const gunGeo = {
  slide: new THREE.BoxGeometry(0.045, 0.055, 0.16),
  barrel: new THREE.CylinderGeometry(0.011, 0.011, 0.09, 12),
  grip: new THREE.BoxGeometry(0.04, 0.09, 0.045),
};

function kindFor(look: Look) {
  if (look.hairStyle === "ponytail" || (look.hairStyle === "curly" && look.build === "slim")) return "michelle";
  // Xbot is the denser body, but that file ships without a photo. Soldier and Michelle carry real textures.
  return "soldier";
}

function bone(root: THREE.Object3D, name: string) {
  const o = root.getObjectByName(name);
  return o && (o as THREE.Bone).isBone ? (o as THREE.Bone) : null;
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

function retarget(clips: THREE.AnimationClip[], names: Set<string>) {
  return clips
    .map((clip) => {
      const tracks = clip.tracks.filter((t) => names.has(t.name.split(".")[0]));
      return tracks.length ? new THREE.AnimationClip(clip.name, clip.duration, tracks) : null;
    })
    .filter((c): c is THREE.AnimationClip => !!c);
}

/** Mixamo heroes shipped with three.js, plus the soldier for anyone in a vest. */
export async function preloadCast() {
  if (templates.size || typeof window === "undefined") return;
  const loader = new GLTFLoader();
  const [xbot, michelle, soldier] = await Promise.all([
    loader.loadAsync("/models/Xbot.glb"),
    loader.loadAsync("/models/Michelle.glb"),
    loader.loadAsync("/models/Soldier.glb"),
  ]);
  const male = prepare(xbot, Math.PI);
  const female = prepare(michelle, Math.PI);
  const guard = prepare(soldier, Math.PI);
  const names = new Set<string>();
  female.scene.traverse((o) => {
    if ((o as THREE.Bone).isBone) names.add(o.name);
  });
  const shared = retarget(male.clips, names);
  if (shared.some((c) => c.name === "idle")) female.clips = shared;
  templates.set("xbot", male);
  templates.set("michelle", female);
  templates.set("soldier", guard);
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

export function trySkinned(look: Look): Rig | null {
  const src = templates.get(kindFor(look));
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
  rig.body.add(model);
  rig.root.add(rig.body);
  const tint = new THREE.Color(look.shirt);
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.frustumCulled = true;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
      const copy = m.clone() as THREE.MeshStandardMaterial;
      const n = copy.name.toLowerCase();
      if (!n.includes("visor") && !n.includes("glass") && copy.color) copy.color.lerp(tint, copy.map ? 0.12 : 0.16);
      rig.materials.push(copy);
      return copy;
    });
    mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
  });
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
