"use client";

import { Md } from "@/components/game";
import { Button } from "@/components/ui/button";
import { CharacterId, characters, Line } from "@/content/story";
import { useCallback, useEffect, useState } from "react";

export function Avatar({ who, size = "lg", mood }: { who: CharacterId; size?: "sm" | "lg"; mood?: "happy" | "sad" }) {
  const c = characters[who];
  const dims = size === "lg" ? "size-24 text-6xl sm:size-28 sm:text-7xl" : "size-12 text-3xl";
  const anim = mood === "happy" ? "anim-jump" : mood === "sad" ? "anim-shake" : "anim-float";
  return (
    <div className={`relative shrink-0 rounded-full bg-gradient-to-br p-1 ${c.ring} ${anim}`}>
      <div className={`flex items-center justify-center rounded-full bg-background/90 ${dims}`}>
        <span className="anim-blink select-none">{c.avatar}</span>
      </div>
    </div>
  );
}

function useTypewriter(text: string) {
  const [state, setState] = useState({ text, shown: 0 });
  const shown = state.text === text ? state.shown : 0;
  useEffect(() => {
    const t = setInterval(
      () =>
        setState((s) => {
          const cur = s.text === text ? s.shown : 0;
          return cur >= text.length ? s : { text, shown: cur + 1 };
        }),
      18,
    );
    return () => clearInterval(t);
  }, [text]);
  return { typed: text.slice(0, shown), done: shown >= text.length, finish: () => setState({ text, shown: text.length }) };
}

function openTicks(s: string) {
  return (s.match(/`/g)?.length ?? 0) % 2 === 1 ? s + "`" : s;
}

export function Cutscene({ lines, onDone, doneLabel = "Vamos lá!" }: { lines: Line[]; onDone: () => void; doneLabel?: string }) {
  const [i, setI] = useState(0);
  const line = lines[i];
  const { typed, done, finish } = useTypewriter(line.text);
  const c = characters[line.who];
  const last = i === lines.length - 1;
  const isPlayer = line.who === "voce";

  const advance = useCallback(() => {
    if (!done) return finish();
    if (last) onDone();
    else setI((n) => n + 1);
  }, [done, finish, last, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div
        key={i}
        onClick={advance}
        className={`anim-pop flex cursor-pointer items-end gap-4 ${isPlayer ? "flex-row-reverse" : ""}`}
      >
        <div className="flex flex-col items-center gap-1">
          <Avatar who={line.who} />
          <span className="text-center text-xs font-semibold">{c.name}</span>
        </div>
        <div
          className={`relative mb-6 min-h-32 flex-1 rounded-2xl border border-white/15 bg-card p-5 text-lg leading-relaxed shadow-xl ${
            isPlayer ? "rounded-br-sm" : "rounded-bl-sm"
          }`}
        >
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{c.role}</p>
          <p>
            <Md text={openTicks(typed)} />
            {!done && <span className="anim-caret ml-0.5 inline-block h-5 w-2 translate-y-1 bg-foreground/70" />}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-label={`Fala ${i + 1} de ${lines.length}`}>
          {lines.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-primary" : n < i ? "w-3 bg-primary/50" : "w-3 bg-white/15"}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {!last && (
            <Button variant="ghost" onClick={onDone}>
              Pular
            </Button>
          )}
          {i > 0 && (
            <Button variant="secondary" onClick={() => setI((n) => n - 1)}>
              ← Voltar
            </Button>
          )}
          <Button onClick={advance}>{!done ? "Mostrar tudo" : last ? doneLabel : "Próximo →"}</Button>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Dica: clique no balão ou aperte Enter para continuar.</p>
    </div>
  );
}

export function Speech({ who, text, mood }: { who: CharacterId; text: string; mood?: "happy" | "sad" }) {
  return (
    <div key={text} className="anim-pop flex items-start gap-3">
      <Avatar who={who} size="sm" mood={mood} />
      <div className="flex-1 rounded-2xl rounded-tl-sm border border-white/10 bg-card px-4 py-3 text-sm leading-relaxed">
        <p className="mb-0.5 text-xs font-semibold text-muted-foreground">{characters[who].name}</p>
        <Md text={text} />
      </div>
    </div>
  );
}
