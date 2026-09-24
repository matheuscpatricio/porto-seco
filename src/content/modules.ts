/** Plain lessons Dani can teach from the roof. The mission checks stay in the chapters. */
export type Module = { id: string; band: string; title: string; lines: string[] };

export const MODULES: Module[] = [
  {
    id: "logica",
    band: "Começo",
    title: "Lógica de programação",
    lines: [
      "Programar é colocar uma ordem atrás da outra. O computador faz a primeira, depois a segunda, e não inventa o que você não pediu.",
      "Decisão é um se: se isso for verdade, faz uma coisa; senão, faz outra.",
      "Repetição é mandar ele fazer de novo até a conta acabar. É um enquanto ou um para cada item.",
    ],
  },
  {
    id: "variavel",
    band: "Começo",
    title: "Variáveis e tipos",
    lines: [
      "Uma variável é uma caixinha com nome. Você guarda um texto ou um número dentro.",
      "Texto leva aspas. Número vai pelado. Se o número estiver entre aspas, continua sendo texto e não soma.",
    ],
  },
  {
    id: "print",
    band: "Começo",
    title: "Mostrar na tela",
    lines: [
      "print pede para o computador mostrar uma frase.",
      "A frase vai entre aspas. Sem aspas, ele acha que é outra ordem, não um texto.",
    ],
  },
  {
    id: "if",
    band: "Decisão",
    title: "if, else e elif",
    lines: [
      "if é um se. Se a condição for verdade, ele faz o trecho recuado.",
      "else é o caso contrário. elif é outro se, só testado quando o primeiro falhou.",
    ],
  },
  {
    id: "bool",
    band: "Decisão",
    title: "and, or e not",
    lines: [
      "and só passa se as duas coisas forem verdade. or passa se pelo menos uma for.",
      "not inverte: o que era verdade vira mentira.",
    ],
  },
  {
    id: "for",
    band: "Repetição",
    title: "for e while",
    lines: [
      "for percorre uma lista, um item de cada vez.",
      "while repete enquanto a condição continuar verdade. Se ela nunca ficar falsa, ele não para.",
    ],
  },
  {
    id: "lista",
    band: "Dados",
    title: "Listas",
    lines: [
      "Uma lista guarda várias coisas em ordem, entre colchetes.",
      "O primeiro item é o 0. append coloca mais um no fim.",
    ],
  },
  {
    id: "dict",
    band: "Dados",
    title: "Dicionários",
    lines: [
      "Um dicionário liga um nome a um valor, como uma ficha.",
      "Você pede pelo nome e recebe o que estava guardado naquela chave.",
    ],
  },
  {
    id: "funcao",
    band: "Funções",
    title: "Funções",
    lines: [
      "Uma função é uma receita com nome. def cria. Você chama pelo nome quando quiser repetir a receita.",
      "return entrega o resultado e sai. O que vem depois não roda.",
    ],
  },
  {
    id: "classe",
    band: "Objetos",
    title: "Classes",
    lines: [
      "Uma classe é a planta de um objeto. O objeto é a coisa de verdade, com os dados dela.",
      "self é o próprio objeto. __init__ roda na hora de criar e guarda os campos.",
    ],
  },
  {
    id: "erro",
    band: "Objetos",
    title: "Erros",
    lines: [
      "try tenta. except pega o erro em vez de derrubar o programa.",
      "raise dispara um erro de propósito, quando a regra foi quebrada.",
    ],
  },
  {
    id: "comp",
    band: "Avançado",
    title: "Compreensão de lista",
    lines: [
      "É um for espremido numa linha, que já monta a lista nova.",
      "O if no fim deixa de fora o que você não quer.",
    ],
  },
  {
    id: "lambda",
    band: "Avançado",
    title: "lambda",
    lines: [
      "lambda é uma função curtinha, de uma linha, sem nome.",
      "sorted usa isso para saber por qual pedaço ordenar.",
    ],
  },
  {
    id: "yield",
    band: "Avançado",
    title: "Geradores",
    lines: [
      "yield entrega um valor e pausa a função.",
      "Na próxima vez ela continua de onde parou, em vez de calcular a lista inteira de uma vez.",
    ],
  },
  {
    id: "decorator",
    band: "Avançado",
    title: "Decorators",
    lines: [
      "Um decorator é uma função que embrulha outra e devolve essa versão embrulhada.",
      "O @ em cima do def aplica esse embrulho.",
    ],
  },
];
