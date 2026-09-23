"use client";

import { LinkButton, Stars, TopBar } from "@/components/game";
import { Avatar, Cutscene, Speech } from "@/components/story";
import { CharacterId, characters, prologue } from "@/content/story";
import { allLevels, worlds } from "@/content/worlds";
import { ACHIEVEMENTS, isUnlocked, markIntroSeen, resetProgress, useProgress } from "@/lib/progress";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const guardians: Record<string, CharacterId> = { w1: "vera", w2: "coruja", w3: "marina", w4: "bruno", w5: "rei", w6: "lua" };

function Stars3() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 28 }, (_, i) => (
        <span
          key={i}
          className="anim-twinkle absolute size-1 rounded-full bg-white"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * 0.4}s` }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  const p = useProgress();
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [replay, setReplay] = useState(false);
  const done = Object.keys(p.stars).length;
  const nextLevel = allLevels.find((l) => !p.stars[l.id]) ?? allLevels[0];

  if (!mounted) return <TopBar />;

  if (!p.introSeen || replay) {
    return (
      <>
        <TopBar />
        <main className="relative flex flex-1 flex-col justify-center px-4 py-10">
          <Stars3 />
          <div className="relative mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prólogo</p>
            <h1 className="mt-1 text-4xl font-black sm:text-5xl">A língua perdida de Pythonia</h1>
          </div>
          <div className="relative">
            <Cutscene
              lines={prologue}
              doneLabel="Começar a aventura →"
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

  const guide =
    done === 0
      ? "Tudo pronto! Comece pela Vila das Variáveis. A Dona Vera está precisando de ajuda com a padaria."
      : done === allLevels.length
        ? "Você consertou Pythonia inteira! Pode refazer qualquer fase para ganhar mais estrelas."
        : `Muito bem, você já concluiu ${done} fase${done > 1 ? "s" : ""}. A próxima missão é "${nextLevel.title}".`;

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 pb-20">
        <section className="relative py-10 text-center sm:py-14">
          <Stars3 />
          <div className="relative flex items-end justify-center gap-6">
            <Avatar who="pytha" />
            <Avatar who="bug" size="sm" />
          </div>
          <h1 className="relative mt-6 text-4xl font-black tracking-tight sm:text-6xl">
            Aprenda Python <span className="bg-gradient-to-r from-amber-300 to-rose-400 bg-clip-text text-transparent">jogando</span>
          </h1>
          <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
            O Bug embaralhou os feitiços do reino. Com a ajuda da Pytha, você aprende Python do zero, sem precisar saber
            nada antes, e conserta os 6 mundos de Pythonia.
          </p>
          <div className="relative mx-auto mt-6 max-w-lg text-left">
            <Speech who="pytha" text={guide} />
          </div>
          <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
            <LinkButton size="lg" href={`/level/${nextLevel.id}`}>
              {done ? "Continuar aventura" : "Começar aventura"} →
            </LinkButton>
            <button className="text-sm text-muted-foreground underline hover:text-foreground" onClick={() => setReplay(true)}>
              Rever o prólogo
            </button>
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
                    <p className="mt-1 text-xs text-white/70">Guardião: {characters[guardians[w.id]].name}</p>
                  </div>
                  <div className="hidden sm:block">
                    <Avatar who={guardians[w.id]} size="sm" />
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
