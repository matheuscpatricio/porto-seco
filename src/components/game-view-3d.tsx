"use client";

import { Dialogue } from "@/components/dialogue";
import { Button } from "@/components/ui/button";
import type { Level, Who, World } from "@/content/types";
import { connector } from "@/content/story";
import { Game3D, HackOutcome, Input3, Phase } from "@/game3d/engine";
import { BLOCK, blockStart, COAST, GREEN, SIZE } from "@/game3d/world";
import { purchaseBike, useProgress } from "@/lib/progress";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

export type GameHandle = { applyHack: (o: HackOutcome) => void; closeHack: () => void; replayBrief: () => void; enterHub: () => void; beginMission: () => void };

type Toast = { id: number; text: string; tone: "info" | "bad" | "good" };
type Keys = { f: boolean; b: boolean; l: boolean; r: boolean; tl: boolean; tr: boolean; jump: boolean; shoot: boolean; use: boolean; run: boolean };

const KEYMAP: Record<string, keyof Keys> = {
  KeyW: "f",
  ArrowUp: "f",
  KeyS: "b",
  ArrowDown: "b",
  KeyA: "l",
  KeyD: "r",
  ArrowLeft: "tl",
  ArrowRight: "tr",
  Space: "jump",
  KeyF: "shoot",
  KeyJ: "shoot",
  KeyE: "use",
  ShiftLeft: "run",
  ShiftRight: "run",
};

