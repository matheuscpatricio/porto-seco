import { chaptersA } from "@/content/chapters-a";
import { chaptersB } from "@/content/chapters-b";
import type { Level, Line, World } from "@/content/types";

export type { Display, Level, Line, LockEvent, Who, World } from "@/content/types";

export const prologue: Line[] = [
  { who: "leo", text: "Meu nome é Léo. Sou motoboy de aplicativo em Porto Seco e devo R$ 8 mil para o Caveira, o agiota que manda no meu bairro." },
  { who: "leo", text: "O Caveira trabalha para a Vértice Segurança, a empresa que controla as câmeras, os drones e os seguranças desta cidade. O dono dela é Augusto Vidal." },
  { who: "dani", text: "E é aí que eu entro. Sou a Dani. Trabalhei na Vértice até descobrir que o Vidal forjou as provas que colocaram meu irmão na cadeia." },
  { who: "dani", text: "As provas verdadeiras estão num servidor no topo da Torre Vértice. Para chegar lá, preciso de alguém rápido na rua que aprenda a programar em Python." },
  { who: "leo", text: "Eu nunca programei na vida." },
  { who: "dani", text: "Melhor ainda. Programar é só dar ordens bem claras para o computador. Ele obedece tudo, mas ao pé da letra. Eu te ensino um passo de cada vez." },
  { who: "rui", text: "Eu sou o Tio Rui, o motorista. A Bia cuida dos carros. Você corre, pula, derruba os seguranças com a pistola de choque e hackeia o que estiver no caminho." },
  { who: "leo", text: "Fechado. Bora derrubar a Vértice." },
];

export const worlds: World[] = [...chaptersA, ...chaptersB];

export type PlayableLevel = Level & { worldId: string };

export const allLevels: PlayableLevel[] = worlds.flatMap((w) => w.levels.map((l) => ({ ...l, worldId: w.id })));

export function findLevel(id: string) {
  const idx = allLevels.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const level = allLevels[idx];
  return { level, world: worlds.find((w) => w.id === level.worldId)!, next: allLevels[idx + 1] ?? null, index: idx };
}
