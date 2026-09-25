"use client";

import { Button } from "@/components/ui/button";
import { MODULES, type Module, type Visual } from "@/content/modules";
import { sound } from "@/game/audio";
import { useCallback, useEffect, useState } from "react";

const BANDS = ["Começo", "Decisão", "Repetição", "Dados", "Funções", "Objetos", "Avançado"];

function useTypewriter(text: string) {
  const [state, setState] = useState({ text, shown: 0 });
  const shown = state.text === text ? state.shown : 0;
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        const cur = s.text === text ? s.shown : 0;
        return cur >= text.length ? s : { text, shown: cur + 2 };
      });
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return { typed: text.slice(0, shown), done: shown >= text.length, finish: () => setState({ text, shown: text.length }) };
}

function VisualView({ visual }: { visual: Visual }) {
  if (visual.kind === "sequence") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {visual.items.map((item, n) => (
          <div key={`${item}-${n}`} className="flex items-center gap-2">
            <div
              className={`min-w-24 rounded-xl border px-3 py-4 text-center ${
                n === visual.lit
                  ? "border-emerald-300 bg-emerald-400/20 text-emerald-50 shadow-[0_0_24px_rgb(52_211_153/0.4)]"
                  : n < visual.lit
                    ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-100/80"
                    : "border-white/10 text-white/35"
              }`}
            >
              <p className="font-mono text-[10px] text-emerald-300/80">{n + 1}</p>
              <p className="text-sm font-bold">{item}</p>
            </div>
            {n < visual.items.length - 1 && <span className={n < visual.lit ? "text-emerald-300" : "text-white/20"}>→</span>}
          </div>
        ))}
      </div>
    );
  }
  if (visual.kind === "fork") {
    return (
      <div className="grid justify-items-center gap-3">
        <p className="rounded-full border border-sky-300/50 bg-sky-400/15 px-4 py-2 text-sm font-bold text-sky-100">{visual.question}</p>
        <div className="grid w-full max-w-md grid-cols-2 gap-3">
          {(["yes", "no"] as const).map((side) => (
            <div
              key={side}
              className={`rounded-xl border px-3 py-5 text-center ${
                visual.path === side ? "border-emerald-300 bg-emerald-400/15 text-emerald-50 shadow-[0_0_24px_rgb(52_211_153/0.3)]" : "border-white/10 text-white/40"
              }`}
            >
              <p className="font-mono text-[10px] uppercase">{side === "yes" ? "sim" : "não"}</p>
              <p className="mt-1 text-sm font-bold">{side === "yes" ? visual.yes : visual.no}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (visual.kind === "loop") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap justify-center gap-2">
          {visual.items.map((item, n) => (
            <div
              key={`${item}-${n}`}
              className={`rounded-lg border px-4 py-3 font-mono text-sm ${
                n === visual.at ? "border-amber-300 bg-amber-300/15 text-amber-50 shadow-[0_0_20px_rgb(252_211_77/0.35)]" : "border-white/10 text-white/40"
              }`}
            >
              <span className="mr-2 text-[10px] text-white/40">[{n}]</span>
              {item}
            </div>
          ))}
        </div>
        <p className="text-center font-mono text-xs text-amber-200">{visual.note}</p>
      </div>
    );
  }
  if (visual.kind === "slots") {
    return (
      <div className="flex flex-wrap justify-center gap-4">
        {visual.slots.map((slot) => (
          <div key={slot.name} className="w-40 rounded-xl border border-cyan-300/40 bg-cyan-400/10 p-3 text-center">
            <p className="font-mono text-[10px] uppercase text-cyan-200">{slot.kind}</p>
            <p className="mt-1 text-xs text-white/60">{slot.name}</p>
            <p className="mt-2 rounded-md bg-black/50 py-2 font-mono text-lg text-cyan-100">{slot.value}</p>
          </div>
        ))}
      </div>
    );
  }
  if (visual.kind === "terminal") {
    return (
      <div className="mx-auto w-full max-w-lg rounded-lg border border-emerald-400/30 bg-black/70 p-4 font-mono text-sm text-emerald-200">
        <p className="text-white/50">&gt; {visual.cmd}</p>
        {visual.out.map((line) => (
          <p key={line} className="mt-2 text-emerald-100">
            {line}
          </p>
        ))}
      </div>
    );
  }
  if (visual.kind === "code") {
    return (
      <pre className="mx-auto w-full max-w-lg overflow-x-auto rounded-lg border border-white/10 bg-black/70 p-4 font-mono text-sm leading-7">
        {visual.lines.map((line, n) => (
          <div key={`${line}-${n}`} className={n === visual.focus ? "bg-emerald-400/20 text-emerald-50" : "text-white/55"}>
            {line || " "}
          </div>
        ))}
      </pre>
    );
  }
  if (visual.kind === "cards") {
    return (
      <div className="space-y-3">
        <p className="text-center font-mono text-xs uppercase tracking-widest text-sky-200">{visual.title}</p>
        <div className="mx-auto grid max-w-md gap-2">
          {visual.pairs.map((pair) => (
            <div
              key={pair.key}
              className={`grid grid-cols-[1fr_auto_1.2fr] items-center gap-3 rounded-lg border px-3 py-2 ${
                pair.hot ? "border-sky-300 bg-sky-400/15 text-sky-50" : "border-white/10 text-white/50"
              }`}
            >
              <span className="font-mono text-sm">{pair.key}</span>
              <span>→</span>
              <span className="font-bold">{pair.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (visual.kind === "gates") {
    return (
      <div className="space-y-4 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-violet-200">{visual.title}</p>
        <div className="flex flex-wrap justify-center gap-4">
          {visual.lamps.map((lamp) => (
            <div key={lamp.label} className="w-28">
              <div className={`mx-auto size-10 rounded-full ${lamp.on ? "bg-emerald-400 shadow-[0_0_22px_#34d399]" : "bg-zinc-700"}`} />
              <p className="mt-2 text-sm">{lamp.label}</p>
              <p className="font-mono text-[10px] text-white/50">{lamp.on ? "verdade" : "falso"}</p>
            </div>
          ))}
        </div>
        <p className="font-mono text-sm text-emerald-200">{visual.result}</p>
      </div>
    );
  }
  return (
    <div className="mx-auto grid max-w-md justify-items-center">
      <div className="rounded-2xl border border-fuchsia-300/50 bg-fuchsia-400/10 px-8 py-6 text-center">
        <p className="font-mono text-[10px] uppercase text-fuchsia-200">{visual.outer}</p>
        <div className="mt-3 rounded-xl border border-white/15 bg-black/50 px-4 py-3 font-mono text-sm text-white">{visual.inner}</div>
      </div>
      <p className="mt-3 text-sm text-white/70">{visual.note}</p>
    </div>
  );
}

export function ComputerLesson({
  moduleId,
  onPick,
  onClose,
}: {
  moduleId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const mod = MODULES.find((m) => m.id === moduleId) ?? null;
  if (mod) return <LessonRoom module={mod} onBack={() => onPick("")} onClose={onClose} />;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-3">
      <div className="flex max-h-[88%] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-cyan-300/30 bg-[#04110e] shadow-[0_0_40px_rgb(34_211_238/0.2)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 font-mono text-[11px] text-cyan-200">
          <span>DANI // COMPUTADOR</span>
          <span>aula · o pagamento fica</span>
        </div>
        <div className="space-y-3 overflow-y-auto p-4">
          <p className="text-sm text-emerald-50">Escolha o módulo. A Maya explica na tela, um passo de cada vez, com o desenho do que ela está falando.</p>
          <p className="text-xs text-white/60">Essa aula na cobertura não tira o dinheiro da missão. O pagamento some só se, no terminal, ela escrever o código no seu lugar.</p>
          {BANDS.map((band) => (
            <div key={band}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300/70">{band}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {MODULES.filter((m) => m.band === band).map((m) => (
                  <Button key={m.id} size="sm" variant="secondary" onClick={() => onPick(m.id)}>
                    {m.title}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-3">
          <Button variant="ghost" onClick={onClose}>
            Sair da tela
          </Button>
        </div>
      </div>
    </div>
  );
}

function LessonRoom({ module, onBack, onClose }: { module: Module; onBack: () => void; onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = module.steps[i];
  const last = i === module.steps.length - 1;
  const { typed, done, finish } = useTypewriter(step.say);

  const advance = useCallback(() => {
    sound.sfx("click");
    if (!done) return finish();
    if (last) onClose();
    else setI((n) => n + 1);
  }, [done, finish, last, onClose]);

  const back = useCallback(() => {
    sound.sfx("click");
    if (i === 0) onBack();
    else setI((n) => n - 1);
  }, [i, onBack]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, back, onClose]);

  return (
    <div className="anim-monitor absolute inset-0 z-20 flex flex-col bg-[#02110c] text-emerald-50">
      <div className="flex items-center justify-between border-b border-emerald-400/20 px-4 py-2 font-mono text-[11px] text-emerald-300">
        <span>
          DANI // {module.title.toUpperCase()} · {i + 1}/{module.steps.length}
        </span>
        <span>dentro da tela</span>
      </div>
      <div className="flex gap-1 px-4 pt-3">
        {module.steps.map((_, n) => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= i ? "bg-emerald-400" : "bg-white/10"}`} />
        ))}
      </div>
      <div key={i} className="anim-pop flex flex-1 items-center justify-center p-4">
        <VisualView visual={step.visual} />
      </div>
      <div className="border-t border-emerald-400/20 bg-black/50 p-4">
        <p className="text-[11px] font-black uppercase tracking-widest text-sky-300">Maya</p>
        <p className="mt-1 min-h-12 text-sm leading-relaxed sm:text-base">
          {typed}
          {!done && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-emerald-300 align-middle" />}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={back}>
            Voltar
          </Button>
          <Button onClick={advance}>{last && done ? "Sair da aula" : "Próximo"}</Button>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
