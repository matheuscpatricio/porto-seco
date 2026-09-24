import type { Level, Who, World } from "@/content/types";
import { allLevels } from "@/content/worlds";
import { sound } from "@/game/audio";
import { diverseLook, guardLook, people, policeLooks, randomLook, thugLook } from "@/game/characters";
import { Cyber } from "@/game3d/cyber";
import { animate, buildHuman, Pose3, Rig } from "@/game3d/human";
import { buildMission, Mission, scriptFor, Step } from "@/game3d/missions";
import { RIDES, WEAPONS, type RideId, type WeaponId } from "@/lib/progress-rules";
import { BERTHS, canMount, CENTRAL_PHONE, DANI_CHAIR, decayWanted, DECK, doorOpen, ELEVATOR, HIDEOUT, hitWanted, HOME_STUDY, indoors, inSea, JET, knockdownWanted, onPier, PLAYER_MAX_HP, POLICE_RANK, policeRank, policeRankForMission, policeRoster, ROOF, roomExit, SECURITY_HIT, separateCircles, SHOPS, shirtFor, SWIM_HEIGHT, TOWER, waterDepth, type PoliceRank } from "@/game3d/rules";
import { buildCar, buildWorld, Collider, LANE, Layout, SIZE, streetCenter, THEMES, updateScreen } from "@/game3d/world";
import * as THREE from "three";

export type Phase = "brief" | "play" | "dive" | "hack" | "result" | "surface" | "open" | "escape" | "done";
export type HackOutcome = { ok: boolean; locks: boolean[] | null; screen: string | null; broken: boolean };
export type Input3 = { mx: number; mz: number; jump: boolean; shoot: boolean; use: boolean; run: boolean; yaw: number; pitch: number };

export type GameEvents = {
  onPhase: (p: Phase) => void;
  onToast: (text: string, tone?: "info" | "bad" | "good") => void;
  onStudy?: () => void;
  onShop?: (kind: "armas" | "motos") => void;
  onHelp?: () => void;
};

export type Hud = {
  hp: number;
  maxHp: number;
  heat: number;
  near: boolean;
  objective: string;
  distance: number;
  angle: number;
  boss: { name: string; pct: number } | null;
  alarm: boolean;
  script: string;
  step: number;
  steps: number;
  hub: boolean;
  wanted: number;
};

type Enemy = {
  kind: "guard" | "drone" | "boss";
  rig: Rig | null;
  mesh: THREE.Object3D;
  marker: THREE.Mesh;
  pos: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  zone: 1 | 2;
  a: THREE.Vector3;
  b: THREE.Vector3;
  toB: boolean;
  cooldown: number;
  shootT: number;
  dead: number;
  moving: boolean;
  name?: string;
  police?: boolean;
  rank?: PoliceRank;
  detail?: "street" | "chase" | "patrol";
  faction?: "caveira";
  damage: number;
  fireGap: number;
  t: number;
};
type Ped = { rig: Rig; pos: THREE.Vector3; yaw: number; loop: number; wp: number; dir: 1 | -1; speed: number; panic: number; t: number; talkT: number; still: boolean; pitch: number; stepD: number; hp: number; dead: number };
type Traffic = { mesh: THREE.Group; pos: THREE.Vector3; from: [number, number]; to: [number, number]; speed: number; want: number; blockedT: number; honkT: number; ignoreT: number; yaw: number };
type Bullet = { mesh: THREE.Mesh; vel: THREE.Vector3; mine: boolean; life: number; damage: number };
type Particle = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number };

const GRAV = 22;
const R = 0.35;

const bulletGeo = new THREE.CapsuleGeometry(0.035, 0.5, 2, 6).rotateX(Math.PI / 2);
const mineMat = new THREE.MeshBasicMaterial({ color: "#fff2b0", toneMapped: false });
const enemyMat = new THREE.MeshBasicMaterial({ color: "#ff8a65", toneMapped: false });
const policeBulletMat: Record<PoliceRank, THREE.MeshBasicMaterial> = {
  guarda: new THREE.MeshBasicMaterial({ color: "#93c5fd", toneMapped: false }),
  especial: new THREE.MeshBasicMaterial({ color: "#fbbf24", toneMapped: false }),
  federal: new THREE.MeshBasicMaterial({ color: "#fb7185", toneMapped: false }),
};
const partGeo = new THREE.SphereGeometry(0.06, 6, 4);
const markerGeo = new THREE.ConeGeometry(0.26, 0.55, 16).rotateX(Math.PI);
const markerMat = new THREE.MeshBasicMaterial({ color: "#ff1f1f", toneMapped: false, transparent: true, opacity: 0.95 });
const bossMarkerMat = new THREE.MeshBasicMaterial({ color: "#ff0040", toneMapped: false });
const contactMat = new THREE.MeshBasicMaterial({ color: "#facc15", toneMapped: false });

function segBox(a: THREE.Vector3, b: THREE.Vector3, c: Collider) {
  let t0 = 0;
  let t1 = 1;
  const d = [b.x - a.x, b.y - a.y, b.z - a.z];
  const o = [a.x, a.y, a.z];
  const mn = [c.minX, c.bottom ?? 0, c.minZ];
  const mx = [c.maxX, c.top, c.maxZ];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mn[i] || o[i] > mx[i]) return -1;
    } else {
      let ta = (mn[i] - o[i]) / d[i];
      let tb = (mx[i] - o[i]) / d[i];
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      if (t0 > t1) return -1;
    }
  }
  return t0;
}

function buildDrone() {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: "#20252c", roughness: 0.35, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 12), shell);
  body.scale.set(1.2, 0.45, 1.2);
  g.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: "#ff3b3b", toneMapped: false }));
  eye.position.set(0, -0.1, 0.45);
  g.add(eye);
  const armMat = new THREE.MeshStandardMaterial({ color: "#48515c", roughness: 0.5, metalness: 0.5 });
  const rotorMat = new THREE.MeshBasicMaterial({ color: "#cbd5e1", transparent: true, opacity: 0.35 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.7, 4, 8), armMat);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = -a;
    arm.position.set(Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45);
    g.add(arm);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.01, 20), rotorMat);
    rotor.position.set(Math.cos(a) * 0.85, 0.12, Math.sin(a) * 0.85);
    rotor.name = "rotor";
    g.add(rotor);
  }
  g.traverse((o) => (o.castShadow = true));
  return g;
}

function buildShark() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: "#4c5c68", roughness: 0.4, metalness: 0.2 });
  const bellyMat = new THREE.MeshStandardMaterial({ color: "#d7dee4", roughness: 0.55 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 18, 12), bodyMat);
  body.scale.set(0.9, 0.7, 2.7);
  body.castShadow = true;
  g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), bellyMat);
  belly.scale.set(0.7, 0.38, 2.15);
  belly.position.set(0, -0.16, 0.05);
  g.add(belly);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.72, 12), bodyMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.02, 1.4);
  g.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 10), bodyMat);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.08, -1.4);
  g.add(tail);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 8), bodyMat);
  fin.position.set(0, 0.42, -0.15);
  g.add(fin);
  for (const s of [-1, 1]) {
    const pec = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 6), bodyMat);
    pec.rotation.z = s * 1.1;
    pec.position.set(s * 0.28, -0.1, 0.3);
    g.add(pec);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: "#0a0a0a" }));
    eye.position.set(s * 0.2, 0.08, 0.85);
    g.add(eye);
  }
  g.visible = false;
  return g;
}

