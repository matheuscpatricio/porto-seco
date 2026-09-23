"use client";

import { useSyncExternalStore } from "react";
import { allLevels } from "@/content/worlds";

export type Progress = {
  xp: number;
  stars: Record<string, number>;
  code: Record<string, string>;
  achievements: string[];
  lastDay: string | null;
  streak: number;
  introSeen?: boolean;
};

const KEY = "pyquest-progress-v1";
const empty: Progress = { xp: 0, stars: {}, code: {}, achievements: [], lastDay: null, streak: 0 };

let cache: Progress | null = null;
const subs = new Set<() => void>();

function load(): Progress {
  if (cache) return cache;
  try {
    cache = { ...empty, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    cache = { ...empty };
  }
  return cache!;
}

function save(p: Progress) {
  cache = p;
  localStorage.setItem(KEY, JSON.stringify(p));
  subs.forEach((s) => s());
}

export function useProgress() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    load,
    () => empty,
  );
}

export const ACHIEVEMENTS: Record<string, string> = {
  first: "Primeiro feitiço: completou a primeira fase",
  perfect: "Perfeccionista: 3 estrelas sem dicas",
  boss: "Caçador de chefes: derrotou um chefe",
  world: "Explorador: completou um mundo inteiro",
  master: "Arquimago: completou todas as fases",
};

export function wizardLevel(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 25)) + 1;
  const cur = 25 * (level - 1) ** 2;
  const next = 25 * level ** 2;
  return { level, pct: ((xp - cur) / (next - cur)) * 100, next };
}

export function isUnlocked(p: Progress, id: string) {
  const idx = allLevels.findIndex((l) => l.id === id);
  return idx === 0 || !!p.stars[allLevels[idx - 1].id];
}

export function saveCode(id: string, code: string) {
  const p = load();
  save({ ...p, code: { ...p.code, [id]: code } });
}

export function completeLevel(id: string, stars: number) {
  const p = load();
  const level = allLevels.find((l) => l.id === id)!;
  const prev = p.stars[id] ?? 0;
  const gainedXp = prev ? Math.max(0, Math.round((level.xp * (stars - prev)) / 3)) : Math.round((level.xp * (stars + 1)) / 4);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const streak = p.lastDay === today ? p.streak : p.lastDay === yesterday ? p.streak + 1 : 1;
  const next: Progress = { ...p, xp: p.xp + gainedXp, stars: { ...p.stars, [id]: Math.max(prev, stars) }, lastDay: today, streak };

  const newAch: string[] = [];
  const add = (a: string) => !next.achievements.includes(a) && newAch.push(a);
  add("first");
  if (stars === 3) add("perfect");
  if (level.boss) add("boss");
  const worldId = allLevels.find((l) => l.id === id)!.worldId;
  if (allLevels.filter((l) => l.worldId === worldId).every((l) => next.stars[l.id])) add("world");
  if (allLevels.every((l) => next.stars[l.id])) add("master");
  next.achievements = [...next.achievements, ...newAch];
  save(next);
  return { gainedXp, newAch, stars: next.stars[id] };
}

export function markIntroSeen() {
  save({ ...load(), introSeen: true });
}

export function resetProgress() {
  save({ ...empty });
}
