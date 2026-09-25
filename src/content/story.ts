import type { Line } from "@/content/types";

const LINES: Record<string, Line[]> = {
  "1-2": [{ who: "dani", text: "O print que você deixou no caixa ainda está na tela. O próximo sistema é o mesmo caixa, um andar acima." }],
  "1-3": [{ who: "rui", text: "Guarda esse dinheiro. A dívida com o Kane continua, mas hoje o pagamento é outro." }],
  "2-1": [{ who: "dani", text: "A quebrada fechou. O centro da Vértice usa o mesmo cadastro, com uma trava nova." }],
  "3-1": [{ who: "bia", text: "O porto recebe o que o centro liberou. É outro sistema, a mesma empresa." }],
  "4-1": [{ who: "dani", text: "O desmanche guarda o que o porto não quis registrar. A gente entra por aí." }],
  "5-1": [{ who: "vidal", text: "Você subiu, moleque. A torre vê cada sistema que você abriu." }],
  "6-1": [{ who: "dani", text: "É o último nó. Tudo que você estudou em casa está nesse servidor." }],
};

export function connector(levelId: string): Line[] {
  return LINES[levelId] ?? (levelId.endsWith("-1") ? [] : [{ who: "dani", text: "O sistema anterior ficou aberto. Este é o próximo nó da Vértice." }]);
}
