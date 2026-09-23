"use client";

import type { Who } from "@/content/types";
import { people } from "@/game/characters";
import { drawHuman, Pose } from "@/game/draw";
import { useEffect, useRef } from "react";

export function Portrait({ who, size = 72, pose = "talk", full = false }: { who: Who; size?: number; pose?: Pose; full?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const h = full ? size * 1.6 : size;
    c.width = size * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, h);
      const s = full ? h / 80 : size / 30;
      const feetY = full ? h - 4 : size + 30 * s;
      drawHuman(ctx, people[who].look, pose, size / 2, feetY, 1, s, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [who, size, pose, full]);
  return <canvas ref={ref} style={{ width: size, height: full ? size * 1.6 : size }} className="shrink-0" aria-label={people[who].name} />;
}
