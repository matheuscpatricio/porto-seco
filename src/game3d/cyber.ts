import { people } from "@/game/characters";
import { animate, buildHuman, Rig } from "@/game3d/human";
import * as THREE from "three";

type Lock = { group: THREE.Group; body: THREE.MeshBasicMaterial; shackle: THREE.Mesh; state: "idle" | "ok" | "bad"; t: number };

function label(text: string, color = "#a7f3d0") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(2, 20, 12, 0.85)";
  g.fillRect(0, 0, 512, 96);
  g.strokeStyle = color;
  g.lineWidth = 4;
  g.strokeRect(2, 2, 508, 92);
  g.fillStyle = color;
  g.font = "bold 34px monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text.length > 26 ? text.slice(0, 25) + "…" : text, 256, 48);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(2.6, 0.5, 1);
  return s;
}

export class Cyber {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 200);
  avatar: Rig;
  locks: Lock[] = [];
  screen: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; mesh: THREE.Mesh } | null = null;
  private streams: THREE.Points;
  private grid: THREE.GridHelper;
  private t = 0;
  alarm = 0;
  success = 0;

  constructor(labels: string[] | null, title: string) {
    const s = this.scene;
    s.background = new THREE.Color("#010805");
    s.fog = new THREE.Fog("#010805", 8, 45);
    this.grid = new THREE.GridHelper(120, 60, "#10b981", "#064e3b");
    s.add(this.grid);
    s.add(new THREE.AmbientLight("#ffffff", 1));

    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 25;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.streams = new THREE.Points(g, new THREE.PointsMaterial({ color: "#34d399", size: 0.08, transparent: true, opacity: 0.8 }));
    s.add(this.streams);

    this.avatar = buildHuman(people.leo.look, { wire: "#22d3ee" });
    this.avatar.armed = false;
    s.add(this.avatar.root);

    const t = label(title.toUpperCase(), "#67e8f9");
    t.position.set(0, 5.2, 6);
    t.scale.set(5, 0.9, 1);
    s.add(t);

    if (labels) {
      const count = labels.length;
      labels.forEach((text, i) => {
        const a = count === 1 ? 0 : (-0.55 + (1.1 * i) / (count - 1)) * (count > 3 ? 1.2 : 1);
        const group = new THREE.Group();
        group.position.set(Math.sin(a) * 6, 1.6, Math.cos(a) * 6);
        group.lookAt(0, 1.6, 0);
        const body = new THREE.MeshBasicMaterial({ color: "#0e7490", wireframe: false, transparent: true, opacity: 0.85 });
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.35), body);
        group.add(b);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, 0.9, 0.35)), new THREE.LineBasicMaterial({ color: "#67e8f9" }));
        group.add(edges);
        const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.07, 8, 16, Math.PI), new THREE.MeshBasicMaterial({ color: "#a5f3fc" }));
        shackle.position.y = 0.45;
        group.add(shackle);
        const l = label(text);
        l.position.y = 1.35;
        group.add(l);
        s.add(group);
        this.locks.push({ group, body, shackle, state: "idle", t: 0 });
      });
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 320;
      const tex = new THREE.CanvasTexture(canvas);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.75), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95 }));
      mesh.position.set(0, 2.6, 6);
      mesh.rotation.y = Math.PI;
      s.add(mesh);
      this.screen = { canvas, tex, mesh };
      this.setScreen(["aguardando código..."], "#6ee7b7");
    }
  }

  setScreen(lines: string[], color = "#fde047") {
    if (!this.screen) return;
    const { canvas, tex } = this.screen;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "rgba(2, 16, 10, 0.92)";
    g.fillRect(0, 0, 512, 320);
    g.strokeStyle = "#34d399";
    g.lineWidth = 6;
    g.strokeRect(3, 3, 506, 314);
    g.fillStyle = color;
    g.font = "bold 34px monospace";
    g.textAlign = "center";
    const shown = lines.length > 6 ? [...lines.slice(0, 4), "...", lines[lines.length - 1]] : lines;
    shown.forEach((l, i) => g.fillText(l.slice(0, 24), 256, 60 + i * 44));
    tex.needsUpdate = true;
  }

  setLock(i: number, ok: boolean) {
    const l = this.locks[i];
    if (!l) return;
    l.state = ok ? "ok" : "bad";
    l.t = 0;
    l.body.color.set(ok ? "#16a34a" : "#dc2626");
  }

  reset() {
    this.alarm = 0;
    this.success = 0;
    for (const l of this.locks) {
      l.state = "idle";
      l.body.color.set("#0e7490");
      l.shackle.position.y = 0.45;
      l.group.position.y = 1.6;
    }
    this.setScreen(["aguardando código..."], "#6ee7b7");
  }

  update(dt: number, typing: boolean) {
    this.t += dt;
    const t = this.t;
    const p = this.streams.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + dt * (3 + (i % 5));
      if (y > 25) y = 0;
      p.setY(i, y);
    }
    p.needsUpdate = true;
    this.alarm = Math.max(0, this.alarm - dt);
    this.success = Math.max(0, this.success - dt);
    const bg = this.scene.background as THREE.Color;
    bg.set(this.alarm > 0 ? (Math.sin(t * 20) > 0 ? "#2a0505" : "#010805") : this.success > 0 ? "#03200f" : "#010805");
    (this.grid.material as THREE.LineBasicMaterial).color?.set?.(this.alarm > 0 ? "#ef4444" : "#10b981");

    for (const l of this.locks) {
      l.t += dt;
      if (l.state === "ok") {
        l.shackle.position.y = Math.min(0.75, 0.45 + l.t * 1.2);
        l.group.position.y = 1.6 + Math.sin(t * 3) * 0.05;
      } else if (l.state === "bad") {
        l.group.position.x += Math.sin(l.t * 60) * (l.t < 0.5 ? 0.02 : 0);
      } else {
        l.group.position.y = 1.6 + Math.sin(t * 2 + l.group.position.x) * 0.06;
      }
    }

    animate(this.avatar, this.success > 0 ? "cheer" : this.alarm > 0 ? "hurt" : typing ? "type" : "idle", t, dt);
    const sw = Math.sin(t * 0.3) * 0.5;
    this.camera.position.set(Math.sin(sw) * 4.2, 3, -Math.cos(sw) * 4.2 - 1);
    this.camera.lookAt(0, 1.8, 3);
  }
}
