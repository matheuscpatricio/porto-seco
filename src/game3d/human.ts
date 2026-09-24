import type { Look } from "@/game/characters";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export type Pose3 =
  | "idle"
  | "walk"
  | "run"
  | "jump"
  | "shoot"
  | "type"
  | "cheer"
  | "talk"
  | "hurt"
  | "down"
  | "sit"
  | "ride"
  | "phone"
  | "cower";

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
  materials: THREE.MeshStandardMaterial[];
  flash: number;
  armed: boolean;
};

const lathe = (pts: [number, number][], seg = 18) =>
  new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  );

/** Tapered limb hanging down from y = 0 to y = -len, closed with round caps. */
function limbGeo(r0: number, r1: number, len: number) {
  const pts: [number, number][] = [[0.0001, r0 * 0.9]];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push([Math.sin(a) * r0, Math.cos(a) * r0 * 0.9]);
  }
  pts.push(
    [r0 * 0.98, -len * 0.25],
    [((r0 + r1) / 2) * 1.02, -len * 0.55],
    [r1, -len],
  );
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push([Math.cos(a) * r1, -len - Math.sin(a) * r1 * 0.9]);
  }
  return lathe(pts, 14);
}

const geo = {
  upperArm: limbGeo(0.058, 0.047, 0.27),
  foreArm: limbGeo(0.047, 0.036, 0.25),
  thigh: limbGeo(0.088, 0.062, 0.4),
  shin: limbGeo(0.062, 0.042, 0.4),
  torso: lathe([
    [0.0001, -0.02],
    [0.13, -0.01],
    [0.14, 0.06],
    [0.128, 0.13],
    [0.15, 0.26],
    [0.175, 0.38],
    [0.182, 0.44],
    [0.16, 0.5],
    [0.1, 0.54],
    [0.0001, 0.55],
  ]),
  pelvis: lathe([
    [0.0001, -0.1],
    [0.1, -0.09],
    [0.145, -0.04],
    [0.15, 0.03],
    [0.13, 0.08],
    [0.0001, 0.09],
  ]),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  lowSphere: new THREE.SphereGeometry(1, 10, 8),
  shoe: new THREE.CapsuleGeometry(0.052, 0.15, 6, 12),
  neck: new THREE.CylinderGeometry(0.048, 0.056, 0.12, 14),
  nose: new THREE.ConeGeometry(0.022, 0.05, 10),
  brow: new THREE.CapsuleGeometry(0.008, 0.045, 3, 6),
};

function part(g: THREE.BufferGeometry, m: THREE.Material, cast = true) {
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = cast;
  return mesh;
}

