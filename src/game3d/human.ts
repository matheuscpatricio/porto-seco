import type { Look } from "@/game/characters";
import * as THREE from "three";

export type Pose3 = "idle" | "walk" | "run" | "jump" | "shoot" | "type" | "cheer" | "talk" | "hurt" | "down" | "sit";

export type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  hips: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;
  shoulderL: THREE.Group;
  shoulderR: THREE.Group;
  elbowL: THREE.Group;
  elbowR: THREE.Group;
  hipL: THREE.Group;
  hipR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  gun: THREE.Object3D;
  materials: THREE.MeshLambertMaterial[];
  flash: number;
  armed: boolean;
};

const geo = {
  limbUpper: new THREE.CapsuleGeometry(0.065, 0.24, 4, 8),
  limbLower: new THREE.CapsuleGeometry(0.058, 0.24, 4, 8),
  legUpper: new THREE.CapsuleGeometry(0.085, 0.34, 4, 8),
  legLower: new THREE.CapsuleGeometry(0.075, 0.34, 4, 8),
  hand: new THREE.SphereGeometry(0.06, 8, 8),
  head: new THREE.SphereGeometry(0.15, 16, 12),
  foot: new THREE.BoxGeometry(0.13, 0.08, 0.26),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 12, 10),
};

type MatFactory = (color: string) => THREE.MeshLambertMaterial;

function part(g: THREE.BufferGeometry, m: THREE.Material, cast = true) {
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = cast;
  return mesh;
}

