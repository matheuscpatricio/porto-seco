import type { Look } from "@/game/characters";

export type Pose = "idle" | "run" | "jump" | "shoot" | "hurt" | "down" | "talk" | "cheer" | "sit";

type Pt = { x: number; y: number };

function limb(ctx: CanvasRenderingContext2D, from: Pt, a1: number, l1: number, a2: number, l2: number, dir: number, width: number, color: string) {
  const mid = { x: from.x + Math.sin(a1) * l1 * dir, y: from.y + Math.cos(a1) * l1 };
  const end = { x: mid.x + Math.sin(a2) * l2 * dir, y: mid.y + Math.cos(a2) * l2 };
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(mid.x, mid.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  return end;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Draws a full-body character with feet at (x, y). `dir` is 1 when facing right, -1 when facing left. */
export function drawHuman(ctx: CanvasRenderingContext2D, look: Look, pose: Pose, x: number, y: number, dir: number, s: number, t: number, flash = false) {
  ctx.save();
  if (pose === "down") {
    ctx.translate(x, y - 5 * s);
    ctx.rotate((-Math.PI / 2) * dir);
    ctx.translate(-x, -y + 5 * s + 30 * s);
  }
  const big = look.build === "big" ? 1.25 : look.build === "slim" ? 0.9 : 1;
  const bob = pose === "run" ? Math.abs(Math.sin(t * 12)) * 2.5 * s : pose === "cheer" ? Math.abs(Math.sin(t * 7)) * 8 * s : pose === "idle" || pose === "talk" ? Math.sin(t * 2) * 0.8 * s : 0;
  const hipY = y - 30 * s - bob;
  const shY = y - 53 * s - bob;
  const headY = y - 64 * s - bob;
  const tw = 15 * s * big;
  const lean = pose === "hurt" ? -0.25 : pose === "run" ? 0.12 : 0;

  const legs: [number, number][] = [];
  const arms: [number, number][] = [];
  const cyc = t * 12;
  for (let i = 0; i < 2; i++) {
    const ph = i === 0 ? 0 : Math.PI;
    if (pose === "run") {
      const a = Math.sin(cyc + ph) * 0.75;
      legs.push([a, a - 0.35 - Math.max(0, Math.sin(cyc + ph + 1.3)) * 0.9]);
      arms.push([-Math.sin(cyc + ph) * 0.8, -Math.sin(cyc + ph) * 0.8 + 1.1]);
    } else if (pose === "jump") {
      legs.push(i === 0 ? [0.8, -0.3] : [-0.1, -0.9]);
      arms.push(i === 0 ? [2.4, 2.6] : [-0.9, -0.4]);
    } else if (pose === "cheer") {
      legs.push(i === 0 ? [0.15, 0.1] : [-0.15, -0.1]);
      arms.push([Math.PI - 0.35 + Math.sin(t * 7 + ph) * 0.15, Math.PI - 0.15]);
    } else if (pose === "sit") {
      legs.push([1.5, 0]);
      arms.push([0.9, 1.5]);
    } else {
      const sway = pose === "hurt" ? 0.3 : 0.06;
      legs.push(i === 0 ? [sway, sway] : [-sway, -sway]);
      if (pose === "talk" && i === 0) arms.push([0.5 + Math.sin(t * 5) * 0.35, 1.5 + Math.sin(t * 5) * 0.3]);
      else if (pose === "hurt") arms.push([-1.2, -0.6]);
      else arms.push(i === 0 ? [0.1, 0.25] : [-0.1, 0.05]);
    }
  }
  if (pose === "shoot") {
    arms[0] = [Math.PI / 2, Math.PI / 2];
    arms[1] = [0.9, Math.PI / 2 - 0.1];
  }

  const sleeve = look.jacket ?? look.shirt;
  const legW = 6.5 * s * (big > 1 ? 1.2 : 1);
  const armW = 5 * s * (big > 1 ? 1.25 : 1);
  const hip = { x: x + lean * 10 * s * dir, y: hipY };
  const sh = { x: x + lean * 18 * s * dir, y: shY };
  const shade = (c: string) => (flash ? "#ffffff" : c);

  const drawLeg = (i: number) => {
    const foot = limb(ctx, { x: hip.x + (i === 0 ? 2 : -2) * s * dir, y: hip.y }, legs[i][0], 14 * s, legs[i][1], 14 * s, dir, legW, shade(look.pants));
    ctx.fillStyle = shade(look.shoes);
    ctx.beginPath();
    ctx.ellipse(foot.x + 3 * s * dir, foot.y + 1 * s, 5.5 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const drawArm = (i: number) => {
    const hand = limb(ctx, { x: sh.x + (i === 0 ? 3 : -3) * s * dir, y: sh.y + 2 * s }, arms[i][0], 11 * s, arms[i][1], 11 * s, dir, armW, shade(sleeve));
    circle(ctx, hand.x, hand.y, 2.8 * s, shade(look.skin));
    if (i === 0 && pose === "shoot") {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(hand.x - (dir < 0 ? 12 * s : 0), hand.y - 3 * s, 12 * s, 5 * s);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(hand.x + (dir > 0 ? 8 * s : -11 * s), hand.y - 3 * s, 3 * s, 5 * s);
      if (Math.sin(t * 40) > 0) circle(ctx, hand.x + 16 * s * dir, hand.y - 0.5 * s, 3.5 * s, "#fde047");
    }
  };

  ctx.globalAlpha = 0.92;
  drawLeg(1);
  drawArm(1);
  ctx.globalAlpha = 1;

  ctx.fillStyle = shade(look.shirt);
  ctx.beginPath();
  ctx.roundRect(sh.x - tw / 2, sh.y - 2 * s, tw, hip.y - sh.y + 6 * s, 5 * s);
  ctx.fill();
  if (look.extras.includes("jacket") && look.jacket) {
    ctx.fillStyle = shade(look.jacket);
    ctx.fillRect(sh.x - tw / 2, sh.y - 1 * s, tw * 0.32, hip.y - sh.y + 5 * s);
    ctx.fillRect(sh.x + tw / 2 - tw * 0.32, sh.y - 1 * s, tw * 0.32, hip.y - sh.y + 5 * s);
  }
  if (look.extras.includes("vest")) {
    ctx.fillStyle = shade(look.jacket ?? "#0f172a");
    ctx.beginPath();
    ctx.roundRect(sh.x - tw / 2 - 1 * s, sh.y + 3 * s, tw + 2 * s, (hip.y - sh.y) * 0.75, 3 * s);
    ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(sh.x - tw / 4, sh.y + 8 * s, tw / 2, 2 * s);
  }
  if (look.extras.includes("tie")) {
    ctx.fillStyle = shade(look.accent ?? "#b91c1c");
    ctx.beginPath();
    ctx.moveTo(sh.x - 2 * s, sh.y);
    ctx.lineTo(sh.x + 2 * s, sh.y);
    ctx.lineTo(sh.x + 1 * s, sh.y + 14 * s);
    ctx.lineTo(sh.x - 1 * s, sh.y + 14 * s);
    ctx.fill();
  }
  ctx.fillStyle = shade("#27272a");
  ctx.fillRect(hip.x - tw / 2, hip.y - 1 * s, tw, 3 * s);

  drawLeg(0);

  const hx = sh.x + 1 * s * dir;
  const r = 8.5 * s;
  if (look.hairStyle === "ponytail") circle(ctx, hx - 8 * s * dir, headY + 1 * s + Math.sin(t * 8) * (pose === "run" ? 1.5 : 0.3) * s, 4.5 * s, shade(look.hair));
  circle(ctx, sh.x, sh.y - 3 * s, 3 * s, shade(look.skin));
  circle(ctx, hx, headY, r, shade(look.skin));

  if (look.extras.includes("mask")) {
    circle(ctx, hx, headY, r + 0.5 * s, "#111111");
    circle(ctx, hx + 2 * s * dir, headY - 1.5 * s, 2.4 * s, "#f5f5f4");
    circle(ctx, hx + 6 * s * dir, headY - 1.5 * s, 2 * s, "#f5f5f4");
    ctx.fillStyle = "#f5f5f4";
    for (let k = 0; k < 3; k++) ctx.fillRect(hx + (1 + k * 2.2) * s * dir - 0.6 * s, headY + 3.5 * s, 1.2 * s, 2.5 * s);
  } else {
    ctx.fillStyle = shade(look.hair);
    if (look.hairStyle === "short" || look.hairStyle === "ponytail") {
      ctx.beginPath();
      ctx.arc(hx, headY - 1 * s, r + 0.6 * s, Math.PI * 1.02, Math.PI * 1.98);
      ctx.fill();
      ctx.fillRect(hx - (r + 0.3 * s) * dir - (dir < 0 ? 0 : 0), headY - 3 * s, 3 * s * dir, 6 * s);
    } else if (look.hairStyle === "buzz") {
      ctx.beginPath();
      ctx.arc(hx, headY - 0.5 * s, r + 0.3 * s, Math.PI * 1.08, Math.PI * 1.92);
      ctx.fill();
    } else if (look.hairStyle === "slick") {
      ctx.beginPath();
      ctx.ellipse(hx - 1.5 * s * dir, headY - 4.5 * s, r, 5 * s, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (look.hairStyle === "curly") {
      for (let k = -3; k <= 3; k++) circle(ctx, hx + k * 2.6 * s, headY - 7 * s + Math.abs(k) * 1.1 * s, 3.4 * s, shade(look.hair));
      circle(ctx, hx - 6.5 * s * dir, headY - 1 * s, 3.4 * s, shade(look.hair));
    }
    circle(ctx, hx + 4.5 * s * dir, headY - 1.2 * s, 1.2 * s, "#111111");
    if (look.extras.includes("glasses")) {
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1.2 * s;
      ctx.strokeRect(hx + 2.3 * s * dir - (dir < 0 ? 4.5 * s : 0), headY - 3 * s, 4.5 * s, 3.5 * s);
    }
    if (look.extras.includes("mustache")) {
      ctx.fillStyle = shade(look.hair === "#111111" ? "#111111" : look.hair);
      ctx.fillRect(hx + 3 * s * dir - (dir < 0 ? 5 * s : 0), headY + 2.2 * s, 5 * s, 1.6 * s);
    }
    if (look.extras.includes("beard")) {
      ctx.fillStyle = shade("#3f2a1d");
      ctx.beginPath();
      ctx.arc(hx + 1.5 * s * dir, headY + 3 * s, 6 * s, 0.1, Math.PI - 0.1);
      ctx.fill();
    }
    const talking = pose === "talk" && Math.sin(t * 14) > 0;
    ctx.fillStyle = "#3f1d1d";
    ctx.fillRect(hx + 4 * s * dir - (dir < 0 ? 3 * s : 0), headY + 4 * s, 3 * s, talking ? 2 * s : 0.8 * s);
  }
  if (look.extras.includes("cap")) {
    ctx.fillStyle = shade(look.accent ?? "#1f2937");
    ctx.beginPath();
    ctx.arc(hx, headY - 2 * s, r + 0.4 * s, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(hx, headY - 3 * s, 11 * s * dir, 2.2 * s);
  }

  drawArm(0);
  ctx.restore();
}

export function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, sky: [string, string]) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky[0]);
  g.addColorStop(1, sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function drawSkyline(ctx: CanvasRenderingContext2D, camX: number, w: number, ground: number, color: string, factor: number, seed: number, tall: number, windows: boolean) {
  const off = camX * factor;
  const bw = 70;
  const first = Math.floor(off / bw) - 1;
  for (let i = first; i < first + w / bw + 3; i++) {
    const r = hash(i + seed);
    const bh = 60 + r * tall;
    const bx = i * bw - off;
    ctx.fillStyle = color;
    ctx.fillRect(bx, ground - bh, bw - 6, bh);
    if (windows) {
      for (let wy = ground - bh + 10; wy < ground - 12; wy += 16) {
        for (let wx = bx + 8; wx < bx + bw - 14; wx += 14) {
          if (hash(wx * 3.1 + wy * 7.7 + seed) > 0.55) {
            ctx.fillStyle = "rgba(253, 224, 71, 0.55)";
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
    }
  }
}

export function drawDrone(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, flash: boolean) {
  ctx.fillStyle = flash ? "#fff" : "#1f2937";
  ctx.beginPath();
  ctx.ellipse(x, y, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  circle(ctx, x, y + 2, 2.5 + Math.sin(t * 10) * 0.8, "#ef4444");
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 10, y - 3);
    ctx.lineTo(x + side * 20, y - 9);
    ctx.stroke();
    const blade = Math.abs(Math.sin(t * 50)) * 10 + 2;
    ctx.fillStyle = "rgba(203, 213, 225, 0.7)";
    ctx.fillRect(x + side * 20 - blade, y - 11, blade * 2, 2);
  }
}

export function drawCar(ctx: CanvasRenderingContext2D, x: number, ground: number, color: string, t: number, moving: boolean) {
  const y = ground;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - 70, y - 38, 140, 26, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - 38, y - 60, 72, 26, 10);
  ctx.fill();
  ctx.fillStyle = "#93c5fd";
  ctx.fillRect(x - 32, y - 55, 30, 18);
  ctx.fillRect(x + 2, y - 55, 26, 18);
  ctx.fillStyle = "#fde047";
  ctx.fillRect(x + 62, y - 32, 8, 6);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x - 70, y - 32, 6, 6);
  for (const wx of [x - 42, x + 42]) {
    circle(ctx, wx, y - 10, 12, "#111827");
    circle(ctx, wx, y - 10, 5, "#9ca3af");
    if (moving) {
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx, y - 10);
      ctx.lineTo(wx + Math.cos(t * 30) * 5, y - 10 + Math.sin(t * 30) * 5);
      ctx.stroke();
    }
  }
}

export function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#92400e";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 3);
  ctx.lineTo(x + w - 3, y + h - 3);
  ctx.stroke();
}

export function drawTerminal(ctx: CanvasRenderingContext2D, x: number, ground: number, near: boolean, t: number) {
  ctx.fillStyle = "#334155";
  ctx.fillRect(x - 16, ground - 70, 32, 70);
  ctx.fillStyle = near ? `rgba(34, 197, 94, ${0.6 + Math.sin(t * 6) * 0.3})` : "#0f766e";
  ctx.fillRect(x - 12, ground - 64, 24, 18);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(x - 12, ground - 40, 24, 10);
}
