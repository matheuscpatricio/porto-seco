"use client";

import { Progress } from "@/components/ui/progress";
import { useProgress, wizardLevel } from "@/lib/progress";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ReactNode } from "react";

export function LinkButton({ href, children, className, variant, size }: { href: string; children: ReactNode; className?: string } & VariantProps<typeof buttonVariants>) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)}>
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
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="text-2xl">🐍</span>
          <span className="hidden sm:inline">PyQuest</span>
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <span className="whitespace-nowrap rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            Mago nv. {w.level}
          </span>
          <Progress value={w.pct} className="h-2 max-w-48" />
          <span className="whitespace-nowrap text-xs text-muted-foreground">{p.xp} XP</span>
        </div>
        {p.streak > 0 && <span className="text-sm" title="Dias seguidos">🔥 {p.streak}</span>}
      </div>
    </header>
  );
}
