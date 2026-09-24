import type { Line } from "@/content/types";

/** Plain-language phone lines. The lesson checks stay in the chapters. */
const PLAIN: Record<string, string[]> = {
  "1-1": [
    "print é só pedir para o computador mostrar uma frase na tela.",
    "A frase vai entre aspas. Sem aspas, ele acha que é outra ordem, não um texto.",
  ],
  "1-2": [
    "Uma variável é uma caixinha com nome. Você guarda um texto ou um número dentro.",
    "Texto leva aspas. Número vai pelado, sem aspas, senão continua sendo texto.",
  ],
  "1-3": [
    "A divisão inteira corta o que sobra depois da vírgula e fica só com o número cheio.",
    "O resto é o que não coube nessa divisão. É a sobra.",
  ],
  "1-4": [
    "input espera alguém digitar e te entrega o que foi escrito, sempre como texto.",
    "A f-string enfia esse texto no meio de uma frase. É um f antes das aspas e o nome entre chaves.",
  ],
  "1-5": [
    "Tudo que a pessoa digita chega como texto, mesmo parecendo número.",
    "int transforma esse texto em número de verdade, daqueles que dá para somar.",
  ],
  "2-1": [
    "if é um se. Se a condição for verdade, o computador faz o trecho que está recuado.",
    "else é o caso contrário, quando o se não aconteceu.",
  ],
  "2-2": [
    "elif é outro se, só testado quando o primeiro falhou.",
    "return entrega a resposta e sai da função. O que vem depois não roda.",
  ],
  "2-3": [
    "and só passa se as duas coisas forem verdade. or passa se pelo menos uma for.",
    "not inverte: o que era verdade vira mentira, e o contrário também.",
  ],
  "2-4": [
    "Zero, texto vazio e lista vazia o Python trata como falso.",
    "Qualquer outra coisa, um número, uma palavra, uma lista com item, conta como verdade.",
  ],
  "2-5": [
    "O resto da divisão por 3 diz se o número é múltiplo de 3. Se o resto é zero, é múltiplo.",
    "A ordem dos if muda a resposta, porque o primeiro que for verdade é o que vale.",
  ],
  "3-1": [
    "for repete o mesmo trecho para cada número de uma contagem.",
    "range começa no primeiro número e para um antes do último. O fim não entra.",
  ],
  "3-2": [
    "Uma lista é uma fila de coisas, uma atrás da outra.",
    "append coloca mais uma no fim. len diz quantas já têm.",
  ],
  "3-3": [
    "Você cria uma caixinha zerada e, a cada volta do for, soma o item nela.",
    "No fim, a caixinha tem o total. É como ir somando no papel.",
  ],
  "3-4": [
    "while repete enquanto a condição continuar verdade.",
    "Alguma coisa dentro do laço precisa mudar, senão ele não para nunca.",
  ],
  "3-5": [
    "Guarda o maior valor que você já viu.",
    "Se aparecer um maior, troca. No fim, a caixinha tem o campeão.",
  ],
  "4-1": [
    "Um parâmetro com igual já vem preenchido. Quem chama a função pode deixar em branco.",
    "Se passar outro valor, esse novo substitui o que estava combinado.",
  ],
  "4-2": [
    "Dicionário é uma lista com etiqueta. Você pede pela etiqueta e recebe o valor.",
    "get busca sem quebrar o programa quando a etiqueta não existe.",
  ],
  "4-3": [
    "Tupla é um pacote fechado. Os valores ficam juntos e não são para trocar no meio do caminho.",
    "return a, b entrega os dois de uma vez, nesse pacote.",
  ],
  "4-4": [
    "Conjunto não guarda repetido. Cada coisa entra uma vez só.",
    "O sinal & fica só com o que existe nos dois conjuntos ao mesmo tempo.",
  ],
  "4-5": [
    "Recursão é a função pedindo ajuda para ela mesma, num problema um pouco menor.",
    "Precisa de um caso tão pequeno que ela já sabe a resposta e para de se chamar.",
  ],
  "5-1": [
    "Classe é a forma. O objeto é a coisa feita com essa forma.",
    "__init__ monta o objeto, e self é o próprio objeto que está sendo montado.",
  ],
  "5-2": [
    "A classe filha já nasce sabendo o que a mãe sabe.",
    "super() chama a mãe para não reescrever tudo do zero.",
  ],
  "5-3": [
    "Métodos com dois underlines ensinam o Python a usar o seu objeto com +, == e print.",
    "Você define o que cada um desses sinais faz.",
  ],
  "5-4": [
    "try tenta um trecho. Se der erro, except segura o erro em vez de derrubar o programa.",
    "raise é você mesmo avisando que alguma coisa deu errado.",
  ],
  "5-5": [
    "Aqui junta tudo: a forma do objeto, um dicionário dentro dele, um erro seu e um jeito de contar o tamanho.",
    "Cada peça faz uma coisa só. Juntas, formam o sistema.",
  ],
  "6-1": [
    "Compreensão de lista é um for escrito numa linha, que já devolve a lista pronta.",
    "Dá para filtrar com if e ficar só com os itens que interessam.",
  ],
  "6-2": [
    "lambda é uma função curtinha, de uma linha, sem nome.",
    "sorted usa isso para saber por qual pedaço ordenar.",
  ],
  "6-3": [
    "yield entrega um valor e pausa a função.",
    "Na próxima vez ela continua de onde parou, em vez de calcular a lista inteira de uma vez.",
  ],
  "6-4": [
    "Um decorator é uma função que embrulha outra e devolve essa versão embrulhada.",
    "O @ em cima do def aplica esse embrulho.",
  ],
  "6-5": [
    "dataclass escreve sozinha o código chato de montar o objeto e de comparar.",
    "O nome: str só anota que aquele campo é texto. Ajuda quem lê o código.",
  ],
};

export function phoneLines(level: { id: string; theory: string; example: string }): Line[] {
  const lesson = PLAIN[level.id] ?? [
    "Vou falar do jeito mais simples que der.",
    level.theory.replace(/`/g, ""),
    `Um jeito de escrever é este: ${level.example.split("\n")[0]}`,
  ];
  return [
    { who: "dani", text: "Léo, aqui é a Dani. Eu fico na central. Te explico por telefone, sem aparecer no meio da rua." },
    ...lesson.map((text) => ({ who: "dani" as const, text })),
    { who: "dani", text: "Quando fizer sentido, desliga e volta para a missão. Eu continuo aqui se precisar ligar de novo." },
  ];
}
