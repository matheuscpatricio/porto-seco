"use client";

import { Dialogue } from "@/components/dialogue";
import { LinkButton, Stars, TopBar } from "@/components/game";
import { Portrait } from "@/components/portrait";
import type { Who } from "@/content/types";
import { allLevels, prologue, worlds } from "@/content/worlds";
import { people } from "@/game/characters";
import { ACHIEVEMENTS, isUnlocked, markIntroSeen, resetProgress, useProgress } from "@/lib/progress";
import Link from "next/link";
import { sound } from "@/game/audio";
import { requestGameFullscreen } from "@/game/fullscreen";
import { useEffect, useState, useSyncExternalStore } from "react";

const crew: Who[] = ["leo", "dani", "rui", "bia"];
const villains: Who[] = ["vidal", "caveira"];

export default function Home() {
  const p = useProgress();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [replay, setReplay] = useState(false);
  useEffect(() => sound.setAmbience("menu"), []);
  const done = Object.keys(p.stars).length;
  const nextLevel = allLevels.find((l) => !p.stars[l.id]) ?? allLevels[0];

  if (!mounted) {
    return (
      <>
        <TopBar />
        <main className="relative flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-orange-600/30 via-rose-950/40 to-background px-4 py-16">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Porto Seco, 2026</p>
          <h1 className="mt-1 text-center text-4xl font-black uppercase tracking-tight sm:text-6xl">A dívida</h1>
          <p className="mt-4 text-sm text-white/70">Abrindo a cidade…</p>
        </main>
      </>
    );
  }

  if (!p.introSeen || replay) {
    return (
      <>
        <TopBar />
        <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-orange-600/30 via-rose-950/40 to-background px-4 py-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Porto Seco, 2026</p>
          <h1 className="mt-1 text-center text-4xl font-black uppercase tracking-tight sm:text-6xl">A dívida</h1>
          <div className="my-6 flex items-end gap-2 sm:gap-6">
            {[...crew, ...villains].map((w) => (
              <div key={w} className="flex flex-col items-center">
                <Portrait who={w} size={56} pose="idle" full />
                <span className={`text-[10px] font-bold ${people[w].ally ? "text-sky-300" : "text-rose-300"}`}>{people[w].name}</span>
              </div>
            ))}
          </div>
          <div className="w-full max-w-2xl">
            <Dialogue
              lines={prologue}
              doneLabel="Começar ▶"
              onDone={() => {
                setReplay(false);
                markIntroSeen();
              }}
            />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16">
        <section className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-orange-600/40 via-rose-900/40 to-slate-950 p-6 sm:p-10">
          <div className="relative z-10 max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">Um jogo de ação para aprender Python do zero</p>
            <h1 className="mt-2 text-4xl font-black uppercase leading-none tracking-tight sm:text-6xl">Porto Seco</h1>
            <p className="mt-3 text-white/80">
              O Léo é motoboy, está endividado e nunca programou. Com a ajuda da Dani, ele corre, pula, enfrenta os capangas do Caveira e hackeia a cidade inteira, aprendendo
              Python a cada missão. A ilha tem costa irregular. A polícia só reage a um hack ou a uma morte, e a água funda traz um tubarão.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <LinkButton size="lg" href={done ? `/level/${nextLevel.id}?hub=1` : `/level/${nextLevel.id}`} className="bg-orange-500 text-black hover:bg-orange-400">
                {done ? "Continuar a história" : "Começar a história"} ▶
              </LinkButton>
              <button className="text-sm text-white/70 underline hover:text-white" onClick={() => setReplay(true)}>
                Rever a introdução
              </button>
            </div>
            <p className="mt-3 text-xs text-white/60">
              {done} de {allLevels.length} missões concluídas · R$ {p.money} · a moto fica na calçada · o ponto azul no mapa é o arranha-céu da Dani, no centro · na sala da cobertura, E entra no computador e a aula não tira o pagamento · lojas de armas e de motos gastam o pagamento · Teclado: ← → andar, ↑ pular, F atirar, E hackeia, sobe na moto e abre o computador da torre · No celular há botões na tela
            </p>
          </div>
          <div className="pointer-events-none absolute bottom-0 right-4 hidden items-end gap-3 md:flex">
            {crew.map((w) => (
              <Portrait key={w} who={w} size={70} pose={w === "leo" ? "run" : "idle"} full />
            ))}
          </div>
        </section>

        <div className="mt-6 space-y-4">
          {worlds.map((w) => {
            const worldDone = w.levels.filter((l) => p.stars[l.id]).length;
            return (
              <section key={w.id} className="overflow-hidden rounded-2xl border border-white/10 bg-card">
                <div className={`flex items-center gap-4 bg-gradient-to-r ${w.color} px-5 py-3`}>
                  <span className="text-3xl">{w.emoji}</span>
                  <div className="flex-1">
                    <h2 className="text-lg font-black text-white">{w.name}</h2>
                    <p className="text-xs text-white/80">{w.subtitle}</p>
                  </div>
                  <span className="rounded-full bg-black/30 px-3 py-1 text-sm font-bold text-white">
                    {worldDone}/{w.levels.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-5">
                  {w.levels.map((l) => {
                    const open = isUnlocked(p, l.id);
                    const inner = (
                      <div
                        className={`flex h-full flex-col gap-1 rounded-xl border p-3 transition ${
                          open ? "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-orange-400/60" : "cursor-not-allowed border-white/5 opacity-40"
                        } ${l.boss ? "ring-1 ring-rose-500/50" : ""}`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{l.boss ? `Chefe: ${people[l.boss].name}` : `Missão ${l.id}`}</span>
                          <span>{open ? `${l.xp} XP` : "🔒"}</span>
                        </div>
                        <p className="font-bold leading-tight">{l.title}</p>
                        <p className="text-[11px] text-muted-foreground">{l.target}</p>
                        <Stars n={p.stars[l.id] ?? 0} size="text-sm" />
                      </div>
                    );
                    return open ? (
                      <Link key={l.id} href={`/level/${l.id}`} onClick={() => requestGameFullscreen()?.catch(() => {})}>
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

        <section className="mt-8 rounded-2xl border border-white/10 bg-card p-5">
          <h2 className="mb-3 font-bold">🏆 Conquistas</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(ACHIEVEMENTS).map(([k, label]) => (
              <li key={k} className={`rounded-lg px-3 py-2 text-sm ${p.achievements.includes(k) ? "bg-emerald-500/15" : "bg-white/[0.03] text-muted-foreground"}`}>
                {p.achievements.includes(k) ? "✅" : "⬜"} {label}
              </li>
            ))}
          </ul>
          {done > 0 && (
            <button className="mt-4 text-xs text-muted-foreground underline" onClick={() => confirm("Apagar todo o progresso?") && resetProgress()}>
              Recomeçar do zero
            </button>
          )}
        </section>
      </main>
    </>
  );
}
