"use client";

import { Dialogue } from "@/components/dialogue";
import { LinkButton, Md, Stars, TopBar } from "@/components/game";
import { GameHandle, GameView3D } from "@/components/game-view-3d";
import { feedback, HackPanel } from "@/components/hack-panel";
import { Button } from "@/components/ui/button";
import { findLevel } from "@/content/worlds";
import type { Phase } from "@/game3d/engine";
import { people } from "@/game/characters";
import { ACHIEVEMENTS, completeLevel, isUnlocked, markHelped, saveCode, useProgress } from "@/lib/progress";
import { onReadyChange, runPython, RunResult, warmUp } from "@/lib/runPython";
import { sound } from "@/game/audio";
import { requestGameFullscreen } from "@/game/fullscreen";
import confetti from "canvas-confetti";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Win = { stars: number; xp: number; pay: number; ach: string[] };

export default function LevelPage() {
  const { id } = useParams<{ id: string }>();
  const found = findLevel(id);
  const p = useProgress();

  if (!found || !isUnlocked(p, id)) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="text-5xl">{found ? "🔒" : "🗺️"}</p>
          <h1 className="mt-4 text-2xl font-bold">{found ? "Missão bloqueada" : "Essa missão não existe"}</h1>
          {found && <p className="mt-2 text-muted-foreground">Complete a missão anterior para liberar esta.</p>}
          <LinkButton href="/" className="mt-6">
            Voltar ao mapa
          </LinkButton>
        </main>
      </>
    );
  }
  return <Mission key={id} id={id} savedCode={p.code[id]} alreadyDone={!!p.stars[id]} />;
}

