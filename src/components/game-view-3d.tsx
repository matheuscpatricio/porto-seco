"use client";

import { Dialogue } from "@/components/dialogue";
import type { Level, Who, World } from "@/content/types";
import { Game3D, HackOutcome, Input3, Phase } from "@/game3d/engine";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

export type GameHandle = { applyHack: (o: HackOutcome) => void; closeHack: () => void; replayBrief: () => void };

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

export const GameView3D = forwardRef<GameHandle, { level: Level; world: World; index: number; onPhase: (p: Phase) => void; skipBrief: boolean }>(
  function GameView3D({ level, world, index, onPhase, skipBrief }, ref) {
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
    const [phase, setPhase] = useState<Phase>("brief");
    const [near, setNear] = useState(false);
    const [locked, setLocked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [briefKey, setBriefKey] = useState(0);
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
      });
      gameRef.current = game;
      game.scene.environment = envMap;
      game.scene.environmentIntensity = world.id === "w2" || world.id === "w5" || world.id === "w6" ? 0.25 : 0.55;
      if (skipBrief) game.startPlay();
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
        const dt = (now - last) / 1000;
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
        if (objRef.current) objRef.current.textContent = `${h.script} ${h.step}/${h.steps} · ${h.objective} · ${h.distance} m`;
        if (bossRef.current) bossRef.current.style.display = h.boss ? "block" : "none";
        if (h.boss && bossBarRef.current && bossNameRef.current) {
          bossBarRef.current.style.width = `${h.boss.pct * 100}%`;
          bossNameRef.current.textContent = h.boss.name;
        }
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
      <div ref={wrapRef} className="relative h-[min(68vh,620px)] min-h-[340px] w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
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
            <div className="pointer-events-none absolute right-3 top-3 hidden rounded-lg bg-black/55 px-2.5 py-1 text-[11px] leading-tight text-white/80 md:block">
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
              key={briefKey}
              lines={level.brief}
              onSpeaker={setSpeaker}
              doneLabel="Começar missão ▶"
              onDone={() => gameRef.current?.startPlay()}
            />
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
