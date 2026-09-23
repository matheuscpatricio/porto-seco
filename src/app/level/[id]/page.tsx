"use client";

import { LinkButton, Md, Stars, TopBar } from "@/components/game";
import { Cast, describeExpect, describeGot, Stage } from "@/components/stage";
import { Avatar, Cutscene, Speech } from "@/components/story";
import { Button } from "@/components/ui/button";
import { stages } from "@/content/stages";
import { characters, cheers, oops, scenes } from "@/content/story";
import { findLevel } from "@/content/worlds";
import { ACHIEVEMENTS, completeLevel, isUnlocked, saveCode, useProgress } from "@/lib/progress";
import { friendlyError, onReadyChange, runPython, RunResult, warmUp } from "@/lib/runPython";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import confetti from "canvas-confetti";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Win = { stars: number; xp: number; ach: string[] };

export default function LevelPage() {
  const { id } = useParams<{ id: string }>();
  const found = findLevel(id);
  const p = useProgress();

  if (!found) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="text-5xl">🗺️</p>
          <h1 className="mt-4 text-2xl font-bold">Essa fase não existe</h1>
          <LinkButton href="/" className="mt-6">
            Voltar ao mapa
          </LinkButton>
        </main>
      </>
    );
  }
  if (!isUnlocked(p, id)) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="text-5xl">🔒</p>
          <h1 className="mt-4 text-2xl font-bold">Fase bloqueada</h1>
          <p className="mt-2 text-muted-foreground">Complete a fase anterior para liberar esta.</p>
          <LinkButton href="/" className="mt-6">
            Voltar ao mapa
          </LinkButton>
        </main>
      </>
    );
  }
  return <Level key={id} id={id} savedCode={p.code[id]} alreadyDone={!!p.stars[id]} />;
}

function Crystals({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-0.5" title="Energia mágica: vira estrelas quando você vence">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`text-lg transition-all ${i <= n ? "" : "scale-75 opacity-20 grayscale"}`}>
          💎
        </span>
      ))}
    </span>
  );
}

function feedbackFor(result: RunResult, cast: number, events: { label: string; expect: string }[]) {
  const intro = oops[cast % oops.length];
  if (result.timedOut) return `${intro} O feitiço ficou repetindo para sempre. Confira se o seu laço tem um jeito de parar.`;
  if (result.error) {
    const friendly = friendlyError(result.error);
    return `${intro} ${friendly ?? "O Python parou no meio do feitiço."} A linha vermelha no pergaminho de saída mostra onde foi.`;
  }
  const bad = result.probes?.findIndex((p) => !p.ok) ?? -1;
  if (bad >= 0 && events[bad]) {
    const ev = events[bad];
    return `${intro} Olha o teste "${ev.label}": seu feitiço deu ${describeGot(result.probes![bad])}, mas a missão esperava ${describeExpect(ev.expect)}.`;
  }
  return `${intro} ${result.failure ?? "O resultado ainda não é o que a missão pede."}`;
}

