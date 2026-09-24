"use client";

import { Progress } from "@/components/ui/progress";
import { useProgress, wizardLevel } from "@/lib/progress";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import Link from "next/link";
import { sound } from "@/game/audio";
import { requestGameFullscreen } from "@/game/fullscreen";
import { useSyncExternalStore, type ReactNode } from "react";

const serverAudio = { sfx: true };

function SoundToggles() {
  const a = useSyncExternalStore((l) => sound.subscribe(l), sound.getSettings, () => serverAudio);
  const cls = (on: boolean) =>
    `rounded-full border px-2 py-1 text-xs font-semibold transition ${on ? "border-white/20 bg-white/10 text-foreground" : "border-white/10 text-muted-foreground line-through"}`;
  return (
    <button className={cls(a.sfx)} onClick={() => sound.set({ sfx: !a.sfx })} aria-pressed={a.sfx} title="Sons da cidade e efeitos">
      {a.sfx ? "🔊" : "🔈"} <span className="hidden sm:inline">Som</span>
    </button>
  );
}

export function LinkButton({ href, children, className, variant, size, onClick }: { href: string; children: ReactNode; className?: string; onClick?: () => void } & VariantProps<typeof buttonVariants>) {
  return (
    <Link
      href={href}
      onClick={() => {
        onClick?.();
        if (href.startsWith("/level")) requestGameFullscreen()?.catch(() => {});
      }}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children}
    </Link>
  );
}

export function Md({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith("`") ? (
          <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-amber-300">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function Stars({ n, size = "text-base" }: { n: number; size?: string }) {
  return (
    <span className={size} aria-label={`${n} de 3 estrelas`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? "text-yellow-400" : "text-white/15"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function TopBar() {
  const p = useProgress();
  const w = wizardLevel(p.xp);
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="rounded bg-rose-600 px-1.5 py-0.5 font-mono text-xs font-black text-white">PY</span>
          <span className="hidden font-black uppercase tracking-widest sm:inline">Porto Seco</span>
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <span className="whitespace-nowrap rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            Reputação nv. {w.level}
          </span>
          <Progress value={w.pct} className="h-2 max-w-48" />
          <span className="whitespace-nowrap text-xs text-muted-foreground">{p.xp} XP</span>
        </div>
        {p.streak > 0 && <span className="text-sm" title="Dias seguidos">🔥 {p.streak}</span>}
        <SoundToggles />
      </div>
    </header>
  );
}
