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
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

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
        <NightField>
          <p className="font-mono text-[11px] tracking-[0.45em] text-cyan-200/60">VÉRTICE</p>
          <h1 className="mt-4 font-display text-4xl font-medium tracking-[0.08em] sm:text-6xl">Porto Seco</h1>
          <p className="mt-6 font-mono text-xs text-white/40">Abrindo a cidade</p>
        </NightField>
      </>
    );
  }

  if (!p.introSeen || replay) {
    return (
      <>
        <TopBar />
        <NightField>
          <p className="font-mono text-[11px] tracking-[0.45em] text-cyan-200/60">00 · A DÍVIDA</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-[0.08em] sm:text-6xl">Porto Seco</h1>
          <div className="my-8 flex max-w-3xl flex-wrap items-end justify-center gap-x-4 gap-y-5 sm:gap-x-6">
            {[...crew, ...villains].map((w) => (
              <div key={w} className="flex flex-col items-center gap-2">
                <Portrait who={w} size={68} pose="idle" full />
                <span className={`font-mono text-[10px] tracking-widest ${people[w].ally ? "text-cyan-200/80" : "text-rose-300/80"}`}>{people[w].name}</span>
              </div>
            ))}
          </div>
          <div className="w-full max-w-xl">
            <Dialogue
              lines={prologue}
              doneLabel="Entrar"
              onDone={() => {
                setReplay(false);
                markIntroSeen();
              }}
            />
          </div>
        </NightField>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="relative mx-auto w-full max-w-5xl px-5 pb-24">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
        <section className="grid items-end gap-10 pt-16 sm:pt-24 lg:grid-cols-[1.4fr_0.6fr]">
          <div>
            <p className="font-mono text-[11px] tracking-[0.45em] text-cyan-200/60">ILHA DE VÉRTICE</p>
            <h1 className="mt-4 font-display text-4xl font-medium tracking-[0.08em] text-white sm:text-6xl">Porto Seco</h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/55">Cole aprende Python na rua. Cada missão abre um sistema da cidade.</p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <LinkButton
                size="lg"
                href={done ? `/level/${nextLevel.id}?hub=1` : `/level/${nextLevel.id}`}
                className="h-11 rounded-none border border-cyan-200/50 bg-cyan-200/10 px-6 font-normal tracking-[0.18em] text-cyan-50 uppercase hover:bg-cyan-200/20"
              >
                {done ? "Continuar" : "Entrar"}
              </LinkButton>
              <button className="font-mono text-[11px] tracking-[0.22em] text-white/40 uppercase hover:text-white" onClick={() => setReplay(true)}>
                Introdução
              </button>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-px border border-white/10 bg-white/10 font-mono text-[11px] lg:grid-cols-1">
            <Stat k="Missões" v={`${done}/${allLevels.length}`} />
            <Stat k="Carteira" v={`R$ ${p.money}`} />
            <Stat k="Próxima" v={nextLevel.id} />
          </dl>
        </section>
        <p className="mt-8 max-w-xl font-mono text-[11px] leading-5 text-white/35">
          WASD anda · setas giram a câmera · espaço pula · F atira · E usa a moto, o terminal e o computador da Maya. No celular, o joystick fica à esquerda.
        </p>

        <div className="mt-16 space-y-10">
          {worlds.map((w, wi) => {
            const worldDone = w.levels.filter((l) => p.stars[l.id]).length;
            return (
              <section key={w.id}>
                <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.35em] text-cyan-200/50">0{wi + 1}</p>
                    <h2 className="mt-1 text-lg font-light tracking-wide">{w.name.replace(/^Capítulo \d+: /, "")}</h2>
                    <p className="text-xs text-white/40">{w.subtitle}</p>
                  </div>
                  <span className="font-mono text-xs text-white/45">
                    {worldDone}/{w.levels.length}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-5">
                  {w.levels.map((l) => {
                    const open = isUnlocked(p, l.id);
                    const inner = (
                      <div className={`flex h-full min-h-28 flex-col gap-2 bg-[#07060c] p-3 transition ${open ? "hover:bg-white/[0.04]" : "opacity-35"}`}>
                        <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-white/35">
                          <span>{l.boss ? people[l.boss].name : l.id}</span>
                          <span>{open ? `${l.xp}` : "—"}</span>
                        </div>
                        <p className="text-sm font-medium leading-tight">{l.title}</p>
                        <p className="line-clamp-2 text-[11px] text-white/35">{l.target}</p>
                        <Stars n={p.stars[l.id] ?? 0} size="text-xs" />
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

        <section className="mt-16 border-t border-white/10 pt-8">
          <h2 className="font-mono text-[11px] tracking-[0.35em] text-white/40">CONQUISTAS</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(ACHIEVEMENTS).map(([k, label]) => (
              <li key={k} className={`border-l px-3 py-2 text-sm ${p.achievements.includes(k) ? "border-cyan-200/70 text-white" : "border-white/10 text-white/35"}`}>
                {label}
              </li>
            ))}
          </ul>
          {done > 0 && (
            <button className="mt-6 font-mono text-[11px] tracking-widest text-white/30 uppercase hover:text-white" onClick={() => confirm("Apagar todo o progresso?") && resetProgress()}>
              Recomeçar do zero
            </button>
          )}
        </section>
      </main>
    </>
  );
}

function NightField({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-16 text-center">
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
      {children}
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-[#07060c] px-4 py-3">
      <dt className="tracking-[0.22em] text-white/35 uppercase">{k}</dt>
      <dd className="mt-1 text-sm text-cyan-50">{v}</dd>
    </div>
  );
}