function Level({ id, savedCode, alreadyDone }: { id: string; savedCode?: string; alreadyDone: boolean }) {
  const { level, world, next, index } = findLevel(id)!;
  const scene = scenes[id];
  const spec = stages[id];
  const [mode, setMode] = useState<"story" | "play">(alreadyDone ? "play" : "story");
  const [code, setCode] = useState(savedCode ?? level.starter);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cast, setCast] = useState<Cast | null>(null);
  const [lastResult, setLastResult] = useState<RunResult | null>(null);
  const [rehearsal, setRehearsal] = useState<RunResult | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [fails, setFails] = useState(0);
  const [win, setWin] = useState<Win | null>(null);
  const [solved, setSolved] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const castCount = useRef(0);
  const viewRef = useRef<EditorView | null>(null);

  const crystals = solved ? 1 : Math.max(1, 3 - hintsShown - Math.max(0, fails - 1));
  const host = characters[spec.host];

  useEffect(() => {
    warmUp();
    return onReadyChange(setReady);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => saveCode(id, code), 400);
    return () => clearTimeout(t);
  }, [id, code]);

  function insertChip(chip: string) {
    const view = viewRef.current;
    if (!view) return setCode((c) => c + chip);
    const { from, to } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    const indent = line.text.match(/^\s*/)![0];
    let text = chip;
    let cursor = chip.length;
    if (chip.endsWith(":")) {
      text = `${chip}\n${indent}    `;
      cursor = text.length;
    } else if (chip.endsWith("()")) {
      cursor = chip.length - 1;
    } else if (chip === '""') {
      cursor = 1;
    }
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + cursor } });
    view.focus();
  }

  async function launch(source: string, solving = false) {
    setBusy(true);
    setRehearsal(null);
    setLastResult(null);
    const result = await runPython(source, level.check, level.inputs, spec.events ? { setup: spec.setup, events: spec.events } : undefined);
    castCount.current += 1;
    if (solving) setSolved(true);
    setCast({ n: castCount.current, result });
  }

  const onCastDone = useCallback(
    (c: Cast) => {
      setBusy(false);
      setLastResult(c.result);
      if (!c.result.ok) {
        setFails((f) => f + 1);
        return;
      }
      const stars = solved ? 1 : Math.max(1, 3 - hintsShown - Math.max(0, fails - 1));
      const done = completeLevel(id, stars);
      setWin({ stars: done.stars, xp: done.gainedXp, ach: done.newAch });
      confetti({ particleCount: level.boss ? 260 : 140, spread: 90, origin: { y: 0.6 } });
    },
    [fails, hintsShown, id, level.boss, solved],
  );

  async function rehearse() {
    setBusy(true);
    const r = await runPython(code, "", level.inputs);
    setBusy(false);
    setRehearsal(r);
  }

  function solve() {
    if (!confirm("Pedir para a Pytha lançar o feitiço por você? Ela escreve o código e explica. A fase vale só 1 estrela.")) return;
    setCode(level.solution);
    launch(level.solution, true);
  }

  if (mode === "story") {
    return (
      <>
        <TopBar />
        <main className="relative flex flex-1 flex-col justify-center overflow-hidden px-4 py-10">
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${world.color} opacity-15`} />
          <div className="relative mb-8 text-center">
            <p className="text-5xl">{world.emoji}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {world.name} · Fase {index + 1}
            </p>
            <h1 className="mt-1 text-3xl font-black">
              {level.boss && "👹 "}
              {level.title}
            </h1>
          </div>
          <div className="relative">
            <Cutscene lines={scene.intro} onDone={() => setMode("play")} doneLabel="Ir para a missão ✨" />
          </div>
        </main>
      </>
    );
  }

  const output = rehearsal ?? lastResult;

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-card/80 px-4 py-2">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Mapa
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] uppercase tracking-widest text-muted-foreground">
              {world.emoji} {world.name} · Fase {index + 1}
            </p>
            <h1 className="truncate font-black leading-tight">
              {level.boss && "👹 Chefe: "}
              {level.title.replace(/^Chefe( final)?: /, "")}
            </h1>
          </div>
          <Crystals n={crystals} />
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{level.xp} XP</span>
          <button className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => setMode("story")}>
            Rever a história
          </button>
        </div>

        <Stage spec={spec} worldColor={world.color} cast={cast} casting={busy && !cast} onDone={onCastDone} />

        <div className={`flex items-start gap-3 rounded-xl border p-3 sm:p-4 ${level.boss ? "border-rose-400/40 bg-rose-500/10" : "border-amber-300/30 bg-amber-200/5"}`}>
          <Avatar who={spec.host} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-200/80">📜 Missão de {host.name}</p>
            <p className="leading-relaxed">
              <Md text={level.task} />
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <section className="overflow-hidden rounded-2xl border-2 border-amber-700/50 bg-[#1b1510] shadow-xl">
            <div className="flex items-center justify-between border-b border-amber-700/40 bg-amber-900/30 px-4 py-2">
              <span className="text-sm font-bold text-amber-100">📖 Seu livro de feitiços</span>
              <button className="text-xs text-amber-200/70 hover:text-amber-100" onClick={() => setCode(level.starter)}>
                Apagar e recomeçar
              </button>
            </div>

            <div className="border-b border-amber-700/30 px-3 py-2">
              <p className="mb-1.5 text-[11px] text-amber-200/70">Palavras mágicas: toque para colocar no feitiço, onde está o cursor.</p>
              <div className="flex flex-wrap gap-1.5">
                {spec.chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => insertChip(chip)}
                    disabled={busy}
                    className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-xs text-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-500/25 active:translate-y-0 disabled:opacity-40"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <CodeMirror
              value={code}
              onChange={setCode}
              onCreateEditor={(view) => {
                viewRef.current = view;
              }}
              extensions={[python()]}
              theme="dark"
              height="230px"
              basicSetup={{ tabSize: 4 }}
              editable={!busy}
            />

            <div className="flex flex-wrap items-center gap-2 border-t border-amber-700/40 p-3">
              <button
                onClick={() => launch(code)}
                disabled={busy || !!win}
                className="anim-glow flex-1 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 px-5 py-3 text-base font-black text-amber-950 shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:animate-none disabled:opacity-50 sm:flex-none"
              >
                {busy ? (ready ? "✨ Lançando…" : "✨ Acordando o Python…") : "✨ Lançar feitiço"}
              </button>
              <Button variant="secondary" disabled={busy} onClick={rehearse}>
                Ensaiar
              </Button>
              <Button variant="ghost" disabled={busy || !!win} onClick={solve}>
                🪄 Pytha resolve
              </Button>
            </div>

            {output && (
              <div className="border-t border-amber-700/40 bg-black/50 p-3 font-mono text-sm">
                <p className="mb-1 font-sans text-[11px] uppercase tracking-widest text-muted-foreground">
                  {rehearsal ? "Ensaio: o que o seu código mostrou (não vale pontos)" : "Pergaminho de saída"}
                </p>
                {output.stdout ? <pre className="whitespace-pre-wrap">{output.stdout}</pre> : !output.error && <p className="text-muted-foreground">(nada foi impresso)</p>}
                {output.error && <pre className="mt-1 whitespace-pre-wrap text-rose-400">{output.error}</pre>}
              </div>
            )}
          </section>

          <aside className="space-y-3">
            {!lastResult && !win && (
              <Speech
                who="pytha"
                text={
                  busy
                    ? "Lá vai o feitiço! Olhe o palco lá em cima para ver o que acontece."
                    : rehearsal
                      ? rehearsal.error
                        ? `No ensaio deu erro. ${friendlyError(rehearsal.error) ?? "Veja a linha vermelha."}`
                        : "Ensaio feito! Quando estiver pronto, aperte o botão dourado para valer."
                      : "Escreva o feitiço no livro. Pode digitar ou tocar nas palavras mágicas. Depois aperte o botão dourado e veja o que acontece no palco!"
                }
              />
            )}
            {lastResult && !lastResult.ok && <Speech who="pytha" mood="sad" text={feedbackFor(lastResult, fails, spec.events ?? [])} />}

            <div className="rounded-xl border border-white/10 bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">💡 Pedir uma dica</p>
                {hintsShown < level.hints.length ? (
                  <Button size="sm" variant="secondary" disabled={!!win} onClick={() => setHintsShown((h) => h + 1)}>
                    Dica {hintsShown + 1} de {level.hints.length} (−1 💎)
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Sem mais dicas</span>
                )}
              </div>
              {hintsShown === 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Cada dica gasta um cristal. O primeiro erro é de graça; depois disso, cada erro também gasta um.
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {level.hints.slice(0, hintsShown).map((h, i) => (
                    <li key={i} className="anim-pop rounded-md bg-amber-400/10 px-2 py-1 font-mono text-sm text-amber-200">
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-card p-3">
              <button className="flex w-full items-center justify-between text-sm font-semibold" onClick={() => setShowBook((s) => !s)}>
                <span>📚 Anotações da Pytha</span>
                <span className="text-muted-foreground">{showBook ? "▲" : "▼"}</span>
              </button>
              {showBook && (
                <div className="anim-pop mt-2 space-y-2">
                  <p className="text-sm leading-relaxed">
                    <Md text={level.theory} />
                  </p>
                  <pre className="overflow-x-auto rounded-lg bg-black/40 p-2 font-mono text-xs text-emerald-300">{level.example}</pre>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {win && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center">
          <div className="anim-pop max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl border border-emerald-400/40 bg-card p-5 shadow-2xl">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">{level.boss ? "Chefe derrotado!" : "Missão cumprida!"}</p>
              <Stars n={win.stars} size="text-5xl" />
              <p className="text-sm text-muted-foreground">
                +{win.xp} XP{solved ? " · resolvido pela Pytha" : ""}
              </p>
            </div>
            <Speech who={scene.win.who} text={scene.win.text} mood="happy" />
            <Speech who="pytha" text={`${solved ? "Veja como eu fiz:" : cheers[index % cheers.length] + " Por que funcionou:"} ${level.explain}`} mood="happy" />
            {solved && (
              <pre className="overflow-x-auto rounded-lg bg-black/50 p-3 font-mono text-xs text-emerald-300">{level.solution}</pre>
            )}
            {win.ach.map((a) => (
              <p key={a} className="anim-pop rounded-lg bg-yellow-400/10 px-3 py-2 text-sm text-yellow-200">
                🏆 Conquista: {ACHIEVEMENTS[a]}
              </p>
            ))}
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              <Button variant="ghost" onClick={() => setWin(null)}>
                Ver o palco
              </Button>
              <LinkButton href="/" variant="secondary">
                Mapa
              </LinkButton>
              {next && <LinkButton href={`/level/${next.id}`}>Próxima missão →</LinkButton>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