/** Builds a jointed humanoid facing +Z with feet at y = 0 (about 1.75 m tall). */
export function buildHuman(
  look: Look,
  opts: { wire?: string; simple?: boolean } = {},
): Rig {
  const fine = !opts.simple;
  const materials: THREE.MeshStandardMaterial[] = [];
  const mat = (color: string, rough = 0.8, metal = 0) => {
    const m = opts.wire
      ? new THREE.MeshStandardMaterial({
          color: opts.wire,
          emissive: opts.wire,
          emissiveIntensity: 0.8,
          wireframe: true,
        })
      : new THREE.MeshStandardMaterial({
          color,
          roughness: rough,
          metalness: metal,
        });
    materials.push(m);
    return m;
  };
  const skin = mat(look.skin, 0.6);
  const shirt = mat(look.shirt, 0.9);
  const outer = mat(
    look.jacket ?? look.shirt,
    look.extras.includes("jacket") ? 0.55 : 0.9,
  );
  const pants = mat(look.pants, 0.95);
  const shoes = mat(look.shoes, 0.45);
  const hairM = mat(look.hair, 0.7);
  const big = look.build === "big" ? 1.15 : look.build === "slim" ? 0.92 : 1;
  const jacket = look.extras.includes("jacket");
  const mask = look.extras.includes("mask");

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  body.add(hips);

  const pelvis = part(geo.pelvis, pants);
  pelvis.scale.set(1.05 * big, 1, 0.72 * big);
  hips.add(pelvis);
  if (fine) {
    const belt = part(
      new THREE.TorusGeometry(0.14, 0.012, 6, 24),
      mat("#1c1917", 0.5),
      false,
    );
    belt.rotation.x = Math.PI / 2;
    belt.scale.set(1.05 * big, 0.72 * big, 1);
    belt.position.y = 0.07;
    hips.add(belt);
  }

  const chest = new THREE.Group();
  chest.position.y = 0.06;
  hips.add(chest);
  const torso = part(geo.torso, jacket ? outer : shirt);
  torso.scale.set(1.12 * big, 1, 0.68 * big);
  chest.add(torso);
  if (jacket) {
    const front = part(geo.torso, shirt, false);
    front.scale.set(0.42 * big, 0.95, 0.66 * big);
    front.position.z = 0.012;
    chest.add(front);
    const collar = part(
      new THREE.TorusGeometry(0.075, 0.022, 8, 20, Math.PI * 1.3),
      outer,
      false,
    );
    collar.rotation.set(Math.PI / 2 - 0.3, 0, Math.PI * 0.85);
    collar.position.set(0, 0.52, 0.01);
    chest.add(collar);
  }
  if (look.extras.includes("vest")) {
    const vest = part(geo.torso, mat(look.jacket ?? "#0f172a", 0.7));
    vest.scale.set(1.2 * big, 0.62, 0.8 * big);
    vest.position.y = 0.15;
    chest.add(vest);
    const stripe = part(
      new RoundedBoxGeometry(0.2, 0.035, 0.01, 2, 0.005),
      mat("#facc15", 0.4),
      false,
    );
    stripe.position.set(0, 0.4, 0.13 * big);
    chest.add(stripe);
  }
  if (look.extras.includes("tie")) {
    const tie = part(
      new THREE.ConeGeometry(0.03, 0.3, 4),
      mat(look.accent ?? "#b91c1c", 0.5),
      false,
    );
    tie.rotation.x = Math.PI;
    tie.scale.z = 0.25;
    tie.position.set(0, 0.36, 0.125 * big);
    chest.add(tie);
  }

  const neck = part(geo.neck, skin);
  neck.position.y = 0.58;
  chest.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.74;
  chest.add(head);
  const faceM = mask ? mat("#141414", 0.9) : skin;
  const skull = part(geo.sphere, faceM);
  skull.scale.set(0.118, 0.14, 0.13);
  head.add(skull);
  const jaw = part(geo.sphere, faceM);
  jaw.scale.set(0.09, 0.07, 0.095);
  jaw.position.set(0, -0.065, 0.025);
  head.add(jaw);
  const nose = part(geo.nose, faceM, false);
  nose.rotation.x = Math.PI / 2 + 0.3;
  nose.position.set(0, -0.005, 0.135);
  head.add(nose);
  for (const sx of fine ? [-1, 1] : []) {
    const ear = part(geo.lowSphere, faceM, false);
    ear.scale.set(0.015, 0.032, 0.022);
    ear.position.set(sx * 0.117, 0, 0.005);
    head.add(ear);
    const white = part(
      geo.lowSphere,
      mat(mask ? "#e5e5e5" : "#f5f5f4", 0.3),
      false,
    );
    white.scale.set(0.02, 0.013, 0.01);
    white.position.set(sx * 0.045, 0.03, 0.115);
    head.add(white);
    const iris = part(geo.lowSphere, mat("#1c1410", 0.2), false);
    iris.scale.setScalar(0.0075);
    iris.position.set(sx * 0.045, 0.03, 0.124);
    head.add(iris);
    if (!mask) {
      const brow = part(geo.brow, hairM, false);
      brow.rotation.z = Math.PI / 2 + sx * 0.12;
      brow.position.set(sx * 0.046, 0.06, 0.118);
      head.add(brow);
    }
  }
  if (fine) {
    const mouth = part(
      new THREE.CapsuleGeometry(0.006, 0.03, 3, 6),
      mat(mask ? "#262626" : "#7f3b32", 0.6),
      false,
    );
    mouth.rotation.z = Math.PI / 2;
    mouth.position.set(0, -0.06, 0.112);
    head.add(mouth);
  }

  if (!mask) {
    const hs = look.hairStyle;
    const capGeo = (theta: number) =>
      new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, theta);
    if (hs === "short" || hs === "ponytail" || hs === "buzz") {
      const cap = part(capGeo(hs === "buzz" ? 1.15 : 1.5), hairM);
      cap.scale.set(0.126, 0.15, 0.138);
      cap.rotation.x = -0.35;
      cap.position.set(0, 0.012, -0.006);
      head.add(cap);
    }
    if (hs === "ponytail") {
      const tail = part(new THREE.CapsuleGeometry(0.035, 0.14, 6, 10), hairM);
      tail.position.set(0, -0.03, -0.14);
      tail.rotation.x = 0.35;
      head.add(tail);
    }
    if (hs === "slick") {
      const cap = part(capGeo(1.35), hairM);
      cap.scale.set(0.125, 0.15, 0.14);
      cap.rotation.x = -0.55;
      head.add(cap);
    }
    if (hs === "curly") {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const puff = part(geo.lowSphere, hairM);
        puff.scale.setScalar(0.05 + (i % 3) * 0.008);
        const ring = i % 2 ? 0.1 : 0.075;
        puff.position.set(
          Math.cos(a) * ring,
          0.09 + (i % 2) * 0.035,
          Math.sin(a) * ring - 0.02,
        );
        head.add(puff);
      }
    }
    if (look.extras.includes("glasses")) {
      const frame = mat("#1f2937", 0.3, 0.6);
      for (const sx of [-1, 1]) {
        const lens = part(
          new THREE.TorusGeometry(0.026, 0.004, 6, 18),
          frame,
          false,
        );
        lens.position.set(sx * 0.046, 0.03, 0.128);
        head.add(lens);
      }
      const bridge = part(
        new THREE.CylinderGeometry(0.003, 0.003, 0.04, 6),
        frame,
        false,
      );
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, 0.035, 0.13);
      head.add(bridge);
    }
    if (look.extras.includes("mustache")) {
      const m = part(
        new THREE.CapsuleGeometry(0.012, 0.05, 4, 8),
        hairM,
        false,
      );
      m.rotation.z = Math.PI / 2;
      m.position.set(0, -0.038, 0.122);
      head.add(m);
    }
    if (look.extras.includes("beard")) {
      const b = part(geo.sphere, mat("#3f2a1d", 0.9));
      b.scale.set(0.092, 0.06, 0.08);
      b.position.set(0, -0.085, 0.045);
      head.add(b);
    }
  }
  if (look.extras.includes("cap")) {
    const capM = mat(look.accent ?? "#1f2937", 0.8);
    const dome = part(
      new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      capM,
    );
    dome.scale.set(0.13, 0.11, 0.142);
    dome.position.y = 0.03;
    head.add(dome);
    const brim = part(
      new THREE.CylinderGeometry(
        0.1,
        0.1,
        0.012,
        20,
        1,
        false,
        -Math.PI / 2,
        Math.PI,
      ),
      capM,
    );
    brim.scale.set(1, 1, 0.9);
    brim.position.set(0, 0.035, 0.11);
    head.add(brim);
  }

  const makeArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.2 * big, 0.47, 0);
    chest.add(shoulder);
    const delt = part(geo.sphere, outer);
    delt.scale.setScalar(0.068 * big);
    shoulder.add(delt);
    const upper = part(geo.upperArm, outer);
    upper.scale.set(big, 1, big);
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);
    const lower = part(geo.foreArm, jacket ? outer : skin);
    lower.scale.set(big, 1, big);
    elbow.add(lower);
    const hand = new THREE.Group();
    hand.position.y = -0.3;
    elbow.add(hand);
    const palm = part(geo.lowSphere, skin);
    palm.scale.set(0.034, 0.055, 0.022);
    hand.add(palm);
    if (fine) {
      const thumb = part(
        new THREE.CapsuleGeometry(0.01, 0.03, 3, 6),
        skin,
        false,
      );
      thumb.position.set(-side * 0.025, 0.005, 0.015);
      thumb.rotation.z = side * 0.6;
      hand.add(thumb);
    }
    return { shoulder, elbow };
  };
  const L = makeArm(1);
  const R = makeArm(-1);

  const gun = new THREE.Group();
  const metal = mat("#262a30", 0.35, 0.8);
  const slide = part(
    new RoundedBoxGeometry(0.035, 0.045, 0.19, 2, 0.008),
    metal,
  );
  slide.position.z = 0.07;
  gun.add(slide);
  const grip = part(
    new RoundedBoxGeometry(0.032, 0.1, 0.045, 2, 0.008),
    mat("#111111", 0.8),
  );
  grip.position.set(0, -0.05, 0.0);
  grip.rotation.x = 0.25;
  gun.add(grip);
  gun.position.y = -0.33;
  gun.rotation.x = Math.PI / 2;
  gun.visible = false;
  R.elbow.add(gun);

  const makeLeg = (side: number) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.085 * big, -0.02, 0);
    hips.add(hip);
    const thigh = part(geo.thigh, pants);
    thigh.scale.set(big, 1, big);
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    const shin = part(geo.shin, pants);
    shin.scale.set(big, 1, big);
    knee.add(shin);
    const shoe = part(geo.shoe, shoes);
    shoe.rotation.x = Math.PI / 2;
    shoe.scale.set(1.1, 1, 0.75);
    shoe.position.set(0, -0.455, 0.045);
    knee.add(shoe);
    if (fine) {
      const sole = part(
        new THREE.CapsuleGeometry(0.054, 0.15, 4, 10),
        mat("#e7e5e4", 0.9),
        false,
      );
      sole.rotation.x = Math.PI / 2;
      sole.scale.set(1.12, 1, 0.25);
      sole.position.set(0, -0.487, 0.045);
      knee.add(sole);
    }
    return { hip, knee };
  };
  const LL = makeLeg(1);
  const LR = makeLeg(-1);

  if (big > 1) body.scale.setScalar(1.05);

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

