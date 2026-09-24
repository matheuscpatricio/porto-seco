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

export const policeLooks: Record<"guarda" | "especial" | "federal", Look> = {
  guarda: {
    skin: "#c89a74",
    hair: "#1f2937",
    hairStyle: "buzz",
    shirt: "#1d4ed8",
    jacket: "#1e3a8a",
    pants: "#1e3a8a",
    shoes: "#0b0f19",
    extras: ["cap", "vest"],
    build: "normal",
    accent: "#1e3a8a",
  },
  especial: {
    skin: "#a97856",
    hair: "#111827",
    hairStyle: "buzz",
    shirt: "#0f172a",
    jacket: "#111827",
    pants: "#0f172a",
    shoes: "#0b0f19",
    extras: ["mask", "vest"],
    build: "big",
    accent: "#f59e0b",
  },
  federal: {
    skin: "#e0b18a",
    hair: "#111827",
    hairStyle: "slick",
    shirt: "#18181b",
    jacket: "#0a0a0a",
    pants: "#18181b",
    shoes: "#0a0a0a",
    extras: ["vest", "jacket"],
    build: "big",
    accent: "#eab308",
  },
};

/** Caveira's men. Dark clothes, mask, vest, gold accent. They are not police. */
export const thugLook: Look = {
  skin: "#6b4a33",
  hair: "#111111",
  hairStyle: "buzz",
  shirt: "#171717",
  jacket: "#0a0a0a",
  pants: "#111111",
  shoes: "#0a0a0a",
  extras: ["mask", "vest"],
  build: "big",
  accent: "#eab308",
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

const SKINS = ["#f6d3bc", "#f3d2b3", "#e0ac84", "#c68642", "#a86f4b", "#8d5524", "#6b4430", "#4a2f22", "#3d2918"];
const HAIRS = ["#0f0f0f", "#2b1a10", "#4a2f1b", "#8b5a2b", "#c9a26b", "#9ca3af", "#e5e7eb"];
const SHIRTS = ["#f8fafc", "#1e3a8a", "#b91c1c", "#15803d", "#fde047", "#0e7490", "#f97316", "#7c3aed", "#e11d48", "#334155", "#a3a3a3", "#ec4899"];
const PANTS = ["#1e3a5f", "#27272a", "#57534e", "#1f2937", "#78716c", "#3f6212", "#e7e5e4"];
const FACE_SKINS = ["#f6d3bc", "#e7b892", "#c68642", "#8d5524", "#5c3317", "#3d2918"];

/** A new skin on the same uniform, so officers and capangas are not one face. */
export function diverseLook(look: Look, r: () => number): Look {
  return { ...look, extras: [...look.extras], skin: FACE_SKINS[Math.floor(r() * FACE_SKINS.length)] };
}

/** A random passer-by. About half are women. Skins run from light to dark. `r` returns numbers in [0, 1). */
export function randomLook(r: () => number): Look {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const woman = r() < 0.48;
  const extras: Extra[] = [];
  if (r() < 0.18) extras.push("glasses");
  if (r() < 0.12) extras.push("cap");
  if (!woman && r() < 0.14) extras.push("mustache");
  if (r() < 0.28) extras.push("jacket");
  let hairStyle: HairStyle;
  let build: Look["build"];
  if (woman) {
    hairStyle = r() < 0.6 ? "ponytail" : "curly";
    build = r() < 0.65 ? "slim" : "normal";
  } else {
    hairStyle = pick(["short", "slick", "bald", "buzz", "curly"] as HairStyle[]);
    build = hairStyle === "curly" ? "big" : r() < 0.28 ? "big" : r() < 0.5 ? "slim" : "normal";
  }
  return {
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairStyle,
    shirt: pick(SHIRTS),
    jacket: pick(SHIRTS),
    pants: pick(PANTS),
    shoes: pick(["#111111", "#f5f5f4", "#78350f", "#1e3a8a"]),
    extras,
    build,
    accent: pick(SHIRTS),
  };
}
