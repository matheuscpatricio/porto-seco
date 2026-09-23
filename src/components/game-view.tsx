"use client";

import { Dialogue } from "@/components/dialogue";
import type { Level, Who, World } from "@/content/types";
import { Game, HackOutcome, Input, Phase, VH, VW } from "@/game/engine";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

export type GameHandle = { applyHack: (o: HackOutcome) => void; closeHack: () => void; replayBrief: () => void };

type Toast = { id: number; text: string; tone: "info" | "bad" | "good" };

const KEYS: Record<string, keyof Input> = {
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  ArrowUp: "jump",
  w: "jump",
  W: "jump",
  " ": "jump",
  f: "shoot",
  F: "shoot",
  j: "shoot",
  J: "shoot",
  e: "use",
  E: "use",
};

function TouchButton({ label, onPress, className = "" }: { label: string; onPress: (down: boolean) => void; className?: string }) {
  return (
    <button
      className={`pointer-events-auto select-none rounded-full border border-white/30 bg-black/50 font-black text-white backdrop-blur active:bg-white/30 ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
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

export const GameView = forwardRef<GameHandle, { level: Level; world: World; index: number; onPhase: (p: Phase) => void; skipBrief: boolean }>(
  function GameView({ level, world, index, onPhase, skipBrief }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | null>(null);
    const input = useRef<Input>({ left: false, right: false, jump: false, shoot: false, use: false });
    const tapped = useRef<Partial<Input>>({});
    const [phase, setPhase] = useState<Phase>("brief");
    const [hp, setHp] = useState(3);
    const [near, setNear] = useState(false);
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
      const game = new Game(level, world, index, {
        onPhase: (p) => {
          setPhase(p);
          onPhaseRef.current(p);
        },
        onToast: toast,
        onNear: setNear,
        onHp: setHp,
      });
      gameRef.current = game;
      if (skipBrief) {
        game.startPlay();
        toast("Chegue ao terminal (→) e aperte E para hackear.", "info");
      }
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = VW * dpr;
      canvas.height = VH * dpr;
      let raf = 0;
      let last = performance.now();
      const loop = (now: number) => {
        const dt = (now - last) / 1000;
        last = now;
        const held = input.current;
        const tap = tapped.current;
        tapped.current = {};
        game.update(dt, { left: held.left, right: held.right, jump: held.jump || !!tap.jump, shoot: held.shoot || !!tap.shoot, use: held.use || !!tap.use });
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        game.render(ctx);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }, [level, world, index, skipBrief, toast]);

    useEffect(() => {
      const typing = (e: KeyboardEvent) => {
        const el = e.target as HTMLElement | null;
        return !!el && (el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || !!el.closest(".cm-editor"));
      };
      const down = (e: KeyboardEvent) => {
        const k = KEYS[e.key];
        if (!k || typing(e)) return;
        if (gameRef.current?.phase !== "play") return;
        e.preventDefault();
        input.current[k] = true;
        tapped.current[k] = true;
      };
      const up = (e: KeyboardEvent) => {
        const k = KEYS[e.key];
        if (k) input.current[k] = false;
      };
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
      return () => {
        window.removeEventListener("keydown", down);
        window.removeEventListener("keyup", up);
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

    const press = useCallback((k: keyof Input, d: boolean) => {
      input.current[k] = d;
      if (d) tapped.current[k] = true;
    }, []);

    const setSpeaker = useCallback((who: Who) => {
      if (gameRef.current) gameRef.current.talking = who;
    }, []);

    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
        <canvas ref={canvasRef} className="block aspect-[960/420] w-full touch-none" />

        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-sm">
          {[1, 2, 3].map((i) => (
            <span key={i} className={i <= hp ? "" : "opacity-20 grayscale"}>
              ❤️
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute right-3 top-3 hidden rounded-lg bg-black/55 px-2.5 py-1 text-[11px] leading-tight text-white/80 md:block">
          <b>← →</b> andar · <b>↑ / espaço</b> pular · <b>F</b> atirar · <b>E</b> hackear
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-12 flex flex-col items-center gap-1.5 px-3">
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

        {phase === "brief" && (
          <div className="absolute inset-x-0 bottom-0 p-2 sm:p-4">
            <Dialogue
              key={briefKey}
              lines={level.brief}
              onSpeaker={setSpeaker}
              doneLabel="Começar missão ▶"
              onDone={() => {
                gameRef.current?.startPlay();
                toast("Chegue ao terminal (→) e aperte E para hackear.", "info");
              }}
            />
          </div>
        )}

        {phase === "play" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex items-end justify-between px-2 md:hidden">
            <div className="flex gap-2">
              <TouchButton label="◀" onPress={(d) => press("left", d)} className="size-14 text-xl" />
              <TouchButton label="▶" onPress={(d) => press("right", d)} className="size-14 text-xl" />
            </div>
            <div className="flex items-end gap-2">
              {near && <TouchButton label="HACK" onPress={(d) => press("use", d)} className="h-12 bg-emerald-600/80 px-4 text-sm" />}
              <TouchButton label="⚡" onPress={(d) => press("shoot", d)} className="size-14 text-xl" />
              <TouchButton label="⤒" onPress={(d) => press("jump", d)} className="size-16 text-2xl" />
            </div>
          </div>
        )}

        {phase === "play" && near && (
          <button
            className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-black text-emerald-950 shadow-lg anim-glow md:block"
            onClick={() => gameRef.current?.setPhase("hack")}
          >
            💻 Hackear terminal (E)
          </button>
        )}
      </div>
    );
  },
);