function Btn({ label, onPress, className = "" }: { label: string; onPress: (d: boolean) => void; className?: string }) {
  return (
    <button
      className={`pointer-events-auto select-none rounded-full border border-white/30 bg-black/50 font-black text-white backdrop-blur active:bg-white/30 ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onPress(true);
      }}
      onPointerUp={() => onPress(false)}
      onPointerLeave={() => onPress(false)}
      onPointerCancel={() => onPress(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

type ViewProps = { level: Level; world: World; index: number; onPhase: (p: Phase) => void; skipBrief: boolean; fullscreen: boolean; onFullscreen: () => void; onStart: () => void };

const MAP_R = 70;

function drawMinimap(c: HTMLCanvasElement, m: ReturnType<Game3D["minimap"]>) {
  const g = c.getContext("2d");
  if (!g) return;
  const W = c.width;
  const half = W / 2;
  const s = half / MAP_R;
  const cos = Math.cos(m.player.cam);
  const sin = Math.sin(m.player.cam);
  const toScreen = (x: number, z: number) => {
    const dx = x - m.player.x;
    const dz = z - m.player.z;
    return [half + (-cos * dx + sin * dz) * s, half + (-sin * dx - cos * dz) * s] as const;
  };
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, W);
  g.save();
  g.beginPath();
  g.arc(half, half, half - 2, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = "#1a4a68";
  g.fillRect(0, 0, W, W);
  const a = -cos * s;
  const b = -sin * s;
  const cc = sin * s;
  const d = -cos * s;
  g.setTransform(a, b, cc, d, half - (a * m.player.x + cc * m.player.z), half - (b * m.player.x + d * m.player.z));
  g.fillStyle = "#e4d2a4";
  g.fillRect(-COAST, -COAST, SIZE + COAST * 2, SIZE + COAST * 2);
  g.fillStyle = "#3e7a48";
  g.fillRect(-GREEN, -GREEN, SIZE + GREEN * 2, SIZE + GREEN * 2);
  g.fillStyle = "#3f4550";
  g.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const inCompound = blockStart(i) === m.compound.minX && blockStart(j) === m.compound.minZ;
      g.fillStyle = inCompound ? "#4c3a6b" : "#5b6270";
      g.fillRect(blockStart(i) - 1.5, blockStart(j) - 1.5, BLOCK + 3, BLOCK + 3);
      g.fillStyle = inCompound ? "#5e4a82" : "#7a8190";
      g.fillRect(blockStart(i) + 1.5, blockStart(j) + 1.5, BLOCK - 3, BLOCK - 3);
    }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const dot = (x: number, z: number, r: number, color: string) => {
    const [sx, sy] = toScreen(x, z);
    g.fillStyle = color;
    g.beginPath();
    g.arc(sx, sy, r, 0, Math.PI * 2);
    g.fill();
  };
  for (const car of m.cars) dot(car.x, car.z, 2.5, "#cbd5e1");
  dot(m.escape.x, m.escape.z, 4, "#f43f5e");
  if (m.runner) dot(m.runner.x, m.runner.z, 4, "#fb923c");
  for (const al of m.allies) dot(al.x, al.z, 3.5, "#38bdf8");
  for (const e of m.enemies) dot(e.x, e.z, e.boss ? 5 : 3.5, e.police ? "#60a5fa" : e.boss ? "#ff0040" : "#ef4444");
  g.restore();
  let [tx, ty] = toScreen(m.target.x, m.target.z);
  const dist = Math.hypot(tx - half, ty - half);
  const edge = half - 9;
  if (dist > edge) {
    tx = half + ((tx - half) / dist) * edge;
    ty = half + ((ty - half) / dist) * edge;
  }
  g.fillStyle = "#fbbf24";
  g.strokeStyle = "#000";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(tx, ty, 6, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  const rel = m.player.yaw - m.player.cam;
  g.save();
  g.translate(half, half);
  g.rotate(-rel);
  g.fillStyle = "#ffffff";
  g.strokeStyle = "#000";
  g.beginPath();
  g.moveTo(0, -8);
  g.lineTo(6, 6);
  g.lineTo(0, 3);
  g.lineTo(-6, 6);
  g.closePath();
  g.fill();
  g.stroke();
  g.restore();
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(half, half, half - 2, 0, Math.PI * 2);
  g.stroke();
}

export const GameView3D = forwardRef<GameHandle, ViewProps>(
  function GameView3D({ level, world, index, onPhase, skipBrief, fullscreen, onFullscreen, onStart }, ref) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game3D | null>(null);
    const keys = useRef<Keys>({ f: false, b: false, l: false, r: false, tl: false, tr: false, jump: false, shoot: false, use: false, run: false });
    const taps = useRef<Partial<Keys>>({});
    const look = useRef({ yaw: 0, pitch: 0 });
    const stick = useRef({ id: -1, ox: 0, oy: 0, x: 0, y: 0 });
    const drag = useRef({ id: -1, x: 0, y: 0 });
    const heartsRef = useRef<HTMLDivElement>(null);
    const arrowRef = useRef<HTMLDivElement>(null);
    const objRef = useRef<HTMLSpanElement>(null);
    const bossRef = useRef<HTMLDivElement>(null);
    const bossBarRef = useRef<HTMLDivElement>(null);
    const bossNameRef = useRef<HTMLSpanElement>(null);
    const alarmRef = useRef<HTMLDivElement>(null);
    const knobRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<HTMLCanvasElement>(null);
    const [phase, setPhase] = useState<Phase>("brief");
    const [near, setNear] = useState(false);
    const [locked, setLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [briefKey, setBriefKey] = useState(0);
    const [pass, setPass] = useState<"link" | "lesson">("link");
    const [hub, setHub] = useState(false);
    const hubRef = useRef(false);
    const [notes, setNotes] = useState(false);
    const [shop, setShop] = useState(false);
    const progress = useProgress();
    const link = connector(level.id);
    const toastId = useRef(0);
    const onPhaseRef = useRef(onPhase);
    useEffect(() => {
      onPhaseRef.current = onPhase;
    }, [onPhase]);

    const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
      const id = ++toastId.current;
      setToasts((ts) => [...ts.filter((t) => t.text !== text).slice(-2), { id, text, tone }]);
      setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), tone === "info" ? 6500 : 4200);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current!;
      const wrap = wrapRef.current!;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      const game = new Game3D(level, world, index, {
        onPhase: (p) => {
          setPhase(p);
          onPhaseRef.current(p);
          if (p !== "play" && document.pointerLockElement) document.exitPointerLock();
        },
        onToast: toast,
        onStudy: () => setNotes(true),
        onShop: () => setShop(true),
      });
      gameRef.current = game;
      game.scene.environment = envMap;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __game: Game3D }).__game = game;
      game.scene.environmentIntensity = world.id === "w2" || world.id === "w5" || world.id === "w6" ? 0.25 : 0.55;
      const openHub = new URLSearchParams(window.location.search).get("hub") === "1";
      if (openHub) game.enterHub();
      else if (skipBrief) game.startPlay();
      const resize = () => {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        renderer.setSize(w, h, false);
        game.resize(w, h);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      let raf = 0;
      let last = performance.now();
      let lastNear = false;
      let frames = 0;
      const loop = (now: number) => {
        const dt = Math.max(0, (now - last) / 1000);
        last = now;
        const k = keys.current;
        const tp = taps.current;
        taps.current = {};
        const s = stick.current;
        let mx = (k.r ? 1 : 0) - (k.l ? 1 : 0);
        let mz = (k.f ? 1 : 0) - (k.b ? 1 : 0);
        if (s.id >= 0) {
          mx = s.x;
          mz = -s.y;
        }
        const turn = ((k.tr ? 1 : 0) - (k.tl ? 1 : 0)) * 2.4 * dt;
        const input: Input3 = {
          mx,
          mz,
          jump: k.jump || !!tp.jump,
          shoot: k.shoot || !!tp.shoot,
          use: k.use || !!tp.use,
          run: k.run,
          yaw: look.current.yaw + turn,
          pitch: look.current.pitch,
        };
        look.current = { yaw: 0, pitch: 0 };
        game.update(dt, input);
        game.render(renderer);
        if (++frames === 2) setLoading(false);

        const h = game.hud();
        if (h.near !== lastNear) {
          lastNear = h.near;
          setNear(h.near);
        }
        if (heartsRef.current) heartsRef.current.textContent = "❤️".repeat(Math.max(0, h.hp)) + "🖤".repeat(Math.max(0, 3 - h.hp));
        if (arrowRef.current) arrowRef.current.style.transform = `rotate(${-h.angle}rad)`;
        if (h.hub !== hubRef.current) {
          hubRef.current = h.hub;
          setHub(h.hub);
        }
        if (objRef.current) objRef.current.textContent = `${h.script}${h.steps ? ` ${h.step}/${h.steps}` : ""} · ${h.objective} · ${h.distance} m${h.wanted > 0 ? " · polícia" : ""}`;
        if (bossRef.current) bossRef.current.style.display = h.boss ? "block" : "none";
        if (h.boss && bossBarRef.current && bossNameRef.current) {
          bossBarRef.current.style.width = `${h.boss.pct * 100}%`;
          bossNameRef.current.textContent = h.boss.name;
        }
        if (mapRef.current && frames % 3 === 0 && (game.phase === "play" || game.phase === "open")) drawMinimap(mapRef.current, game.minimap());
        if (alarmRef.current) alarmRef.current.style.opacity = h.alarm ? String(0.25 + Math.sin(now / 90) * 0.15) : "0";
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        game.dispose();
        envMap.dispose();
        pmrem.dispose();
        renderer.dispose();
      };
    }, [level, world, index, skipBrief, toast]);

    useEffect(() => {
      gameRef.current?.setOwned(progress.bike);
    }, [progress.bike]);

    useEffect(() => {
      const typing = (e: KeyboardEvent) => {
        const el = e.target as HTMLElement | null;
        return !!el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || !!el.closest(".cm-editor"));
      };
      const down = (e: KeyboardEvent) => {
        const k = KEYMAP[e.code];
        if (!k || typing(e) || gameRef.current?.phase !== "play") return;
        e.preventDefault();
        keys.current[k] = true;
        taps.current[k] = true;
      };
      const up = (e: KeyboardEvent) => {
        const k = KEYMAP[e.code];
        if (k) keys.current[k] = false;
      };
      const move = (e: MouseEvent) => {
        if (document.pointerLockElement === canvasRef.current) {
          look.current.yaw += e.movementX * 0.0026;
          look.current.pitch += e.movementY * 0.002;
        }
      };
      const lockChange = () => setLocked(document.pointerLockElement === canvasRef.current);
      const mouseDown = (e: MouseEvent) => {
        if (document.pointerLockElement === canvasRef.current && e.button === 0) {
          keys.current.shoot = true;
          taps.current.shoot = true;
        }
      };
      const mouseUp = () => {
        keys.current.shoot = false;
      };
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
      window.addEventListener("mousemove", move);
      window.addEventListener("mousedown", mouseDown);
      window.addEventListener("mouseup", mouseUp);
      document.addEventListener("pointerlockchange", lockChange);
      return () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mousedown", mouseDown);
        window.removeEventListener("mouseup", mouseUp);
        document.removeEventListener("pointerlockchange", lockChange);
      };
    }, []);

    useImperativeHandle(ref, () => ({
      applyHack: (o) => gameRef.current?.applyHack(o),
      closeHack: () => gameRef.current?.closeHack(),
      enterHub: () => {
        gameRef.current?.enterHub();
        setHub(true);
        hubRef.current = true;
      },
      beginMission: () => {
        setPass("link");
        setBriefKey((k) => k + 1);
        gameRef.current?.beginMission();
        setHub(false);
        hubRef.current = false;
      },
      replayBrief: () => {
        const g = gameRef.current;
        if (!g || g.phase !== "play") return;
        g.setPhase("brief");
        setBriefKey((k) => k + 1);
      },
    }));

    const press = useCallback((k: keyof Keys, d: boolean) => {
      keys.current[k] = d;
      if (d) taps.current[k] = true;
    }, []);

    const setSpeaker = useCallback((who: Who) => {
      if (gameRef.current) gameRef.current.talking = who;
    }, []);

    const onPointerDown = (e: React.PointerEvent) => {
      if (gameRef.current?.phase !== "play") return;
      if (e.pointerType === "mouse") {
        if (!document.pointerLockElement) canvasRef.current?.requestPointerLock?.();
        return;
      }
      const rect = wrapRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.45 && stick.current.id < 0) stick.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      else if (drag.current.id < 0) drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: React.PointerEvent) => {
      const s = stick.current;
      if (e.pointerId === s.id) {
        const dx = e.clientX - s.ox;
        const dy = e.clientY - s.oy;
        const len = Math.hypot(dx, dy);
        const m = Math.min(1, len / 50);
        s.x = len ? (dx / len) * m : 0;
        s.y = len ? (dy / len) * m : 0;
        if (knobRef.current) knobRef.current.style.transform = `translate(${s.x * 34}px, ${s.y * 34}px)`;
      } else if (e.pointerId === drag.current.id) {
        look.current.yaw += (e.clientX - drag.current.x) * 0.006;
        look.current.pitch += (e.clientY - drag.current.y) * 0.004;
        drag.current.x = e.clientX;
        drag.current.y = e.clientY;
      }
    };
    const onPointerUp = (e: React.PointerEvent) => {
      if (e.pointerId === stick.current.id) {
        stick.current = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
        if (knobRef.current) knobRef.current.style.transform = "";
      }
      if (e.pointerId === drag.current.id) drag.current.id = -1;
    };

    const inCyber = phase === "hack" || phase === "result";

    return (
      <div ref={wrapRef} className={`overflow-hidden bg-black ${fullscreen ? "absolute inset-0" : "relative h-[min(68vh,620px)] min-h-[340px] w-full rounded-xl border border-white/10 shadow-2xl"}`}>
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />

        {loading && <div className="absolute inset-0 grid place-items-center bg-black text-sm text-white/70">Montando a cidade…</div>}

        <div ref={alarmRef} className="pointer-events-none absolute inset-0 bg-red-600 opacity-0 mix-blend-screen" />

        {(phase === "play" || phase === "open") && (
          <>
            <div ref={heartsRef} className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-sm" />
            <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              <div ref={arrowRef} className="text-lg leading-none text-amber-300 transition-transform duration-75">
                ⬆
              </div>
              <span ref={objRef} className="max-w-[70vw] truncate font-semibold sm:max-w-[52vw]" />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 shadow" />
            <canvas ref={mapRef} width={160} height={160} className="pointer-events-none absolute right-3 top-12 size-28 drop-shadow-lg sm:size-36" />
            <div className="pointer-events-none absolute bottom-3 left-3 hidden max-w-[60%] rounded-lg bg-black/55 px-2.5 py-1 text-[11px] leading-tight text-white/80 md:block">
              {locked ? (
                <>
                  <b>WASD</b> andar · <b>Shift</b> correr · <b>Mouse</b> olhar · <b>Clique/F</b> atirar · <b>Espaço</b> pular · <b>E</b> hackear · <b>Esc</b> soltar o mouse
                </>
              ) : (
                <>
                  <b>Clique no jogo</b> para usar o mouse · <b>WASD/setas</b> andar · <b>F</b> atirar · <b>Espaço</b> pular
                </>
              )}
            </div>
          </>
        )}

        <div ref={bossRef} className="pointer-events-none absolute left-1/2 top-12 hidden w-72 -translate-x-1/2 rounded-md bg-black/60 px-3 py-1.5">
          <span ref={bossNameRef} className="block text-center text-[11px] font-bold text-white" />
          <div className="mt-1 h-1.5 w-full rounded bg-red-950">
            <div ref={bossBarRef} className="h-full rounded bg-red-500" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-20 flex flex-col items-center gap-1.5 px-3">
          {toasts.map((t) => (
            <p
              key={t.id}
              className={`anim-pop max-w-xl rounded-lg px-3 py-1.5 text-center text-xs font-semibold shadow-lg sm:text-sm ${
                t.tone === "bad" ? "bg-rose-600 text-white" : t.tone === "good" ? "bg-emerald-600 text-white" : "bg-black/75 text-white"
              }`}
            >
              {t.text}
            </p>
          ))}
        </div>

        <button
          data-exit-full={fullscreen ? "" : undefined}
          className="absolute right-3 top-3 z-10 rounded-full border border-white/30 bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur hover:bg-black/80"
          onClick={onFullscreen}
          title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
        >
          {fullscreen ? "✕ Sair" : "⛶ Tela cheia"}
        </button>

        {phase === "dive" && <div key="dive" className="anim-dive pointer-events-none absolute inset-0" />}
        {phase === "hack" && <div key="in" className="anim-dive-in pointer-events-none absolute inset-0" />}
        {phase === "surface" && <div key="out" className="anim-dive-in pointer-events-none absolute inset-0" />}
        {inCyber && (
          <>
            <div className="scanlines pointer-events-none absolute inset-0" />
            <p className="pointer-events-none absolute left-3 top-3 rounded bg-emerald-950/80 px-2 py-1 font-mono text-[11px] font-bold text-emerald-300">
              ● DENTRO DO SISTEMA · {level.target.toUpperCase()}
            </p>
          </>
        )}

        {phase === "brief" && !loading && (
          <div className="absolute inset-x-0 bottom-0 p-2 sm:p-4">
            <Dialogue
              key={`${briefKey}-${pass}`}
              lines={link.length > 0 && pass === "link" ? link : level.brief}
              onSpeaker={setSpeaker}
              doneLabel={link.length > 0 && pass === "link" ? "Continuar" : "Começar missão ▶"}
              onDone={() => {
                if (link.length > 0 && pass === "link") {
                  setPass("lesson");
                  return;
                }
                onStart();
                gameRef.current?.startPlay();
              }}
            />
          </div>
        )}

        {hub && phase === "play" && (
          <div className="absolute left-1/2 top-16 z-10 flex -translate-x-1/2 flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                setPass("link");
                setBriefKey((k) => k + 1);
                setHub(false);
                hubRef.current = false;
                gameRef.current?.beginMission();
              }}
            >
              Começar missão
            </Button>
            <p className="w-full text-center text-xs text-white/80">R$ {progress.money}{progress.bike ? " · moto" : ""}</p>
          </div>
        )}

        {notes && (
          <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/60 p-3 sm:items-center">
            <div className="max-h-[80vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-card p-4">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Caderno de casa</p>
              <p className="text-sm leading-relaxed">{level.theory}</p>
              <pre className="overflow-x-auto rounded-lg bg-black/70 p-3 font-mono text-xs text-emerald-200">{level.example}</pre>
              <Button onClick={() => setNotes(false)}>Fechar</Button>
            </div>
          </div>
        )}

        {shop && (
          <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/60 p-3 sm:items-center">
            <div className="w-full max-w-sm space-y-3 rounded-2xl bg-card p-4">
              <p className="text-xs font-black uppercase tracking-widest text-amber-200">Oficina</p>
              <p className="text-sm">A moto custa 500. Você tem R$ {progress.money}.</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const deal = purchaseBike();
                    if (deal.bought) {
                      gameRef.current?.setOwned(true);
                      toast("A moto é sua. Ela está na porta de casa.", "good");
                    } else toast(progress.bike ? "Você já tem a moto." : "Ainda falta dinheiro.", "bad");
                    setShop(false);
                  }}
                >
                  Comprar
                </Button>
                <Button variant="ghost" onClick={() => setShop(false)}>
                  Sair
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === "play" && (
          <>
            <div className="pointer-events-none absolute bottom-6 left-6 grid size-28 place-items-center rounded-full border border-white/20 bg-black/25 md:hidden">
              <div ref={knobRef} className="size-12 rounded-full bg-white/30" />
            </div>
            <div className="pointer-events-none absolute bottom-3 right-3 flex items-end gap-2 md:hidden">
              {near && <Btn label="HACK" onPress={(d) => press("use", d)} className="h-12 bg-emerald-600/80 px-4 text-sm" />}
              <Btn label="⚡" onPress={(d) => press("shoot", d)} className="size-14 text-xl" />
              <Btn label="⤒" onPress={(d) => press("jump", d)} className="size-16 text-2xl" />
            </div>
          </>
        )}

        {phase === "play" && near && (
          <button
            className="anim-glow absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-black text-emerald-950 shadow-lg md:block"
            onClick={() => gameRef.current?.beginHack()}
          >
            💻 Hackear terminal (E)
          </button>
        )}
      </div>
    );
  },
);
