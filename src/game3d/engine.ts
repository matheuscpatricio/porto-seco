import type { Level, Who, World } from "@/content/types";
import { sound } from "@/game/audio";
import { guardLook, people } from "@/game/characters";
import { Cyber } from "@/game3d/cyber";
import { animate, buildHuman, Pose3, Rig } from "@/game3d/human";
import { buildWorld, Collider, Layout, THEMES, updateScreen } from "@/game3d/world";
import * as THREE from "three";

export type Phase = "brief" | "play" | "dive" | "hack" | "result" | "surface" | "open" | "escape" | "done";
export type HackOutcome = { ok: boolean; locks: boolean[] | null; screen: string | null; broken: boolean };
export type Input3 = { mx: number; mz: number; jump: boolean; shoot: boolean; use: boolean; run: boolean; yaw: number; pitch: number };

export type GameEvents = {
  onPhase: (p: Phase) => void;
  onToast: (text: string, tone?: "info" | "bad" | "good") => void;
};

export type Hud = {
  hp: number;
  near: boolean;
  objective: string;
  distance: number;
  angle: number;
  boss: { name: string; pct: number } | null;
  alarm: boolean;
};

type Enemy = {
  kind: "guard" | "drone" | "boss";
  rig: Rig | null;
  mesh: THREE.Object3D;
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
  t: number;
};
type Bullet = { mesh: THREE.Mesh; vel: THREE.Vector3; mine: boolean; life: number };
type Particle = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number };

const GRAV = 22;
const R = 0.35;

const bulletGeo = new THREE.SphereGeometry(0.09, 8, 6);
const mineMat = new THREE.MeshBasicMaterial({ color: "#7dd3fc" });
const enemyMat = new THREE.MeshBasicMaterial({ color: "#f87171" });
const partGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);

function segBox(a: THREE.Vector3, b: THREE.Vector3, c: Collider) {
  let t0 = 0;
  let t1 = 1;
  const d = [b.x - a.x, b.y - a.y, b.z - a.z];
  const o = [a.x, a.y, a.z];
  const mn = [c.minX, 0, c.minZ];
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
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), new THREE.MeshLambertMaterial({ color: "#1f2937" }));
  body.scale.set(1.2, 0.5, 1.2);
  g.add(body);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: "#ef4444" }));
  eye.position.set(0, -0.1, 0.45);
  g.add(eye);
  const armMat = new THREE.MeshLambertMaterial({ color: "#475569" });
  const rotorMat = new THREE.MeshBasicMaterial({ color: "#cbd5e1", transparent: true, opacity: 0.6 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.08), armMat);
    arm.position.set(Math.cos(a) * 0.45, 0.05, Math.sin(a) * 0.45);
    arm.rotation.y = -a;
    g.add(arm);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 12), rotorMat);
    rotor.position.set(Math.cos(a) * 0.85, 0.12, Math.sin(a) * 0.85);
    rotor.name = "rotor";
    g.add(rotor);
  }
  g.traverse((o) => (o.castShadow = true));
  return g;
}

