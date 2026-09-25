/** Plain lessons Maya teaches from the roof. Mission checks stay in the chapters. */
export type Visual =
  | { kind: "sequence"; items: string[]; lit: number }
  | { kind: "fork"; question: string; yes: string; no: string; path: "yes" | "no" }
  | { kind: "loop"; items: string[]; at: number; note: string }
  | { kind: "slots"; slots: { name: string; value: string; kind: string }[] }
  | { kind: "terminal"; cmd: string; out: string[] }
  | { kind: "code"; lines: string[]; focus: number }
  | { kind: "cards"; title: string; pairs: { key: string; value: string; hot?: boolean }[] }
  | { kind: "gates"; title: string; lamps: { label: string; on: boolean }[]; result: string }
  | { kind: "wrap"; inner: string; outer: string; note: string };

export type LessonStep = { say: string; visual: Visual };
export type Module = { id: string; band: string; title: string; steps: LessonStep[] };

export const MODULES: Module[] = [
  {
    id: "logica",
    band: "Começo",
    title: "Lógica de programação",
    steps: [
      {
        say: "Programar é uma fila. O computador faz o primeiro passo, depois o segundo, e não inventa o que você não pediu.",
        visual: { kind: "sequence", items: ["pegar o nome", "guardar", "mostrar"], lit: 1 },
      },
      {
        say: "Decisão é um se. Se a porta estiver aberta, ele entra. Senão, ele espera.",
        visual: { kind: "fork", question: "porta aberta?", yes: "entrar", no: "esperar", path: "yes" },
      },
      {
        say: "Repetição manda fazer de novo, um item de cada vez, até a fila acabar.",
        visual: { kind: "loop", items: ["cadeado", "alarme", "porta"], at: 1, note: "agora: alarme" },
      },
    ],
  },
  {
    id: "variavel",
    band: "Começo",
    title: "Variáveis e tipos",
    steps: [
      {
        say: "Uma variável é uma caixinha com nome. Dentro vai um texto ou um número.",
        visual: {
          kind: "slots",
          slots: [
            { name: "nome", value: '"Cole"', kind: "texto" },
            { name: "idade", value: "23", kind: "número" },
          ],
        },
      },
      {
        say: "Texto leva aspas. Número vai pelado. Com aspas, o 23 continua texto e não soma.",
        visual: {
          kind: "slots",
          slots: [
            { name: '"23" + "1"', value: '"231"', kind: "texto grudado" },
            { name: "23 + 1", value: "24", kind: "conta de verdade" },
          ],
        },
      },
    ],
  },
  {
    id: "print",
    band: "Começo",
    title: "Mostrar na tela",
    steps: [
      {
        say: "print pede para o computador mostrar uma frase. A frase vai entre aspas.",
        visual: { kind: "terminal", cmd: 'print("Olá, Porto")', out: ["Olá, Porto"] },
      },
      {
        say: "Sem aspas ele acha que é outra ordem, não um texto, e a tela não mostra a frase.",
        visual: { kind: "code", lines: ['print("Olá")', "print(Olá)"], focus: 0 },
      },
    ],
  },
  {
    id: "if",
    band: "Decisão",
    title: "if, else e elif",
    steps: [
      {
        say: "if é um se. Se a condição for verdade, ele faz só o trecho recuado.",
        visual: { kind: "code", lines: ["if aberta:", "    entrar()", "esperar()"], focus: 1 },
      },
      {
        say: "else é o caso contrário. Só roda quando o se falhou.",
        visual: { kind: "fork", question: "aberta?", yes: "entrar()", no: "esperar()", path: "no" },
      },
      {
        say: "elif é outro se, testado só quando o primeiro não passou.",
        visual: { kind: "code", lines: ["if ouro:", "    abrir()", "elif prata:", "    esperar()"], focus: 2 },
      },
    ],
  },
  {
    id: "bool",
    band: "Decisão",
    title: "and, or e not",
    steps: [
      {
        say: "and só passa se as duas coisas forem verdade. Uma apagada já trava.",
        visual: {
          kind: "gates",
          title: "and",
          lamps: [
            { label: "chave", on: true },
            { label: "senha", on: false },
          ],
          result: "fechado",
        },
      },
      {
        say: "or passa se pelo menos uma for verdade. Uma acesa já chega.",
        visual: {
          kind: "gates",
          title: "or",
          lamps: [
            { label: "chave", on: false },
            { label: "senha", on: true },
          ],
          result: "aberto",
        },
      },
      {
        say: "not inverte. O que era verdade vira mentira, e a luz troca de lado.",
        visual: {
          kind: "gates",
          title: "not",
          lamps: [{ label: "alarme", on: true }],
          result: "not alarme = falso",
        },
      },
    ],
  },
  {
    id: "for",
    band: "Repetição",
    title: "for e while",
    steps: [
      {
        say: "for percorre a lista, um item de cada vez, e para sozinho no fim.",
        visual: { kind: "loop", items: ["lanterna", "alicate", "pendrive"], at: 0, note: "for: agora a lanterna" },
      },
      {
        say: "while repete enquanto a condição continuar verdade. Aqui a conta ainda não chegou em zero.",
        visual: { kind: "loop", items: ["3", "2", "1"], at: 1, note: "while tentativas > 0" },
      },
      {
        say: "Se a condição nunca ficar falsa, o while não para. A seta fica girando.",
        visual: { kind: "code", lines: ["while True:", "    tentar()", "# nunca chega no fim"], focus: 0 },
      },
    ],
  },
  {
    id: "lista",
    band: "Dados",
    title: "Listas",
    steps: [
      {
        say: "Uma lista guarda várias coisas em ordem, entre colchetes. O primeiro é o zero.",
        visual: { kind: "loop", items: ["lanterna", "alicate", "pendrive"], at: 0, note: "posição 0" },
      },
      {
        say: "append coloca mais um no fim, sem apagar o que já estava.",
        visual: { kind: "sequence", items: ["lanterna", "alicate", "pendrive", "rádio"], lit: 3 },
      },
    ],
  },
  {
    id: "dict",
    band: "Dados",
    title: "Dicionários",
    steps: [
      {
        say: "Um dicionário liga um nome a um valor, como uma ficha. Você pede pelo nome.",
        visual: {
          kind: "cards",
          title: "ficha do Cole",
          pairs: [
            { key: "nome", value: "Cole", hot: true },
            { key: "moto", value: "entrega" },
          ],
        },
      },
      {
        say: "A chave errada não acha nada. A chave certa devolve exatamente o que estava guardado.",
        visual: {
          kind: "cards",
          title: "ficha[\"moto\"]",
          pairs: [
            { key: "nome", value: "Cole" },
            { key: "moto", value: "entrega", hot: true },
          ],
        },
      },
    ],
  },
  {
    id: "funcao",
    band: "Funções",
    title: "Funções",
    steps: [
      {
        say: "Uma função é uma receita com nome. def cria. Você chama pelo nome quando quiser repetir.",
        visual: { kind: "code", lines: ["def saudar(nome):", "    return \"Oi, \" + nome", "saudar(\"Cole\")"], focus: 2 },
      },
      {
        say: "return entrega o resultado e sai. O que vem depois da receita não roda.",
        visual: { kind: "sequence", items: ["entra o nome", "monta a frase", "return e sai"], lit: 2 },
      },
    ],
  },
  {
    id: "classe",
    band: "Objetos",
    title: "Classes",
    steps: [
      {
        say: "Uma classe é a planta. O objeto é a coisa de verdade, feita a partir dessa planta.",
        visual: {
          kind: "cards",
          title: "planta Moto → objeto",
          pairs: [
            { key: "planta", value: "Moto" },
            { key: "objeto", value: "entrega do Cole", hot: true },
          ],
        },
      },
      {
        say: "self é o próprio objeto. __init__ roda na hora de criar e guarda os campos nele.",
        visual: { kind: "code", lines: ["class Moto:", "    def __init__(self, nome):", "        self.nome = nome"], focus: 2 },
      },
    ],
  },
  {
    id: "erro",
    band: "Objetos",
    title: "Erros",
    steps: [
      {
        say: "try tenta. Se quebrar, except pega o erro em vez de derrubar o programa.",
        visual: { kind: "wrap", inner: "abrir a porta", outer: "except segura a queda", note: "o programa continua" },
      },
      {
        say: "raise dispara um erro de propósito, quando a regra foi quebrada.",
        visual: { kind: "terminal", cmd: 'raise ValueError("senha vazia")', out: ["ValueError: senha vazia"] },
      },
    ],
  },
  {
    id: "comp",
    band: "Avançado",
    title: "Compreensão de lista",
    steps: [
      {
        say: "É um for espremido numa linha, que já monta a lista nova.",
        visual: { kind: "code", lines: ["[n * 2 for n in [1, 2, 3]]", "# vira [2, 4, 6]"], focus: 0 },
      },
      {
        say: "O if no fim deixa de fora o que você não quer. Aqui só os pares entram na lista nova.",
        visual: { kind: "code", lines: ["[n for n in [1, 2, 3, 4] if n % 2 == 0]", "# fica [2, 4]"], focus: 0 },
      },
    ],
  },
  {
    id: "lambda",
    band: "Avançado",
    title: "lambda",
    steps: [
      {
        say: "lambda é uma função curtinha, de uma linha, sem nome.",
        visual: { kind: "code", lines: ["lambda nome: nome.upper()", "# recebe nome, devolve maiúsculo"], focus: 0 },
      },
      {
        say: "sorted usa isso para saber por qual pedaço ordenar.",
        visual: {
          kind: "cards",
          title: "sorted por tamanho",
          pairs: [
            { key: "curto", value: "oi" },
            { key: "longo", value: "porto", hot: true },
          ],
        },
      },
    ],
  },
  {
    id: "yield",
    band: "Avançado",
    title: "Geradores",
    steps: [
      {
        say: "yield entrega um valor e pausa a função. Ela não calcula a lista inteira de uma vez.",
        visual: { kind: "sequence", items: ["entrega 1", "pausa", "entrega 2"], lit: 1 },
      },
      {
        say: "Na próxima vez ela continua de onde parou, em vez de recomeçar do zero.",
        visual: { kind: "loop", items: ["1", "2", "3"], at: 2, note: "continua no 3" },
      },
    ],
  },
  {
    id: "decorator",
    band: "Avançado",
    title: "Decorators",
    steps: [
      {
        say: "Um decorator é uma função que embrulha outra e devolve essa versão embrulhada.",
        visual: { kind: "wrap", inner: "abrir()", outer: "@avisar", note: "avisa, depois abre" },
      },
      {
        say: "O @ em cima do def aplica esse embrulho. A chamada continua com o mesmo nome.",
        visual: { kind: "code", lines: ["@avisar", "def abrir():", "    ...", "abrir()  # já embrulhada"], focus: 0 },
      },
    ],
  },
];