/** Builds a jointed humanoid facing +Z with feet at y = 0 (about 1.75 m tall). */
export function buildHuman(look: Look, opts: { wire?: string } = {}): Rig {
  const materials: THREE.MeshLambertMaterial[] = [];
  const mat: MatFactory = (color) => {
    const m = opts.wire
      ? new THREE.MeshLambertMaterial({ color: opts.wire, emissive: opts.wire, emissiveIntensity: 0.8, wireframe: true })
      : new THREE.MeshLambertMaterial({ color });
    materials.push(m);
    return m;
  };
  const skin = mat(look.skin);
  const shirt = mat(look.shirt);
  const outer = mat(look.jacket ?? look.shirt);
  const pants = mat(look.pants);
  const shoes = mat(look.shoes);
  const hairM = mat(look.hair);
  const big = look.build === "big" ? 1.18 : look.build === "slim" ? 0.92 : 1;

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  body.add(hips);

  const pelvis = part(geo.box, pants);
  pelvis.scale.set(0.34 * big, 0.14, 0.2 * big);
  hips.add(pelvis);

  const chest = new THREE.Group();
  chest.position.y = 0.06;
  hips.add(chest);
  const torso = part(geo.box, look.extras.includes("jacket") ? outer : shirt);
  torso.scale.set(0.4 * big, 0.5, 0.23 * big);
  torso.position.y = 0.27;
  chest.add(torso);
  if (look.extras.includes("jacket")) {
    const front = part(geo.box, shirt, false);
    front.scale.set(0.14 * big, 0.46, 0.02);
    front.position.set(0, 0.27, 0.12 * big);
    chest.add(front);
  }
  if (look.extras.includes("vest")) {
    const vest = part(geo.box, mat(look.jacket ?? "#0f172a"));
    vest.scale.set(0.43 * big, 0.36, 0.26 * big);
    vest.position.y = 0.3;
    chest.add(vest);
    const stripe = part(geo.box, mat("#facc15"), false);
    stripe.scale.set(0.2, 0.03, 0.01);
    stripe.position.set(0, 0.36, 0.135 * big);
    chest.add(stripe);
  }
  if (look.extras.includes("tie")) {
    const tie = part(geo.box, mat(look.accent ?? "#b91c1c"), false);
    tie.scale.set(0.05, 0.28, 0.01);
    tie.position.set(0, 0.34, 0.12 * big);
    chest.add(tie);
  }

  const neck = part(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8), skin);
  neck.position.y = 0.56;
  chest.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.72;
  chest.add(head);
  const skull = part(geo.head, look.extras.includes("mask") ? mat("#111111") : skin);
  skull.scale.set(1, 1.08, 1);
  head.add(skull);

  const eyeM = mat(look.extras.includes("mask") ? "#f5f5f4" : "#111111");
  for (const sx of [-1, 1]) {
    const eye = part(geo.sphere, eyeM, false);
    eye.scale.setScalar(look.extras.includes("mask") ? 0.035 : 0.02);
    eye.position.set(sx * 0.055, 0.02, 0.135);
    head.add(eye);
  }
  if (!look.extras.includes("mask")) {
    const hs = look.hairStyle;
    if (hs === "short" || hs === "ponytail" || hs === "buzz") {
      const cap = part(new THREE.SphereGeometry(0.158, 16, 10, 0, Math.PI * 2, 0, hs === "buzz" ? 1.2 : 1.45), hairM);
      cap.rotation.x = -0.25;
      cap.position.y = 0.01;
      head.add(cap);
    }
    if (hs === "ponytail") {
      const tail = part(geo.sphere, hairM);
      tail.scale.set(0.07, 0.12, 0.07);
      tail.position.set(0, -0.02, -0.17);
      head.add(tail);
    }
    if (hs === "slick") {
      const cap = part(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, 0, 1.3), hairM);
      cap.rotation.x = -0.45;
      head.add(cap);
    }
    if (hs === "curly") {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const puff = part(geo.sphere, hairM);
        puff.scale.setScalar(0.07);
        puff.position.set(Math.cos(a) * 0.11, 0.1 + Math.sin(i * 1.7) * 0.02, Math.sin(a) * 0.11 - 0.02);
        head.add(puff);
      }
      const top = part(geo.sphere, hairM);
      top.scale.setScalar(0.1);
      top.position.set(0, 0.13, -0.02);
      head.add(top);
    }
    if (look.extras.includes("glasses")) {
      const g = part(geo.box, mat("#e5e7eb"), false);
      g.scale.set(0.2, 0.04, 0.02);
      g.position.set(0, 0.025, 0.145);
      head.add(g);
    }
    if (look.extras.includes("mustache")) {
      const m = part(geo.box, hairM, false);
      m.scale.set(0.1, 0.022, 0.02);
      m.position.set(0, -0.055, 0.145);
      head.add(m);
    }
    if (look.extras.includes("beard")) {
      const b = part(geo.sphere, mat("#3f2a1d"));
      b.scale.set(0.12, 0.08, 0.1);
      b.position.set(0, -0.09, 0.07);
      head.add(b);
    }
  }
  if (look.extras.includes("cap")) {
    const capM = mat(look.accent ?? "#1f2937");
    const dome = part(new THREE.SphereGeometry(0.163, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM);
    dome.position.y = 0.02;
    head.add(dome);
    const brim = part(geo.box, capM);
    brim.scale.set(0.24, 0.02, 0.14);
    brim.position.set(0, 0.03, 0.18);
    head.add(brim);
  }

  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.25 * big, 0.48, 0);
    chest.add(shoulder);
    const upper = part(geo.limbUpper, outer);
    upper.position.y = -0.15;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    const lower = part(geo.limbLower, outer);
    lower.position.y = -0.14;
    elbow.add(lower);
    const hand = part(geo.hand, skin);
    hand.position.y = -0.3;
    elbow.add(hand);
    if (big > 1) shoulder.scale.setScalar(1.15);
    return { shoulder, elbow };
  };
  const L = makeArm(1);
  const R = makeArm(-1);

  const gun = new THREE.Group();
  const barrel = part(geo.box, mat("#1f2937"));
  barrel.scale.set(0.06, 0.08, 0.24);
  barrel.position.z = 0.08;
  gun.add(barrel);
  const tip = part(geo.box, new THREE.MeshBasicMaterial({ color: "#facc15" }), false);
  tip.scale.set(0.065, 0.085, 0.04);
  tip.position.z = 0.21;
  gun.add(tip);
  gun.position.y = -0.32;
  gun.rotation.x = Math.PI / 2;
  gun.visible = false;
  R.elbow.add(gun);

  const makeLeg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.1 * big, -0.02, 0);
    hips.add(hip);
    const thigh = part(geo.legUpper, pants);
    thigh.position.y = -0.22;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    const shin = part(geo.legLower, pants);
    shin.position.y = -0.2;
    knee.add(shin);
    const foot = part(geo.foot, shoes);
    foot.position.set(0, -0.44, 0.05);
    knee.add(foot);
    if (big > 1) {
      thigh.scale.set(1.2, 1, 1.2);
      shin.scale.set(1.15, 1, 1.15);
    }
    return { hip, knee };
  };
  const LL = makeLeg(1);
  const LR = makeLeg(-1);

  if (big > 1) body.scale.setScalar(1.06);

  return {
    root,
    body,
    hips,
    chest,
    head,
    shoulderL: L.shoulder,
    shoulderR: R.shoulder,
    elbowL: L.elbow,
    elbowR: R.elbow,
    hipL: LL.hip,
    hipR: LR.hip,
    kneeL: LL.knee,
    kneeR: LR.knee,
    gun,
    materials,
    flash: 0,
    armed: true,
  };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

type Target = { sL: [number, number, number]; sR: [number, number, number]; eL: number; eR: number; hL: number; hR: number; kL: number; kR: number; chest: number; head: number; hipsY: number; bodyRx: number; bodyY: number };

