export type Who = "leo" | "dani" | "rui" | "bia" | "vidal" | "caveira" | "baiano" | "brito" | "tanque" | "marreta";

export type Line = { who: Who; text: string };

export type LockEvent = { label: string; expr: string; expect: string; do?: string };

export type Display = { kind: "screen" } | { kind: "locks"; setup?: string; events: LockEvent[] };

export type Level = {
  id: string;
  title: string;
  boss?: Who;
  brief: Line[];
  task: string;
  theory: string;
  example: string;
  starter: string;
  hints: string[];
  /** Python run after the player's code; `__out` holds stdout. Raise AssertionError with a message on failure. */
  check: string;
  inputs?: string[];
  solution: string;
  explain: string;
  chips: string[];
  display: Display;
  target: string;
  success: Line;
  xp: number;
};

export type World = {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  color: string;
  sky: [string, string];
  skyline: string;
  levels: Level[];
};