type Target = {
  sL: [number, number, number];
  sR: [number, number, number];
  eL: number;
  eR: number;
  hL: number;
  hR: number;
  kL: number;
  kR: number;
  chest: number;
  head: number;
  hipsY: number;
  bodyRx: number;
  bodyY: number;
  twist: number;
  spread: number;
};

/** Poses the rig. `t` is time in seconds; `speed` scales the gait cycle. Rotations use negative X for swinging a limb forward. */
export function animate(r: Rig, pose: Pose3, t: number, dt: number, speed = 1) {
  const c = t * (pose === "run" ? 10.5 : 6.4) * speed;
  const T: Target = {
    sL: [0.05, 0, 0.1],
    sR: [0.05, 0, -0.1],
    eL: -0.18,
    eR: -0.18,
    hL: 0,
    hR: 0,
    kL: 0.04,
    kR: 0.04,
    chest: 0,
    head: 0,
    hipsY: 0.95,
    bodyRx: 0,
    bodyY: 0,
    twist: 0,
    spread: 0,
  };
  const breathe = Math.sin(t * 1.8) * 0.015;
  switch (pose) {
    case "walk":
    case "run": {
      const amp = pose === "run" ? 0.85 : 0.45;
      T.hL = Math.sin(c) * amp;
      T.hR = -Math.sin(c) * amp;
      T.kL = Math.max(0, -Math.cos(c)) * amp * 1.5 + 0.08;
      T.kR = Math.max(0, Math.cos(c)) * amp * 1.5 + 0.08;
      T.sL = [-Math.sin(c) * amp * 0.8, 0, 0.1];
      T.sR = [Math.sin(c) * amp * 0.8, 0, -0.1];
      T.eL = T.eR = pose === "run" ? -1.4 : -0.35;
      T.chest = pose === "run" ? 0.2 : 0.04;
      T.twist = Math.sin(c) * (pose === "run" ? 0.14 : 0.07);
      T.hipsY =
        0.95 - Math.abs(Math.cos(c)) * (pose === "run" ? 0.06 : 0.025) + 0.015;
      break;
    }
    case "jump":
      T.hL = -0.9;
      T.kL = 1.4;
      T.hR = 0.3;
      T.kR = 0.9;
      T.sL = [-2.4, 0, 0.4];
      T.sR = [-2.2, 0, -0.4];
      T.eL = T.eR = -0.4;
      break;
    case "shoot":
      T.sR = [-Math.PI / 2, 0, 0.05];
      T.eR = 0;
      T.sL = [-1.25, 0, -0.5];
      T.eL = -0.55;
      T.chest = 0.04;
      T.twist = -0.15;
      break;
    case "type":
      T.sL = [-0.85, 0, 0.18];
      T.sR = [-0.85, 0, -0.18];
      T.eL = -0.85 + Math.sin(t * 18) * 0.1;
      T.eR = -0.85 + Math.cos(t * 16) * 0.1;
      T.chest = 0.15;
      T.head = 0.18;
      break;
    case "cheer":
      T.sL = [-2.9, 0, 0.3];
      T.sR = [-2.9, 0, -0.3];
      T.eL = T.eR = -0.2;
      T.hipsY = 0.95 + Math.abs(Math.sin(t * 8)) * 0.12;
      T.kL = T.kR = 0.2;
      break;
    case "talk":
      T.sR = [-0.5 + Math.sin(t * 4) * 0.2, 0, -0.3];
      T.eR = -1.2 + Math.sin(t * 5) * 0.2;
      T.sL = [-0.2, 0, 0.15];
      T.eL = -0.3 + Math.sin(t * 3.3) * 0.15;
      T.head = Math.sin(t * 3) * 0.07;
      break;
    case "phone":
      T.sR = [-0.4, 0, -0.9];
      T.eR = -2.4;
      T.head = 0.1;
      break;
    case "cower":
      T.sL = [-2.6, 0, 0.8];
      T.sR = [-2.6, 0, -0.8];
      T.eL = T.eR = -1.8;
      T.hL = T.hR = -1.1;
      T.kL = T.kR = 1.9;
      T.hipsY = 0.5;
      T.chest = 0.5;
      T.head = 0.4;
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
    case "ride":
      T.hipsY = 0.74;
      T.hL = T.hR = -1.45;
      T.kL = T.kR = 1.85;
      T.spread = 0.62;
      T.sL = [-1.25, 0, -0.22];
      T.sR = [-1.25, 0, 0.22];
      T.eL = T.eR = -0.95;
      T.chest = 0.48;
      T.head = -0.28;
      T.bodyRx = 0.12;
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
  r.hipL.rotation.z = lerp(r.hipL.rotation.z, T.spread, k);
  r.hipR.rotation.z = lerp(r.hipR.rotation.z, -T.spread, k);
  r.kneeL.rotation.x = lerp(r.kneeL.rotation.x, T.kL, k);
  r.kneeR.rotation.x = lerp(r.kneeR.rotation.x, T.kR, k);
  r.chest.rotation.x = lerp(r.chest.rotation.x, T.chest + breathe, k);
  r.chest.rotation.y = lerp(r.chest.rotation.y, T.twist, k);
  r.hips.rotation.y = lerp(r.hips.rotation.y, -T.twist * 0.6, k);
  r.head.rotation.x = lerp(r.head.rotation.x, T.head, k);
  r.hips.position.y = lerp(r.hips.position.y, T.hipsY, k);
  r.body.rotation.x = lerp(r.body.rotation.x, T.bodyRx, Math.min(1, dt * 6));
  r.body.position.y = lerp(r.body.position.y, T.bodyY, Math.min(1, dt * 6));
  r.gun.visible =
    r.armed &&
    (pose === "shoot" ||
      pose === "run" ||
      pose === "walk" ||
      pose === "idle" ||
      pose === "jump");
  r.flash = Math.max(0, r.flash - dt);
  const on = r.flash > 0;
  for (const m of r.materials) {
    if (!m.wireframe) m.emissive.setHex(on ? 0xffffff : 0x000000);
  }
}
