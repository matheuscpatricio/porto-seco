"use client";

import { Avatar } from "@/components/story";
import type { Stage as StageSpec, StageEvent } from "@/content/stages";
import { characters } from "@/content/story";
import type { ProbeResult, RunResult } from "@/lib/runPython";
import { useEffect, useRef, useState } from "react";

export type Cast = { n: number; result: RunResult };

const STEP_MS = 900;

function stdoutLines(r: RunResult) {
  return r.stdout.replace(/\n$/, "").split("\n").filter((l, i, a) => l !== "" || i < a.length - 1);
}

export function totalSteps(spec: StageSpec, r: RunResult) {
  if (r.error || r.timedOut) return 1;
  if (spec.display === "countdown") return Math.min(stdoutLines(r).length, 15) || 1;
  if (spec.display === "boxes" || spec.display === "visitors") return spec.events?.length ?? 1;
  return 1;
}

export function describeExpect(expect: string) {
  return expect.startsWith("!") ? `disparar o alarme ${expect.slice(1)}` : expect;
}

export function describeGot(p: ProbeResult | undefined) {
  if (!p) return "nada";
  if (p.error) return `um erro ${p.error}`;
  return p.value ?? "nada";
}

function EventCard({ ev, probe, shown, active }: { ev: StageEvent; probe?: ProbeResult; shown: boolean; active: boolean }) {
  const meaningKey = probe ? (probe.error ? `!${probe.error}` : probe.value ?? "") : "";
  const meaning = ev.meaning?.[meaningKey];
  const state = !shown ? "wait" : probe?.ok ? "ok" : "bad";
  return (
    <div
      className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-all ${
        state === "ok"
          ? "border-emerald-400/70 bg-emerald-500/20"
          : state === "bad"
            ? "anim-shake border-rose-400/70 bg-rose-500/20"
            : "border-white/15 bg-black/30"
      } ${active ? "scale-105" : ""}`}
    >
      <span className={`text-3xl sm:text-4xl ${shown ? "anim-walk-in" : "opacity-60"}`}>{ev.actor}</span>
      <span className="text-[11px] leading-tight text-white/80">{ev.label}</span>
      <span
        key={state}
        className={`anim-pop max-w-full truncate rounded-md px-1.5 py-0.5 font-mono text-xs ${
          state === "wait" ? "bg-white/10 text-white/50" : state === "ok" ? "bg-emerald-400/25 text-emerald-100" : "bg-rose-400/25 text-rose-100"
        }`}
        title={shown ? describeGot(probe) : undefined}
      >
        {state === "wait" ? "?" : describeGot(probe)}
      </span>
      {shown && (
        <span className="text-[11px] font-semibold leading-tight">
          {state === "ok" ? meaning ?? "✅ Certo!" : `❌ Esperava ${ev.meaning?.[ev.expect] ?? describeExpect(ev.expect)}`}
        </span>
      )}
    </div>
  );
}

export function Stage({
  spec,
  worldColor,
  cast,
  casting,
  onDone,
}: {
  spec: StageSpec;
  worldColor: string;
  cast: Cast | null;
  casting: boolean;
  onDone: (c: Cast) => void;
}) {
  const [anim, setAnim] = useState({ n: -1, step: 0 });
  const step = cast && anim.n === cast.n ? anim.step : 0;
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!cast) return;
    const steps = totalSteps(spec, cast.result);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let s = 1; s <= steps + 1; s++) {
      timers.push(setTimeout(() => setAnim({ n: cast.n, step: s }), STEP_MS * s));
    }
    timers.push(setTimeout(() => onDoneRef.current(cast), STEP_MS * (steps + 1) + (cast.result.ok ? 700 : 200)));
    return () => timers.forEach(clearTimeout);
  }, [cast, spec]);

  const r = cast?.result;
  const steps = r ? totalSteps(spec, r) : 0;
  const finished = !!r && step > steps;
  const fizzled = !!r && (!!r.error || !!r.timedOut) && step >= 1;
  const won = finished && r!.ok;
  const lost = finished && !r!.ok;
  const flying = casting || (!!cast && step === 0);
  const host = characters[spec.host];
  const lines = r ? stdoutLines(r) : [];

  let center: React.ReactNode;
  if (fizzled) {
    center = (
      <div className="flex flex-col items-center gap-2">
        <span className="anim-puff text-6xl">💨</span>
        <p className="anim-pop rounded-lg bg-black/50 px-3 py-1 text-sm">
          {r!.timedOut ? "O feitiço ficou girando sem parar e se desfez." : "O feitiço falhou antes de chegar ao alvo!"}
        </p>
      </div>
    );
  } else if (spec.display === "sign") {
    const lit = !!r && step >= 1 && !r.error;
    const text = lit ? r!.stdout.trim() || "(nada foi impresso)" : spec.emptySign ?? "";
    return renderShell(
      <div className="flex flex-col items-center">
        <div
          key={lit ? `on-${cast?.n}` : "off"}
          className={`min-w-44 max-w-full rounded-lg border-4 border-amber-900 bg-amber-100 px-4 py-3 text-center font-mono text-lg font-bold text-amber-950 shadow-lg sm:min-w-56 sm:text-2xl ${
            lit ? "anim-sign-on" : "opacity-60"
          }`}
        >
          <p className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-widest text-amber-800">{spec.signTitle}</p>
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>
        <div className="flex gap-16">
          <span className="h-6 w-1.5 bg-amber-900" />
          <span className="h-6 w-1.5 bg-amber-900" />
        </div>
      </div>,
    );
  } else if (spec.display === "countdown") {
    const shownLines = r && !r.error ? lines.slice(0, step) : [];
    const current = shownLines[shownLines.length - 1];
    center = (
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-24 items-center justify-center">
          {current !== undefined ? (
            <span key={shownLines.length} className="anim-big-in font-mono text-5xl font-black text-yellow-200 drop-shadow sm:text-6xl">
              {current}
            </span>
          ) : (
            <span className="text-5xl opacity-40">⏱️</span>
          )}
        </div>
        <p className="max-w-full truncate font-mono text-xs text-white/60">{shownLines.join(" · ")}</p>
      </div>
    );
  } else if (spec.display === "speech") {
    const spoken = r && step >= 1 && !r.error ? r.stdout.trim() || "…" : null;
    center = (
      <div className="flex items-end gap-3">
        {spec.arrival && <span className="anim-walk-in text-5xl sm:text-6xl">{spec.arrival}</span>}
        <div
          key={spoken ?? "empty"}
          className={`anim-pop max-w-56 rounded-2xl rounded-bl-sm border px-4 py-3 text-base sm:text-lg ${
            spoken ? "border-white/30 bg-white text-slate-900" : "border-dashed border-white/30 bg-black/30 text-white/50"
          }`}
        >
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">{host.name} diz</p>
          <p className="whitespace-pre-wrap font-medium">{spoken ?? "(esperando o seu feitiço)"}</p>
        </div>
      </div>
    );
  } else {
    const events = spec.events ?? [];
    center = (
      <div className={`grid w-full gap-2 ${events.length > 3 ? "grid-cols-2 sm:grid-cols-4" : events.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {events.map((ev, i) => (
          <EventCard key={i} ev={ev} probe={r?.probes?.[i]} shown={!!r?.probes && step > i} active={!!r && step === i + 1} />
        ))}
      </div>
    );
  }

  return renderShell(center);

  function renderShell(middle: React.ReactNode) {
    const enemy = spec.enemy;
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b ${worldColor}`}>
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative flex min-h-64 flex-col">
          <div className="flex flex-1 items-center gap-2 px-3 pt-4 sm:gap-4 sm:px-5">
            <div className="flex w-16 shrink-0 flex-col items-center gap-1 sm:w-24">
              <div className={`relative rounded-full ${flying ? "anim-glow" : ""}`}>
                <Avatar who="voce" size="sm" mood={won ? "happy" : lost ? "sad" : undefined} />
                <span className="absolute -right-2 -top-1 text-xl">🪄</span>
              </div>
              <span className="text-[10px] font-semibold text-white/80">Você</span>
              {flying && (
                <span className="anim-cast pointer-events-none absolute left-20 top-20 z-10 text-3xl sm:left-28" style={{ ["--cast-dist" as string]: "min(60vw, 480px)" }}>
                  ✨
                </span>
              )}
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-center py-2">{middle}</div>

            <div className="flex w-16 shrink-0 flex-col items-center gap-1 sm:w-24">
              {enemy ? (
                <>
                  <span className={`text-5xl sm:text-6xl ${won ? "anim-defeat" : lost || fizzled ? "anim-jump" : "anim-float"}`}>{enemy.emoji}</span>
                  <span className="text-center text-[10px] font-semibold text-white/80">{enemy.name}</span>
                </>
              ) : (
                <>
                  <Avatar who={spec.host} size="sm" mood={won ? "happy" : lost ? "sad" : undefined} />
                  <span className="text-center text-[10px] font-semibold text-white/80">{host.name}</span>
                </>
              )}
            </div>
          </div>

          {(lost || fizzled) && enemy && (
            <p className="anim-pop absolute right-3 top-3 max-w-48 rounded-xl rounded-br-sm bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow sm:right-28">
              {enemy.taunt}
            </p>
          )}
          {(lost || fizzled) && !enemy && (
            <p className="anim-pop absolute right-3 top-3 flex items-center gap-1 rounded-xl bg-rose-600/90 px-3 py-1.5 text-xs font-semibold text-white shadow">
              🐛 Hehehe! Não foi dessa vez!
            </p>
          )}
          {won && spec.crowd && (
            <div className="absolute inset-x-0 bottom-9 flex justify-center gap-2">
              {spec.crowd.map((c, i) => (
                <span key={i} className="anim-walk-in text-3xl" style={{ animationDelay: `${i * 120}ms` }}>
                  {c}
                </span>
              ))}
            </div>
          )}

          <div className="relative mt-2 flex items-end justify-around border-t border-white/10 bg-black/30 px-3 py-1.5 text-2xl">
            {spec.scenery.map((s, i) => (
              <span key={i} className="opacity-90">
                {s}
              </span>
            ))}
          </div>
          <p key={won ? "after" : "before"} className="anim-pop relative bg-black/50 px-4 py-2 text-center text-sm text-white/90">
            {won ? (enemy ? `${enemy.defeat} ${spec.after}` : spec.after) : spec.before}
          </p>
        </div>
      </div>
    );
  }
}
