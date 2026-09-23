import type { Who } from "@/content/types";

export type HairStyle = "short" | "ponytail" | "curly" | "slick" | "bald" | "buzz";
export type Extra = "glasses" | "mustache" | "tie" | "cap" | "mask" | "vest" | "jacket" | "beard";

export type Look = {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  jacket?: string;
  pants: string;
  shoes: string;
  extras: Extra[];
  build: "slim" | "normal" | "big";
  accent?: string;
};

export const guardLook: Look = {
  skin: "#c89a74",
  hair: "#1f2937",
  hairStyle: "buzz",
  shirt: "#334155",
  jacket: "#0f172a",
  pants: "#1e293b",
  shoes: "#0b0f19",
  extras: ["cap", "vest"],
  build: "normal",
  accent: "#1f2937",
};

export const people: Record<Who, { name: string; role: string; look: Look; ally: boolean }> = {
  leo: {
    name: "Léo",
    role: "motoboy e hacker novato",
    ally: true,
    look: { skin: "#b97a56", hair: "#151515", hairStyle: "short", shirt: "#f1f5f9", jacket: "#e11d48", pants: "#1e3a5f", shoes: "#f8fafc", extras: ["jacket"], build: "normal" },
  },
  dani: {
    name: "Dani",
    role: "hacker, ex-funcionária da Vértice",
    ally: true,
    look: { skin: "#f0c8a0", hair: "#6d28d9", hairStyle: "ponytail", shirt: "#111827", pants: "#374151", shoes: "#a855f7", extras: ["glasses"], build: "slim" },
  },
  rui: {
    name: "Tio Rui",
    role: "motorista da equipe",
    ally: true,
    look: { skin: "#7a4a2a", hair: "#d1d5db", hairStyle: "short", shirt: "#f97316", pants: "#57534e", shoes: "#292524", extras: ["mustache"], build: "big" },
  },
  bia: {
    name: "Bia",
    role: "mecânica da equipe",
    ally: true,
    look: { skin: "#d9a066", hair: "#2b160c", hairStyle: "curly", shirt: "#1d4ed8", pants: "#1d4ed8", shoes: "#111111", extras: [], build: "slim" },
  },
  vidal: {
    name: "Augusto Vidal",
    role: "dono da Vértice Segurança",
    ally: false,
    look: { skin: "#f3d2b3", hair: "#9ca3af", hairStyle: "slick", shirt: "#e5e7eb", jacket: "#0b0b0f", pants: "#0b0b0f", shoes: "#000000", extras: ["jacket", "tie"], build: "normal", accent: "#b91c1c" },
  },
  caveira: {
    name: "Caveira",
    role: "agiota e chefe dos seguranças",
    ally: false,
    look: { skin: "#6b4a33", hair: "#111111", hairStyle: "bald", shirt: "#1f1f1f", jacket: "#262626", pants: "#171717", shoes: "#0a0a0a", extras: ["mask", "vest"], build: "big" },
  },
  baiano: {
    name: "Baiano",
    role: "cobrador do Caveira",
    ally: false,
    look: { skin: "#8a5a3b", hair: "#111111", hairStyle: "buzz", shirt: "#eab308", pants: "#3f3f46", shoes: "#18181b", extras: ["cap", "mustache"], build: "big", accent: "#15803d" },
  },
  brito: {
    name: "Sargento Brito",
    role: "segurança da Vértice",
    ally: false,
    look: { ...guardLook, skin: "#e0b18a", extras: ["cap", "vest", "mustache"], build: "big" },
  },
  tanque: {
    name: "Tanque",
    role: "capanga do porto",
    ally: false,
    look: { skin: "#c08a63", hair: "#000000", hairStyle: "bald", shirt: "#475569", pants: "#1f2937", shoes: "#111827", extras: ["beard"], build: "big" },
  },
  marreta: {
    name: "Marreta",
    role: "dono do desmanche",
    ally: false,
    look: { skin: "#9c6b4a", hair: "#6b7280", hairStyle: "curly", shirt: "#78350f", pants: "#78350f", shoes: "#1c1917", extras: ["glasses", "beard"], build: "big" },
  },
};
