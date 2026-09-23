import type { Level, Who, World } from "@/content/types";
import { sound } from "@/game/audio";
import { guardLook, Look, people } from "@/game/characters";
import { drawCar, drawCrate, drawDrone, drawHuman, drawSky, drawSkyline, drawTerminal, Pose } from "@/game/draw";

export const VW = 960;
export const VH = 420;
const GROUND = 360;
const GRAVITY = 1900;
const RUN = 250;
const JUMP = 720;

export type Phase = "brief" | "play" | "hack" | "result" | "open" | "escape" | "done";
export type Input = { left: boolean; right: boolean; jump: boolean; shoot: boolean; use: boolean };
export type LockState = "idle" | "ok" | "bad";
export type HackOutcome = { ok: boolean; locks: boolean[] | null; screen: string | null; broken: boolean };

type Box = { x: number; y: number; w: number; h: number };
type Actor = {
  kind: "guard" | "drone" | "boss";
  x: number;
  y: number;
  vx: number;
  home: number;
  hp: number;
  maxHp: number;
  dir: number;
  cooldown: number;
  flash: number;
  dead: number;
  shootPose: number;
  look: Look;
  zone: 1 | 2;
  name?: string;
  t: number;
};
type Bullet = { x: number; y: number; vx: number; vy: number; mine: boolean; life: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Npc = { who: Who; x: number; dir: number };

export type GameEvents = {
  onPhase: (p: Phase) => void;
  onToast: (text: string, tone?: "info" | "bad" | "good") => void;
  onNear: (near: boolean) => void;
  onHp: (hp: number) => void;
};

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export class Game {
  phase: Phase = "brief";
  t = 0;
  camX = 0;
  player = { x: 90, y: GROUND, vx: 0, vy: 0, dir: 1, grounded: true, hp: 3, inv: 0, shootT: 0, cooldown: 0, downT: 0, cheerT: 0 };
  checkpoint = 90;
  crates: Box[] = [];
  actors: Actor[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  npcs: Npc[] = [];
  talking: Who | null = null;
  terminalX: number;
  barrierX: number;
  endX: number;
  carX: number;
  barrierLift = 0;
  locks: LockState[];
  screenText: string | null = null;
  alarmT = 0;
  shake = 0;
  hacked = false;
  near = false;
  escapeT = 0;
  resultQueue: { at: number; fn: () => void }[] = [];
  private lastHp = 3;
  private usePressed = false;
  private jumpHeld = false;

  constructor(
    public level: Level,
    public world: World,
    public index: number,
    private ev: GameEvents,
  ) {
    const r = rng(index + 7);
    this.terminalX = 1150 + Math.min(index, 20) * 30;
    this.barrierX = this.terminalX + 160;
    this.endX = this.barrierX + 900;
    this.carX = this.endX - 110;
    this.locks = level.display.kind === "locks" ? level.display.events.map(() => "idle") : [];

    const crateCount = 3 + (index % 3);
    for (let i = 0; i < crateCount; i++) {
      const cx = 320 + (i * (this.terminalX - 480)) / crateCount + r() * 60;
      const h = r() > 0.5 ? 44 : 60;
      this.crates.push({ x: cx, y: GROUND - h, w: 50, h });
      if (r() > 0.65) this.crates.push({ x: cx + 5, y: GROUND - h - 40, w: 40, h: 40 });
    }
    for (let i = 0; i < 2 + (index % 2); i++) {
      const cx = this.barrierX + 200 + i * 230 + r() * 60;
      this.crates.push({ x: cx, y: GROUND - 48, w: 50, h: 48 });
    }

    const guards1 = Math.min(1 + Math.floor(index / 4), 4);
    const drones1 = Math.min(1 + Math.floor(index / 6), 3);
    for (let i = 0; i < guards1; i++) this.spawn("guard", 520 + ((this.terminalX - 700) * (i + 0.5)) / guards1, 1);
    for (let i = 0; i < drones1; i++) this.spawn("drone", 700 + ((this.terminalX - 800) * (i + 0.3)) / drones1, 1);
    const guards2 = Math.min(1 + Math.floor(index / 5), 4);
    for (let i = 0; i < guards2; i++) this.spawn("guard", this.barrierX + 260 + i * 150, 2);
    if (index >= 6) this.spawn("drone", this.barrierX + 480, 2);
    if (level.boss) {
      const b = this.spawn("boss", this.carX - 200, 2);
      b.look = people[level.boss].look;
      b.name = people[level.boss].name;
    }

    const allies = Array.from(new Set(level.brief.map((l) => l.who).filter((w) => w !== "leo" && people[w].ally)));
    allies.forEach((who, i) => this.npcs.push({ who, x: 170 + i * 60, dir: -1 }));
  }

  spawn(kind: Actor["kind"], x: number, zone: 1 | 2) {
    const hp = kind === "boss" ? 12 + Math.floor(this.index / 3) : kind === "drone" ? 1 : 2;
    const a: Actor = {
      kind,
      x,
      y: kind === "drone" ? GROUND - 170 : GROUND,
      vx: 0,
      home: x,
      hp,
      maxHp: hp,
      dir: -1,
      cooldown: 1 + Math.random(),
      flash: 0,
      dead: 0,
      shootPose: 0,
      look: guardLook,
      zone,
      t: Math.random() * 10,
    };
    this.actors.push(a);
    return a;
  }

  setPhase(p: Phase) {
    if (p === "hack" && this.phase !== "hack") sound.sfx("terminal");
    this.phase = p;
    this.ev.onPhase(p);
    this.updateMusic();
  }

  updateMusic() {
    const p = this.phase;
    const bossAlive = this.actors.some((a) => a.kind === "boss" && a.hp > 0);
    sound.setMusic(p === "brief" ? "menu" : p === "hack" || p === "result" ? "hack" : p === "escape" || p === "done" ? "off" : this.hacked && bossAlive ? "boss" : "play");
  }

  startPlay() {
    this.talking = null;
    this.setPhase("play");
  }

  closeHack() {
    if (this.phase === "hack") this.setPhase("play");
  }

  applyHack(o: HackOutcome) {
    this.setPhase("result");
    this.screenText = null;
    this.locks = this.locks.map(() => "idle");
    let at = this.t + 0.5;
    if (o.broken) {
      this.queue(at, () => {
        this.burst(this.terminalX, GROUND - 60, "#94a3b8", 24);
        sound.sfx("lockBad");
        this.ev.onToast("O código deu erro e o terminal travou!", "bad");
      });
      at += 0.8;
    } else if (this.level.display.kind === "screen") {
      this.queue(at, () => {
        this.screenText = o.screen || "(tela vazia)";
        sound.sfx("terminal");
      });
      at += 1.2;
    } else if (o.locks) {
      o.locks.forEach((ok, i) => {
        this.queue(at, () => {
          this.locks[i] = ok ? "ok" : "bad";
          sound.sfx(ok ? "lockOk" : "lockBad");
          this.burst(this.barrierX, GROUND - 170 + i * 26, ok ? "#22c55e" : "#ef4444", 8);
        });
        at += 0.55;
      });
      at += 0.4;
    }
    this.queue(at, () => (o.ok ? this.succeed() : this.fail()));
  }

  private succeed() {
    this.hacked = true;
    this.player.cheerT = 1.4;
    sound.sfx("success");
    setTimeout(() => sound.sfx("gate"), 250);
    this.setPhase("open");
    this.ev.onToast(`${this.level.target}: acesso liberado!`, "good");
    this.queue(this.t + 1.6, () => {
      this.checkpoint = this.barrierX + 80;
      this.setPhase("play");
      const s = this.level.success;
      this.ev.onToast(`${people[s.who].name}: "${s.text}"`, "info");
    });
  }

  private fail() {
    this.alarmT = 3.5;
    sound.sfx("alarm");
    this.shake = 0.5;
    this.spawn("guard", Math.max(40, this.camX + 30), 1).cooldown = 1.4;
    this.spawn("guard", this.terminalX + 120, 1).cooldown = 1.8;
    this.setPhase("play");
    this.ev.onToast("ALARME! Chegaram reforços. Derrube os seguranças e tente o terminal de novo.", "bad");
  }

  private queue(at: number, fn: () => void) {
    this.resultQueue.push({ at, fn });
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 220;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0.5 + Math.random() * 0.5, color, size: 2 + Math.random() * 3 });
    }
  }

  private solids(): Box[] {
    const s = [...this.crates];
    if (!this.hacked || this.barrierLift < 1) s.push({ x: this.barrierX - 12, y: GROUND - 190 + this.barrierLift * 190, w: 24, h: 190 });
    return s;
  }

  update(dt: number, input: Input) {
    this.t += dt;
    dt = Math.min(dt, 1 / 30);
    const due = this.resultQueue.filter((q) => this.t >= q.at);
    this.resultQueue = this.resultQueue.filter((q) => this.t < q.at);
    due.forEach((q) => q.fn());
    if (this.hacked && this.barrierLift < 1) this.barrierLift = Math.min(1, this.barrierLift + dt * 0.9);
    this.alarmT = Math.max(0, this.alarmT - dt);
    this.shake = Math.max(0, this.shake - dt);

    const p = this.player;
    const canControl = this.phase === "play" && p.downT <= 0;
    p.inv = Math.max(0, p.inv - dt);
    p.shootT = Math.max(0, p.shootT - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.cheerT = Math.max(0, p.cheerT - dt);

    if (p.downT > 0) {
      p.downT -= dt;
      if (p.downT <= 0) {
        p.x = this.checkpoint;
        p.y = GROUND;
        p.vy = 0;
        p.hp = 3;
        p.inv = 1.5;
        this.bullets = [];
        this.ev.onToast("Você foi derrubado e voltou para o último ponto seguro.", "info");
      }
    }

    if (this.phase === "escape") {
      this.escapeT += dt;
      this.carX += dt * Math.min(600, this.escapeT * 500);
      if (this.escapeT > 2.2) {
        this.setPhase("done");
      }
    } else {
      p.vx = 0;
      if (canControl) {
        if (input.left) {
          p.vx = -RUN;
          p.dir = -1;
        }
        if (input.right) {
          p.vx = RUN;
          p.dir = 1;
        }
        if (input.jump && !this.jumpHeld && p.grounded) {
          p.vy = -JUMP;
          p.grounded = false;
          sound.sfx("jump");
        }
        if (input.shoot && p.cooldown <= 0) {
          p.cooldown = 0.28;
          p.shootT = 0.25;
          this.bullets.push({ x: p.x + p.dir * 30, y: p.y - 45, vx: p.dir * 760, vy: 0, mine: true, life: 1.1 });
          sound.sfx("shoot");
        }
      }
      this.jumpHeld = input.jump;
      this.movePlayer(dt);
    }

    this.near = Math.abs(p.x - this.terminalX) < 70 && !this.hacked;
    this.ev.onNear(this.near && this.phase === "play");
    if (canControl && this.near && input.use && !this.usePressed) this.setPhase("hack");
    this.usePressed = input.use;

    if (this.phase === "play" && this.hacked && p.x > this.carX - 90 && !this.actors.some((a) => a.kind === "boss" && a.hp > 0)) {
      this.phase = "escape";
      this.ev.onPhase("escape");
      this.updateMusic();
      sound.sfx("car");
      this.ev.onToast("Tio Rui: \"Entra, entra! Segura firme!\"", "good");
    }
    if (this.phase === "play" && this.hacked && p.x > this.carX - 200 && this.actors.some((a) => a.kind === "boss" && a.hp > 0) && Math.floor(this.t * 2) % 8 === 0) {
      this.ev.onToast("Derrube o chefe antes de fugir!", "bad");
    }

    const active = this.phase === "play" || this.phase === "result" || this.phase === "open";
    for (const a of this.actors) this.updateActor(a, dt, active);

    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const s of this.solids()) {
        if (b.x > s.x && b.x < s.x + s.w && b.y > s.y && b.y < s.y + s.h) {
          b.life = 0;
          this.burst(b.x, b.y, "#fde047", 4);
        }
      }
      if (b.mine) {
        for (const a of this.actors) {
          if (a.hp <= 0 || b.life <= 0) continue;
          const top = a.kind === "drone" ? a.y - 12 : a.y - (a.kind === "boss" ? 90 : 72);
          const bottom = a.kind === "drone" ? a.y + 12 : a.y;
          const half = a.kind === "drone" ? 22 : a.kind === "boss" ? 22 : 16;
          if (Math.abs(b.x - a.x) < half && b.y > top && b.y < bottom) {
            b.life = 0;
            a.hp -= 1;
            a.flash = 0.12;
            sound.sfx("hit");
            this.burst(b.x, b.y, "#60a5fa", 8);
            if (a.hp <= 0) {
              this.burst(a.x, a.y - 30, a.kind === "drone" ? "#f97316" : "#93c5fd", 20);
              this.shake = 0.2;
              sound.sfx(a.kind === "drone" ? "boom" : "enemyDown");
              if (a.kind === "boss") {
                this.ev.onToast(`${a.name} foi derrubado!`, "good");
                this.updateMusic();
              }
            }
          }
        }
      } else if (p.inv <= 0 && p.downT <= 0 && Math.abs(b.x - p.x) < 14 && b.y > p.y - 72 && b.y < p.y) {
        b.life = 0;
        this.hurtPlayer();
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);

    for (const q of this.particles) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vy += 600 * dt;
      q.life -= dt;
    }
    this.particles = this.particles.filter((q) => q.life > 0);

    if (p.hp !== this.lastHp) {
      this.lastHp = p.hp;
      this.ev.onHp(p.hp);
    }

    const target = (this.phase === "escape" ? this.carX : p.x) - VW * 0.38;
    this.camX += (Math.max(0, Math.min(this.endX - VW + 60, target)) - this.camX) * Math.min(1, dt * 6);
  }

  private hurtPlayer() {
    const p = this.player;
    p.hp -= 1;
    p.inv = 1;
    sound.sfx("hurt");
    this.shake = 0.25;
    this.burst(p.x, p.y - 40, "#f87171", 10);
    if (p.hp <= 0) {
      p.downT = 1.4;
    }
  }

  private movePlayer(dt: number) {
    const p = this.player;
    const w = 12;
    const h = 70;
    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.x = Math.max(20, Math.min(this.endX - 20, p.x));
    for (const s of this.solids()) {
      if (p.x + w > s.x && p.x - w < s.x + s.w && p.y > s.y + 4 && p.y - h < s.y + s.h) {
        p.x = p.vx > 0 ? s.x - w : p.vx < 0 ? s.x + s.w + w : p.x;
      }
    }
    p.y += p.vy * dt;
    p.grounded = false;
    if (p.y >= GROUND) {
      p.y = GROUND;
      p.vy = 0;
      p.grounded = true;
    }
    for (const s of this.solids()) {
      if (p.x + w > s.x && p.x - w < s.x + s.w) {
        if (p.vy >= 0 && p.y >= s.y && p.y - p.vy * dt <= s.y + 2) {
          p.y = s.y;
          p.vy = 0;
          p.grounded = true;
        } else if (p.vy < 0 && p.y - h < s.y + s.h && p.y - h > s.y) {
          p.vy = 0;
        }
      }
    }
  }

  private updateActor(a: Actor, dt: number, active: boolean) {
    a.t += dt;
    a.flash = Math.max(0, a.flash - dt);
    a.shootPose = Math.max(0, a.shootPose - dt);
    if (a.hp <= 0) {
      a.dead += dt;
      if (a.kind === "drone") a.y = Math.min(GROUND - 8, a.y + dt * 260);
      return;
    }
    const p = this.player;
    const dx = p.x - a.x;
    const inZone = a.zone === 1 ? p.x < this.barrierX + 10 : this.hacked;
    const engaged = active && inZone && Math.abs(dx) < (a.kind === "boss" ? 520 : 440) && p.downT <= 0;

    if (a.kind === "drone") {
      a.x = a.home + Math.sin(a.t * 0.9) * 140;
      a.y = GROUND - 170 + Math.sin(a.t * 2.3) * 14;
      a.dir = dx > 0 ? 1 : -1;
    } else if (engaged) {
      a.dir = dx > 0 ? 1 : -1;
      const keep = a.kind === "boss" ? 220 : 260;
      if (Math.abs(dx) > keep) a.x += a.dir * (a.kind === "boss" ? 110 : 80) * dt;
      a.vx = Math.abs(dx) > keep ? 1 : 0;
    } else {
      const speed = 60;
      if (a.vx === 0) a.vx = a.dir;
      a.x += a.vx * speed * dt;
      if (a.x > a.home + 120) {
        a.vx = -1;
        a.dir = -1;
      }
      if (a.x < a.home - 120) {
        a.vx = 1;
        a.dir = 1;
      }
    }

    if (!engaged) return;
    a.cooldown -= dt;
    if (a.cooldown <= 0) {
      const gy = a.kind === "drone" ? a.y + 6 : a.y - (a.kind === "boss" ? 56 : 45);
      const speed = a.kind === "drone" ? 300 : 360;
      if (a.kind === "drone") {
        const ang = Math.atan2(p.y - 40 - gy, dx);
        this.bullets.push({ x: a.x, y: gy, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, mine: false, life: 2.5 });
        a.cooldown = 2.4;
      } else if (a.kind === "boss") {
        for (let k = 0; k < 3; k++) this.queue(this.t + k * 0.15, () => a.hp > 0 && this.bullets.push({ x: a.x + a.dir * 34, y: gy, vx: a.dir * speed, vy: 0, mine: false, life: 2 }));
        a.cooldown = 1.9;
      } else {
        this.bullets.push({ x: a.x + a.dir * 30, y: gy, vx: a.dir * speed, vy: 0, mine: false, life: 2 });
        a.cooldown = 1.6;
      }
      a.shootPose = 0.35;
      if (Math.abs(dx) < 700) sound.sfx("enemyShoot");
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const w = this.world;
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 10 * this.shake);
    drawSky(ctx, VW, VH, w.sky);
    drawSkyline(ctx, this.camX, VW, GROUND - 40, "rgba(0,0,0,0.25)", 0.15, 3, 150, false);
    drawSkyline(ctx, this.camX, VW, GROUND, w.skyline, 0.45, 11, 190, true);

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, GROUND, VW, VH - GROUND);
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(0, GROUND, VW, 6);
    ctx.fillStyle = "#e5e7eb";
    for (let x = -((this.camX * 1) % 80); x < VW; x += 80) ctx.fillRect(x, GROUND + 34, 36, 4);

    ctx.translate(-this.camX, 0);
    const t = this.t;

    for (const c of this.crates) drawCrate(ctx, c.x, c.y, c.w, c.h);
    drawTerminal(ctx, this.terminalX, GROUND, this.near && this.phase === "play", t);
    this.drawMonitor(ctx);
    this.drawBarrier(ctx);

    drawCar(ctx, this.carX, GROUND, "#dc2626", t, this.phase === "escape");
    if (this.phase !== "escape" && this.phase !== "done") drawHuman(ctx, people.rui.look, "sit", this.carX + 8, GROUND - 26, 1, 0.55, t);

    for (const n of this.npcs) {
      drawHuman(ctx, people[n.who].look, this.talking === n.who ? "talk" : "idle", n.x, GROUND, n.dir, 1, t + n.x);
    }

    for (const a of this.actors) {
      if (a.hp <= 0 && a.dead > 3) continue;
      ctx.globalAlpha = a.hp <= 0 ? Math.max(0, 1 - (a.dead - 2)) : 1;
      if (a.kind === "drone") drawDrone(ctx, a.x, a.y, t, a.flash > 0);
      else {
        const pose: Pose = a.hp <= 0 ? "down" : a.shootPose > 0 ? "shoot" : a.vx !== 0 ? "run" : "idle";
        drawHuman(ctx, a.look, pose, a.x, a.y, a.dir, a.kind === "boss" ? 1.25 : 1, a.t, a.flash > 0);
      }
      ctx.globalAlpha = 1;
    }

    const p = this.player;
    if (this.phase !== "escape" && this.phase !== "done" && !(p.inv > 0 && Math.floor(t * 20) % 2 === 0 && p.downT <= 0)) {
      const pose: Pose =
        p.downT > 0 ? "down" : this.phase === "brief" ? (this.talking === "leo" ? "talk" : "idle") : p.cheerT > 0 ? "cheer" : this.phase === "hack" || this.phase === "result" ? "talk" : !p.grounded ? "jump" : p.shootT > 0 ? "shoot" : p.vx !== 0 ? "run" : "idle";
      drawHuman(ctx, people.leo.look, pose, p.x, p.y, this.phase === "hack" || this.phase === "result" ? (this.terminalX > p.x ? 1 : -1) : p.dir, 1, t);
    }
    if (this.phase === "escape" || this.phase === "done") drawHuman(ctx, people.leo.look, "sit", this.carX - 18, GROUND - 26, 1, 0.55, t);

    for (const b of this.bullets) {
      ctx.fillStyle = b.mine ? "#7dd3fc" : "#f87171";
      ctx.fillRect(b.x - 7, b.y - 2, 14, 4);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillRect(b.x - 3, b.y - 1, 6, 2);
    }
    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, q.life * 1.5);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x, q.y, q.size, q.size);
    }
    ctx.globalAlpha = 1;

    if (this.near && this.phase === "play") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.beginPath();
      ctx.roundRect(this.terminalX - 70, GROUND - 120, 140, 28, 8);
      ctx.fill();
      ctx.fillStyle = "#86efac";
      ctx.font = "bold 13px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("E  para hackear", this.terminalX, GROUND - 101);
    }
    ctx.restore();

    this.drawHud(ctx);
    if (this.alarmT > 0) {
      ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + Math.sin(t * 14) * 0.12})`;
      ctx.fillRect(0, 0, VW, VH);
    }
  }

  private drawMonitor(ctx: CanvasRenderingContext2D) {
    const x = this.terminalX + 70;
    const y = GROUND - 250;
    ctx.fillStyle = "#374151";
    ctx.fillRect(x - 3, y + 70, 6, GROUND - y - 70);
    ctx.fillStyle = "#0b1220";
    ctx.strokeStyle = this.hacked ? "#22c55e" : this.alarmT > 0 ? "#ef4444" : "#475569";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x - 90, y, 180, 72, 6);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 10px ui-sans-serif, system-ui";
    ctx.fillText(this.level.target.toUpperCase(), x, y + 14);
    ctx.font = "bold 14px ui-monospace, monospace";
    if (this.level.display.kind === "screen") {
      ctx.fillStyle = this.screenText ? "#fde047" : "#475569";
      const lines = (this.screenText ?? "aguardando comando...").split("\n");
      const shown = lines.length > 3 ? [...lines.slice(0, 2), `... ${lines[lines.length - 1]}`] : lines;
      shown.forEach((l, i) => ctx.fillText(l.slice(0, 22), x, y + 34 + i * 16));
    } else {
      ctx.fillStyle = this.hacked ? "#22c55e" : "#64748b";
      ctx.fillText(this.hacked ? "ACESSO LIBERADO" : this.alarmT > 0 ? "ACESSO NEGADO" : "BLOQUEADO", x, y + 42);
      ctx.font = "10px ui-sans-serif, system-ui";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`${this.locks.filter((l) => l === "ok").length}/${this.locks.length} travas`, x, y + 60);
    }
  }

  private drawBarrier(ctx: CanvasRenderingContext2D) {
    const x = this.barrierX;
    const lift = this.barrierLift * 190;
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(x - 20, GROUND - 200, 8, 200);
    ctx.fillRect(x + 12, GROUND - 200, 8, 200);
    ctx.fillStyle = "#111827";
    ctx.fillRect(x - 22, GROUND - 206, 44, 8);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 14, GROUND - 198, 28, 198);
    ctx.clip();
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(x - 12, GROUND - 190 - lift, 24, 190);
    ctx.fillStyle = "#4b5563";
    for (let k = 0; k < 8; k++) ctx.fillRect(x - 12, GROUND - 186 - lift + k * 24, 24, 4);
    ctx.restore();
    const n = Math.max(1, this.locks.length);
    for (let i = 0; i < n; i++) {
      const st = this.locks[i] ?? (this.hacked ? "ok" : "idle");
      const lit = this.level.display.kind === "screen" ? (this.hacked ? "ok" : this.alarmT > 0 ? "bad" : "idle") : st;
      ctx.fillStyle = lit === "ok" ? "#22c55e" : lit === "bad" ? "#ef4444" : "#334155";
      ctx.beginPath();
      ctx.arc(x - 26, GROUND - 170 + i * 26, 6, 0, Math.PI * 2);
      ctx.fill();
      if (lit !== "idle") {
        ctx.fillStyle = lit === "ok" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";
        ctx.beginPath();
        ctx.arc(x - 26, GROUND - 170 + i * 26, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawHud(ctx: CanvasRenderingContext2D) {
    const boss = this.actors.find((a) => a.kind === "boss");
    if (boss && boss.hp > 0 && this.hacked) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(VW / 2 - 160, 14, 320, 30);
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "bold 11px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(boss.name ?? "Chefe", VW / 2, 27);
      ctx.fillStyle = "#450a0a";
      ctx.fillRect(VW / 2 - 150, 32, 300, 7);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(VW / 2 - 150, 32, (300 * boss.hp) / boss.maxHp, 7);
    }
  }
}