function rand(seed: number) {
  let s = seed * 97 + 5;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

export class Game3D {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 420);
  cyber: Cyber;
  layout: Layout;
  mission: Mission;
  stepIdx = 0;
  phase: Phase = "brief";
  t = 0;
  player: { rig: Rig; pos: THREE.Vector3; vy: number; yaw: number; grounded: boolean; hp: number; inv: number; shootT: number; cooldown: number; downT: number; cheerT: number; moving: boolean; running: boolean; stepD: number };
  camYaw = Math.PI / 4;
  camPitch = 0.28;
  enemies: Enemy[] = [];
  peds: Ped[] = [];
  traffic: Traffic[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  allies: { who: Who; rig: Rig; pos: THREE.Vector3; path?: THREE.Vector3[]; wp: number; waiting: boolean; yaw: number }[] = [];
  driver: Rig;
  talking: Who | null = null;
  hacked = false;
  alarmT = 0;
  near = false;
  checkpoint: THREE.Vector3;
  private phaseT = 0;
  private queue: { at: number; fn: () => void }[] = [];
  private jumpHeld = false;
  private useHeld = false;
  private sun: THREE.DirectionalLight;
  private lockLights: THREE.Mesh[] = [];
  private carPath: THREE.Vector3[] = [];
  private carSpeed = 0;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private shake = 0;
  private runner: { mesh: THREE.Group; driver: Rig; pos: THREE.Vector3; yaw: number; path: THREE.Vector3[]; speed: number; hits: number; state: "wait" | "flee" | "stopped" } | null = null;
  private contact: { rig: Rig; marker: THREE.Mesh } | null = null;
  private boss: Enemy | null = null;
  private lastShot = -99;
  private warnT = 0;
  private r: () => number;
  private free = false;
  private wanted = 0;
  private heat = 0;
  /** Set when this mission's hack succeeds. Patrol police may shoot after that. */
  private provoked = false;
  private shark = buildShark();
  private sharkT = 0;
  private sharkBite = 0;
  private wadeNote = false;
  private seaMat: THREE.ShaderMaterial | null = null;
  private mounted = false;
  private rideSpeed = 0;
  private weapon: WeaponId = "choque";
  private ride: RideId = "entrega";
  private dani: Rig | null = null;
  private lift: { t: number; up: boolean; start: THREE.Vector3 } | null = null;
  private liftFloor: "ground" | "roof" = "ground";
  private jetting = false;
  private cops: { mesh: THREE.Group; pos: THREE.Vector3; yaw: number; speed: number }[] = [];
  private owned = false;
  private targetDoor: Collider | null = null;

  constructor(
    public level: Level,
    public world: World,
    public index: number,
    private ev: GameEvents,
  ) {
    const bossOrder = allLevels.slice(0, index).filter((l) => l.boss).length;
    const theme = THEMES.w1;
    this.r = rand(11);
    this.layout = buildWorld(this.scene, "w1", 11, level.target);
    const L = this.layout;
    const bossName = level.boss ? people[level.boss].name : null;
    this.mission = buildMission(scriptFor(level, index, bossOrder), level, L, index, bossName);
    const M = this.mission;

    const hemi = new THREE.HemisphereLight(theme.hemi[0], theme.hemi[1], theme.hemi[2]);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(theme.sun, theme.sunIntensity);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -28;
    sc.right = sc.top = 28;
    this.sun.shadow.radius = 1.5;
    sc.near = 1;
    sc.far = 200;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);

    if (M.terminal) this.moveTerminal(M.terminal);
    if (M.pickup) this.moveCar(this.openCurb(M.pickup.pos, M.pickup.yaw), M.pickup.yaw);

    const chapter = Math.max(0, Number(world.id.replace(/\D/g, "")) - 1);
    const rig = buildHuman({ ...people.leo.look, shirt: shirtFor(chapter) });
    this.scene.add(rig.root);
    this.player = { rig, pos: L.spawn.clone(), vy: 0, yaw: Math.PI / 4, grounded: true, hp: PLAYER_MAX_HP, inv: 0, shootT: 0, cooldown: 0, downT: 0, cheerT: 0, moving: false, running: false, stepD: 0 };
    this.checkpoint = L.spawn.clone();

    const allyIds = Array.from(new Set(level.brief.map((l) => l.who).filter((w) => w !== "leo" && w !== "rui" && w !== "dani" && people[w].ally)));
    allyIds.forEach((who, i) => {
      const rr = buildHuman(people[who].look);
      rr.armed = false;
      const pos = L.allySpots[i % L.allySpots.length].clone();
      rr.root.position.copy(pos);
      this.scene.add(rr.root);
      const escort = M.kind === "escolta" && who === "dani";
      this.allies.push({ who, rig: rr, pos, path: escort ? M.steps.find((s): s is Extract<Step, { k: "escort" }> => s.k === "escort")!.path : undefined, wp: 0, waiting: false, yaw: 0 });
    });

    this.driver = buildHuman(people.rui.look, { simple: true });
    this.driver.armed = false;
    this.driver.root.scale.setScalar(0.9);
    this.scene.add(this.driver.root);

    this.dani = buildHuman(people.dani.look);
    this.dani.armed = false;
    this.dani.root.position.set(DANI_CHAIR.x, DECK, DANI_CHAIR.z);
    this.dani.root.rotation.y = 0;
    this.scene.add(this.dani.root);

    const n = level.display.kind === "locks" ? level.display.events.length : 1;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), new THREE.MeshBasicMaterial({ color: "#334155", toneMapped: false }));
      m.position.set(L.terminal.x - 0.05, 2.25, L.terminal.z - ((n - 1) * 0.5) / 2 + i * 0.5);
      this.scene.add(m);
      this.lockLights.push(m);
    }

    const r = this.r;
    const guards1 = Math.min(3 + Math.floor(index / 3), 8);
    for (let i = 0; i < guards1 && i < L.patrols1.length; i++) this.spawn("guard", L.patrols1[i][0], L.patrols1[i][1], 1);
    const drones = Math.min(1 + Math.floor(index / 6), 3);
    for (let i = 0; i < drones; i++) {
      const s = L.droneSpots[i];
      this.spawn("drone", s, s.clone().add(new THREE.Vector3(0, 0, 18)), 1);
    }
    if (M.gate) {
      const guards2 = Math.min(2 + Math.floor(index / 6), 4);
      for (let i = 0; i < guards2; i++) {
        const p = L.patrols2[i % L.patrols2.length];
        this.spawn("guard", p, p.clone().add(new THREE.Vector3(r() * 6 - 3, 0, r() * 6 - 3)), 2);
      }
      if (level.boss) this.spawnBoss(L.patrols2[2], 2);
    }
    for (const p of M.escortWave) this.spawn("guard", p, p.clone().add(new THREE.Vector3(4, 0, 0)), 1);

    if (M.chasePath.length) {
      const mesh = buildCar("#27303b", "van");
      const start = M.chasePath[0].clone().add(new THREE.Vector3(-LANE, 0, 0));
      mesh.position.copy(start);
      this.scene.add(mesh);
      const d = buildHuman(guardLook, { simple: true });
      d.armed = false;
      d.root.scale.setScalar(0.9);
      this.scene.add(d.root);
      this.runner = { mesh, driver: d, pos: start, yaw: 0, path: M.chasePath.slice(1), speed: 0, hits: 0, state: "wait" };
    }
    const contactStep = M.steps.find((s): s is Extract<Step, { k: "contact" }> => s.k === "contact");
    if (contactStep) {
      const cr = buildHuman(randomLook(r));
      cr.armed = false;
      const p = contactStep.to.clone().add(new THREE.Vector3(1.2, 0, 0));
      cr.root.position.copy(p);
      cr.root.rotation.y = -Math.PI / 2;
      this.scene.add(cr.root);
      const mk = new THREE.Mesh(markerGeo, contactMat);
      mk.position.set(p.x, 2.3, p.z);
      this.scene.add(mk);
      this.contact = { rig: cr, marker: mk };
    }

    this.spawnCity(theme.peds, theme.traffic);
    this.spawnRoster();
    this.scene.add(this.shark);
    const sea = this.scene.getObjectByName("sea");
    if (sea && sea instanceof THREE.Mesh && sea.material instanceof THREE.ShaderMaterial) this.seaMat = sea.material;
    this.cyber = new Cyber(level.display.kind === "locks" ? level.display.events.map((e) => e.label) : null, level.target);

    if (M.gate) {
      const g = L.gate;
      this.carPath = [new THREE.Vector3(g.x - 6, 0, g.z), new THREE.Vector3(g.x - 7, 0, g.z - 40), new THREE.Vector3(g.x - 7, 0, g.z - 140)];
    } else {
      const c = L.car;
      const f = new THREE.Vector3(Math.sin(c.rotation.y), 0, Math.cos(c.rotation.y));
      this.carPath = [c.position.clone().addScaledVector(f, 140)];
    }

    this.player.yaw = this.camYaw + Math.PI;
    this.placeTargetDoor();
    this.updateCamera(1, true);
  }

  private placeTargetDoor() {
    const t = this.layout.terminal;
    const door: Collider = { minX: t.x - 2.5, maxX: t.x - 1.7, minZ: t.z - 1.15, maxZ: t.z + 1.15, top: 2.6, door: "target", shut: 2.6 };
    if (this.targetDoor) {
      Object.assign(this.targetDoor, door);
      return;
    }
    this.layout.colliders.push(door);
    this.targetDoor = door;
  }

  private moveTerminal(p: THREE.Vector3) {
    const spot = this.openTerminal(p);
    const L = this.layout;
    L.terminal.copy(spot);
    L.kiosk.position.copy(spot);
    Object.assign(L.kioskCollider, { minX: spot.x - 0.35, maxX: spot.x + 0.35, minZ: spot.z - 0.5, maxZ: spot.z + 0.5 });
    if (this.targetDoor) this.placeTargetDoor();
  }

  /** Puts the kiosk on open sidewalk, screen facing the street, with room to stand in front of it. */
  private openTerminal(want: THREE.Vector3) {
    const own = this.layout.kioskCollider;
    const fits = (q: THREE.Vector3) => {
      if (q.x < 3 || q.z < 3 || q.x > SIZE - 3 || q.z > SIZE - 3) return false;
      const comp = this.layout.compound;
      if (q.x > comp.minX - 1 && q.x < comp.maxX + 1 && q.z > comp.minZ - 1 && q.z < comp.maxZ + 1) return false;
      if (this.solidAt(q.x, q.z, 0.7, own)) return false;
      return !this.solidAt(q.x - 1.5, q.z, 0.45, own);
    };
    if (fits(want)) return want;
    for (const dx of [-1.4, -2.6, -3.8, 1.4]) {
      for (const dz of [0, 2.2, -2.2, 4.4, -4.4]) {
        const q = want.clone().add(new THREE.Vector3(dx, 0, dz));
        if (fits(q)) return q;
      }
    }
    return want;
  }

  /** True when a living guard is close and in front of the escort, not merely somewhere on the street. */
  private guardAhead(a: { pos: THREE.Vector3; path?: THREE.Vector3[]; wp: number }) {
    const goal = a.path?.[Math.min(a.wp, (a.path?.length ?? 1) - 1)];
    const fwd = goal ? goal.clone().sub(a.pos) : new THREE.Vector3(0, 0, 1);
    fwd.y = 0;
    if (fwd.lengthSq() < 0.04) return false;
    fwd.normalize();
    return this.enemies.some((e) => {
      if (e.hp <= 0 || e.kind === "drone") return false;
      const rel = e.pos.clone().sub(a.pos);
      rel.y = 0;
      const dist = rel.length();
      if (dist > 9 || dist < 0.05) return false;
      return rel.normalize().dot(fwd) > 0.25;
    });
  }

  private solidAt(x: number, z: number, pad: number, ignore?: Collider) {
    for (const c of this.layout.colliders) {
      if (c === ignore || c.top < 1 || c.top > 80) continue;
      if (x + pad > c.minX && x - pad < c.maxX && z + pad > c.minZ && z - pad < c.maxZ) return true;
    }
    return false;
  }

  private moveCar(p: THREE.Vector3, yaw: number) {
    const L = this.layout;
    L.car.position.copy(p);
    L.car.rotation.y = yaw;
    const c = L.car.userData.collider as Collider;
    const along = Math.abs(Math.sin(yaw)) > 0.5;
    Object.assign(c, along ? { minX: p.x - 2.2, maxX: p.x + 2.2, minZ: p.z - 1, maxZ: p.z + 1 } : { minX: p.x - 1, maxX: p.x + 1, minZ: p.z - 2.2, maxZ: p.z + 2.2 });
  }

  /** Slides the escape car along the curb until the player can walk up to the driver's door. */
  private openCurb(want: THREE.Vector3, yaw: number) {
    const along = Math.abs(Math.sin(yaw)) > 0.5;
    const axis: "x" | "z" = along ? "x" : "z";
    const candidates = [0];
    for (let d = 4; d <= 48; d += 4) candidates.push(d, -d);
    for (const delta of candidates) {
      const p = want.clone();
      p[axis] += delta;
      if (this.curbFits(p, along)) return p;
    }
    const fallback = new THREE.Vector3(streetCenter(1) + 4.9, 0, streetCenter(1));
    return this.curbFits(fallback, false) ? fallback : want;
  }

  private curbFits(p: THREE.Vector3, along: boolean) {
    if (p.x < 4 || p.z < 4 || p.x > SIZE - 4 || p.z > SIZE - 4) return false;
    const box = along
      ? { minX: p.x - 2.5, maxX: p.x + 2.5, minZ: p.z - 1.3, maxZ: p.z + 1.3 }
      : { minX: p.x - 1.3, maxX: p.x + 1.3, minZ: p.z - 2.5, maxZ: p.z + 2.5 };
    const own = this.layout.car.userData.collider as Collider;
    const comp = this.layout.compound;
    const inside = (x: number, z: number, pad: number) => x > comp.minX - pad && x < comp.maxX + pad && z > comp.minZ - pad && z < comp.maxZ + pad;
    if (inside(p.x, p.z, 1.5)) return false;
    const hits = (x: number, z: number, padX: number, padZ: number) => {
      for (const c of this.layout.colliders) {
        if (c === own || c.top < 1 || c.top > 80) continue;
        if (x + padX > c.minX && x - padX < c.maxX && z + padZ > c.minZ && z - padZ < c.maxZ) return true;
      }
      return false;
    };
    if (hits((box.minX + box.maxX) / 2, (box.minZ + box.maxZ) / 2, (box.maxX - box.minX) / 2, (box.maxZ - box.minZ) / 2)) return false;
    const door = along ? new THREE.Vector3(p.x, 0, p.z + 2.4) : new THREE.Vector3(p.x - 2.4, 0, p.z);
    if (door.x < 1.5 || door.z < 1.5 || door.x > SIZE - 1.5 || door.z > SIZE - 1.5) return false;
    if (inside(door.x, door.z, 0) || hits(door.x, door.z, 0.5, 0.5)) return false;
    return door.distanceTo(p) < 3.2;
  }

  private spawnBoss(p: THREE.Vector3, zone: 1 | 2) {
    const b = this.spawn("boss", p, p.clone().add(new THREE.Vector3(0, 0, 6)), zone);
    b.name = people[this.level.boss!].name;
    this.scene.remove(b.mesh);
    const rigB = buildHuman(people[this.level.boss!].look);
    rigB.root.scale.setScalar(1.18);
    b.rig = rigB;
    b.mesh = rigB.root;
    b.marker.material = bossMarkerMat;
    b.marker.scale.setScalar(1.4);
    this.scene.add(rigB.root);
    this.boss = b;
    return b;
  }

  private spawnCity(nPeds: number, nCars: number) {
    const L = this.layout;
    const r = this.r;
    for (let i = 0; i < nPeds; i++) {
      const loop = Math.floor(r() * L.pedLoops.length);
      const pts = L.pedLoops[loop];
      const wp = Math.floor(r() * 4);
      const a = pts[wp];
      const b = pts[(wp + 1) % 4];
      const pos = a.clone().lerp(b, r());
      pos.y = 0.2;
      const still = r() < 0.2;
      const rig = buildHuman(randomLook(r), { simple: true });
      rig.armed = false;
      this.scene.add(rig.root);
      this.peds.push({ rig, pos, yaw: 0, loop, wp: (wp + 1) % 4, dir: r() < 0.5 ? 1 : -1, speed: 1.1 + r() * 0.6, panic: 0, t: r() * 10, talkT: 2 + r() * 8, still, pitch: 100 + r() * 160, stepD: 0, hp: 5, dead: 0 });
    }
    const colors = ["#2a2f36", "#b8bcc2", "#8e1b1b", "#1f3f8a", "#f1f1ef", "#1d5a45", "#c7a14a", "#5b3a7a"];
    const kinds = ["sedan", "hatch", "sedan", "van", "hatch"] as const;
    for (let i = 0; i < nCars; i++) {
      const alongX = r() < 0.5;
      const line = Math.floor(r() * 4);
      const k = Math.floor(r() * 3);
      const from: [number, number] = alongX ? [k, line] : [line, k];
      const to: [number, number] = alongX ? [k + 1, line] : [line, k + 1];
      const flip = r() < 0.5;
      const f = flip ? to : from;
      const t = flip ? from : to;
      const mesh = buildCar(colors[i % colors.length], kinds[i % kinds.length]);
      const pos = this.lanePoint(f, t, r());
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.traffic.push({ mesh, pos, from: f, to: t, speed: 0, want: 7 + r() * 4, blockedT: 0, honkT: 0, ignoreT: 0, yaw: 0 });
    }
  }

  private node(n: [number, number]) {
    return new THREE.Vector3(streetCenter(n[0]), 0, streetCenter(n[1]));
  }

  private lanePoint(from: [number, number], to: [number, number], s: number) {
    const a = this.node(from);
    const b = this.node(to);
    const d = b.clone().sub(a).normalize();
    const off = new THREE.Vector3(-d.z, 0, d.x).multiplyScalar(LANE);
    return a.lerp(b, s).add(off);
  }

  private spawn(kind: Enemy["kind"], a: THREE.Vector3, b: THREE.Vector3, zone: 1 | 2, opts?: { look?: (typeof guardLook); rank?: PoliceRank; detail?: "street" | "chase" | "patrol"; hp?: number; damage?: number; faction?: "caveira" }) {
    const hp = opts?.hp ?? (kind === "boss" ? 14 + Math.floor(this.index / 2) : kind === "drone" ? 2 : 3);
    const rank = opts?.rank;
    const stats = rank ? POLICE_RANK[rank] : null;
    let rig: Rig | null = null;
    let mesh: THREE.Object3D;
    if (kind === "drone") mesh = buildDrone();
    else {
      const authored = opts?.look ?? guardLook;
      const look = authored.extras.includes("vest") ? diverseLook(authored, Math.random) : authored;
      rig = buildHuman(look, { simple: true });
      mesh = rig.root;
    }
    const pos = a.clone();
    if (kind === "drone") pos.y = 7;
    mesh.position.copy(pos);
    this.scene.add(mesh);
    const marker = new THREE.Mesh(markerGeo, rank ? new THREE.MeshBasicMaterial({ color: stats!.color, toneMapped: false }) : kind === "boss" ? bossMarkerMat : markerMat);
    this.scene.add(marker);
    const fireGap = stats?.gap ?? (kind === "boss" ? 1.8 : kind === "drone" ? 2.6 : 2);
    const e: Enemy = {
      kind,
      rig,
      mesh,
      marker,
      pos,
      yaw: 0,
      hp,
      maxHp: hp,
      zone,
      a: a.clone(),
      b: b.clone(),
      toB: true,
      cooldown: 1 + Math.random() * 1.5,
      shootT: 0,
      dead: 0,
      moving: false,
      damage: opts?.damage ?? stats?.damage ?? SECURITY_HIT,
      fireGap,
      rank,
      detail: opts?.detail,
      faction: opts?.faction,
      police: !!rank,
      name: stats?.name,
      t: Math.random() * 10,
    };
    this.enemies.push(e);
    return e;
  }

  private spawnPolice(rank: PoliceRank, at: THREE.Vector3, detail: "street" | "chase" | "patrol", goal?: THREE.Vector3) {
    const b = goal ?? this.player.pos.clone();
    const stats = POLICE_RANK[rank];
    const e = this.spawn("guard", at, b, 1, { look: policeLooks[rank], rank, detail, hp: stats.hp, damage: stats.damage });
    e.cooldown = 0.6;
    return e;
  }

  private sidewalkSpot() {
    const loops = this.layout.pedLoops;
    const pts = loops[Math.floor(this.r() * loops.length)];
    const p = pts[Math.floor(this.r() * pts.length)].clone();
    p.y = 0.2;
    return p;
  }

  /** Special and federal officers patrol. Caveira's men hunt Léo on sight. */
  private spawnRoster() {
    const roster = policeRoster(this.index);
    const wave = (rank: PoliceRank, n: number) => {
      for (let i = 0; i < n; i++) {
        const a = this.sidewalkSpot();
        this.spawnPolice(rank, a, "patrol", this.sidewalkSpot());
      }
    };
    wave("especial", roster.especial);
    wave("federal", roster.federal);
    for (let i = 0; i < 8; i++) {
      const a = this.sidewalkSpot();
      const e = this.spawn("guard", a, this.sidewalkSpot(), 1, { look: thugLook, hp: 8, damage: 26, faction: "caveira" });
      e.name = "Capanga";
      e.fireGap = 1.45;
      e.cooldown = 0.45;
      e.marker.material = new THREE.MeshBasicMaterial({ color: "#eab308", toneMapped: false });
    }
  }

  private respawnPed(p: Ped) {
    const loops = this.layout.pedLoops;
    let best = p.pos.clone();
    let bestD = 0;
    for (let n = 0; n < 14; n++) {
      const loop = Math.floor(this.r() * loops.length);
      const pts = loops[loop];
      const wp = Math.floor(this.r() * pts.length);
      const q = pts[wp].clone();
      const d = q.distanceTo(this.player.pos);
      if (d > bestD) {
        best = q;
        bestD = d;
        p.loop = loop;
        p.wp = (wp + 1) % pts.length;
      }
      if (d > 28) break;
    }
    best.y = 0.2;
    p.pos.copy(best);
    p.hp = 5;
    p.dead = 0;
    p.panic = 0;
    p.still = this.r() < 0.2;
    p.rig.root.position.copy(p.pos);
  }

  private updateShark(dt: number) {
    const P = this.player;
    const depth = waterDepth(P.pos.x, P.pos.z);
    const hunt = !this.jetting && !this.lift && P.downT <= 0 && depth >= 1.05 && (this.phase === "play" || this.phase === "open");
    this.shark.visible = hunt;
    if (!hunt) return;
    this.sharkT += dt;
    const bite = depth >= SWIM_HEIGHT;
    const orbit = bite ? 1.35 : 4.4;
    const ang = this.sharkT * (bite ? 2.6 : 0.85);
    const y = Math.min(-0.45, P.pos.y + 0.7);
    this.shark.position.set(P.pos.x + Math.cos(ang) * orbit, y, P.pos.z + Math.sin(ang) * orbit);
    const dx = P.pos.x - this.shark.position.x;
    const dz = P.pos.z - this.shark.position.z;
    this.shark.rotation.set(0, Math.atan2(dx, dz), Math.sin(this.sharkT * 7) * 0.12);
    if (!bite) return;
    this.sharkBite -= dt;
    if (this.sharkBite > 0) return;
    this.sharkBite = 1.35;
    P.hp -= 62;
    P.inv = 0.45;
    this.shake = 0.5;
    sound.sfx("hurt");
    this.ev.onToast("O tubarão mordeu você.", "bad");
    if (P.hp <= 0) P.downT = 1.6;
  }

  get step(): Step | undefined {
    return this.mission.steps[this.stepIdx];
  }

  private stepText(s = this.step): string {
    if (!s) return "";
    if (s.k === "hack") return `Hackeie: ${this.level.target}`;
    return s.text;
  }

  private nextStep() {
    this.stepIdx++;
    const s = this.step;
    if (!s) {
      this.setPhase("done");
      return;
    }
    this.ev.onToast(`Próximo objetivo: ${this.stepText(s)}`, "info");
    this.updateAmbience();
  }

  setPhase(p: Phase) {
    if (p === this.phase) return;
    if (p === "dive") sound.sfx("terminal");
    this.phase = p;
    this.phaseT = 0;
    this.ev.onPhase(p);
    this.updateAmbience();
  }

  updateAmbience() {
    const p = this.phase;
    sound.setAmbience(p === "dive" || p === "hack" || p === "result" ? "cyber" : this.layout.night ? "night" : "day");
  }

  private leaveRooms() {
    const out = roomExit(this.player.pos.x, this.player.pos.z);
    if (!out) return;
    this.player.pos.x = out.x;
    this.player.pos.z = out.z;
    if (this.player.pos.y > 5) this.player.pos.y = 0.2;
  }

  startPlay() {
    this.talking = null;
    this.lift = null;
    this.free = false;
    this.leaveRooms();
    this.setPhase("play");
    this.ev.onToast(`${this.mission.title}: ${this.stepText()}`, "info");
  }

  enterHub() {
    this.free = true;
    this.mounted = false;
    this.jetting = false;
    for (const c of this.cops) this.scene.remove(c.mesh);
    this.cops = [];
    this.wanted = knockdownWanted();
    this.provoked = false;
    this.clearPolice(true);
    this.player.pos.copy(this.layout.spawn);
    this.checkpoint = this.layout.spawn.clone();
    this.player.hp = PLAYER_MAX_HP;
    this.player.downT = 0;
    this.stepIdx = this.mission.steps.length;
    if (this.phase === "play") this.ev.onPhase("play");
    else this.setPhase("play");
    this.lift = null;
    this.ev.onToast("Você está na ilha. O arranha-céu do centro, o ponto azul, é o esconderijo da Dani. E no elevador sobe.", "info");
  }

  beginMission() {
    this.free = false;
    this.jetting = false;
    for (const c of this.cops) this.scene.remove(c.mesh);
    this.cops = [];
    this.provoked = false;
    this.clearPolice(true);
    this.leaveRooms();
    this.stepIdx = 0;
    this.setPhase("brief");
  }

  setOwned(owned: boolean) {
    this.owned = owned;
  }

  setLoadout(weapon: WeaponId, ride: RideId) {
    this.weapon = weapon;
    this.ride = ride;
  }

  private clearPolice(all = false) {
    for (const e of this.enemies) {
      if (!e.rank || e.detail === "patrol") continue;
      if (!all && e.detail === "chase") continue;
      e.hp = 0;
    }
    this.heat = 0;
  }

  private syncDoors() {
    const step = this.free || !this.step ? "none" : this.step.k === "hack" ? "hack" : "other";
    for (const c of this.layout.colliders) {
      if (!c.door) continue;
      c.top = doorOpen(c.door, step) ? -1 : (c.shut ?? 2.6);
    }
  }

  private callPolice(at: THREE.Vector3) {
    this.wanted = hitWanted("ped", this.wanted);
    this.heat = Math.min(3, this.heat + 1);
    const rank = policeRank(this.heat);
    const alive = this.enemies.some((e) => e.rank === rank && e.detail === "street" && e.hp > 0);
    if (alive) {
      this.ev.onToast(`${POLICE_RANK[rank].name} ainda está atrás de você.`, "bad");
      return;
    }
    sound.sfx("siren");
    const spots = [new THREE.Vector3(at.x + 14, 0, at.z + 6), new THREE.Vector3(at.x - 12, 0, at.z - 8)];
    for (const spot of spots) this.spawnPolice(rank, spot, "street");
    this.ev.onToast(POLICE_RANK[rank].call, "bad");
  }

  beginHack() {
    if (this.phase === "play" && this.near) this.setPhase("dive");
  }

  closeHack() {
    if (this.phase === "hack") this.setPhase("surface");
  }

  private at(delay: number, fn: () => void) {
    this.queue.push({ at: this.t + delay, fn });
  }

  applyHack(o: HackOutcome) {
    this.setPhase("result");
    this.cyber.reset();
    let d = 0.4;
    if (o.broken) {
      this.at(d, () => {
        this.cyber.setScreen(["ERRO NO CÓDIGO"], "#f87171");
        this.cyber.alarm = 1.2;
        sound.sfx("lockBad");
      });
      d += 1.2;
    } else if (!o.locks) {
      this.at(d, () => {
        this.cyber.setScreen((o.screen ?? "(nada impresso)").split("\n"), o.ok ? "#4ade80" : "#fde047");
        sound.sfx("terminal");
      });
      d += 1.4;
    } else {
      o.locks.forEach((ok, i) => {
        this.at(d, () => {
          this.cyber.setLock(i, ok);
          const light = this.lockLights[i];
          if (light) (light.material as THREE.MeshBasicMaterial).color.set(ok ? "#22c55e" : "#ef4444");
          sound.sfx(ok ? "lockOk" : "lockBad");
        });
        d += 0.6;
      });
      d += 0.3;
    }
    this.at(d, () => {
      if (o.ok) {
        this.cyber.success = 1.2;
        sound.sfx("success");
      } else {
        this.cyber.alarm = 1.2;
        sound.sfx("alarm");
      }
    });
    this.at(d + 1.3, () => {
      this.setPhase("surface");
      this.at(1.1, () => (o.ok ? this.succeed(o) : this.fail()));
    });
  }

  private succeed(o: HackOutcome) {
    this.hacked = true;
    this.provoked = true;
    this.player.cheerT = 1.6;
    for (const l of this.lockLights) (l.material as THREE.MeshBasicMaterial).color.set("#22c55e");
    updateScreen(this.layout, this.level.target.toUpperCase(), o.screen ? o.screen.split("\n").slice(-2) : ["ACESSO", "LIBERADO"], "#4ade80");
    this.ev.onToast(`${this.level.target}: acesso liberado!`, "good");
    const s = this.level.success;
    const after = () => {
      this.ev.onToast(`${people[s.who].name}: "${s.text}"`, "info");
      this.nextStep();
    };
    if (this.mission.gate) {
      this.setPhase("open");
      sound.sfx("gate", this.at3(new THREE.Vector3(this.layout.gate.x, 0, this.layout.gate.z)));
      this.at(1.8, () => {
        this.layout.gate.collider.top = -1;
        this.checkpoint = new THREE.Vector3(this.layout.gate.x + 3, 0, this.layout.gate.z);
        this.setPhase("play");
        after();
      });
      return;
    }
    this.setPhase("play");
    this.checkpoint = this.player.pos.clone();
    if (this.mission.alarmAfterHack) {
      this.alarmT = 5;
      this.shake = 0.4;
      sound.sfx("alarm");
      sound.sfx("siren", { pan: 0.5, vol: 0.8 });
      const p = this.player.pos;
      for (const [dx, dz] of [
        [-14, 8],
        [12, -10],
        [-10, -14],
        [16, 12],
      ]) {
        const at = new THREE.Vector3(p.x + dx, 0, p.z + dz);
        this.spawn("guard", at, at.clone().add(new THREE.Vector3(3, 0, 0)), 1).cooldown = 2;
      }
      this.spawn("drone", new THREE.Vector3(p.x, 7, p.z - 12), new THREE.Vector3(p.x, 7, p.z), 1);
      this.panicAll(p);
      this.ev.onToast("A Vértice detectou a invasão! Saia daí!", "bad");
    }
    after();
  }

  private fail() {
    this.alarmT = 4;
    this.shake = 0.5;
    for (const l of this.lockLights) (l.material as THREE.MeshBasicMaterial).color.set("#334155");
    updateScreen(this.layout, this.level.target.toUpperCase(), ["ACESSO NEGADO", "ALARME!"], "#f87171");
    const p = this.player.pos;
    for (const off of [-12, 12]) {
      const s = new THREE.Vector3(p.x - 10, 0, p.z + off);
      const e = this.spawn("guard", s, s.clone().add(new THREE.Vector3(4, 0, 0)), 1);
      e.cooldown = 1.5;
    }
    this.setPhase("play");
    sound.sfx("alarm");
    this.panicAll(p);
    this.ev.onToast("ALARME! Chegaram reforços. Derrube os seguranças e tente o terminal de novo.", "bad");
  }

  private burst(p: THREE.Vector3, color: string, n: number) {
    const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(partGeo, m);
      mesh.position.copy(p);
      this.scene.add(mesh);
      this.particles.push({ mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 7, Math.random() * 5, (Math.random() - 0.5) * 7), life: 0.3 + Math.random() * 0.4 });
    }
  }

  /** Pan and distance volume for a world-space sound. */
  private at3(p: THREE.Vector3, range = 60) {
    const cam = this.camera.position;
    const to = p.clone().sub(cam);
    const d = to.length();
    const right = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw)).multiplyScalar(-1);
    const pan = d > 0.01 ? to.normalize().dot(right) : 0;
    return { pan: pan * 0.9, vol: Math.max(0, 1 - d / range) ** 1.4 };
  }

  private collide(pos: THREE.Vector3, radius: number, feet: number) {
    for (const c of this.layout.colliders) {
      if (c.above != null && feet < c.above) continue;
      if (c.bottom != null && feet < c.bottom) continue;
      if (c.top <= feet + 0.35) continue;
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          pos.x += (dx / d) * (radius - d);
          pos.z += (dz / d) * (radius - d);
        } else {
          const push = [pos.x - c.minX, c.maxX - pos.x, pos.z - c.minZ, c.maxZ - pos.z];
          const k = push.indexOf(Math.min(...push));
          if (k === 0) pos.x = c.minX - radius;
          else if (k === 1) pos.x = c.maxX + radius;
          else if (k === 2) pos.z = c.minZ - radius;
          else pos.z = c.maxZ + radius;
        }
      }
    }
  }

  /** Pushes `pos` out of a moving car's footprint. Returns true on contact. */
  private pushFromCar(pos: THREE.Vector3, car: THREE.Vector3, yaw: number, len: number, radius: number) {
    const f = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const rt = new THREE.Vector3(f.z, 0, -f.x);
    const rel = pos.clone().sub(car);
    rel.y = 0;
    const a = rel.dot(f);
    const b = rel.dot(rt);
    const ha = len / 2 + radius;
    const hb = 0.95 + radius;
    if (Math.abs(a) >= ha || Math.abs(b) >= hb) return false;
    const pa = ha - Math.abs(a);
    const pb = hb - Math.abs(b);
    if (pb < pa) pos.addScaledVector(rt, Math.sign(b || 1) * pb);
    else pos.addScaledVector(f, Math.sign(a || 1) * pa);
    return true;
  }

  private groundAt(pos: THREE.Vector3, feet: number) {
    let g = 0;
    for (const c of this.layout.colliders) {
      if (c.above != null && feet < c.above) continue;
      if (c.top > feet + 0.4 || c.top > 200) continue;
      if (pos.x + R > c.minX && pos.x - R < c.maxX && pos.z + R > c.minZ && pos.z - R < c.maxZ) g = Math.max(g, c.top);
    }
    return g;
  }

  private blocked(a: THREE.Vector3, b: THREE.Vector3) {
    for (const c of this.layout.colliders) {
      if (c.top < 0 || c.top > 900) continue;
      const t = segBox(a, b, c);
      if (t >= 0 && t < 1) return true;
    }
    return false;
  }

  private targetPos(): THREE.Vector3 {
    if (this.free || !this.step) return new THREE.Vector3(HOME_STUDY.x, 0, HOME_STUDY.z);
    const s = this.step;
    const L = this.layout;
    if (!s) return L.car.position;
    switch (s.k) {
      case "hack":
        return L.terminal;
      case "go":
      case "contact":
        return s.to;
      case "chase":
        return this.runner?.pos ?? L.car.position;
      case "escort": {
        const a = this.allies.find((x) => x.path);
        if (!a) return L.terminal;
        return a.pos.distanceTo(L.terminal) < 7 ? L.terminal : a.pos;
      }
      case "boss":
        return this.boss?.pos ?? L.car.position;
      case "car":
        return L.car.position;
      case "cops":
        return s.to;
      case "jet":
        return this.jetting ? s.to : new THREE.Vector3(JET.x, 0, JET.z);
    }
  }

  hud(): Hud {
    const p = this.player.pos;
    const target = this.targetPos();
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const bearing = Math.atan2(dx, dz);
    let angle = bearing - this.camYaw;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    const b = this.boss;
    const bossShown = b && b.hp > 0 && (this.step?.k === "boss" || (b.zone === 1 && b.pos.distanceTo(p) < 30));
    return {
      hp: this.player.hp,
      maxHp: PLAYER_MAX_HP,
      heat: this.heat,
      near: this.near && this.phase === "play",
      objective: this.free ? "Casa" : this.stepText(),
      distance: Math.round(Math.hypot(dx, dz)),
      angle,
      boss: bossShown ? { name: b.name ?? "Chefe", pct: b.hp / b.maxHp } : null,
      alarm: this.alarmT > 0,
      script: this.free ? "Na ilha" : this.mission.title,
      step: this.free ? 0 : Math.min(this.stepIdx + 1, this.mission.steps.length),
      steps: this.free ? 0 : this.mission.steps.length,
      hub: this.free,
      wanted: this.wanted,
    };
  }

  minimap() {
    const alive = (e: Enemy) => e.hp > 0;
    return {
      player: { x: this.player.pos.x, z: this.player.pos.z, yaw: this.player.yaw, cam: this.camYaw },
      target: this.targetPos(),
      enemies: this.enemies.filter(alive).map((e) => ({ x: e.pos.x, z: e.pos.z, boss: e.kind === "boss", police: !!e.rank, rank: e.rank ?? null, faction: e.faction ?? null })),
      allies: this.allies.map((a) => ({ x: a.pos.x, z: a.pos.z })),
      cars: this.traffic.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      cops: this.cops.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      escape: { x: this.layout.car.position.x, z: this.layout.car.position.z },
      runner: this.runner ? { x: this.runner.pos.x, z: this.runner.pos.z } : null,
      compound: this.layout.compound,
      hideout: HIDEOUT,
    };
  }

  update(dt: number, input: Input3) {
    dt = Math.max(0, Math.min(dt, 1 / 25));
    this.t += dt;
    this.phaseT += dt;
    const due = this.queue.filter((q) => this.t >= q.at);
    this.queue = this.queue.filter((q) => this.t < q.at);
    due.forEach((q) => q.fn());
    this.alarmT = Math.max(0, this.alarmT - dt);
    this.shake = Math.max(0, this.shake - dt);
    this.warnT = Math.max(0, this.warnT - dt);

    const P = this.player;
    const L = this.layout;
    const control = this.phase === "play" && P.downT <= 0 && !this.lift;
    P.inv = Math.max(0, P.inv - dt);
    P.shootT = Math.max(0, P.shootT - dt);
    P.cooldown = Math.max(0, P.cooldown - dt);
    P.cheerT = Math.max(0, P.cheerT - dt);

    if (this.phase === "play" || this.phase === "open") {
      this.camYaw -= input.yaw;
      this.camPitch = Math.max(-0.15, Math.min(1.0, this.camPitch + input.pitch));
    }

    this.syncDoors();
    const seen = this.enemies.some((e) => e.police && e.hp > 0 && e.pos.distanceTo(P.pos) < 18);
    const street = this.phase === "play" || this.phase === "open" ? "free" : "busy";
    this.wanted = decayWanted(this.wanted, dt, street, seen);
    if (this.wanted <= 0) this.clearPolice();

    if (P.downT > 0) {
      P.downT -= dt;
      if (P.downT <= 0) {
        this.wanted = knockdownWanted();
        this.clearPolice();
        if (this.free) this.checkpoint = this.layout.spawn.clone();
        P.pos.copy(this.checkpoint);
        P.vy = 0;
        P.hp = PLAYER_MAX_HP;
        P.inv = 2;
        this.ev.onToast("Você foi derrubado e voltou para o último ponto seguro.", "info");
      }
    }

    P.moving = false;
    this.rideSpeed = 0;
    if (this.lift) this.updateLift(dt);
    if (control) {
      const fx = Math.sin(this.camYaw);
      const fz = Math.cos(this.camYaw);
      let vx = fx * input.mz - fz * input.mx;
      let vz = fz * input.mz + fx * input.mx;
      const len = Math.hypot(vx, vz);
      if (len > 0.05) {
        vx /= Math.max(1, len);
        vz /= Math.max(1, len);
        P.running = input.run || len > 0.95;
        const depthNow = waterDepth(P.pos.x, P.pos.z);
        const drag = !this.jetting && depthNow > 0.25 ? (depthNow >= SWIM_HEIGHT ? 0.28 : 0.48) : 1;
        const speed = (P.running ? 7.5 : 4.2) * (this.jetting ? 2.15 : this.mounted ? RIDES[this.ride].speed : 1) * drag;
        this.rideSpeed = speed;
        P.pos.x += vx * speed * dt;
        P.pos.z += vz * speed * dt;
        P.moving = true;
        const target = Math.atan2(vx, vz);
        let d = target - P.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        P.yaw += d * Math.min(1, dt * 12);
        if (P.grounded) {
          P.stepD += speed * dt;
          if (P.stepD > (P.running ? 1.05 : 0.72)) {
            P.stepD = 0;
            sound.step((Math.random() - 0.5) * 0.2, P.running ? 0.16 : 0.1, P.running);
          }
        }
      }
      const depth = waterDepth(P.pos.x, P.pos.z);
      if (!this.jetting && depth > 0.45 && !this.wadeNote) {
        this.wadeNote = true;
        this.ev.onToast("Você entrou no mar. Se a água cobrir você, o tubarão ataca.", "info");
      }
      if (depth < 0.1) this.wadeNote = false;
      const ridePlace = indoors(P.pos.x, P.pos.z) ? "indoor" : inSea(P.pos.x, P.pos.z) && !this.jetting ? "sea" : "street";
      if (this.mounted && !canMount(ridePlace, true)) {
        this.mounted = false;
        this.ev.onToast("Você desceu da moto.", "info");
      }
      if (this.jetting && indoors(P.pos.x, P.pos.z)) this.jetting = false;
      if (input.jump && !this.jumpHeld && P.grounded) {
        P.vy = 8.2;
        P.grounded = false;
        sound.sfx("jump");
      }
      if (input.shoot && P.cooldown <= 0) this.playerShoot();
    }
    this.jumpHeld = input.jump;

    if (!this.lift && this.phase !== "escape" && this.phase !== "done") {
      this.collide(P.pos, R, P.pos.y);
      const wasAir = !P.grounded;
      P.vy -= GRAV * dt;
      P.pos.y += P.vy * dt;
      let g = this.groundAt(P.pos, P.pos.y - P.vy * dt);
      const depth = waterDepth(P.pos.x, P.pos.z);
      if (!this.jetting && depth > 0.05) g = Math.min(g, -Math.min(depth, 2.05));
      if (P.pos.y <= g) {
        if (wasAir && P.vy < -6) sound.sfx("land");
        P.pos.y = g;
        P.vy = 0;
        P.grounded = true;
      } else if (P.pos.y > g + 0.05) P.grounded = false;
    }

    const rode = this.tryRide(control, input);
    this.updateStep(dt, control, rode ? { ...input, use: false } : input);
    if (rode) this.useHeld = true;

    if (this.phase === "open") {
      const gm = L.gate.mesh;
      gm.position.z = Math.min(L.gate.z + L.gate.width, gm.position.z + dt * 3.6);
    }

    if (this.phase === "escape") {
      this.carSpeed = Math.min(18, this.carSpeed + dt * 9);
      const car = L.car;
      const next = this.carPath[0];
      if (next) {
        const to = next.clone().sub(car.position);
        to.y = 0;
        const dist = to.length();
        if (dist < 1.5) this.carPath.shift();
        else {
          to.normalize();
          car.position.addScaledVector(to, this.carSpeed * dt);
          car.rotation.y = Math.atan2(to.x, to.z);
        }
      }
      for (const w of car.userData.wheels as THREE.Group[]) w.rotation.x += this.carSpeed * dt * 2.5;
      if (this.phaseT > 4) this.setPhase("done");
    }

    const active = this.phase === "play" || this.phase === "open";
    for (const e of this.enemies) this.updateEnemy(e, dt, active);
    this.updatePeds(dt);
    this.updateTraffic(dt);
    this.updateCops(dt);
    this.updateShips();
    this.updateShark(dt);
    if (this.seaMat) this.seaMat.uniforms.uTime.value = this.t;
    this.resolveVehicles();
    this.updateRunner(dt);
    this.updateBullets(dt);
    for (const q of this.particles) {
      q.mesh.position.addScaledVector(q.vel, dt);
      q.vel.y -= 14 * dt;
      q.life -= dt;
      if (q.life <= 0) this.scene.remove(q.mesh);
    }
    this.particles = this.particles.filter((q) => q.life > 0);

    let pose: Pose3 = "idle";
    if (P.downT > 0) pose = "down";
    else if (this.phase === "brief") pose = this.talking === "leo" ? "talk" : "idle";
    else if (this.phase === "dive" || this.phase === "hack" || this.phase === "result" || (this.phase === "surface" && this.phaseT < 0.6)) pose = "type";
    else if (P.cheerT > 0) pose = "cheer";
    else if (!P.grounded) pose = "jump";
    else if (P.shootT > 0) pose = "shoot";
    else if (P.moving) pose = P.running ? "run" : "walk";
    const typing = this.phase === "dive" || this.phase === "hack" || this.phase === "result" || this.phase === "brief";
    if (this.mounted && !typing && pose !== "down") pose = P.shootT > 0 ? "shoot" : "ride";
    if (this.phase === "dive" || this.phase === "hack" || this.phase === "result") {
      P.pos.x += (L.terminal.x - 1.05 - P.pos.x) * Math.min(1, dt * 6);
      P.pos.z += (L.terminal.z - P.pos.z) * Math.min(1, dt * 6);
      P.yaw += (Math.PI / 2 - P.yaw) * Math.min(1, dt * 8);
    }
    const rig = P.rig;
    rig.root.visible = this.phase !== "escape" && this.phase !== "done" && !(P.inv > 0 && P.downT <= 0 && Math.floor(this.t * 16) % 2 === 0);
    const bike = L.bikes[this.ride];
    const jet = L.jet;
    for (const id of ["entrega", "esportiva", "noturna"] as const) L.bikes[id].visible = id === this.ride;
    if (this.jetting) {
      jet.position.set(P.pos.x, 0.05, P.pos.z);
      jet.rotation.y = P.yaw;
    } else {
      jet.position.set(JET.x, 0.05, JET.z);
      jet.rotation.y = 0;
    }
    if (!this.lift) this.layout.elevator.position.set(ELEVATOR.x, this.liftFloor === "roof" ? ROOF + 1.5 : 1.7, 66.6);
    if (this.mounted) {
      bike.position.set(P.pos.x, P.pos.y, P.pos.z);
      bike.rotation.y = P.yaw;
      const spin = (this.rideSpeed * dt) / 0.33;
      for (const w of bike.userData.wheels as THREE.Group[]) w.rotation.x += spin;
    }
    rig.root.position.copy(P.pos);
    if (this.mounted) {
      rig.root.position.x -= Math.sin(P.yaw) * 0.2;
      rig.root.position.z -= Math.cos(P.yaw) * 0.2;
    } else if (this.jetting) rig.root.position.y += 0.42;
    rig.root.rotation.y = P.yaw;
    animate(rig, pose, this.t, dt);

    if (this.dani) animate(this.dani, "desk", this.t, dt);
    this.updateAllies(dt);
    const car = L.car;
    this.driver.root.position.set(car.position.x, car.position.y + 0.25, car.position.z);
    this.driver.root.position.add(new THREE.Vector3(Math.cos(car.rotation.y) * 0.4, 0, -Math.sin(car.rotation.y) * 0.4));
    this.driver.root.rotation.y = car.rotation.y;
    animate(this.driver, "sit", this.t, dt);

    if (this.contact) {
      const c = this.contact;
      animate(c.rig, this.step?.k === "contact" ? "phone" : "idle", this.t, dt);
      c.marker.visible = this.step?.k === "contact";
      c.marker.position.y = 2.3 + Math.sin(this.t * 3) * 0.1;
      c.marker.rotation.y += dt * 2;
    }

    const beacon = L.beacon;
    const bt = this.targetPos();
    beacon.position.set(bt.x, 30, bt.z);
    (beacon.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.sin(this.t * 3) * 0.05;

    if (this.phase === "hack" || this.phase === "result") this.cyber.update(dt, this.phase === "hack");
    this.updateCamera(dt);
    this.updateEngines();

    const fog = this.scene.fog as THREE.Fog;
    if (fog) fog.far = P.pos.y > 30 ? 520 : L.night ? 150 : 200;
    this.sun.position.set(P.pos.x + 30, 60, P.pos.z + 20);
    this.sun.target.position.copy(P.pos);
  }

  private updateStep(dt: number, control: boolean, input: Input3) {
    const P = this.player;
    const L = this.layout;
    const s = this.step;
    this.near = false;
    if (this.free && this.phase === "play") {
      if (control && input.use && !this.useHeld) {
        const study = new THREE.Vector3(HOME_STUDY.x, P.pos.y, HOME_STUDY.z);
        const shop = SHOPS.find((p) => P.pos.distanceTo(new THREE.Vector3(p.x, P.pos.y, p.z)) < 2.4);
        if (P.pos.distanceTo(study) < 2.3) this.ev.onStudy?.();
        else if (shop) this.ev.onShop?.(shop.kind);
      }
      this.useHeld = input.use;
      return;
    }
    if (!s || this.phase !== "play") {
      this.useHeld = input.use;
      return;
    }
    switch (s.k) {
      case "hack":
        this.near = P.pos.distanceTo(new THREE.Vector3(L.terminal.x - 1.1, P.pos.y, L.terminal.z)) < 2.4;
        if (control && this.near && input.use && !this.useHeld) this.setPhase("dive");
        break;
      case "go":
      case "contact":
        if (P.pos.distanceTo(new THREE.Vector3(s.to.x, P.pos.y, s.to.z)) < 3) {
          this.ev.onToast(s.arrive, s.k === "contact" ? "good" : "bad");
          if (s.k === "contact") sound.sfx("pickup");
          if (s.k === "go" && s.spawnBoss && this.mission.bossAt) {
            const b = this.spawnBoss(this.mission.bossAt, 1);
            for (const dx of [-5, 5]) {
              const at = this.mission.bossAt.clone().add(new THREE.Vector3(dx, 0, 3));
              this.spawn("guard", at, at.clone().add(new THREE.Vector3(0, 0, 4)), 1);
            }
            b.cooldown = 1.5;
            this.panicAll(this.mission.bossAt);
          }
          this.checkpoint = P.pos.clone();
          this.nextStep();
        }
        break;
      case "chase": {
        const rn = this.runner;
        if (rn && rn.state === "stopped" && P.pos.distanceTo(new THREE.Vector3(rn.pos.x, P.pos.y, rn.pos.z)) < 5) {
          const side = new THREE.Vector3(rn.pos.x + 3.4, 0, rn.pos.z);
          this.moveTerminal(side);
          this.lockLights.forEach((m, i, arr) => m.position.set(side.x - 0.05, 2.25, side.z - ((arr.length - 1) * 0.5) / 2 + i * 0.5));
          this.ev.onToast("O motorista fugiu e largou o painel do carro. Hackeie ali do lado!", "good");
          this.checkpoint = P.pos.clone();
          this.nextStep();
        }
        break;
      }
      case "escort": {
        const d = this.allies.find((a) => a.path);
        const arrived = d && (d.wp >= d.path!.length || d.pos.distanceTo(L.terminal) < 4.5);
        if (arrived) {
          this.ev.onToast('Dani: "Cheguei! O interfone é todo seu. Aperte E."', "good");
          this.checkpoint = P.pos.clone();
          this.nextStep();
          break;
        }
        const door = new THREE.Vector3(L.terminal.x - 1.1, P.pos.y, L.terminal.z);
        if (control && P.pos.distanceTo(door) < 2.6 && input.use && !this.useHeld) {
          this.ev.onToast("A Dani ainda não chegou. Fique perto dela — a seta mostra onde ela está.", "bad");
        }
        break;
      }
      case "boss":
        if (!this.boss || this.boss.hp <= 0) this.nextStep();
        break;
      case "cops":
        if (P.pos.distanceTo(new THREE.Vector3(s.to.x, P.pos.y, s.to.z)) < 4.2) {
          for (const e of this.enemies) if (e.detail === "chase") e.hp = 0;
          this.ev.onToast("No porto a viatura perdeu você.", "good");
          this.checkpoint = P.pos.clone();
          this.nextStep();
        }
        break;
      case "jet":
        if (this.jetting && P.pos.distanceTo(new THREE.Vector3(s.to.x, P.pos.y, s.to.z)) < 7) {
          this.jetting = false;
          P.pos.set(JET.x, 0, JET.z);
          this.checkpoint = P.pos.clone();
          this.ev.onToast("Você chegou na boia. A fuga pelo mar deu certo.", "good");
          this.nextStep();
        }
        break;
      case "car":
        if (P.pos.distanceTo(L.car.position) < 3.6) {
          const boss = this.enemies.find((e) => e.kind === "boss" && e.hp > 0);
          if (boss) {
            if (this.warnT <= 0) {
              this.ev.onToast("Derrube o chefe antes de fugir!", "bad");
              this.warnT = 3;
            }
          } else {
            this.setPhase("escape");
            sound.sfx("car");
            this.ev.onToast('Tio Rui: "Entra, entra! Segura firme!"', "good");
          }
        }
        break;
    }
    this.useHeld = input.use;
    void dt;
  }

  private updateAllies(dt: number) {
    const P = this.player;
    for (const a of this.allies) {
      let pose: Pose3 = this.talking === a.who ? "talk" : "idle";
      if (a.path && this.step?.k === "escort" && this.phase === "play") {
        while (a.wp < a.path.length && this.solidAt(a.path[a.wp].x, a.path[a.wp].z, 0.4)) a.wp++;
        const threat = this.guardAhead(a);
        if (threat) {
          if (!a.waiting) this.ev.onToast('Dani: "Tem segurança na frente! Me cobre!"', "bad");
          a.waiting = true;
          pose = "cower";
        } else {
          a.waiting = false;
          const far = P.pos.distanceTo(a.pos) > 18;
          if (far && this.warnT <= 0) {
            this.ev.onToast('Dani: "Não me deixa para trás!"', "bad");
            this.warnT = 5;
          }
          const goal = a.path[a.wp];
          if (goal && !far) {
            const to = goal.clone().sub(a.pos);
            to.y = 0;
            if (to.length() < 0.5) a.wp++;
            else {
              to.normalize();
              a.pos.addScaledVector(to, 2.6 * dt);
              a.yaw = Math.atan2(to.x, to.z);
              pose = "walk";
            }
          }
        }
        this.collide(a.pos, 0.35, 0);
        a.rig.root.rotation.y = a.yaw;
      } else {
        const d = P.pos.clone().sub(a.pos);
        a.rig.root.rotation.y = Math.atan2(d.x, d.z);
        if (a.path && this.step && this.step.k !== "escort" && this.stepIdx > 0) pose = "idle";
      }
      a.rig.root.position.copy(a.pos);
      animate(a.rig, pose, this.t + a.pos.x, dt);
    }
  }

  private panicAll(from: THREE.Vector3) {
    for (const p of this.peds) {
      if (p.pos.distanceTo(from) < 28) {
        if (p.panic <= 0 && Math.random() < 0.3) sound.sfx("scream", this.at3(p.pos, 30));
        p.panic = 5 + Math.random() * 3;
      }
    }
  }

  private updatePeds(dt: number) {
    const L = this.layout;
    const P = this.player;
    const camPos = this.camera.position;
    for (const p of this.peds) {
      p.t += dt;
      p.panic = Math.max(0, p.panic - dt);
      const near = p.pos.distanceTo(camPos) < 55;
      if (p.dead > 0) {
        p.dead -= dt;
        p.pos.y = 0.2;
        p.rig.root.visible = near;
        p.rig.root.position.copy(p.pos);
        if (p.dead <= 0) this.respawnPed(p);
        else if (near) animate(p.rig, "down", p.t, dt);
        continue;
      }
      let pose: Pose3 = "idle";
      if (p.panic > 0) {
        const away = p.pos.clone().sub(P.pos);
        away.y = 0;
        if (away.lengthSq() < 0.01) away.set(1, 0, 0);
        away.normalize();
        p.pos.addScaledVector(away, 5 * dt);
        p.yaw = Math.atan2(away.x, away.z);
        pose = p.panic > 3 ? "run" : "cower";
        if (pose === "cower") p.pos.addScaledVector(away, -5 * dt);
      } else if (!p.still) {
        const pts = L.pedLoops[p.loop];
        const goal = pts[p.wp];
        const to = goal.clone().sub(p.pos);
        to.y = 0;
        if (to.length() < 0.6) p.wp = (p.wp + p.dir + 4) % 4;
        else {
          to.normalize();
          const blockedByPlayer = P.pos.distanceTo(p.pos) < 1.2 && P.pos.clone().sub(p.pos).dot(to) > 0;
          if (!blockedByPlayer) {
            p.pos.addScaledVector(to, p.speed * dt);
            pose = "walk";
          }
          let d = Math.atan2(to.x, to.z) - p.yaw;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          p.yaw += d * Math.min(1, dt * 6);
        }
      } else {
        pose = Math.sin(p.t * 0.3) > 0 ? "phone" : "idle";
      }
      p.pos.y = 0.2;
      this.collide(p.pos, 0.3, 0.2);
      const dp = p.pos.clone().sub(P.pos);
      dp.y = 0;
      const dl = dp.length();
      if (dl < 0.65 && dl > 0.001) p.pos.addScaledVector(dp.normalize(), 0.65 - dl);
      for (const c of this.traffic) this.pushFromCar(p.pos, c.pos, c.yaw, c.mesh.userData.length, 0.3);
      p.rig.root.visible = near;
      if (!near) continue;
      p.rig.root.position.copy(p.pos);
      p.rig.root.rotation.y = p.yaw;
      animate(p.rig, pose, p.t, dt, p.speed);
      p.talkT -= dt;
      if (p.talkT <= 0) {
        p.talkT = 4 + Math.random() * 7;
        const a = this.at3(p.pos, 18);
        if (a.vol > 0.05 && p.panic <= 0 && this.phase === "play") sound.babble(p.pitch, 3 + Math.floor(Math.random() * 6), a.pan, 0.09 * a.vol);
      }
    }
  }

  private obstacleAhead(pos: THREE.Vector3, f: THREE.Vector3, self: unknown, ignoreCars: boolean) {
    const rt = new THREE.Vector3(f.z, 0, -f.x);
    const check = (q: THREE.Vector3, reach: number, width: number) => {
      const rel = q.clone().sub(pos);
      const a = rel.dot(f);
      return a > 0.5 && a < reach && Math.abs(rel.dot(rt)) < width;
    };
    if (check(this.player.pos, 7.5, 1.6)) return "player";
    for (const p of this.peds) if (p.dead <= 0 && p.hp > 0 && check(p.pos, 6.5, 1.5)) return "ped";
    for (const e of this.enemies) if (e.hp > 0 && e.kind !== "drone" && check(e.pos, 6.5, 1.5)) return "ped";
    for (const a of this.allies) if (check(a.pos, 6.5, 1.5)) return "ped";
    if (ignoreCars) return null;
    for (const c of this.traffic) if (c !== self && check(c.pos, 8, 1.4)) return "car";
    if (check(this.layout.car.position, 8, 1.4)) return "car";
    if (this.runner && this.runner !== self && check(this.runner.pos, 8, 1.4)) return "car";
    return null;
  }

  private tryRide(control: boolean, input: Input3): boolean {
    if (!control || !input.use || this.useHeld) return false;
    const P = this.player;
    const terminal = new THREE.Vector3(this.layout.terminal.x - 1.1, P.pos.y, this.layout.terminal.z);
    const hackNear = this.step?.k === "hack" && P.pos.distanceTo(terminal) < 2.4;
    if (this.step?.k === "jet" && !this.jetting && P.pos.distanceTo(new THREE.Vector3(JET.x, P.pos.y, JET.z)) < 2.6) {
      this.jetting = true;
      this.mounted = false;
      this.ev.onToast("Você subiu no jet ski. Vá até a boia.", "good");
      sound.sfx("car");
      return true;
    }
    if (this.jetting && onPier(P.pos.x, P.pos.z)) {
      this.jetting = false;
      this.ev.onToast("Você desceu do jet ski.", "info");
      return true;
    }
    const atLift = P.pos.distanceTo(new THREE.Vector3(ELEVATOR.x, P.pos.y, ELEVATOR.z)) < 2.5;
    const atRoofLift = P.pos.y > ROOF - 2 && P.pos.distanceTo(new THREE.Vector3(TOWER.x, P.pos.y, 77.4)) < 2.6;
    if (!hackNear && atLift && P.pos.y < 4) {
      this.startLift(true);
      return true;
    }
    if (!hackNear && atRoofLift) {
      this.startLift(false);
      return true;
    }
    if (!hackNear && P.pos.y > ROOF - 1.5 && P.pos.distanceTo(new THREE.Vector3(CENTRAL_PHONE.x, P.pos.y, CENTRAL_PHONE.z)) < 2.6) {
      this.ev.onHelp?.();
      return true;
    }
    const place = indoors(P.pos.x, P.pos.z) ? "indoor" : inSea(P.pos.x, P.pos.z) ? "sea" : "street";
    if (this.mounted && !hackNear) {
      this.mounted = false;
      this.ev.onToast("Você desceu da moto.", "info");
      return true;
    }
    if (!this.mounted && !this.jetting && canMount(place, true) && P.pos.distanceTo(this.layout.bikes[this.ride].position) < 2.2) {
      this.mounted = true;
      this.ev.onToast("Você subiu na moto.", "good");
      return true;
    }
    return false;
  }

  private spawnCops() {
    const z = Math.max(20, this.player.pos.z);
    for (const lane of [1, 2]) {
      const mesh = buildCar("#1e3a8a", "sedan");
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.12, 0.28),
        new THREE.MeshStandardMaterial({ color: "#ef4444", emissive: "#60a5fa", emissiveIntensity: 1.4 }),
      );
      bar.position.set(0, 1.32, 0);
      mesh.add(bar);
      const pos = new THREE.Vector3(streetCenter(lane), 0, z - 16 - lane * 6);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.cops.push({ mesh, pos, yaw: 0, speed: 7 });
    }
    const rank = policeRankForMission(this.index);
    this.spawnPolice(rank, new THREE.Vector3(this.player.pos.x + 11, 0, z - 10), "chase");
    this.spawnPolice(rank, new THREE.Vector3(this.player.pos.x - 9, 0, z - 14), "chase");
    sound.sfx("siren", { pan: 0, vol: 0.75 });
    this.ev.onToast(`Sirene. ${POLICE_RANK[rank].name} saiu atrás de você.`, "bad");
  }

  private updateCops(dt: number) {
    if (this.step?.k !== "cops" || this.phase !== "play") return;
    if (!this.cops.length) this.spawnCops();
    for (const c of this.cops) {
      const to = this.player.pos.clone().sub(c.pos);
      to.y = 0;
      const dist = to.length();
      const want = dist < 2.6 ? 1.5 : 10.5;
      c.speed += (want - c.speed) * Math.min(1, dt * 1.5);
      if (to.lengthSq() > 0.04) {
        let d = Math.atan2(to.x, to.z) - c.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        c.yaw += d * Math.min(1, dt * 2.2);
      }
      const ahead = new THREE.Vector3(c.pos.x + Math.sin(c.yaw) * 1.4, 0, c.pos.z + Math.cos(c.yaw) * 1.4);
      if (this.solidAt(ahead.x, ahead.z, 0.7)) c.speed *= 0.35;
      c.pos.addScaledVector(new THREE.Vector3(Math.sin(c.yaw), 0, Math.cos(c.yaw)), c.speed * dt);
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.yaw;
      for (const w of c.mesh.userData.wheels as THREE.Group[]) w.rotation.x += c.speed * dt * 2.5;
    }
  }

  private updateShips() {
    this.layout.ships.forEach((ship, i) => {
      const berth = BERTHS[i] ?? BERTHS[0];
      const t = this.t * 0.08 + i * 2.4;
      const along = Math.sin(t);
      ship.position.set(berth.x + along * 2.2, 0.15 + Math.sin(t * 1.7) * 0.1, berth.z);
      ship.rotation.z = Math.sin(t * 1.3) * 0.03;
      ship.rotation.y = i === 0 ? 0.2 : Math.PI - 0.2;
    });
  }

  private startLift(up: boolean) {
    if (this.lift) return;
    this.mounted = false;
    this.jetting = false;
    this.lift = { t: 0, up, start: this.player.pos.clone() };
    sound.sfx("gate");
    this.ev.onToast(up ? "Elevador. Subindo para a cobertura da Dani." : "Elevador. Descendo para o saguão.", "info");
  }

  private updateLift(dt: number) {
    const ride = this.lift;
    if (!ride) return;
    const P = this.player;
    ride.t += dt;
    const k = Math.min(1, ride.t / 6.4);
    const high = DECK;
    const low = 0.2;
    const cabin = new THREE.Vector3(ELEVATOR.x, ride.up ? low : high, 66.8);
    const deck = new THREE.Vector3(TOWER.x, ride.up ? high : low, ride.up ? 83.2 : ELEVATOR.z);
    let pos: THREE.Vector3;
    if (k < 0.14) {
      pos = ride.start.clone().lerp(cabin, k / 0.14);
      pos.y = ride.up ? low : high;
    } else if (k < 0.86) {
      const u = (k - 0.14) / 0.72;
      const e = u * u * (3 - 2 * u);
      pos = cabin.clone();
      pos.y = (ride.up ? low : high) + (ride.up ? high - low : low - high) * e;
    } else {
      const u = (k - 0.86) / 0.14;
      pos = cabin.clone().lerp(deck, u);
      pos.y = ride.up ? high : low;
    }
    P.pos.copy(pos);
    P.vy = 0;
    P.grounded = true;
    P.yaw = Math.PI;
    this.layout.elevator.position.set(ELEVATOR.x, Math.max(1.6, P.pos.y + 1.4), 66.6);
    if (k >= 1) {
      P.pos.copy(deck);
      P.yaw = ride.up ? 0 : Math.PI;
      if (ride.up) this.camYaw = 0;
      this.liftFloor = ride.up ? "roof" : "ground";
      this.lift = null;
      sound.sfx("gate");
      if (ride.up) this.ev.onToast("Sala da Dani. Aperte E para entrar no computador.", "good");
    }
  }

  private resolveVehicles() {
    const bodies: { pos: THREE.Vector3; speed: number; setSpeed: (n: number) => void }[] = [];
    for (const c of this.traffic) bodies.push({ pos: c.pos, speed: c.speed, setSpeed: (n) => (c.speed = n) });
    for (const c of this.cops) bodies.push({ pos: c.pos, speed: c.speed, setSpeed: (n) => (c.speed = n) });
    if (this.runner) {
      const rn = this.runner;
      bodies.push({ pos: rn.pos, speed: rn.speed, setSpeed: (n) => (rn.speed = n) });
    }
    const parked = this.layout.car.position;
    for (const b of bodies) {
      const sep = separateCircles(b.pos.x, b.pos.z, parked.x, parked.z, 3.3);
      if (!sep) continue;
      b.pos.x = sep.ax;
      b.pos.z = sep.az;
      b.setSpeed(b.speed * 0.2);
    }
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const sep = separateCircles(a.pos.x, a.pos.z, b.pos.x, b.pos.z, 3.15);
        if (!sep) continue;
        a.pos.x = sep.ax;
        a.pos.z = sep.az;
        b.pos.x = sep.bx;
        b.pos.z = sep.bz;
        a.setSpeed(a.speed * 0.35);
        b.setSpeed(b.speed * 0.35);
      }
    }
    const P = this.player;
    for (const b of bodies) {
      const before = b.speed;
      const sep = separateCircles(P.pos.x, P.pos.z, b.pos.x, b.pos.z, 2.2);
      if (!sep) continue;
      P.pos.x = sep.ax;
      P.pos.z = sep.az;
      b.pos.x = sep.bx;
      b.pos.z = sep.bz;
      b.setSpeed(b.speed * 0.2);
      if (before > 7 && P.downT <= 0 && this.phase === "play" && !this.jetting) {
        P.downT = 1.15;
        this.mounted = false;
        this.ev.onToast("O carro te atropelou.", "bad");
        sound.sfx("hurt");
      }
    }
    for (const c of this.traffic) c.mesh.position.copy(c.pos);
    for (const c of this.cops) {
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.yaw;
    }
    if (this.runner) this.runner.mesh.position.copy(this.runner.pos);
  }

  private updateTraffic(dt: number) {
    for (const c of this.traffic) {
      const a = this.lanePoint(c.from, c.to, 0);
      const b = this.lanePoint(c.from, c.to, 1);
      const seg = b.clone().sub(a);
      const f = seg.clone().normalize();
      c.ignoreT = Math.max(0, c.ignoreT - dt);
      const ob = this.obstacleAhead(c.pos, new THREE.Vector3(Math.sin(c.yaw), 0, Math.cos(c.yaw)), c, c.ignoreT > 0);
      const want = ob ? 0 : c.want;
      c.speed += Math.sign(want - c.speed) * Math.min(Math.abs(want - c.speed), (ob ? 16 : 4) * dt);
      if (ob) {
        c.blockedT += dt;
        c.honkT -= dt;
        if (ob === "player" && c.blockedT > 1 && c.honkT <= 0) {
          sound.sfx("honk", this.at3(c.pos, 50));
          c.honkT = 2.5 + Math.random() * 2;
        }
        if (ob === "car" && c.blockedT > 4) {
          c.ignoreT = 2;
          c.blockedT = 0;
        }
      } else c.blockedT = 0;
      const rel = c.pos.clone().sub(a);
      const s = rel.dot(f);
      const ahead = a.clone().addScaledVector(f, Math.min(seg.length(), s + 5));
      const steer = ahead.sub(c.pos);
      steer.y = 0;
      if (steer.lengthSq() > 0.01) {
        let d = Math.atan2(steer.x, steer.z) - c.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        c.yaw += d * Math.min(1, dt * 3);
      }
      c.pos.addScaledVector(new THREE.Vector3(Math.sin(c.yaw), 0, Math.cos(c.yaw)), c.speed * dt);
      if (s > seg.length() - 1) {
        const [i, j] = c.to;
        const opts: [number, number][] = ([
          [i + 1, j],
          [i - 1, j],
          [i, j + 1],
          [i, j - 1],
        ] as [number, number][]).filter(([x, y]) => x >= 0 && x < 4 && y >= 0 && y < 4 && !(x === c.from[0] && y === c.from[1]));
        const next = opts[Math.floor(Math.random() * opts.length)] ?? c.from;
        c.from = c.to;
        c.to = next;
      }
      c.mesh.position.copy(c.pos);
      c.mesh.rotation.y = c.yaw;
      for (const w of c.mesh.userData.wheels as THREE.Group[]) w.rotation.x += c.speed * dt * 2.5;
    }
  }

  private updateRunner(dt: number) {
    const rn = this.runner;
    if (!rn) return;
    const P = this.player;
    if (rn.state === "wait" && this.step?.k === "chase" && this.phase === "play" && P.pos.distanceTo(rn.pos) < 26) {
      rn.state = "flee";
      sound.sfx("car", this.at3(rn.pos));
      this.ev.onToast("Ele te viu! Corra atrás do carro!", "bad");
    }
    if (rn.state === "flee") {
      const goal = rn.path[0];
      if (!goal) {
        rn.state = "stopped";
        this.ev.onToast("O carro do mensageiro morreu no cruzamento! Chegue perto.", "good");
      } else {
        const lane = goal.clone();
        const to = lane.sub(rn.pos);
        to.y = 0;
        if (to.length() < 2) rn.path.shift();
        else {
          const dist = P.pos.distanceTo(rn.pos);
          const want = dist > 40 ? 3 : dist < 10 ? 8.5 : 6.8;
          const ob = this.obstacleAhead(rn.pos, new THREE.Vector3(Math.sin(rn.yaw), 0, Math.cos(rn.yaw)), rn, false);
          rn.speed += ((ob && ob !== "player" ? 1 : want) - rn.speed) * Math.min(1, dt * 2);
          let d = Math.atan2(to.x, to.z) - rn.yaw;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          rn.yaw += d * Math.min(1, dt * 3.5);
          rn.pos.addScaledVector(new THREE.Vector3(Math.sin(rn.yaw), 0, Math.cos(rn.yaw)), rn.speed * dt);
          for (const p of this.peds) if (p.pos.distanceTo(rn.pos) < 6) p.panic = Math.max(p.panic, 3.5);
        }
      }
    }
    if (rn.state === "stopped") rn.speed = Math.max(0, rn.speed - dt * 10);
    rn.mesh.position.copy(rn.pos);
    rn.mesh.rotation.y = rn.yaw;
    for (const w of rn.mesh.userData.wheels as THREE.Group[]) w.rotation.x += rn.speed * dt * 2.5;
    const dvr = rn.driver;
    dvr.root.visible = rn.state !== "stopped";
    dvr.root.position.set(rn.pos.x + Math.cos(rn.yaw) * 0.4, 0.4, rn.pos.z - Math.sin(rn.yaw) * 0.4);
    dvr.root.rotation.y = rn.yaw;
    animate(dvr, "sit", this.t, dt);
  }

  private updateEngines() {
    const cam = this.camera.position;
    const list: { pos: THREE.Vector3; speed: number }[] = this.traffic.map((c) => ({ pos: c.pos, speed: c.speed }));
    if (this.runner) list.push({ pos: this.runner.pos, speed: this.runner.speed + 2 });
    if (this.phase === "escape") list.push({ pos: this.layout.car.position, speed: this.carSpeed + 3 });
    else list.push({ pos: this.layout.car.position, speed: 0.5 });
    if (this.phase === "hack" || this.phase === "result") {
      sound.setEngines([]);
      return;
    }
    const voices = list
      .map((c) => ({ c, d: c.pos.distanceTo(cam) }))
      .filter((x) => x.d < 50)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map(({ c }) => {
        const a = this.at3(c.pos, 50);
        return { gain: a.vol, pan: a.pan, rpm: Math.min(1.6, 0.25 + c.speed / 10) };
      });
    sound.setEngines(voices);
  }

  private playerShoot() {
    const P = this.player;
    const gun = WEAPONS[this.weapon];
    P.cooldown = gun.cooldown;
    P.shootT = 0.3;
    const origin = P.pos.clone().add(new THREE.Vector3(0, 1.35, 0));
    let dir = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    let best: THREE.Vector3 | null = null;
    let bestScore = Infinity;
    const consider = (c: THREE.Vector3) => {
      const to = c.clone().sub(origin);
      const dist = to.length();
      if (dist > 32) return;
      const flat = new THREE.Vector3(to.x, 0, to.z).normalize();
      const ang = Math.acos(Math.max(-1, Math.min(1, flat.dot(dir))));
      if (ang > 0.6) return;
      if (this.blocked(origin, c)) return;
      const score = ang * 20 + dist;
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    };
    for (const e of this.enemies) if (e.hp > 0) consider(e.pos.clone().add(new THREE.Vector3(0, e.kind === "drone" ? 0 : e.kind === "boss" ? 1.4 : 1.2, 0)));
    if (this.runner && this.runner.state === "flee") consider(this.runner.pos.clone().add(new THREE.Vector3(0, 0.5, 0)));
    if (best) dir = (best as THREE.Vector3).clone().sub(origin).normalize();
    P.yaw = Math.atan2(dir.x, dir.z);
    const mesh = new THREE.Mesh(bulletGeo, mineMat);
    mesh.position.copy(origin).addScaledVector(dir, 0.6);
    mesh.lookAt(mesh.position.clone().add(dir));
    this.scene.add(mesh);
    this.bullets.push({ mesh, vel: dir.multiplyScalar(60), mine: true, life: 1, damage: gun.damage });
    this.burst(origin.clone().addScaledVector(dir, 0.7), "#ffd27a", 3);
    sound.sfx("shoot");
    if (this.t - this.lastShot > 1.5) this.panicAll(P.pos);
    this.lastShot = this.t;
  }

  private updateEnemy(e: Enemy, dt: number, active: boolean) {
    e.t += dt;
    e.shootT = Math.max(0, e.shootT - dt);
    const P = this.player;
    if (e.hp <= 0) {
      e.dead += dt;
      e.marker.visible = false;
      if (e.kind === "drone") {
        e.pos.y = Math.max(0.3, e.pos.y - dt * 9);
        e.mesh.rotation.z += dt * 4;
      }
      e.mesh.position.copy(e.pos);
      if (e.rig) animate(e.rig, "down", e.t, dt);
      if (e.dead > 5) e.mesh.visible = false;
      return;
    }
    const L = this.layout;
    const inside = P.pos.x > L.compound.minX && P.pos.z > L.compound.minZ && P.pos.z < L.compound.maxZ;
    const zoneOk = e.zone === 1 || this.hacked || inside;
    const eye = e.pos.clone().add(new THREE.Vector3(0, e.kind === "drone" ? 0 : 1.5, 0));
    const chest = P.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const dist = eye.distanceTo(chest);
    const range = e.kind === "boss" ? 26 : e.kind === "drone" ? 24 : 20;
    const hostile = e.faction === "caveira" || e.detail === "chase" || e.detail === "street" || !e.rank || this.wanted > 0 || this.provoked;
    const sees = active && zoneOk && hostile && P.downT <= 0 && dist < range && !this.blocked(eye, chest);
    e.moving = false;

    if (e.kind === "drone") {
      e.pos.x = e.a.x + Math.sin(e.t * 0.5) * 8;
      e.pos.z = e.a.z + Math.cos(e.t * 0.4) * 10;
      e.pos.y = 7 + Math.sin(e.t * 2) * 0.4;
      e.mesh.children.forEach((c) => c.name === "rotor" && (c.rotation.y += dt * 40));
    } else if (sees) {
      const to = chest.clone().sub(eye);
      e.yaw = Math.atan2(to.x, to.z);
      const keep = e.kind === "boss" ? 7 : 9;
      if (dist > keep) {
        const step = (e.rank ? POLICE_RANK[e.rank].speed : e.kind === "boss" ? 3.2 : 2.6) * dt;
        e.pos.x += Math.sin(e.yaw) * step;
        e.pos.z += Math.cos(e.yaw) * step;
        e.moving = true;
      }
    } else {
      const goal = e.toB ? e.b : e.a;
      const to = goal.clone().sub(e.pos);
      to.y = 0;
      if (to.length() < 0.6) e.toB = !e.toB;
      else {
        to.normalize();
        e.yaw = Math.atan2(to.x, to.z);
        e.pos.addScaledVector(to, 1.6 * dt);
        e.moving = true;
      }
    }
    if (e.kind !== "drone") {
      this.collide(e.pos, 0.4, 0);
      for (const c of this.traffic) this.pushFromCar(e.pos, c.pos, c.yaw, c.mesh.userData.length, 0.4);
    }
    e.mesh.position.copy(e.pos);
    e.mesh.rotation.y = e.yaw;
    const top = e.kind === "drone" ? 0.9 : e.kind === "boss" ? 2.75 : 2.3;
    e.marker.visible = true;
    e.marker.position.set(e.pos.x, e.pos.y + top + Math.sin(this.t * 4 + e.t) * 0.08, e.pos.z);
    e.marker.rotation.y += dt * 2.5;
    const pulse = 1 + (sees ? Math.sin(this.t * 12) * 0.15 : 0);
    e.marker.scale.setScalar((e.kind === "boss" ? 1.4 : e.rank === "federal" ? 1.35 : e.rank === "especial" ? 1.15 : 1) * pulse);
    if (e.rig) {
      e.rig.armed = true;
      animate(e.rig, e.shootT > 0 ? "shoot" : e.moving ? (sees ? "run" : "walk") : "idle", e.t, dt, sees ? 0.8 : 0.7);
    }

    if (!sees) return;
    e.cooldown -= dt;
    if (e.cooldown > 0) return;
    const shots = e.kind === "boss" ? 3 : 1;
    for (let k = 0; k < shots; k++) {
      this.at(k * 0.18, () => {
        if (e.hp <= 0) return;
        const from = e.pos.clone().add(new THREE.Vector3(0, e.kind === "drone" ? -0.2 : 1.35, 0));
        const spread = e.rank ? POLICE_RANK[e.rank].spread : 0.8;
        const aim = P.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, 1.2, (Math.random() - 0.5) * spread));
        const dir = aim.sub(from).normalize();
        const mesh = new THREE.Mesh(bulletGeo, e.rank ? policeBulletMat[e.rank] : enemyMat);
        mesh.position.copy(from).addScaledVector(dir, 0.5);
        mesh.lookAt(mesh.position.clone().add(dir));
        this.scene.add(mesh);
        this.bullets.push({ mesh, vel: dir.multiplyScalar(e.kind === "drone" ? 16 : e.rank === "federal" ? 26 : 20), mine: false, life: 2.2, damage: e.damage });
        sound.sfx("enemyShoot", this.at3(from, 70));
      });
    }
    e.shootT = 0.4;
    e.cooldown = e.fireGap;
    if (this.t - this.lastShot > 1.5) this.panicAll(e.pos);
    this.lastShot = this.t;
  }

  private updateBullets(dt: number) {
    const P = this.player;
    for (const b of this.bullets) {
      const prev = b.mesh.position.clone();
      b.mesh.position.addScaledVector(b.vel, dt);
      b.life -= dt;
      const pos = b.mesh.position;
      if (pos.y < 0 || this.blocked(prev, pos)) {
        b.life = 0;
        this.burst(pos, "#d6c7a8", 5);
        if (Math.random() < 0.5) sound.sfx("ricochet", this.at3(pos, 40));
        continue;
      }
      if (b.mine) {
        const rn = this.runner;
        if (rn && rn.state === "flee" && Math.abs(pos.x - rn.pos.x) < 1.3 && Math.abs(pos.z - rn.pos.z) < 2.3 && pos.y < 1.8) {
          b.life = 0;
          rn.hits += b.damage;
          sound.sfx("hit", this.at3(pos));
          this.burst(pos, "#fbbf24", 8);
          if (rn.hits >= 5) {
            rn.state = "stopped";
            rn.path = [];
            sound.sfx("boom", this.at3(rn.pos));
            this.ev.onToast("Pneu estourado! O carro parou. Chegue perto.", "good");
          }
          continue;
        }
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const c = e.pos.clone().add(new THREE.Vector3(0, e.kind === "drone" ? 0 : e.kind === "boss" ? 1.1 : 0.95, 0));
          const rad = e.kind === "drone" ? 0.8 : 0.7;
          if (Math.abs(pos.x - c.x) < rad && Math.abs(pos.z - c.z) < rad && Math.abs(pos.y - c.y) < (e.kind === "drone" ? 0.6 : 1.0)) {
            b.life = 0;
            e.hp -= b.damage;
            if (e.rig) e.rig.flash = 0.1;
            sound.sfx("hit", this.at3(pos));
            this.burst(pos, "#b91c1c", 6);
            if (e.hp <= 0) {
              this.burst(c, e.kind === "drone" ? "#f97316" : "#7f1d1d", 14);
              sound.sfx(e.kind === "drone" ? "boom" : "enemyDown", this.at3(c));
              if (e.kind === "boss") this.ev.onToast(`${e.name} foi derrubado!`, "good");
            }
            break;
          }
        }
        if (b.life > 0) {
          for (const ped of this.peds) {
            if (ped.dead > 0 || ped.hp <= 0) continue;
            if (Math.abs(pos.x - ped.pos.x) < 0.55 && Math.abs(pos.z - ped.pos.z) < 0.55 && pos.y < 1.8) {
              b.life = 0;
              ped.hp -= b.damage;
              ped.rig.flash = 0.1;
              ped.panic = 4;
              if (ped.hp <= 0) {
                ped.hp = 0;
                ped.dead = 2.6;
                this.callPolice(ped.pos);
              }
              break;
            }
          }
        }
      } else if (P.inv <= 0 && P.downT <= 0) {
        const c = P.pos.clone().add(new THREE.Vector3(0, 1.1, 0));
        if (pos.distanceTo(c) < 0.55) {
          b.life = 0;
          P.hp -= b.damage;
          P.inv = 1.1;
          this.shake = 0.3;
          sound.sfx("hurt");
          this.burst(c, "#b91c1c", 10);
          if (P.hp <= 0) P.downT = 1.6;
        }
      }
    }
    for (const b of this.bullets) if (b.life <= 0) this.scene.remove(b.mesh);
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  private updateCamera(dt: number, snap = false) {
    const P = this.player;
    const L = this.layout;
    let pos: THREE.Vector3;
    let look: THREE.Vector3;
    if (this.phase === "brief") {
      const a = this.t * 0.15 + 0.6;
      const c = P.pos.clone().add(new THREE.Vector3(1.5, 0, 1.5));
      pos = c.clone().add(new THREE.Vector3(Math.sin(a) * 6.5, 2.6, Math.cos(a) * 6.5));
      look = c.clone().add(new THREE.Vector3(0, 1.3, 0));
    } else if (this.phase === "dive" || (this.phase === "surface" && this.phaseT < 1.1)) {
      const screen = new THREE.Vector3(L.terminal.x - 0.31, 1.55, L.terminal.z);
      const over = new THREE.Vector3(L.terminal.x - 3.2, 2.1, L.terminal.z - 1.1);
      const mid = new THREE.Vector3(L.terminal.x - 1.8, 1.8, L.terminal.z - 0.5);
      const close = new THREE.Vector3(L.terminal.x - 0.5, 1.55, L.terminal.z);
      const k = this.phase === "dive" ? Math.min(1, this.phaseT / 1.7) : 1 - Math.min(1, this.phaseT / 1.1);
      const e = k * k * (3 - 2 * k);
      pos = e < 0.6 ? over.clone().lerp(mid, e / 0.6) : mid.clone().lerp(close, (e - 0.6) / 0.4);
      look = screen;
      if (this.phase === "dive" && this.phaseT > 1.8) this.setPhase("hack");
      if (this.phase === "surface" && this.phaseT >= 1.05 && this.queue.length === 0) this.setPhase("play");
      snap = true;
    } else if (this.phase === "escape" || this.phase === "done") {
      const car = L.car;
      const back = new THREE.Vector3(-Math.sin(car.rotation.y), 0, -Math.cos(car.rotation.y));
      pos = car.position.clone().addScaledVector(back, 9).add(new THREE.Vector3(0, 4, 0));
      look = car.position.clone().add(new THREE.Vector3(0, 1, 0));
    } else if (this.lift) {
      const y = P.pos.y;
      pos = new THREE.Vector3(TOWER.x + 18, y + 7, 48);
      look = new THREE.Vector3(ELEVATOR.x, y + 1.4, 66.6);
      snap = true;
    } else {
      const fx = Math.sin(this.camYaw);
      const fz = Math.cos(this.camYaw);
      const right = new THREE.Vector3(-fz, 0, fx);
      const target = P.pos.clone().add(new THREE.Vector3(0, 1.55, 0)).addScaledVector(right, 0.55);
      const dist = 4.6;
      const back = new THREE.Vector3(-fx * Math.cos(this.camPitch), Math.sin(this.camPitch), -fz * Math.cos(this.camPitch));
      let want = target.clone().addScaledVector(back, dist);
      let tmin = 1;
      for (const c of L.colliders) {
        if (c.top < 0 || c.top > 900) continue;
        const t = segBox(target, want, c);
        if (t >= 0 && t < tmin) tmin = t;
      }
      if (tmin < 1) want = target.clone().lerp(want, Math.max(0.15, tmin - 0.08));
      pos = want;
      look = target.clone().addScaledVector(new THREE.Vector3(fx, 0, fz), 3);
    }
    const k = snap ? 1 : Math.min(1, dt * 10);
    this.camPos.lerp(pos, k);
    this.camLook.lerp(look, k);
    if (snap) {
      this.camPos.copy(pos);
      this.camLook.copy(look);
    }
    this.camera.position.copy(this.camPos);
    if (this.shake > 0) this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0));
    this.camera.lookAt(this.camLook);
  }

  render(renderer: THREE.WebGLRenderer) {
    if (this.phase === "hack" || this.phase === "result") renderer.render(this.cyber.scene, this.cyber.camera);
    else renderer.render(this.scene, this.camera);
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.cyber.camera.aspect = w / h;
    this.cyber.camera.updateProjectionMatrix();
  }

  dispose() {
    sound.setEngines([]);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
    });
  }
}