function Mission({ id, savedCode, alreadyDone }: { id: string; savedCode?: string; alreadyDone: boolean }) {
  const { level, world, next, index } = findLevel(id)!;
  const game = useRef<GameHandle>(null);
  const [skipBrief] = useState(alreadyDone);
  const [phase, setPhase] = useState<Phase>("brief");
  const [full, setFull] = useState(true);
  const [round, setRound] = useState(0);
  const shell = useRef<HTMLElement>(null);
  const apiFull = useRef(false);
  const [code, setCode] = useState(savedCode ?? level.starter);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<RunResult | null>(null);
  const [hints, setHints] = useState(0);
  const [fails, setFails] = useState(0);
  const [solved, setSolved] = useState(false);
  const [win, setWin] = useState<Win | null>(null);
  const [, setReady] = useState(false);
  const potential = solved ? 1 : Math.max(1, 3 - hints - Math.max(0, fails - 1));
  const potentialRef = useRef(potential);
  useEffect(() => {
    potentialRef.current = potential;
  }, [potential]);

  useEffect(() => {
    warmUp();
    return onReadyChange(setReady);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => saveCode(id, code), 400);
    return () => clearTimeout(t);
  }, [id, code]);

  const onPhase = useCallback(
    (p: Phase) => {
      setPhase(p);
      if (p === "done") {
        const done = completeLevel(id, potentialRef.current);
        setWin({ stars: done.stars, xp: done.gainedXp, pay: done.pay, ach: done.newAch });
        confetti({ particleCount: level.boss ? 260 : 150, spread: 90, origin: { y: 0.55 } });
        sound.sfx("fanfare");
      }
    },
    [id, level.boss],
  );

  async function run(source: string, solving = false) {
    setBusy(true);
    const probe = level.display.kind === "locks" ? { setup: level.display.setup, events: level.display.events } : undefined;
    const r = await runPython(source, level.check, level.inputs, probe);
    setBusy(false);
    setLast(r);
    if (solving) setSolved(true);
    if (!r.ok) setFails((f) => f + 1);
    game.current?.applyHack({
      ok: r.ok,
      broken: !!r.error || !!r.timedOut,
      screen: r.stdout.trim() || null,
      locks: r.probes ? r.probes.map((p) => p.ok) : null,
    });
  }

  function solve() {
    if (!confirm("A Dani escreve o código por você. A missão vale só 1 estrela e não paga dinheiro. Continuar?")) return;
    markHelped();
    setCode(level.solution);
    run(level.solution, true);
  }

  const hacking = phase === "hack" || (phase === "result" && busy);

  function enterFull() {
    setFull(true);
    requestGameFullscreen()?.then(() => {
      apiFull.current = true;
    }).catch(() => {});
  }

  function toggleFull() {
    if (full) {
      setFull(false);
      apiFull.current = false;
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      return;
    }
    enterFull();
  }

  function replay() {
    setWin(null);
    setPhase(skipBrief ? "play" : "brief");
    setLast(null);
    setHints(0);
    setFails(0);
    setSolved(false);
    setBusy(false);
    setCode(savedCode ?? level.starter);
    setRound((n) => n + 1);
  }

  useEffect(() => {
    if (document.fullscreenElement) apiFull.current = true;
    const sync = () => {
      if (document.fullscreenElement) {
        apiFull.current = true;
        setFull(true);
      } else if (apiFull.current) {
        apiFull.current = false;
        setFull(false);
      }
    };
    const arm = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest("[data-exit-full], a, button")) return;
      requestGameFullscreen()?.then(() => {
        apiFull.current = true;
      }).catch(() => {});
    };
    document.addEventListener("fullscreenchange", sync);
    window.addEventListener("pointerdown", arm);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      window.removeEventListener("pointerdown", arm);
    };
  }, []);

  return (
    <>
      {!full && <TopBar />}
      <main ref={shell} className={full ? "fixed inset-0 z-30 flex h-dvh flex-col bg-black" : "mx-auto w-full max-w-6xl space-y-2 px-2 py-2 sm:px-4 sm:py-3"}>
        {!full && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          <LinkButton href="/" size="sm" variant="ghost">
            ← Mapa
          </LinkButton>
          <p className="min-w-0 flex-1 truncate text-sm">
            <span className="text-muted-foreground">
              {world.name} · Missão {index + 1}:
            </span>{" "}
            <b>{level.title}</b>
            {level.boss && <span className="ml-2 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-black uppercase">Chefe</span>}
          </p>
          <span className="text-xs text-muted-foreground" title="Estrelas que você ainda pode ganhar">
            Valendo <Stars n={potential} size="text-sm" />
          </span>
          <button className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => game.current?.replayBrief()} disabled={phase !== "play"}>
            Rever o briefing
          </button>
        </div>}

        <div className={full ? "relative min-h-0 flex-1" : undefined}>
          <GameView3D
            ref={game}
            level={level}
            world={world}
            index={index}
            onPhase={onPhase}
            skipBrief={skipBrief}
            key={round}
            fullscreen={full}
            onFullscreen={toggleFull}
            onStart={enterFull}
          />
        </div>

        {hacking ? (
          <div className={full ? "max-h-[42vh] shrink-0 overflow-y-auto" : undefined}>
            <HackPanel
              level={level}
              code={code}
              setCode={setCode}
              busy={busy}
              last={last}
              hintsShown={hints}
              onHint={() => setHints((h) => h + 1)}
              onRun={() => run(code)}
              onSolve={solve}
              onExit={() => game.current?.closeHack()}
            />
          </div>
        ) : !full ? (
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-card/70 px-3 py-2 text-sm">
            <span className="text-lg">🎯</span>
            <p className="min-w-0 flex-1 leading-snug">
              {phase === "brief" ? (
                "Ouça o briefing da equipe."
              ) : phase === "play" && last && !last.ok ? (
                <>
                  <b className="text-rose-300">Dani:</b> {feedback(level, last)} Volte ao terminal e aperte E para tentar de novo.
                </>
              ) : phase === "play" && !last?.ok ? (
                <>
                  Siga a seta ⬆ e o objetivo no topo da tela. Aperte E quando o botão verde de hackear aparecer. Desafio: <Md text={level.task} />
                </>
              ) : phase === "dive" || phase === "surface" || phase === "result" ? (
                "Léo está dentro do sistema..."
              ) : phase === "escape" ? (
                "Fuga com o Tio Rui!"
              ) : phase === "done" ? (
                "Missão encerrada."
              ) : (
                "Acesso liberado! Siga o próximo objetivo no topo da tela."
              )}
            </p>
          </div>
        ) : null}

        {win && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center">
          <div className="anim-pop max-h-[92vh] w-full max-w-xl space-y-3 overflow-y-auto rounded-2xl border border-emerald-400/40 bg-card p-5 shadow-2xl">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-300">{level.boss ? `${people[level.boss].name} derrotado` : "Missão cumprida"}</p>
              <Stars n={win.stars} size="text-5xl" />
              <p className="text-sm text-muted-foreground">
                +{win.xp} XP de reputação{win.pay ? ` · +R$ ${win.pay}` : alreadyDone ? "" : " · sem dinheiro, a Dani ajudou"}{solved ? " · resolvido pela Dani" : ""}
              </p>
            </div>
            <Dialogue
              lines={[level.success, { who: "dani", text: `${solved ? "Olha como eu fiz:" : "Por que funcionou:"} ${level.explain}` }]}
              onDone={() => {}}
              doneLabel="✓"
              compact
            />
            {solved && <pre className="overflow-x-auto rounded-lg bg-black/60 p-3 font-mono text-xs text-emerald-300">{level.solution}</pre>}
            {win.ach.map((a) => (
              <p key={a} className="rounded-lg bg-yellow-400/10 px-3 py-2 text-sm text-yellow-200">
                🏆 {ACHIEVEMENTS[a]}
              </p>
            ))}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <Button
                onClick={() => {
                  setWin(null);
                  game.current?.enterHub();
                }}
              >
                Ficar na ilha
              </Button>
              <Button variant="ghost" onClick={replay}>
                Jogar de novo
              </Button>
              <LinkButton href="/" variant="secondary">
                Mapa
              </LinkButton>
              {next && <LinkButton href={`/level/${next.id}?hub=1`}>Próxima missão →</LinkButton>}
            </div>
          </div>
        </div>
        )}
      </main>
    </>
  );
}
