"use client";

import { Md } from "@/components/game";
import { Portrait } from "@/components/portrait";
import { Button } from "@/components/ui/button";
import type { Line, Who } from "@/content/types";
import { sound } from "@/game/audio";
import { people } from "@/game/characters";
import { useCallback, useEffect, useState } from "react";

function useTypewriter(text: string) {
  const [state, setState] = useState({ text, shown: 0 });
  const shown = state.text === text ? state.shown : 0;
  useEffect(() => {
    const id = setInterval(
      () =>
        setState((s) => {
          const cur = s.text === text ? s.shown : 0;
          return cur >= text.length ? s : { text, shown: cur + 2 };
        }),
      22,
    );
    return () => clearInterval(id);
  }, [text]);
  return { typed: text.slice(0, shown), done: shown >= text.length, finish: () => setState({ text, shown: text.length }) };
}

function closeTicks(s: string) {
  return (s.match(/`/g)?.length ?? 0) % 2 === 1 ? s + "`" : s;
}

export function Dialogue({
  lines,
  onDone,
  onSpeaker,
  doneLabel = "Começar missão",
  compact = false,
}: {
  lines: Line[];
  onDone: () => void;
  onSpeaker?: (who: Who) => void;
  doneLabel?: string;
  compact?: boolean;
}) {
  const [i, setI] = useState(0);
  const line = lines[i];
  const { typed, done, finish } = useTypewriter(line.text);
  const last = i === lines.length - 1;
  const person = people[line.who];

  useEffect(() => onSpeaker?.(line.who), [line.who, onSpeaker]);
  useEffect(() => sound.speak(line.who, line.text), [line.who, line.text]);

  const advance = useCallback(() => {
    sound.sfx("click");
    if (!done) return finish();
    if (last) onDone();
    else setI((n) => n + 1);
  }, [done, finish, last, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  return (
    <div className="anim-pop w-full rounded-xl border border-white/15 bg-black/80 p-3 shadow-2xl backdrop-blur sm:p-4">
      <div className="flex cursor-pointer gap-3" onClick={advance}>
        <div className={`overflow-hidden rounded-lg border-2 ${person.ally ? "border-sky-400/60 bg-sky-950" : "border-rose-500/60 bg-rose-950"}`}>
          <Portrait who={line.who} size={compact ? 56 : 72} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-black uppercase tracking-wider ${person.ally ? "text-sky-300" : "text-rose-300"}`}>
            {person.name} <span className="font-medium normal-case tracking-normal text-white/50">· {person.role}</span>
          </p>
          <p className={`mt-1 leading-relaxed text-white ${compact ? "text-sm" : "text-sm sm:text-base"}`}>
            <Md text={closeTicks(typed)} />
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-white/50">
          {i + 1}/{lines.length} · clique ou Enter
        </span>
        <div className="flex gap-2">
          {!last && (
            <Button size="sm" variant="ghost" onClick={onDone}>
              Pular
            </Button>
          )}
          <Button size="sm" onClick={advance}>
            {!done ? "Mostrar tudo" : last ? doneLabel : "Próximo →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
