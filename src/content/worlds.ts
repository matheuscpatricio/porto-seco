export type Level = {
  id: string;
  title: string;
  boss?: boolean;
  theory: string;
  example: string;
  task: string;
  starter: string;
  hints: string[];
  /** Python run after the player's code; `__out` holds stdout. Raise AssertionError with a message on failure. */
  check: string;
  inputs?: string[];
  xp: number;
};

export type World = {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  color: string;
  levels: Level[];
};

export const worlds: World[] = [
  {
    id: "w1",
    name: "Vila das Variáveis",
    emoji: "🏡",
    tagline: "Seus primeiros feitiços: print, variáveis e tipos",
    color: "from-emerald-500 to-teal-600",
    levels: [
      {
        id: "1-1",
        title: "O primeiro feitiço",
        theory: "`print()` mostra algo na tela. O texto vai entre aspas.",
        example: 'print("Olá, mundo!")',
        task: "Mostre na tela exatamente: Olá, Python!",
        starter: "# Escreva seu código aqui\n",
        hints: ["Use print(...)", 'print("Olá, Python!")'],
        check: 'assert __out.strip() == "Olá, Python!", f"Esperado \'Olá, Python!\', recebi {__out.strip()!r}"',
        xp: 10,
      },
      {
        id: "1-2",
        title: "Guardando poções",
        theory: "Uma variável guarda um valor com um nome: `nome = valor`.",
        example: 'heroi = "Ana"\nvida = 100\nprint(heroi, vida)',
        task: "Crie a variável `nome` com o texto \"Merlin\" e `idade` com o número 150.",
        starter: "",
        hints: ["Texto usa aspas, número não", 'nome = "Merlin"'],
        check:
          'assert nome == "Merlin", "nome deve ser \\"Merlin\\""\nassert idade == 150 and isinstance(idade, int), "idade deve ser o número 150"',
        xp: 10,
      },
      {
        id: "1-3",
        title: "Matemágica",
        theory: "Operadores: `+ - * /`, `//` (divisão inteira), `%` (resto) e `**` (potência).",
        example: "print(7 // 2, 7 % 2, 2 ** 10)",
        task: "Um dragão tem 250 moedas e divide igualmente entre 7 goblins. Crie `cada` (quanto cada um recebe, inteiro) e `sobra` (o resto).",
        starter: "moedas = 250\n",
        hints: ["Use // e %", "cada = moedas // 7"],
        check: 'assert cada == 35, "cada deveria ser 35"\nassert sobra == 5, "sobra deveria ser 5"',
        xp: 15,
      },
      {
        id: "1-4",
        title: "Pergaminhos e f-strings",
        theory: "f-strings colocam variáveis dentro do texto: `f\"Oi {nome}\"`. `input()` lê o que o usuário digita (sempre como texto).",
        example: 'nome = input("Nome? ")\nprint(f"Bem-vindo, {nome}!")',
        task: "Leia um nome com input() e mostre: Salve, <nome>! (o jogo vai digitar \"Gandalf\")",
        starter: "",
        inputs: ["Gandalf"],
        hints: ['nome = input()', 'print(f"Salve, {nome}!")'],
        check: 'assert "Salve, Gandalf!" in __out, "Esperado ver \'Salve, Gandalf!\'"',
        xp: 15,
      },
      {
        id: "1-5",
        title: "Chefe: o Golem Conversor",
        boss: true,
        theory: "`int()`, `float()` e `str()` convertem tipos. `input()` devolve texto, então converta para fazer contas.",
        example: 'x = int("42") + 1  # 43',
        task: "Leia dois números com input() (o jogo digitará 12 e 30) e mostre: A soma é 42",
        starter: "",
        inputs: ["12", "30"],
        hints: ["Converta com int(input())", 'print(f"A soma é {a + b}")'],
        check: 'assert "A soma é 42" in __out, "Esperado ver \'A soma é 42\'"',
        xp: 40,
      },
    ],
  },
  {
    id: "w2",
    name: "Floresta das Condições",
    emoji: "🌲",
    tagline: "Tome decisões com if, elif e else",
    color: "from-lime-500 to-green-700",
    levels: [
      {
        id: "2-1",
        title: "A bifurcação",
        theory: "`if condicao:` executa o bloco indentado só se a condição for verdadeira. `else:` cobre o outro caso.",
        example: 'vida = 20\nif vida > 0:\n    print("Vivo")\nelse:\n    print("Fim de jogo")',
        task: "Com `ouro = 80`, mostre \"Pode comprar\" se ouro >= 50, senão \"Sem dinheiro\".",
        starter: "ouro = 80\n",
        hints: ["if ouro >= 50:", "Não esqueça os dois-pontos e a indentação"],
        check: 'assert __out.strip() == "Pode comprar", "Deveria mostrar Pode comprar"',
        xp: 15,
      },
      {
        id: "2-2",
        title: "Três caminhos",
        theory: "`elif` testa outra condição quando a anterior falhou.",
        example: 'if x > 0:\n    print("positivo")\nelif x < 0:\n    print("negativo")\nelse:\n    print("zero")',
        task: "Crie a função `classe(xp)` que retorna \"Aprendiz\" (xp < 100), \"Mago\" (xp < 500) ou \"Arquimago\".",
        starter: "def classe(xp):\n    # seu código\n    pass\n",
        hints: ["Use return dentro de cada ramo", "if xp < 100: return \"Aprendiz\""],
        check:
          'assert classe(10) == "Aprendiz", "classe(10)"\nassert classe(100) == "Mago", "classe(100) deveria ser Mago"\nassert classe(499) == "Mago", "classe(499)"\nassert classe(500) == "Arquimago", "classe(500)"',
        xp: 20,
      },
      {
        id: "2-3",
        title: "Portões lógicos",
        theory: "Combine condições com `and`, `or` e `not`.",
        example: "if tem_chave and not trancado:\n    ...",
        task: "Crie `pode_entrar(idade, tem_convite)`: True se idade >= 18 e tem convite, ou se idade >= 60 (com ou sem convite).",
        starter: "def pode_entrar(idade, tem_convite):\n    pass\n",
        hints: ["return (idade >= 18 and tem_convite) or idade >= 60"],
        check:
          'assert pode_entrar(20, True) is True\nassert pode_entrar(20, False) is False, "20 sem convite não entra"\nassert pode_entrar(70, False) is True, "idosos entram"\nassert pode_entrar(15, True) is False, "menor não entra"',
        xp: 20,
      },
      {
        id: "2-4",
        title: "Verdade escondida",
        theory: "Valores vazios (`0`, `\"\"`, `[]`, `None`) contam como falsos. O resto é verdadeiro.",
        example: 'nome = ""\nif not nome:\n    print("Sem nome")',
        task: "Crie `saudacao(nome)` que retorna \"Olá, estranho\" se o nome for vazio, senão \"Olá, <nome>\".",
        starter: "def saudacao(nome):\n    pass\n",
        hints: ["if not nome:", 'return f"Olá, {nome}"'],
        check: 'assert saudacao("") == "Olá, estranho"\nassert saudacao("Lia") == "Olá, Lia"',
        xp: 20,
      },
      {
        id: "2-5",
        title: "Chefe: a Esfinge FizzBuzz",
        boss: true,
        theory: "`n % 3 == 0` testa se n é divisível por 3. A ordem dos ifs importa!",
        example: "if n % 2 == 0: ...",
        task: "Crie `fizzbuzz(n)`: retorna \"FizzBuzz\" se divisível por 3 e 5, \"Fizz\" por 3, \"Buzz\" por 5, senão o número como texto.",
        starter: "def fizzbuzz(n):\n    pass\n",
        hints: ["Teste o caso de 15 primeiro", "return str(n) no final"],
        check:
          'assert fizzbuzz(15) == "FizzBuzz"\nassert fizzbuzz(9) == "Fizz"\nassert fizzbuzz(10) == "Buzz"\nassert fizzbuzz(7) == "7", "números devem virar texto"',
        xp: 50,
      },
    ],
  },
  {
    id: "w3",
    name: "Rio dos Loops",
    emoji: "🌊",
    tagline: "Repita feitiços com for, while e listas",
    color: "from-sky-500 to-blue-700",
    levels: [
      {
        id: "3-1",
        title: "Contagem regressiva",
        theory: "`for i in range(a, b, passo):` repete para cada número. O fim `b` não entra.",
        example: "for i in range(3):\n    print(i)  # 0 1 2",
        task: "Mostre os números de 10 até 1 (um por linha) e depois \"Decolar!\".",
        starter: "",
        hints: ["range(10, 0, -1)", 'print("Decolar!") fora do loop'],
        check:
          'linhas = __out.strip().split("\\n")\nassert linhas == [str(i) for i in range(10, 0, -1)] + ["Decolar!"], "Confira a ordem e o texto final"',
        xp: 20,
      },
      {
        id: "3-2",
        title: "A mochila",
        theory: "Listas guardam vários itens: `[1, 2, 3]`. Use `.append()`, `len()` e índices (`lista[0]`).",
        example: 'itens = ["espada"]\nitens.append("escudo")\nprint(len(itens), itens[-1])',
        task: "Crie `mochila` com \"poção\" e \"mapa\", adicione \"chave\" no fim e guarde o total de itens em `total`.",
        starter: "",
        hints: ['mochila = ["poção", "mapa"]', "total = len(mochila)"],
        check: 'assert mochila == ["poção", "mapa", "chave"], f"mochila = {mochila}"\nassert total == 3',
        xp: 20,
      },
      {
        id: "3-3",
        title: "Somando tesouros",
        theory: "Percorra uma lista com `for item in lista:` e acumule em uma variável.",
        example: "total = 0\nfor x in [1, 2, 3]:\n    total += x",
        task: "Crie `soma_pares(nums)` que retorna a soma apenas dos números pares da lista.",
        starter: "def soma_pares(nums):\n    pass\n",
        hints: ["Comece com total = 0", "if n % 2 == 0: total += n"],
        check: 'assert soma_pares([1,2,3,4]) == 6\nassert soma_pares([]) == 0\nassert soma_pares([7, 9]) == 0',
        xp: 25,
      },
      {
        id: "3-4",
        title: "Enquanto houver vida",
        theory: "`while condicao:` repete enquanto for verdadeiro. `break` sai do loop.",
        example: "n = 1\nwhile n < 100:\n    n *= 2",
        task: "Crie `dobrar_ate(limite)` que começa em 1 e dobra até passar do limite, retornando quantas vezes dobrou.",
        starter: "def dobrar_ate(limite):\n    pass\n",
        hints: ["valor, vezes = 1, 0", "while valor <= limite: valor *= 2; vezes += 1"],
        check: 'assert dobrar_ate(1) == 1\nassert dobrar_ate(100) == 7\nassert dobrar_ate(0) == 0',
        xp: 25,
      },
      {
        id: "3-5",
        title: "Chefe: a Serpente do Maior",
        boss: true,
        theory: "Sem usar `max()`, guarde o melhor valor visto até agora enquanto percorre a lista.",
        example: "melhor = lista[0]",
        task: "Crie `maior(nums)` que retorna o maior número sem usar max(). Para lista vazia, retorne None.",
        starter: "def maior(nums):\n    pass\n",
        hints: ["if not nums: return None", "Compare cada n com melhor"],
        check:
          'import builtins\n_m = builtins.max\nbuiltins.max = lambda *a, **k: (_ for _ in ()).throw(AssertionError("Não vale usar max()!"))\ntry:\n    assert maior([3, 9, 2]) == 9\n    assert maior([-5, -1, -9]) == -1, "Cuidado com negativos"\n    assert maior([]) is None\nfinally:\n    builtins.max = _m',
        xp: 60,
      },
    ],
  },
  {
    id: "w4",
    name: "Montanha das Funções",
    emoji: "⛰️",
    tagline: "Funções, dicionários, tuplas e conjuntos",
    color: "from-amber-500 to-orange-700",
    levels: [
      {
        id: "4-1",
        title: "Parâmetros padrão",
        theory: "Parâmetros podem ter valor padrão: `def f(x, y=2):`.",
        example: 'def ataque(forca, bonus=0):\n    return forca + bonus',
        task: "Crie `dano(base, critico=False)` que retorna base, ou base * 2 se for crítico.",
        starter: "",
        hints: ["def dano(base, critico=False):", "return base * 2 if critico else base"],
        check: 'assert dano(10) == 10\nassert dano(10, True) == 20\nassert dano(5, critico=True) == 10',
        xp: 25,
      },
      {
        id: "4-2",
        title: "O grimório (dicionários)",
        theory: "Dicionários ligam chaves a valores: `{\"fogo\": 30}`. Use `.get(chave, padrao)` e `.items()`.",
        example: 'magias = {"fogo": 30}\nmagias["gelo"] = 20\nfor nome, custo in magias.items():\n    print(nome, custo)',
        task: "Crie `contar_letras(texto)` que retorna um dicionário com quantas vezes cada letra aparece (ignore espaços).",
        starter: "def contar_letras(texto):\n    pass\n",
        hints: ["cont = {}", "cont[c] = cont.get(c, 0) + 1"],
        check: 'assert contar_letras("ana") == {"a": 2, "n": 1}\nassert contar_letras("a a") == {"a": 2}, "ignore espaços"\nassert contar_letras("") == {}',
        xp: 30,
      },
      {
        id: "4-3",
        title: "Tuplas e desempacotamento",
        theory: "Tuplas são listas imutáveis: `(x, y)`. Uma função pode retornar várias coisas: `return a, b`.",
        example: "def pos():\n    return 3, 4\nx, y = pos()",
        task: "Crie `min_max(nums)` que retorna uma tupla (menor, maior).",
        starter: "def min_max(nums):\n    pass\n",
        hints: ["return min(nums), max(nums)"],
        check: 'assert min_max([4, 1, 9]) == (1, 9)\nassert min_max([5]) == (5, 5)',
        xp: 25,
      },
      {
        id: "4-4",
        title: "Conjuntos únicos",
        theory: "Sets não repetem elementos e fazem operações como `&` (interseção) e `|` (união).",
        example: "a = {1, 2, 3}\nb = {2, 3, 4}\nprint(a & b)  # {2, 3}",
        task: "Crie `em_comum(l1, l2)` que retorna uma lista ordenada dos itens presentes nas duas listas, sem repetição.",
        starter: "def em_comum(l1, l2):\n    pass\n",
        hints: ["set(l1) & set(l2)", "sorted(...) devolve lista"],
        check: 'assert em_comum([1,2,2,3], [2,3,4]) == [2, 3]\nassert em_comum([1], [2]) == []',
        xp: 30,
      },
      {
        id: "4-5",
        title: "Chefe: o Titã Recursivo",
        boss: true,
        theory: "Recursão: uma função que chama a si mesma, com um caso base para parar.",
        example: "def fat(n):\n    return 1 if n <= 1 else n * fat(n - 1)",
        task: "Crie `fib(n)` recursiva que retorna o n-ésimo número de Fibonacci (fib(0)=0, fib(1)=1).",
        starter: "def fib(n):\n    pass\n",
        hints: ["Caso base: if n < 2: return n", "return fib(n-1) + fib(n-2)"],
        check: 'assert [fib(i) for i in range(8)] == [0,1,1,2,3,5,8,13]\nassert fib(15) == 610',
        xp: 70,
      },
    ],
  },
  {
    id: "w5",
    name: "Castelo dos Objetos",
    emoji: "🏰",
    tagline: "Classes, herança, métodos especiais e exceções",
    color: "from-violet-500 to-purple-800",
    levels: [
      {
        id: "5-1",
        title: "Forjando um herói",
        theory: "Classes são moldes. `__init__` monta o objeto e `self` é o próprio objeto.",
        example: "class Gato:\n    def __init__(self, nome):\n        self.nome = nome\n    def miar(self):\n        return f\"{self.nome}: miau\"",
        task: "Crie a classe `Heroi` com `nome` e `vida=100`, e o método `sofrer(dano)` que diminui a vida sem deixar ficar abaixo de 0.",
        starter: "class Heroi:\n    pass\n",
        hints: ["def __init__(self, nome, vida=100):", "self.vida = max(0, self.vida - dano)"],
        check:
          'h = Heroi("Zé")\nassert h.nome == "Zé" and h.vida == 100\nh.sofrer(30)\nassert h.vida == 70\nh.sofrer(500)\nassert h.vida == 0, "vida não pode ser negativa"',
        xp: 35,
      },
      {
        id: "5-2",
        title: "Linhagem (herança)",
        theory: "Uma classe filha herda da mãe: `class Mago(Heroi):`. Use `super()` para chamar a mãe.",
        example: "class Animal:\n    def som(self): return \"...\"\nclass Cao(Animal):\n    def som(self): return \"au\"",
        task: "Crie `Personagem` com `atacar()` retornando 10, e `Mago(Personagem)` cujo `atacar()` retorna o dobro do da classe mãe.",
        starter: "",
        hints: ["return super().atacar() * 2"],
        check: 'assert Personagem().atacar() == 10\nassert Mago().atacar() == 20\nassert isinstance(Mago(), Personagem)',
        xp: 35,
      },
      {
        id: "5-3",
        title: "Métodos mágicos",
        theory: "Métodos como `__str__`, `__add__`, `__eq__` e `__len__` mudam como o objeto se comporta com print, +, == e len.",
        example: "def __add__(self, outro):\n    return Vetor(self.x + outro.x)",
        task: "Crie `Vetor(x, y)` com `+` (soma os componentes), `==` e `__str__` retornando \"Vetor(x, y)\".",
        starter: "class Vetor:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n",
        hints: ["def __eq__(self, o): return (self.x, self.y) == (o.x, o.y)", 'return f"Vetor({self.x}, {self.y})"'],
        check: 'v = Vetor(1, 2) + Vetor(3, 4)\nassert v == Vetor(4, 6)\nassert str(v) == "Vetor(4, 6)"',
        xp: 40,
      },
      {
        id: "5-4",
        title: "Armadilhas (exceções)",
        theory: "`try/except` captura erros. `raise` lança seus próprios erros.",
        example: 'try:\n    x = int("abc")\nexcept ValueError:\n    x = 0',
        task: "Crie `dividir(a, b)` que retorna a/b, ou None se b for 0. E `sacar(saldo, valor)` que lança ValueError se valor > saldo, senão retorna o novo saldo.",
        starter: "",
        hints: ["except ZeroDivisionError: return None", 'raise ValueError("saldo insuficiente")'],
        check:
          'assert dividir(10, 2) == 5\nassert dividir(1, 0) is None\nassert sacar(100, 30) == 70\ntry:\n    sacar(10, 50)\n    raise AssertionError("sacar deveria lançar ValueError")\nexcept ValueError:\n    pass',
        xp: 40,
      },
      {
        id: "5-5",
        title: "Chefe: o Rei do Inventário",
        boss: true,
        theory: "Junte tudo: classe, dicionário interno, exceção própria e `__len__`.",
        example: "class ErroX(Exception):\n    pass",
        task: "Crie `ItemFaltando(Exception)` e `Inventario` com `adicionar(item, qtd=1)`, `remover(item, qtd=1)` (lança ItemFaltando se não houver o suficiente), `qtd(item)` e `len()` = total de unidades.",
        starter: "class ItemFaltando(Exception):\n    pass\n\nclass Inventario:\n    def __init__(self):\n        self.itens = {}\n",
        hints: ["self.itens.get(item, 0)", "def __len__(self): return sum(self.itens.values())"],
        check:
          'inv = Inventario()\ninv.adicionar("poção", 3)\ninv.adicionar("mapa")\nassert inv.qtd("poção") == 3 and len(inv) == 4\ninv.remover("poção", 2)\nassert inv.qtd("poção") == 1\nassert inv.qtd("nada") == 0\ntry:\n    inv.remover("mapa", 5)\n    raise AssertionError("deveria lançar ItemFaltando")\nexcept ItemFaltando:\n    pass',
        xp: 90,
      },
    ],
  },
  {
    id: "w6",
    name: "Torre Avançada",
    emoji: "🗼",
    tagline: "Compreensões, geradores, decorators e mais",
    color: "from-rose-500 to-fuchsia-800",
    levels: [
      {
        id: "6-1",
        title: "Compreensões",
        theory: "Crie listas e dicionários em uma linha: `[x*2 for x in nums if x > 0]`.",
        example: "quadrados = {n: n**2 for n in range(4)}",
        task: "Crie `quadrados_impares(nums)` que retorna, em uma compreensão, os quadrados dos números ímpares.",
        starter: "def quadrados_impares(nums):\n    pass\n",
        hints: ["return [n**2 for n in nums if n % 2]"],
        check: 'assert quadrados_impares([1,2,3,4,5]) == [1, 9, 25]\nassert quadrados_impares([2]) == []',
        xp: 40,
      },
      {
        id: "6-2",
        title: "Lambda, map e filter",
        theory: "`lambda x: x + 1` é uma função anônima. `sorted(lista, key=...)` ordena por um critério.",
        example: 'nomes = sorted(["bia", "Al"], key=lambda s: len(s))',
        task: "Crie `ordenar_por_poder(herois)` que recebe tuplas (nome, poder) e retorna só os nomes, do mais forte ao mais fraco.",
        starter: "def ordenar_por_poder(herois):\n    pass\n",
        hints: ["sorted(herois, key=lambda h: h[1], reverse=True)", "[nome for nome, _ in ...]"],
        check: 'assert ordenar_por_poder([("a", 5), ("b", 9), ("c", 1)]) == ["b", "a", "c"]',
        xp: 45,
      },
      {
        id: "6-3",
        title: "Geradores infinitos",
        theory: "`yield` cria um gerador que produz valores sob demanda, sem guardar tudo na memória.",
        example: "def contar():\n    n = 0\n    while True:\n        yield n\n        n += 1",
        task: "Crie o gerador `potencias_de_2()` infinito: 1, 2, 4, 8, ...",
        starter: "def potencias_de_2():\n    pass\n",
        hints: ["n = 1; while True: yield n; n *= 2"],
        check: 'import itertools, types\ng = potencias_de_2()\nassert isinstance(g, types.GeneratorType), "use yield"\nassert list(itertools.islice(g, 6)) == [1,2,4,8,16,32]',
        xp: 50,
      },
      {
        id: "6-4",
        title: "Decorators",
        theory: "Um decorator é uma função que embrulha outra, adicionando comportamento. Use `@nome` acima do `def`.",
        example: "def grito(f):\n    def w(*a, **k):\n        return f(*a, **k).upper()\n    return w",
        task: "Crie o decorator `contar_chamadas` que guarda em `funcao.chamadas` quantas vezes ela foi chamada. Use-o em `def ola(): return \"oi\"`.",
        starter: "def contar_chamadas(f):\n    pass\n\n@contar_chamadas\ndef ola():\n    return \"oi\"\n",
        hints: ["def wrapper(*a, **k): wrapper.chamadas += 1; return f(*a, **k)", "wrapper.chamadas = 0; return wrapper"],
        check: 'assert ola.chamadas == 0\nassert ola() == "oi"\nola(); ola()\nassert ola.chamadas == 3',
        xp: 55,
      },
      {
        id: "6-5",
        title: "Chefe final: o Arquiteto",
        boss: true,
        theory: "`@dataclass` gera `__init__`, `__eq__` e `__repr__`. Type hints (`nome: str`) documentam os tipos. `with` usa context managers.",
        example: "from dataclasses import dataclass\n\n@dataclass\nclass Ponto:\n    x: int\n    y: int = 0",
        task: "Crie a dataclass `Missao(nome: str, recompensa: int, feita: bool = False)` e a função `total_pendente(missoes: list[Missao]) -> int` que soma as recompensas das missões não feitas.",
        starter: "from dataclasses import dataclass\n",
        hints: ["@dataclass acima de class Missao:", "sum(m.recompensa for m in missoes if not m.feita)"],
        check:
          'import dataclasses\nassert dataclasses.is_dataclass(Missao), "use @dataclass"\nms = [Missao("a", 10), Missao("b", 5, True), Missao("c", 7)]\nassert total_pendente(ms) == 17\nassert Missao("x", 1) == Missao("x", 1)\nassert total_pendente.__annotations__.get("return") in (int, "int"), "anote o retorno como int"',
        xp: 120,
      },
    ],
  },
];

export const allLevels = worlds.flatMap((w) => w.levels.map((l) => ({ ...l, worldId: w.id })));

export function findLevel(id: string) {
  const idx = allLevels.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  const level = allLevels[idx];
  return { level, world: worlds.find((w) => w.id === level.worldId)!, next: allLevels[idx + 1] ?? null, index: idx };
}
