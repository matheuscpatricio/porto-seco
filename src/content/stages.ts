import type { CharacterId } from "@/content/story";
import type { ProbeEvent } from "@/lib/runPython";

export type StageEvent = ProbeEvent & {
  actor: string;
  label: string;
  /** What the outcome means in the story, keyed by the Python repr of the result or by "!ErrorName". */
  meaning?: Record<string, string>;
};

export type Stage = {
  scenery: string[];
  host: CharacterId;
  enemy?: { emoji: string; name: string; taunt: string; defeat: string };
  /** sign: stdout on a board · countdown: stdout line by line · speech: host says the stdout · boxes: labelled boxes · visitors: one actor per test */
  display: "sign" | "countdown" | "speech" | "boxes" | "visitors";
  signTitle?: string;
  emptySign?: string;
  arrival?: string;
  setup?: string;
  events?: StageEvent[];
  crowd?: string[];
  before: string;
  after: string;
  chips: string[];
};

const bool = { True: "Entrou na festa 🎉", False: "Ficou do lado de fora 🚫" };

export const stages: Record<string, Stage> = {
  "1-1": {
    scenery: ["🏪", "🥖", "🥐", "🌳"],
    host: "vera",
    display: "sign",
    signTitle: "Placa da padaria",
    emptySign: "(apagada pelo Bug)",
    crowd: ["🧑", "👧", "🧓", "🧔", "👩"],
    before: "A placa está em branco e a rua está vazia.",
    after: "A placa brilhou e os clientes começaram a chegar!",
    chips: ["print()", '""', "Olá, Python!"],
  },
  "1-2": {
    scenery: ["🏪", "📒", "🥖"],
    host: "vera",
    display: "boxes",
    events: [
      { actor: "📦", label: "Caixa nome", expr: "nome", expect: "'Merlin'" },
      { actor: "📦", label: "Caixa idade", expr: "idade", expect: "150" },
    ],
    crowd: ["🧙‍♂️"],
    before: "O livro de encomendas está vazio. Nenhuma caixa foi criada ainda.",
    after: "As caixas foram guardadas no livro. Merlin veio buscar os pães!",
    chips: ["nome", "idade", "=", '"Merlin"', "150"],
  },
  "1-3": {
    scenery: ["🏪", "💰", "🧌", "🧌", "🧌"],
    host: "vera",
    display: "boxes",
    events: [
      { actor: "🪙", label: "Moedas para cada goblin", expr: "cada", expect: "35" },
      { actor: "🪙", label: "Moedas que sobram", expr: "sobra", expect: "5" },
    ],
    crowd: ["🧌", "🧌", "🧌", "🧌", "🧌", "🧌", "🧌"],
    before: "Sete goblins esperam o pagamento, olhando para o saco de 250 moedas.",
    after: "Cada goblin recebeu 35 moedas e foi embora feliz!",
    chips: ["cada", "sobra", "=", "moedas", "//", "%", "7"],
  },
  "1-4": {
    scenery: ["🏪", "🚪", "🥐"],
    host: "vera",
    display: "speech",
    arrival: "🧙‍♂️",
    before: "Um cliente de chapéu pontudo entrou na padaria. A Dona Vera não sabe o nome dele.",
    after: "Gandalf foi cumprimentado pelo nome e tirou o chapéu!",
    chips: ["nome", "=", "input()", "print()", 'f"Salve, {nome}!"'],
  },
  "1-5": {
    scenery: ["🏚️", "🪨", "🪨"],
    host: "pytha",
    enemy: { emoji: "🗿", name: "Golem Conversor", taunt: "Texto mais texto só gruda! 1230! Hahaha!", defeat: "O Golem desmoronou em pedrinhas!" },
    display: "sign",
    signTitle: "Resultado do contra-feitiço",
    emptySign: "…",
    before: "O Golem bloqueia a saída da vila e transforma todo número em texto.",
    after: "A soma deu 42 de verdade e o Golem desmoronou!",
    chips: ["int()", "input()", "a", "b", "=", "+", 'print(f"A soma é {a + b}")'],
  },
  "2-1": {
    scenery: ["🌲", "🏮", "🌲", "🌲"],
    host: "coruja",
    display: "speech",
    arrival: "🧝",
    before: "Um viajante com 80 moedas quer comprar uma lanterna. A Coruja precisa decidir o que dizer.",
    after: "O viajante comprou a lanterna e seguiu pela floresta escura.",
    chips: ["if", "else:", "ouro >= 50:", "print()", '"Pode comprar"', '"Sem dinheiro"'],
  },
  "2-2": {
    scenery: ["🌲", "🏫", "🌲"],
    host: "coruja",
    display: "visitors",
    events: [
      { actor: "🧒", label: "Tem 10 XP", expr: "classe(10)", expect: "'Aprendiz'" },
      { actor: "🧑", label: "Tem 100 XP", expr: "classe(100)", expect: "'Mago'" },
      { actor: "🧑‍🦰", label: "Tem 499 XP", expr: "classe(499)", expect: "'Mago'" },
      { actor: "🧙", label: "Tem 500 XP", expr: "classe(500)", expect: "'Arquimago'" },
    ],
    before: "Quatro aprendizes esperam na fila para receber seu título.",
    after: "Todos receberam o título certo e fizeram uma reverência.",
    chips: ["if", "elif", "else:", "xp < 100:", "xp < 500:", "return", '"Aprendiz"', '"Mago"', '"Arquimago"'],
  },
  "2-3": {
    scenery: ["🌲", "🎪", "🎶", "🌲"],
    host: "coruja",
    display: "visitors",
    events: [
      { actor: "🧑", label: "20 anos, com convite", expr: "pode_entrar(20, True)", expect: "True", meaning: bool },
      { actor: "🧑‍🦱", label: "20 anos, sem convite", expr: "pode_entrar(20, False)", expect: "False", meaning: bool },
      { actor: "👴", label: "70 anos, sem convite", expr: "pode_entrar(70, False)", expect: "True", meaning: bool },
      { actor: "🧒", label: "15 anos, com convite", expr: "pode_entrar(15, True)", expect: "False", meaning: bool },
    ],
    before: "Quatro convidados chegam à porta da festa. Quem entra?",
    after: "A festa está cheia e sem nenhum penetra!",
    chips: ["return", "and", "or", "not", "idade >= 18", "tem_convite", "idade >= 60", "()"],
  },
  "2-4": {
    scenery: ["🌲", "🏡", "🌲"],
    host: "coruja",
    display: "visitors",
    events: [
      { actor: "👤", label: 'Não disse o nome ("")', expr: 'saudacao("")', expect: "'Olá, estranho'" },
      { actor: "👩", label: 'Disse "Lia"', expr: 'saudacao("Lia")', expect: "'Olá, Lia'" },
    ],
    before: "Dois visitantes batem à porta. Um deles é bem tímido.",
    after: "Os dois foram bem recebidos e entraram para o chá.",
    chips: ["if not nome:", "return", '"Olá, estranho"', 'f"Olá, {nome}"'],
  },
  "2-5": {
    scenery: ["🌲", "🏛️", "🌲"],
    host: "pytha",
    enemy: { emoji: "🦁", name: "Esfinge FizzBuzz", taunt: "Errado! Ninguém passa pelo meu enigma!", defeat: "A Esfinge riu, fez uma reverência e abriu o caminho." },
    display: "visitors",
    events: [
      { actor: "1️⃣5️⃣", label: "Enigma: 15", expr: "fizzbuzz(15)", expect: "'FizzBuzz'" },
      { actor: "9️⃣", label: "Enigma: 9", expr: "fizzbuzz(9)", expect: "'Fizz'" },
      { actor: "🔟", label: "Enigma: 10", expr: "fizzbuzz(10)", expect: "'Buzz'" },
      { actor: "7️⃣", label: "Enigma: 7", expr: "fizzbuzz(7)", expect: "'7'" },
    ],
    before: "A Esfinge vai dizer quatro números. Seu feitiço precisa responder cada um.",
    after: "Enigma resolvido! O caminho para o rio está livre.",
    chips: ["if", "n % 15 == 0:", "n % 3 == 0:", "n % 5 == 0:", "return", '"FizzBuzz"', '"Fizz"', '"Buzz"', "str(n)"],
  },
  "3-1": {
    scenery: ["🌊", "⚓", "🚢", "🌊"],
    host: "marina",
    display: "countdown",
    crowd: ["🚢"],
    before: "O barco está pronto no cais esperando a contagem regressiva.",
    after: "10, 9, 8... Decolar! O barco zarpou!",
    chips: ["for i in range(10, 0, -1):", "print(i)", 'print("Decolar!")'],
  },
  "3-2": {
    scenery: ["🌊", "🎒", "⛵"],
    host: "marina",
    display: "boxes",
    events: [
      { actor: "🎒", label: "Mochila", expr: "mochila", expect: '["poção", "mapa", "chave"]' },
      { actor: "🔢", label: "Total de itens", expr: "total", expect: "3" },
    ],
    before: "A mochila está aberta e vazia no convés.",
    after: "Mochila cheia: poção, mapa e chave. Tudo pronto para a viagem!",
    chips: ["mochila", "=", '["poção", "mapa"]', '.append("chave")', "total", "len(mochila)"],
  },
  "3-3": {
    scenery: ["🌊", "🎣", "🐟", "🌊"],
    host: "marina",
    display: "visitors",
    events: [
      { actor: "🎣", label: "Rede com 1, 2, 3, 4", expr: "soma_pares([1, 2, 3, 4])", expect: "6" },
      { actor: "🥅", label: "Rede vazia", expr: "soma_pares([])", expect: "0" },
      { actor: "🐡", label: "Rede com 7 e 9", expr: "soma_pares([7, 9])", expect: "0" },
    ],
    before: "Três redes de pesca subiram do rio. Quanto ouro cada uma rende?",
    after: "O ouro de cada rede foi contado certinho!",
    chips: ["total = 0", "for n in nums:", "if n % 2 == 0:", "total += n", "return total"],
  },
  "3-4": {
    scenery: ["🌊", "🌿", "⏳"],
    host: "marina",
    display: "visitors",
    events: [
      { actor: "🌱", label: "Limite 1", expr: "dobrar_ate(1)", expect: "1" },
      { actor: "🌿", label: "Limite 100", expr: "dobrar_ate(100)", expect: "7" },
      { actor: "🫘", label: "Limite 0", expr: "dobrar_ate(0)", expect: "0" },
    ],
    before: "Três algas mágicas esperam para saber quantas horas vão crescer.",
    after: "Agora a Capitã sabe exatamente quando podar cada alga!",
    chips: ["valor, vezes = 1, 0", "while valor <= limite:", "valor *= 2", "vezes += 1", "return vezes"],
  },
  "3-5": {
    scenery: ["🌊", "🪨", "🌊"],
    host: "pytha",
    enemy: { emoji: "🐉", name: "Serpente do Maior", taunt: "Esse não é o maior! Hssss!", defeat: "A Serpente mergulhou e sumiu no fundo do rio." },
    display: "visitors",
    events: [
      { actor: "🃏", label: "Cartas 3, 9, 2", expr: "maior([3, 9, 2])", expect: "9" },
      { actor: "🃏", label: "Cartas -5, -1, -9", expr: "maior([-5, -1, -9])", expect: "-1" },
      { actor: "🫙", label: "Nenhuma carta", expr: "maior([])", expect: "None" },
    ],
    before: "A Serpente esconde o maior número em três montes de cartas.",
    after: "Você achou o maior de cada monte, sem usar max!",
    chips: ["if not nums:", "return None", "melhor = nums[0]", "for n in nums:", "if n > melhor:", "melhor = n", "return melhor"],
  },
  "4-1": {
    scenery: ["⛰️", "🔥", "⚒️"],
    host: "bruno",
    display: "visitors",
    events: [
      { actor: "⚔️", label: "Golpe normal de 10", expr: "dano(10)", expect: "10" },
      { actor: "💥", label: "Golpe crítico de 10", expr: "dano(10, True)", expect: "20" },
      { actor: "💥", label: "Crítico de 5", expr: "dano(5, critico=True)", expect: "10" },
    ],
    enemy: { emoji: "🎯", name: "Boneco de treino", taunt: "Nem senti!", defeat: "O boneco de treino voou longe!" },
    before: "O boneco de treino espera os golpes da espada nova.",
    after: "Os golpes críticos bateram com o dobro de força!",
    chips: ["def dano(base, critico=False):", "if critico:", "return base * 2", "return base"],
  },
  "4-2": {
    scenery: ["⛰️", "🗡️", "📜"],
    host: "bruno",
    display: "visitors",
    events: [
      { actor: "🗡️", label: 'Runa "ana"', expr: 'contar_letras("ana")', expect: '{"a": 2, "n": 1}' },
      { actor: "🗡️", label: 'Runa "a a"', expr: 'contar_letras("a a")', expect: '{"a": 2}' },
      { actor: "🗡️", label: "Runa vazia", expr: 'contar_letras("")', expect: "{}" },
    ],
    before: "Três espadas com runas gravadas esperam a contagem das letras.",
    after: "Todas as runas foram contadas. O Bruno já sabe quanta tinta comprar!",
    chips: ["cont = {}", "for c in texto:", 'if c == " ":', "continue", "cont[c] = cont.get(c, 0) + 1", "return cont"],
  },
  "4-3": {
    scenery: ["⛰️", "⚖️", "🗡️"],
    host: "bruno",
    display: "visitors",
    events: [
      { actor: "⚖️", label: "Espadas de 4, 1 e 9 kg", expr: "min_max([4, 1, 9])", expect: "(1, 9)" },
      { actor: "⚖️", label: "Uma espada de 5 kg", expr: "min_max([5])", expect: "(5, 5)" },
    ],
    before: "A balança espera para mostrar a espada mais leve e a mais pesada.",
    after: "A balança mostrou os dois pesos de uma vez só!",
    chips: ["return", "min(nums)", ",", "max(nums)"],
  },
  "4-4": {
    scenery: ["⛰️", "🧱", "🪵"],
    host: "bruno",
    display: "visitors",
    events: [
      { actor: "📋", label: "Listas [1,2,2,3] e [2,3,4]", expr: "em_comum([1, 2, 2, 3], [2, 3, 4])", expect: "[2, 3]" },
      { actor: "📋", label: "Listas [1] e [2]", expr: "em_comum([1], [2])", expect: "[]" },
    ],
    before: "Dois ferreiros trouxeram listas de materiais. O que eles têm em comum?",
    after: "Materiais em comum encontrados. Vão dividir as compras!",
    chips: ["return", "sorted()", "set(l1)", "&", "set(l2)"],
  },
  "4-5": {
    scenery: ["🏔️", "☁️", "🏔️"],
    host: "pytha",
    enemy: { emoji: "👹", name: "Titã Recursivo", taunt: "Número errado! A montanha é minha!", defeat: "O Titã tropeçou nos próprios cálculos e rolou montanha abaixo!" },
    display: "visitors",
    events: [
      { actor: "🪆", label: "fib(7)", expr: "fib(7)", expect: "13" },
      { actor: "🪆", label: "fib(10)", expr: "fib(10)", expect: "55" },
      { actor: "🪆", label: "fib(15)", expr: "fib(15)", expect: "610" },
    ],
    before: "O Titã exige três números de Fibonacci para liberar o topo.",
    after: "Três respostas certas e o topo da montanha está livre!",
    chips: ["if n < 2:", "return n", "return fib(n - 1) + fib(n - 2)"],
  },
  "5-1": {
    scenery: ["🏰", "🛡️", "🏰"],
    host: "rei",
    display: "visitors",
    setup: 'h = Heroi("Zé")',
    events: [
      { actor: "🦸", label: "Zé nasce com quanta vida?", expr: "h.vida", expect: "100" },
      { actor: "🧌", label: "Um goblin causa 30 de dano", do: "h.sofrer(30)", expr: "h.vida", expect: "70" },
      { actor: "🐲", label: "Um dragão causa 500 de dano!", do: "h.sofrer(500)", expr: "h.vida", expect: "0" },
    ],
    before: "O Rei chamou um herói novo, o Zé. Ele vai enfrentar dois monstros.",
    after: "O Zé aguentou tudo e a vida nunca ficou negativa!",
    chips: ["def __init__(self, nome, vida=100):", "self.nome = nome", "self.vida = vida", "def sofrer(self, dano):", "self.vida = max(0, self.vida - dano)"],
  },
  "5-2": {
    scenery: ["🏰", "🎯", "🏰"],
    host: "rei",
    display: "visitors",
    events: [
      { actor: "🧝", label: "Personagem ataca", expr: "Personagem().atacar()", expect: "10" },
      { actor: "🧙", label: "Mago ataca", expr: "Mago().atacar()", expect: "20" },
      { actor: "🧙", label: "Mago é um Personagem?", expr: "isinstance(Mago(), Personagem)", expect: "True" },
    ],
    before: "Um personagem e um mago vão mostrar a força no pátio do castelo.",
    after: "O mago bateu com o dobro de força, como manda a família!",
    chips: ["class Personagem:", "def atacar(self):", "return 10", "class Mago(Personagem):", "return super().atacar() * 2"],
  },
  "5-3": {
    scenery: ["🏰", "🧭", "🗺️"],
    host: "rei",
    display: "visitors",
    events: [
      { actor: "🧭", label: "Vetor(1, 2) + Vetor(3, 4)", expr: "str(Vetor(1, 2) + Vetor(3, 4))", expect: "'Vetor(4, 6)'" },
      { actor: "🧭", label: "Vetor(4, 6) == Vetor(4, 6)?", expr: "Vetor(4, 6) == Vetor(4, 6)", expect: "True" },
    ],
    before: "Os engenheiros do Rei querem somar duas direções no mapa.",
    after: "As direções somaram e o mapa mostra o caminho certo!",
    chips: ["def __add__(self, outro):", "return Vetor(self.x + outro.x, self.y + outro.y)", "def __eq__(self, outro):", "def __str__(self):", 'return f"Vetor({self.x}, {self.y})"'],
  },
  "5-4": {
    scenery: ["🏰", "💎", "🪤"],
    host: "rei",
    display: "visitors",
    events: [
      { actor: "➗", label: "Dividir 10 por 2", expr: "dividir(10, 2)", expect: "5.0" },
      { actor: "➗", label: "Dividir 1 por 0", expr: "dividir(1, 0)", expect: "None" },
      { actor: "🤑", label: "Sacar 30 de 100", expr: "sacar(100, 30)", expect: "70" },
      { actor: "🦹", label: "Ladrão tenta sacar 50 de 10", expr: "sacar(10, 50)", expect: "!ValueError", meaning: { "!ValueError": "Alarme disparou! 🚨" } },
    ],
    before: "Clientes e um ladrão disfarçado vão até o tesouro real.",
    after: "Tesouro protegido: o alarme só disparou para o ladrão!",
    chips: ["try:", "return a / b", "except ZeroDivisionError:", "return None", "if valor > saldo:", 'raise ValueError("saldo insuficiente")', "return saldo - valor"],
  },
  "5-5": {
    scenery: ["🏰", "📦", "👑"],
    host: "pytha",
    enemy: { emoji: "🦹", name: "Ladrão do Bug", taunt: "Seu inventário é pior que o meu!", defeat: "O ladrão devolveu o inventário do Rei e fugiu!" },
    display: "visitors",
    setup: "inv = Inventario()",
    events: [
      { actor: "🧪", label: "Guarda 3 poções", do: 'inv.adicionar("poção", 3)', expr: 'inv.qtd("poção")', expect: "3" },
      { actor: "🗺️", label: "Guarda 1 mapa. Total?", do: 'inv.adicionar("mapa")', expr: "len(inv)", expect: "4" },
      { actor: "🧪", label: "Usa 2 poções", do: 'inv.remover("poção", 2)', expr: 'inv.qtd("poção")', expect: "1" },
      { actor: "🦹", label: "Tenta tirar 5 mapas", expr: 'inv.remover("mapa", 5)', expect: "!ItemFaltando", meaning: { "!ItemFaltando": "Alarme ItemFaltando! 🚨" } },
    ],
    before: "O inventário do Rei vai passar por quatro testes do ladrão.",
    after: "O inventário passou em todos os testes. O Rei está salvo!",
    chips: ["def adicionar(self, item, qtd=1):", "self.itens[item] = self.itens.get(item, 0) + qtd", "def remover(self, item, qtd=1):", "raise ItemFaltando(item)", "def qtd(self, item):", "def __len__(self):", "return sum(self.itens.values())"],
  },
  "6-1": {
    scenery: ["🗼", "✨", "🌙"],
    host: "lua",
    display: "visitors",
    events: [
      { actor: "🔮", label: "Números 1 a 5", expr: "quadrados_impares([1, 2, 3, 4, 5])", expect: "[1, 9, 25]" },
      { actor: "🔮", label: "Só o número 2", expr: "quadrados_impares([2])", expect: "[]" },
    ],
    before: "A bola de cristal espera o feitiço de uma linha só.",
    after: "A bola de cristal brilhou com os quadrados dos ímpares!",
    chips: ["return", "[n ** 2 for n in nums if n % 2]"],
  },
  "6-2": {
    scenery: ["🗼", "🏆", "🌙"],
    host: "lua",
    display: "visitors",
    events: [
      { actor: "🏆", label: "Ana 5, Beto 9, Caio 1", expr: 'ordenar_por_poder([("Ana", 5), ("Beto", 9), ("Caio", 1)])', expect: '["Beto", "Ana", "Caio"]' },
    ],
    before: "Três heróis esperam para ver o ranking de poder.",
    after: "O ranking subiu no quadro da torre, com o Beto no topo!",
    chips: ["ordem = sorted(herois, key=lambda h: h[1], reverse=True)", "return [nome for nome, poder in ordem]"],
  },
  "6-3": {
    scenery: ["🗼", "💠", "🌙"],
    host: "lua",
    display: "visitors",
    setup: "import itertools, types",
    events: [
      { actor: "⚙️", label: "É um gerador?", expr: "isinstance(potencias_de_2(), types.GeneratorType)", expect: "True" },
      { actor: "💠", label: "Coleta 6 cristais de energia", expr: "list(itertools.islice(potencias_de_2(), 6))", expect: "[1, 2, 4, 8, 16, 32]" },
    ],
    before: "A torre está apagada. Ela precisa de uma fonte infinita de energia.",
    after: "A energia fluiu: 1, 2, 4, 8, 16, 32... A torre acendeu inteira!",
    chips: ["n = 1", "while True:", "yield n", "n *= 2"],
  },
  "6-4": {
    scenery: ["🗼", "🎁", "🌙"],
    host: "lua",
    display: "visitors",
    events: [
      { actor: "🔢", label: "Antes de lançar", expr: "ola.chamadas", expect: "0" },
      { actor: "🪄", label: "Lança ola() uma vez", do: "ola()", expr: "ola.chamadas", expect: "1" },
      { actor: "🪄", label: "Lança mais duas vezes", do: "ola(); ola()", expr: "ola.chamadas", expect: "3" },
    ],
    before: "O feitiço ola está embrulhado, esperando o contador.",
    after: "O contador marcou cada lançamento, sem mudar o feitiço!",
    chips: ["def wrapper(*a, **k):", "wrapper.chamadas += 1", "return f(*a, **k)", "wrapper.chamadas = 0", "return wrapper"],
  },
  "6-5": {
    scenery: ["🗼", "🌌", "🗼"],
    host: "pytha",
    enemy: { emoji: "🐛", name: "Bug, o Bagunçador", taunt: "Hehehe! As missões continuam perdidas!", defeat: "O Bug se rendeu! Pythonia está salva!" },
    display: "visitors",
    setup: 'ms = [Missao("Salvar a vila", 10), Missao("Cruzar o rio", 5, True), Missao("Subir a torre", 7)]',
    events: [
      { actor: "📜", label: "Missão com @dataclass?", expr: "__import__('dataclasses').is_dataclass(Missao)", expect: "True" },
      { actor: "🪙", label: "Recompensa pendente", expr: "total_pendente(ms)", expect: "17" },
      { actor: "🟰", label: 'Missao("x", 1) == Missao("x", 1)?', expr: 'Missao("x", 1) == Missao("x", 1)', expect: "True" },
    ],
    crowd: ["👩‍🍳", "🦉", "🧜‍♀️", "🧔", "🤴", "🧙‍♀️"],
    before: "O Bug escondeu as missões do reino. Só o Arquiteto sabe quanto falta recompensar.",
    after: "Todas as missões foram encontradas. O reino inteiro veio comemorar!",
    chips: ["@dataclass", "class Missao:", "nome: str", "recompensa: int", "feita: bool = False", "def total_pendente(missoes: list[Missao]) -> int:", "return sum(m.recompensa for m in missoes if not m.feita)"],
  },
};
