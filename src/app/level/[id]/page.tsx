"use client";

import { LinkButton, Md, Stars, TopBar } from "@/components/game";
import { Button } from "@/components/ui/button";
import { Cutscene, Speech } from "@/components/story";
import { cheers, oops, scenes } from "@/content/story";
import { findLevel } from "@/content/worlds";
import { ACHIEVEMENTS, completeLevel, isUnlocked, saveCode, useProgress } from "@/lib/progress";
import { friendlyError, onReadyChange, runPython, RunResult, warmUp } from "@/lib/runPython";
import { python } from "@codemirror/lang-python";
import CodeMirror from "@uiw/react-codemirror";
import confetti from "canvas-confetti";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
          <LinkButton href="/" className="mt-6">Voltar ao mapa</LinkButton>
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
          <LinkButton href="/" className="mt-6">Voltar ao mapa</LinkButton>
        </main>
      </>
    );
  }
  return <Level key={id} id={id} savedCode={p.code[id]} alreadyDone={!!p.stars[id]} />;
}

function Level({ id, savedCode, alreadyDone }: { id: string; savedCode?: string; alreadyDone: boolean }) {
  const { level, world, next, index } = findLevel(id)!;
  const scene = scenes[id];
  const [mode, setMode] = useState<"story" | "play">(alreadyDone ? "play" : "story");
  const [tries, setTriesCount] = useState(0);
  const [code, setCode] = useState(savedCode ?? level.starter);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [win, setWin] = useState<Win | null>(null);
  const [explain, setExplain] = useState<string | null>(null);

  useEffect(() => {
    warmUp();
    return onReadyChange(setReady);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => saveCode(id, code), 400);
    return () => clearTimeout(t);
  }, [id, code]);

  async function solve() {
    const ok = confirm("Revelar a solução? O código entra no editor, os testes rodam e a explicação aparece. Esta fase vale 1 estrela.");
    if (!ok) return;
    setCode(level.solution);
    setExplain(level.explain);
    setRunning(true);
    setResult(null);
    const res = await runPython(level.solution, level.check, level.inputs);
    setRunning(false);
    setResult(res);
    if (!res.ok) return;
    const done = completeLevel(id, 1);
    setWin({ stars: done.stars, xp: done.gainedXp, ach: done.newAch });
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
  }

  async function run(withCheck: boolean) {
    setRunning(true);
    setResult(null);
    const res = await runPython(code, withCheck ? level.check : "", level.inputs);
    setRunning(false);
    setResult(res);
    setTriesCount((n) => n + 1);
    if (!withCheck) return;
    const tries = attempts + 1;
    setAttempts(tries);
    if (res.ok) {
      const stars = Math.max(1, 3 - hintsShown - (tries > 2 ? 1 : 0));
      const done = completeLevel(id, stars);
      setWin({ stars: done.stars, xp: done.gainedXp, ach: done.newAch });
      confetti({ particleCount: level.boss ? 250 : 120, spread: 80, origin: { y: 0.7 } });
    }
  }

  const err = result?.error ? friendlyError(result.error) : null;

  return (
    <>
      <TopBar />
      {mode === "story" ? (
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
            <Cutscene lines={scene.intro} onDone={() => setMode("play")} doneLabel="Escrever o feitiço ✨" />
          </div>
        </main>
      ) : (
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="space-y-4">
          <div>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← {world.emoji} {world.name}
            </Link>
            <h1 className="mt-2 text-2xl font-black">
              {level.boss && "👹 "}
              {level.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Fase {index + 1} · {level.xp} XP ·{" "}
              <button className="underline hover:text-foreground" onClick={() => setMode("story")}>
                Rever a história e a explicação
              </button>
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">📜 Resumo da Pytha</h2>
            <p className="leading-relaxed">
              <Md text={level.theory} />
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-sm text-emerald-300">{level.example}</pre>
          </div>

          <div className={`rounded-xl border p-4 ${level.boss ? "border-rose-400/40 bg-rose-500/10" : "border-primary/30 bg-primary/10"}`}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">🎯 Missão</h2>
            <p className="leading-relaxed">
              <Md text={level.task} />
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-card p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide">💡 Dicas</h2>
              {hintsShown < level.hints.length && (
                <Button size="sm" variant="ghost" onClick={() => setHintsShown((h) => h + 1)}>
                  Revelar dica (−1 ★)
                </Button>
              )}
            </div>
            {hintsShown === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Tente sozinho primeiro, vale mais estrelas!</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {level.hints.slice(0, hintsShown).map((h, i) => (
                  <li key={i} className="font-mono text-sm text-amber-200">
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="flex items-center justify-between bg-white/5 px-3 py-2 text-xs text-muted-foreground">
              <span>main.py</span>
              <button className="hover:text-foreground" onClick={() => setCode(level.starter)}>
                Restaurar código
              </button>
            </div>
            <CodeMirror
              value={code}
              onChange={setCode}
              extensions={[python()]}
              theme="dark"
              height="320px"
              basicSetup={{ tabSize: 4 }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={running} onClick={() => run(false)}>
              ▶ Executar
            </Button>
            <Button disabled={running} onClick={() => run(true)} className="flex-1 sm:flex-none">
              ✨ Lançar feitiço (verificar)
            </Button>
            <Button variant="outline" disabled={running} onClick={solve}>
              🪄 Resolver desafio
            </Button>
            {!ready && <span className="self-center text-xs text-muted-foreground">Carregando Python…</span>}
          </div>

          {explain && (
            <div className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-200">Como foi resolvido</h2>
              <p className="font-sans leading-relaxed">
                <Md text={explain} />
              </p>
            </div>
          )}

          <div className="min-h-40 rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-sm">
            {running && <p className="animate-pulse text-muted-foreground">{ready ? "Executando…" : "Invocando o interpretador Python (só na primeira vez)…"}</p>}
            {!running && !result && <p className="text-muted-foreground">A saída do seu código aparece aqui.</p>}
            {result && (
              <>
                {result.stdout && <pre className="whitespace-pre-wrap text-foreground">{result.stdout}</pre>}
                {result.error && (
                  <div className="mt-2 space-y-2">
                    <pre className="whitespace-pre-wrap text-rose-400">{result.error}</pre>
                  </div>
                )}
                {result.failure && <p className="mt-2 font-sans text-amber-300">❌ {result.failure}</p>}
                {result.ok && !win && !result.stdout && <p className="text-muted-foreground">(sem saída)</p>}
                {win && <p className="mt-2 font-sans text-emerald-400">✅ Todos os testes passaram!</p>}
              </>
            )}
          </div>

          {!running && result && !win && (
            <Speech
              who="pytha"
              mood={result.ok ? "happy" : "sad"}
              text={
                result.ok
                  ? "Seu código rodou sem erros. Quando achar que está pronto, aperte \"Lançar feitiço\" para eu conferir a missão."
                  : `${oops[tries % oops.length]} ${
                      err ??
                      (result.failure
                        ? `O feitiço rodou, mas o resultado ainda não é o que a missão pede. Veja a pista em amarelo acima e compare com a missão.`
                        : "Leia a última linha vermelha: ela diz o tipo do erro e onde ele aconteceu.")
                    }${attempts >= 2 && hintsShown === 0 ? " Se travar, a caixa de dicas ao lado ajuda." : ""}`
              }
            />
          )}

          {win && (
            <div className="space-y-3">
              <Speech who={scene.win.who} text={scene.win.text} mood="happy" />
              {!explain && <Speech who="pytha" text={`${cheers[index % cheers.length]} Por que funcionou: ${level.explain}`} mood="happy" />}
            </div>
          )}

          {win && (
            <div className="anim-pop rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-center">
              <p className="text-lg font-bold">{level.boss ? "Chefe derrotado!" : "Fase concluída!"}</p>
              <Stars n={win.stars} size="text-4xl" />
              <p className="text-sm text-muted-foreground">+{win.xp} XP</p>
              {win.ach.map((a) => (
                <p key={a} className="mt-2 text-sm text-yellow-300">
                  🏆 {ACHIEVEMENTS[a]}
                </p>
              ))}
              <div className="mt-4 flex justify-center gap-2">
                <LinkButton href="/" variant="secondary">Mapa</LinkButton>
                {next && (
                  <LinkButton href={`/level/${next.id}`}>Próxima fase →</LinkButton>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      )}
    </>
  );
}
