"use client";

import { LinkButton, Stars, TopBar } from "@/components/game";
import { Button } from "@/components/ui/button";
import { allLevels, worlds } from "@/content/worlds";
import { ACHIEVEMENTS, isUnlocked, resetProgress, useProgress } from "@/lib/progress";
import Link from "next/link";

export default function Home() {
  const p = useProgress();
  const done = Object.keys(p.stars).length;
  const nextLevel = allLevels.find((l) => !p.stars[l.id]) ?? allLevels[0];

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 pb-20">
        <section className="py-10 text-center sm:py-14">
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Aprenda Python <span className="bg-gradient-to-r from-amber-300 to-rose-400 bg-clip-text text-transparent">jogando</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Atravesse 6 mundos, do primeiro <code className="text-amber-300">print</code> até decorators e dataclasses. Cada
            feitiço é código Python de verdade, rodando no seu navegador.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <LinkButton size="lg" href={`/level/${nextLevel.id}`}>
              {done ? "Continuar aventura" : "Começar aventura"} →
            </LinkButton>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {done} de {allLevels.length} fases concluídas
          </p>
        </section>

        <div className="space-y-6">
          {worlds.map((w, wi) => {
            const worldDone = w.levels.filter((l) => p.stars[l.id]).length;
            return (
              <section key={w.id} className="overflow-hidden rounded-2xl border border-white/10 bg-card">
                <div className={`bg-gradient-to-r ${w.color} flex items-center gap-4 px-5 py-4`}>
                  <span className="text-4xl">{w.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Mundo {wi + 1}</p>
                    <h2 className="text-xl font-bold text-white">{w.name}</h2>
                    <p className="text-sm text-white/80">{w.tagline}</p>
                  </div>
                  <span className="rounded-full bg-black/25 px-3 py-1 text-sm font-semibold text-white">
                    {worldDone}/{w.levels.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-5">
                  {w.levels.map((l) => {
                    const open = isUnlocked(p, l.id);
                    const stars = p.stars[l.id] ?? 0;
                    const inner = (
                      <div
                        className={`flex h-full flex-col gap-1 rounded-xl border p-3 transition ${
                          open
                            ? "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-primary/60 hover:bg-white/[0.06]"
                            : "cursor-not-allowed border-white/5 opacity-40"
                        } ${l.boss ? "ring-1 ring-rose-400/40" : ""}`}
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{l.boss ? "👹 Chefe" : `Fase ${l.id}`}</span>
                          <span>{open ? `${l.xp} XP` : "🔒"}</span>
                        </div>
                        <p className="font-semibold leading-tight">{l.title}</p>
                        <Stars n={stars} size="text-sm" />
                      </div>
                    );
                    return open ? (
                      <Link key={l.id} href={`/level/${l.id}`}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={l.id}>{inner}</div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-10 rounded-2xl border border-white/10 bg-card p-5">
          <h2 className="mb-3 font-bold">🏆 Conquistas</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(ACHIEVEMENTS).map(([k, label]) => {
              const got = p.achievements.includes(k);
              return (
                <li key={k} className={`rounded-lg px-3 py-2 text-sm ${got ? "bg-primary/15" : "bg-white/[0.03] text-muted-foreground"}`}>
                  {got ? "✅" : "⬜"} {label}
                </li>
              );
            })}
          </ul>
          {done > 0 && (
            <button
              className="mt-4 text-xs text-muted-foreground underline"
              onClick={() => confirm("Apagar todo o progresso?") && resetProgress()}
            >
              Recomeçar do zero
            </button>
          )}
        </section>
      </main>
    </>
  );
}