/** Poses the rig. `t` is time in seconds; `speed` scales the gait cycle. Rotations use negative X for swinging a limb forward. */
export function animate(r: Rig, pose: Pose3, t: number, dt: number, speed = 1) {
  const c = t * (pose === "run" ? 11 : 7) * speed;
  const T: Target = { sL: [0, 0, 0.08], sR: [0, 0, -0.08], eL: -0.15, eR: -0.15, hL: 0, hR: 0, kL: 0.05, kR: 0.05, chest: 0, head: 0, hipsY: 0.95, bodyRx: 0, bodyY: 0 };
  const breathe = Math.sin(t * 2) * 0.02;
  switch (pose) {
    case "walk":
    case "run": {
      const amp = pose === "run" ? 0.9 : 0.5;
      T.hL = Math.sin(c) * amp;
      T.hR = -Math.sin(c) * amp;
      T.kL = Math.max(0, -Math.cos(c)) * amp * 1.3 + 0.1;
      T.kR = Math.max(0, Math.cos(c)) * amp * 1.3 + 0.1;
      T.sL = [-Math.sin(c) * amp * 0.9, 0, 0.1];
      T.sR = [Math.sin(c) * amp * 0.9, 0, -0.1];
      T.eL = T.eR = pose === "run" ? -1.3 : -0.4;
      T.chest = pose === "run" ? 0.18 : 0.05;
      T.hipsY = 0.95 - Math.abs(Math.sin(c)) * 0.05 + 0.03;
      break;
    }
    case "jump":
      T.hL = -0.9;
      T.kL = 1.4;
      T.hR = 0.3;
      T.kR = 0.9;
      T.sL = [-2.6, 0, 0.3];
      T.sR = [-2.4, 0, -0.3];
      T.eL = T.eR = -0.3;
      break;
    case "shoot":
      T.sR = [-Math.PI / 2, 0, 0];
      T.eR = 0;
      T.sL = [-1.3, 0, -0.45];
      T.eL = -0.6;
      T.chest = 0.05;
      break;
    case "type":
      T.sL = [-0.9, 0, 0.15];
      T.sR = [-0.9, 0, -0.15];
      T.eL = -0.8 + Math.sin(t * 18) * 0.12;
      T.eR = -0.8 + Math.cos(t * 16) * 0.12;
      T.chest = 0.15;
      T.head = 0.15;
      break;
    case "cheer":
      T.sL = [-2.9, 0, 0.3];
      T.sR = [-2.9, 0, -0.3];
      T.eL = T.eR = -0.2;
      T.hipsY = 0.95 + Math.abs(Math.sin(t * 8)) * 0.15;
      T.kL = T.kR = 0.2;
      break;
    case "talk":
      T.sR = [-0.6 + Math.sin(t * 4) * 0.25, 0, -0.3];
      T.eR = -1.2 + Math.sin(t * 5) * 0.2;
      T.head = Math.sin(t * 3) * 0.08;
      break;
    case "hurt":
      T.chest = -0.35;
      T.sL = [0.6, 0, 0.5];
      T.sR = [0.6, 0, -0.5];
      break;
    case "sit":
      T.hL = T.hR = -1.5;
      T.kL = T.kR = 1.5;
      T.hipsY = 0.55;
      T.sL = [-1.0, 0, 0.1];
      T.sR = [-1.0, 0, -0.1];
      T.eL = T.eR = -0.5;
      break;
    case "down":
      T.bodyRx = -Math.PI / 2;
      T.bodyY = 0.18;
      T.sL = [-2.8, 0, 0.4];
      T.sR = [-0.3, 0, -0.6];
      T.hL = 0.2;
      T.kL = 0.4;
      break;
  }
  const k = Math.min(1, dt * 14);
  r.shoulderL.rotation.x = lerp(r.shoulderL.rotation.x, T.sL[0], k);
  r.shoulderL.rotation.z = lerp(r.shoulderL.rotation.z, T.sL[2], k);
  r.shoulderR.rotation.x = lerp(r.shoulderR.rotation.x, T.sR[0], k);
  r.shoulderR.rotation.z = lerp(r.shoulderR.rotation.z, T.sR[2], k);
  r.elbowL.rotation.x = lerp(r.elbowL.rotation.x, T.eL, k);
  r.elbowR.rotation.x = lerp(r.elbowR.rotation.x, T.eR, k);
  r.hipL.rotation.x = lerp(r.hipL.rotation.x, T.hL, k);
  r.hipR.rotation.x = lerp(r.hipR.rotation.x, T.hR, k);
  r.kneeL.rotation.x = lerp(r.kneeL.rotation.x, T.kL, k);
  r.kneeR.rotation.x = lerp(r.kneeR.rotation.x, T.kR, k);
  r.chest.rotation.x = lerp(r.chest.rotation.x, T.chest + breathe, k);
  r.head.rotation.x = lerp(r.head.rotation.x, T.head, k);
  r.hips.position.y = lerp(r.hips.position.y, T.hipsY, k);
  r.body.rotation.x = lerp(r.body.rotation.x, T.bodyRx, Math.min(1, dt * 6));
  r.body.position.y = lerp(r.body.position.y, T.bodyY, Math.min(1, dt * 6));
  r.gun.visible = r.armed && (pose === "shoot" || pose === "run" || pose === "walk" || pose === "idle" || pose === "jump");
  r.flash = Math.max(0, r.flash - dt);
  const on = r.flash > 0;
  for (const m of r.materials) {
    if (!m.wireframe) m.emissive.setHex(on ? 0xffffff : 0x000000);
  }
}