export class Game3D {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 400);
  cyber: Cyber;
  layout: Layout;
  phase: Phase = "brief";
  t = 0;
  player: { rig: Rig; pos: THREE.Vector3; vy: number; yaw: number; grounded: boolean; hp: number; inv: number; shootT: number; cooldown: number; downT: number; cheerT: number; moving: boolean; running: boolean };
  camYaw = Math.PI / 4;
  camPitch = 0.28;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  allies: { who: Who; rig: Rig; pos: THREE.Vector3 }[] = [];
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
  private lastPhase: Phase = "brief";

  constructor(
    public level: Level,
    public world: World,
    public index: number,
    private ev: GameEvents,
  ) {
    const theme = THEMES[world.id] ?? THEMES.w1;
    this.layout = buildWorld(this.scene, world.id, index * 7 + 3, level.target);
    const L = this.layout;

    const hemi = new THREE.HemisphereLight(theme.hemi[0], theme.hemi[1], theme.hemi[2]);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(theme.sun, theme.sunIntensity);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -45;
    sc.right = sc.top = 45;
    sc.near = 1;
    sc.far = 200;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);

    const rig = buildHuman(people.leo.look);
    this.scene.add(rig.root);
    this.player = { rig, pos: L.spawn.clone(), vy: 0, yaw: Math.PI / 4, grounded: true, hp: 3, inv: 0, shootT: 0, cooldown: 0, downT: 0, cheerT: 0, moving: false, running: false };
    this.checkpoint = L.spawn.clone();

    const allyIds = Array.from(new Set(level.brief.map((l) => l.who).filter((w) => w !== "leo" && w !== "rui" && people[w].ally)));
    if (!allyIds.length) allyIds.push("dani");
    allyIds.forEach((who, i) => {
      const r = buildHuman(people[who].look);
      r.armed = false;
      const pos = L.allySpots[i % L.allySpots.length].clone();
      r.root.position.copy(pos);
      this.scene.add(r.root);
      this.allies.push({ who, rig: r, pos });
    });

    this.driver = buildHuman(people.rui.look);
    this.driver.armed = false;
    this.driver.root.scale.setScalar(0.9);
    this.scene.add(this.driver.root);

    const n = level.display.kind === "locks" ? level.display.events.length : 1;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: "#334155" }));
      m.position.set(L.gate.x - 0.7, 4.6, L.gate.z - ((n - 1) * 0.6) / 2 + i * 0.6);
      this.scene.add(m);
      this.lockLights.push(m);
    }

    const r = (() => {
      let s = index * 97 + 5;
      return () => ((s = (s * 16807) % 2147483647) / 2147483647);
    })();
    const guards1 = Math.min(3 + Math.floor(index / 3), 9);
    for (let i = 0; i < guards1 && i < L.patrols1.length; i++) this.spawn("guard", L.patrols1[i][0], L.patrols1[i][1], 1);
    const drones = Math.min(1 + Math.floor(index / 5), 4);
    for (let i = 0; i < drones; i++) {
      const s = L.droneSpots[i];
      this.spawn("drone", s, s.clone().add(new THREE.Vector3(0, 0, 18)), 1);
    }
    const guards2 = Math.min(2 + Math.floor(index / 6), 4);
    for (let i = 0; i < guards2; i++) {
      const p = L.patrols2[i % L.patrols2.length];
      this.spawn("guard", p, p.clone().add(new THREE.Vector3(r() * 6 - 3, 0, r() * 6 - 3)), 2);
    }
    if (level.boss) {
      const p = L.patrols2[2];
      const b = this.spawn("boss", p, p.clone().add(new THREE.Vector3(0, 0, 6)), 2);
      b.name = people[level.boss].name;
      this.scene.remove(b.mesh);
      const rigB = buildHuman(people[level.boss].look);
      rigB.root.scale.setScalar(1.2);
      b.rig = rigB;
      b.mesh = rigB.root;
      this.scene.add(rigB.root);
    }

    this.cyber = new Cyber(level.display.kind === "locks" ? level.display.events.map((e) => e.label) : null, level.target);

    const g = L.gate;
    this.carPath = [new THREE.Vector3(g.x - 6, 0, g.z), new THREE.Vector3(g.x - 7, 0, g.z - 40), new THREE.Vector3(g.x - 7, 0, g.z - 120)];

    this.player.yaw = this.camYaw + Math.PI;
    this.updateCamera(1, true);
  }

  private spawn(kind: Enemy["kind"], a: THREE.Vector3, b: THREE.Vector3, zone: 1 | 2) {
    const hp = kind === "boss" ? 14 + Math.floor(this.index / 2) : kind === "drone" ? 2 : 3;
    let rig: Rig | null = null;
    let mesh: THREE.Object3D;
    if (kind === "drone") mesh = buildDrone();
    else {
      rig = buildHuman(guardLook);
      mesh = rig.root;
    }
    const pos = a.clone();
    if (kind === "drone") pos.y = 7;
    mesh.position.copy(pos);
    this.scene.add(mesh);
    const e: Enemy = { kind, rig, mesh, pos, yaw: 0, hp, maxHp: hp, zone, a: a.clone(), b: b.clone(), toB: true, cooldown: 1 + Math.random() * 1.5, shootT: 0, dead: 0, moving: false, t: Math.random() * 10 };
    this.enemies.push(e);
    return e;
  }

  setPhase(p: Phase) {
    if (p === this.phase) return;
    if (p === "dive") sound.sfx("terminal");
    this.phase = p;
    this.phaseT = 0;
    this.ev.onPhase(p);
    this.updateMusic();
  }

  updateMusic() {
    const p = this.phase;
    const bossAlive = this.enemies.some((e) => e.kind === "boss" && e.hp > 0);
    sound.setMusic(p === "brief" ? "menu" : p === "dive" || p === "hack" || p === "result" ? "hack" : p === "escape" || p === "done" ? "off" : this.hacked && bossAlive ? "boss" : "play");
  }

  startPlay() {
    this.talking = null;
    this.setPhase("play");
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
    this.player.cheerT = 1.6;
    for (const l of this.lockLights) (l.material as THREE.MeshBasicMaterial).color.set("#22c55e");
    updateScreen(this.layout, this.level.target.toUpperCase(), o.screen ? o.screen.split("\n").slice(-2) : ["ACESSO", "LIBERADO"], "#4ade80");
    (this.layout.beacon.material as THREE.MeshBasicMaterial).color.set("#fbbf24");
    this.setPhase("open");
    sound.sfx("gate");
    this.ev.onToast(`${this.level.target}: acesso liberado!`, "good");
    this.at(1.8, () => {
      this.layout.gate.collider.top = -1;
      this.checkpoint = new THREE.Vector3(this.layout.gate.x + 3, 0, this.layout.gate.z);
      this.setPhase("play");
      const s = this.level.success;
      this.ev.onToast(`${people[s.who].name}: "${s.text}"`, "info");
    });
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
    this.ev.onToast("ALARME! Chegaram reforços. Derrube os seguranças e tente o terminal de novo.", "bad");
  }

  private burst(p: THREE.Vector3, color: string, n: number) {
    const m = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(partGeo, m);
      mesh.position.copy(p);
      this.scene.add(mesh);
      this.particles.push({ mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8), life: 0.4 + Math.random() * 0.5 });
    }
  }

  private collide(pos: THREE.Vector3, radius: number, feet: number) {
    for (const c of this.layout.colliders) {
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

  private groundAt(pos: THREE.Vector3, feet: number) {
    let g = 0;
    for (const c of this.layout.colliders) {
      if (c.top > feet + 0.4 || c.top > 50) continue;
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

  hud(): Hud {
    const p = this.player.pos;
    const L = this.layout;
    const bossAlive = this.enemies.find((e) => e.kind === "boss" && e.hp > 0);
    const target = !this.hacked ? L.terminal : L.car.position;
    const objective = !this.hacked ? `Terminal: ${this.level.target}` : bossAlive ? `Derrube ${bossAlive.name} e chegue ao carro` : "Carro de fuga do Tio Rui";
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const bearing = Math.atan2(dx, dz);
    let angle = bearing - this.camYaw;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return {
      hp: this.player.hp,
      near: this.near && this.phase === "play",
      objective,
      distance: Math.round(Math.hypot(dx, dz)),
      angle,
      boss: bossAlive && this.hacked ? { name: bossAlive.name ?? "Chefe", pct: bossAlive.hp / bossAlive.maxHp } : null,
      alarm: this.alarmT > 0,
    };
  }

  update(dt: number, input: Input3) {
    dt = Math.min(dt, 1 / 25);
    this.t += dt;
    this.phaseT += dt;
    const due = this.queue.filter((q) => this.t >= q.at);
    this.queue = this.queue.filter((q) => this.t < q.at);
    due.forEach((q) => q.fn());
    this.alarmT = Math.max(0, this.alarmT - dt);
    this.shake = Math.max(0, this.shake - dt);

    const P = this.player;
    const L = this.layout;
    const control = this.phase === "play" && P.downT <= 0;
    P.inv = Math.max(0, P.inv - dt);
    P.shootT = Math.max(0, P.shootT - dt);
    P.cooldown = Math.max(0, P.cooldown - dt);
    P.cheerT = Math.max(0, P.cheerT - dt);

    if (this.phase === "play" || this.phase === "open") {
      this.camYaw -= input.yaw;
      this.camPitch = Math.max(-0.15, Math.min(1.0, this.camPitch + input.pitch));
    }

    if (P.downT > 0) {
      P.downT -= dt;
      if (P.downT <= 0) {
        P.pos.copy(this.checkpoint);
        P.vy = 0;
        P.hp = 3;
        P.inv = 2;
        this.ev.onToast("Você foi derrubado e voltou para o último ponto seguro.", "info");
      }
    }

    P.moving = false;
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
        const speed = P.running ? 7.5 : 4.2;
        P.pos.x += vx * speed * dt;
        P.pos.z += vz * speed * dt;
        P.moving = true;
        const target = Math.atan2(vx, vz);
        let d = target - P.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        P.yaw += d * Math.min(1, dt * 12);
      }
      if (input.jump && !this.jumpHeld && P.grounded) {
        P.vy = 8.2;
        P.grounded = false;
        sound.sfx("jump");
      }
      if (input.shoot && P.cooldown <= 0) this.playerShoot();
    }
    this.jumpHeld = input.jump;

    if (this.phase !== "escape" && this.phase !== "done") {
      this.collide(P.pos, R, P.pos.y);
      P.vy -= GRAV * dt;
      P.pos.y += P.vy * dt;
      const g = this.groundAt(P.pos, P.pos.y - P.vy * dt);
      if (P.pos.y <= g) {
        P.pos.y = g;
        P.vy = 0;
        P.grounded = true;
      } else if (P.pos.y > g + 0.05) P.grounded = false;
    }

    this.near = !this.hacked && P.pos.distanceTo(new THREE.Vector3(L.terminal.x - 1.1, P.pos.y, L.terminal.z)) < 2.4;
    if (control && this.near && input.use && !this.useHeld) this.setPhase("dive");
    this.useHeld = input.use;

    if (this.phase === "play" && this.hacked && P.pos.distanceTo(L.car.position) < 3.6) {
      if (this.enemies.some((e) => e.kind === "boss" && e.hp > 0)) {
        if (Math.floor(this.t * 2) % 6 === 0) this.ev.onToast("Derrube o chefe antes de fugir!", "bad");
      } else {
        this.setPhase("escape");
        sound.sfx("car");
        this.ev.onToast('Tio Rui: "Entra, entra! Segura firme!"', "good");
      }
    }

    if (this.phase === "open") {
      const gm = L.gate.mesh;
      gm.position.z = Math.min(L.gate.z + L.gate.width, gm.position.z + dt * 3.6);
    }

    if (this.phase === "escape") {
      this.carSpeed = Math.min(16, this.carSpeed + dt * 9);
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
      if (this.phaseT > 4) this.setPhase("done");
    }

    const active = this.phase === "play" || this.phase === "open";
    for (const e of this.enemies) this.updateEnemy(e, dt, active);
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
    if (this.phase === "dive" || this.phase === "hack" || this.phase === "result") {
      P.pos.x += (L.terminal.x - 1.05 - P.pos.x) * Math.min(1, dt * 6);
      P.pos.z += (L.terminal.z - P.pos.z) * Math.min(1, dt * 6);
      P.yaw += (Math.PI / 2 - P.yaw) * Math.min(1, dt * 8);
    }
    const rig = P.rig;
    rig.root.visible = this.phase !== "escape" && this.phase !== "done" && !(P.inv > 0 && P.downT <= 0 && Math.floor(this.t * 16) % 2 === 0);
    rig.root.position.copy(P.pos);
    rig.root.rotation.y = P.yaw;
    animate(rig, pose, this.t, dt);

    for (const a of this.allies) {
      const d = P.pos.clone().sub(a.pos);
      a.rig.root.rotation.y = Math.atan2(d.x, d.z);
      animate(a.rig, this.talking === a.who ? "talk" : "idle", this.t + a.pos.x, dt);
    }
    const car = L.car;
    this.driver.root.position.set(car.position.x, car.position.y + 0.25, car.position.z);
    this.driver.root.position.add(new THREE.Vector3(Math.cos(car.rotation.y) * 0.45, 0, -Math.sin(car.rotation.y) * 0.45));
    this.driver.root.rotation.y = car.rotation.y;
    animate(this.driver, "sit", this.t, dt);

    const beacon = L.beacon;
    const bt = this.hacked ? car.position : L.terminal;
    beacon.position.set(bt.x, 30, bt.z);
    (beacon.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(this.t * 3) * 0.06;

    if (this.phase === "hack" || this.phase === "result") this.cyber.update(dt, this.phase === "hack");
    this.updateCamera(dt);

    this.sun.position.set(P.pos.x + 30, 60, P.pos.z + 20);
    this.sun.target.position.copy(P.pos);
    if (this.phase !== this.lastPhase) this.lastPhase = this.phase;
  }

  private playerShoot() {
    const P = this.player;
    P.cooldown = 0.25;
    P.shootT = 0.3;
    const origin = P.pos.clone().add(new THREE.Vector3(0, 1.35, 0));
    let dir = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    let best: Enemy | null = null;
    let bestScore = Infinity;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const c = e.pos.clone().add(new THREE.Vector3(0, e.kind === "drone" ? 0 : e.kind === "boss" ? 1.4 : 1.2, 0));
      const to = c.clone().sub(origin);
      const dist = to.length();
      if (dist > 30) continue;
      const flat = new THREE.Vector3(to.x, 0, to.z).normalize();
      const ang = Math.acos(Math.max(-1, Math.min(1, flat.dot(dir))));
      if (ang > 0.6) continue;
      if (this.blocked(origin, c)) continue;
      const score = ang * 20 + dist;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    if (best) dir = best.pos.clone().add(new THREE.Vector3(0, best.kind === "drone" ? 0 : 1.2, 0)).sub(origin).normalize();
    P.yaw = Math.atan2(dir.x, dir.z);
    const mesh = new THREE.Mesh(bulletGeo, mineMat);
    mesh.position.copy(origin).addScaledVector(dir, 0.6);
    this.scene.add(mesh);
    this.bullets.push({ mesh, vel: dir.multiplyScalar(42), mine: true, life: 1.2 });
    sound.sfx("shoot");
  }

  private updateEnemy(e: Enemy, dt: number, active: boolean) {
    e.t += dt;
    e.shootT = Math.max(0, e.shootT - dt);
    const P = this.player;
    if (e.hp <= 0) {
      e.dead += dt;
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
    const sees = active && zoneOk && P.downT <= 0 && dist < range && !this.blocked(eye, chest);
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
        const step = (e.kind === "boss" ? 3.2 : 2.6) * dt;
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
    if (e.kind !== "drone") this.collide(e.pos, 0.4, 0);
    e.mesh.position.copy(e.pos);
    e.mesh.rotation.y = e.yaw;
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
        const aim = P.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.2, (Math.random() - 0.5) * 0.8));
        const dir = aim.sub(from).normalize();
        const mesh = new THREE.Mesh(bulletGeo, enemyMat);
        mesh.position.copy(from).addScaledVector(dir, 0.5);
        this.scene.add(mesh);
        this.bullets.push({ mesh, vel: dir.multiplyScalar(e.kind === "drone" ? 14 : 17), mine: false, life: 2.5 });
      });
    }
    e.shootT = 0.4;
    e.cooldown = e.kind === "boss" ? 1.8 : e.kind === "drone" ? 2.6 : 2.0;
    sound.sfx("enemyShoot");
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
        this.burst(pos, "#fde047", 4);
        continue;
      }
      if (b.mine) {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const c = e.pos.clone().add(new THREE.Vector3(0, e.kind === "drone" ? 0 : e.kind === "boss" ? 1.1 : 0.95, 0));
          const rad = e.kind === "drone" ? 0.8 : e.kind === "boss" ? 0.8 : 0.6;
          if (Math.abs(pos.x - c.x) < rad && Math.abs(pos.z - c.z) < rad && Math.abs(pos.y - c.y) < (e.kind === "drone" ? 0.6 : 1.0)) {
            b.life = 0;
            e.hp -= 1;
            if (e.rig) e.rig.flash = 0.1;
            sound.sfx("hit");
            this.burst(pos, "#60a5fa", 6);
            if (e.hp <= 0) {
              this.burst(c, e.kind === "drone" ? "#f97316" : "#93c5fd", 18);
              sound.sfx(e.kind === "drone" ? "boom" : "enemyDown");
              if (e.kind === "boss") {
                this.ev.onToast(`${e.name} foi derrubado!`, "good");
                this.updateMusic();
              }
            }
            break;
          }
        }
      } else if (P.inv <= 0 && P.downT <= 0) {
        const c = P.pos.clone().add(new THREE.Vector3(0, 1.1, 0));
        if (pos.distanceTo(c) < 0.55) {
          b.life = 0;
          P.hp -= 1;
          P.inv = 1.1;
          this.shake = 0.3;
          sound.sfx("hurt");
          this.burst(c, "#f87171", 10);
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
      const close = new THREE.Vector3(L.terminal.x - 0.5, 1.55, L.terminal.z);
      const k = this.phase === "dive" ? Math.min(1, this.phaseT / 1.7) : 1 - Math.min(1, this.phaseT / 1.1);
      const e = k * k * (3 - 2 * k);
      pos = e < 0.6 ? over.clone().lerp(new THREE.Vector3(L.terminal.x - 1.8, 1.8, L.terminal.z - 0.5), e / 0.6) : new THREE.Vector3(L.terminal.x - 1.8, 1.8, L.terminal.z - 0.5).lerp(close, (e - 0.6) / 0.4);
      look = screen;
      if (this.phase === "dive" && this.phaseT > 1.8) this.setPhase("hack");
      if (this.phase === "surface" && this.phaseT >= 1.05 && this.queue.length === 0) this.setPhase("play");
      snap = true;
    } else if (this.phase === "escape" || this.phase === "done") {
      const car = L.car;
      const back = new THREE.Vector3(-Math.sin(car.rotation.y), 0, -Math.cos(car.rotation.y));
      pos = car.position.clone().addScaledVector(back, 9).add(new THREE.Vector3(0, 4, 0));
      look = car.position.clone().add(new THREE.Vector3(0, 1, 0));
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
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
    });
  }
}
