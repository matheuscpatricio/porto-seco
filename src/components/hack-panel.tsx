"use client";

import { Md } from "@/components/game";
import { Portrait } from "@/components/portrait";
import { Button } from "@/components/ui/button";
import type { Level } from "@/content/types";
import { friendlyError, RunResult } from "@/lib/runPython";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useRef, useState } from "react";

export function describeGot(r: RunResult, i: number) {
  const p = r.probes?.[i];
  if (!p) return "nada";
  if (p.error) return `erro ${p.error}`;
  return p.value ?? "nada";
}

export function describeExpect(e: string) {
  return e.startsWith("!") ? `o erro ${e.slice(1)}` : e;
}

export function feedback(level: Level, r: RunResult) {
  if (r.timedOut) return "O código ficou repetindo para sempre e o terminal cortou. Confira se o seu laço tem um jeito de parar.";
  if (r.error) return `${friendlyError(r.error) ?? "O Python parou no meio do código."} A linha vermelha abaixo mostra onde.`;
  if (level.display.kind === "locks") {
    const bad = r.probes?.findIndex((p) => !p.ok) ?? -1;
    if (bad >= 0) {
      const ev = level.display.events[bad];
      return `A trava "${ev.label}" recebeu ${describeGot(r, bad)}, mas precisava de ${describeExpect(ev.expect)}.`;
    }
  }
  return r.failure ?? "O resultado ainda não é o que o terminal pede.";
}

export function HackPanel({
  level,
  code,
  setCode,
  busy,
  last,
  hintsShown,
  onHint,
  onRun,
  onSolve,
  onExit,
}: {
  level: Level;
  code: string;
  setCode: (c: string) => void;
  busy: boolean;
  last: RunResult | null;
  hintsShown: number;
  onHint: () => void;
  onRun: () => void;
  onSolve: () => void;
  onExit: () => void;
}) {
  const viewRef = useRef<EditorView | null>(null);
  const [showNotes, setShowNotes] = useState(false);

  function insertChip(chip: string) {
    const view = viewRef.current;
    if (!view) return setCode(code + chip);
    const { from, to } = view.state.selection.main;
    const indent = view.state.doc.lineAt(from).text.match(/^\s*/)![0];
    let text = chip;
    let cursor = chip.length;
    if (chip.endsWith(":")) {
      text = `${chip}\n${indent}    `;
      cursor = text.length;
    } else if (chip.endsWith("()")) cursor = chip.length - 1;
    else if (chip === '""') cursor = 1;
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + cursor } });
    view.focus();
  }

  return (
    <section className="anim-pop overflow-hidden rounded-xl border border-emerald-500/40 bg-[#07110d] shadow-2xl">
      <div className="flex items-center gap-2 border-b border-emerald-500/30 bg-emerald-950/60 px-3 py-1.5">
        <span className="font-mono text-xs font-bold text-emerald-300">💻 TERMINAL · {level.target.toUpperCase()}</span>
        <span className="flex-1" />
        <button className="text-xs text-emerald-200/70 hover:text-white" onClick={() => setShowNotes((s) => !s)}>
          {showNotes ? "Esconder anotações" : "Anotações da Maya"}
        </button>
        <button className="text-xs text-emerald-200/70 hover:text-white" onClick={onExit} disabled={busy}>
          Sair ✕
        </button>
      </div>

      <div className="grid gap-0 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 border-emerald-500/20 md:border-r">
          <div className="flex flex-wrap gap-1 border-b border-emerald-500/20 px-2 py-1.5">
            {level.chips.map((c) => (
              <button
                key={c}
                disabled={busy}
                onClick={() => insertChip(c)}
                className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-40"
              >
                {c}
              </button>
            ))}
          </div>
          <CodeMirror
            value={code}
            onChange={setCode}
            onCreateEditor={(v) => {
              viewRef.current = v;
            }}
            extensions={[python()]}
            theme="dark"
            height="150px"
            basicSetup={{ tabSize: 4 }}
            editable={!busy}
            autoFocus
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-emerald-500/20 p-2">
            <button
              onClick={onRun}
              disabled={busy}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-black text-emerald-950 shadow hover:bg-emerald-400 disabled:opacity-50"
            >
              {busy ? "Executando..." : "▶ Executar hack"}
            </button>
            <Button size="sm" variant="secondary" disabled={busy || hintsShown >= level.hints.length} onClick={onHint}>
              Dica ({hintsShown}/{level.hints.length}) −1★
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onSolve}>
              Maya resolve
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-2 p-2.5 text-sm">
          <div className="flex gap-2">
            <div className="overflow-hidden rounded-md border border-sky-400/40 bg-sky-950">
              <Portrait who="dani" size={44} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Objetivo</p>
              <p className="leading-snug text-white">
                <Md text={level.task} />
              </p>
            </div>
          </div>
          {hintsShown > 0 && (
            <ul className="space-y-1">
              {level.hints.slice(0, hintsShown).map((h) => (
                <li key={h} className="rounded bg-amber-400/10 px-2 py-1 font-mono text-xs text-amber-200">
                  {h}
                </li>
              ))}
            </ul>
          )}
          {showNotes && (
            <div className="rounded bg-white/5 p-2 text-xs">
              <p>
                <Md text={level.theory} />
              </p>
              <pre className="mt-1 overflow-x-auto font-mono text-emerald-300">{level.example}</pre>
            </div>
          )}
          {last && !last.ok && !busy && (
            <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs leading-snug text-rose-100">
              <b>Maya:</b> {feedback(level, last)}
            </p>
          )}
          {last && (last.stdout || last.error) && (
            <pre className="max-h-24 overflow-auto rounded bg-black/60 p-1.5 font-mono text-[11px]">
              {last.stdout}
              {last.error && <span className="text-rose-400">{last.error}</span>}
            </pre>
          )}
          {level.display.kind === "locks" && last?.probes && (
            <ul className="space-y-0.5 font-mono text-[11px]">
              {level.display.events.map((ev, i) => (
                <li key={ev.label} className={last.probes![i]?.ok ? "text-emerald-300" : "text-rose-300"}>
                  {last.probes![i]?.ok ? "✔" : "✘"} {ev.label} → {describeGot(last, i)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
