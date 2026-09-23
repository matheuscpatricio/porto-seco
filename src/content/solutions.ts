export type Solution = { code: string; explain: string };

export const solutions: Record<string, Solution> = {
  "1-1": {
    code: 'print("Olá, Python!")\n',
    explain:
      "O desafio pedia um texto exato na tela. `print` escreve o que está entre parênteses, e as aspas marcam que `Olá, Python!` é texto, não um nome de variável. O teste compara a saída, então qualquer letra a mais ou a menos reprova.",
  },
  "1-2": {
    code: 'nome = "Merlin"\nidade = 150\n',
    explain:
      "Uma variável nasce com `nome = valor`. Texto precisa de aspas (`\"Merlin\"`); número não (`150`). Se `idade` fosse `\"150\"`, seria texto e o teste de tipo falharia, porque ele exige um número inteiro.",
  },
  "1-3": {
    code: "moedas = 250\ncada = moedas // 7\nsobra = moedas % 7\n",
    explain:
      "250 dividido por 7 não é inteiro: 7 × 35 = 245, e sobram 5. `//` descarta a parte quebrada e devolve 35. `%` devolve só o resto, 5. A divisão comum `/` daria 35.71, que não serve para contar moedas inteiras.",
  },
  "1-4": {
    code: 'nome = input()\nprint(f"Salve, {nome}!")\n',
    explain:
      "`input()` lê o que foi digitado e devolve texto. A f-string `f\"Salve, {nome}!\"` cola o valor de `nome` no meio da frase. O jogo digita Gandalf, então a saída vira `Salve, Gandalf!`.",
  },
  "1-5": {
    code: 'a = int(input())\nb = int(input())\nprint(f"A soma é {a + b}")\n',
    explain:
      "`input()` sempre devolve texto. Somar `\"12\" + \"30\"` juntaria os textos e daria `\"1230\"`. `int()` converte cada leitura em número antes da conta: 12 + 30 = 42. A f-string monta a frase pedida.",
  },
  "2-1": {
    code: 'ouro = 80\nif ouro >= 50:\n    print("Pode comprar")\nelse:\n    print("Sem dinheiro")\n',
    explain:
      "`if` só entra no bloco indentado quando a condição é verdadeira. 80 é maior ou igual a 50, então imprime `Pode comprar`. O `else` ficaria para o caso de ouro abaixo de 50. Os dois-pontos e os 4 espaços fazem parte da sintaxe do bloco.",
  },
  "2-2": {
    code: 'def classe(xp):\n    if xp < 100:\n        return "Aprendiz"\n    elif xp < 500:\n        return "Mago"\n    else:\n        return "Arquimago"\n',
    explain:
      "A ordem decide o resultado. Primeiro separo quem tem menos de 100 XP. Quem sobrou e tem menos de 500 cai no `elif` e vira Mago, inclusive o 100 e o 499. Só a partir de 500 chega no `else`. `return` devolve o texto e encerra a função.",
  },
  "2-3": {
    code: "def pode_entrar(idade, tem_convite):\n    return (idade >= 18 and tem_convite) or idade >= 60\n",
    explain:
      "São duas portas. A primeira exige as duas coisas ao mesmo tempo: maior de idade `and` convite. A segunda abre sozinha para quem tem 60 ou mais, por causa do `or`. Um adolescente com convite continua de fora, porque nenhuma das duas portas abre.",
  },
  "2-4": {
    code: 'def saudacao(nome):\n    if not nome:\n        return "Olá, estranho"\n    return f"Olá, {nome}"\n',
    explain:
      "Texto vazio conta como falso. `not nome` fica verdadeiro justamente quando não há nome, e aí devolvo a saudação genérica. Com um nome preenchido, a f-string monta `Olá, Lia`.",
  },
  "2-5": {
    code: 'def fizzbuzz(n):\n    if n % 15 == 0:\n        return "FizzBuzz"\n    if n % 3 == 0:\n        return "Fizz"\n    if n % 5 == 0:\n        return "Buzz"\n    return str(n)\n',
    explain:
      "Quem é divisível por 3 e por 5 também é divisível por 15, então esse caso vem primeiro. Se eu testasse o 3 antes, o 15 viraria só `Fizz` e nunca chegaria no `FizzBuzz`. No fim, `str(n)` transforma o número em texto, porque o teste compara com `\"7\"`, não com o número 7.",
  },
  "3-1": {
    code: 'for i in range(10, 0, -1):\n    print(i)\nprint("Decolar!")\n',
    explain:
      "`range(10, 0, -1)` começa em 10, para antes do 0 e anda de 1 em 1 para trás: 10, 9, …, 1. Cada `print` vai para uma linha. `Decolar!` fica fora do `for`, senão sairia dez vezes.",
  },
  "3-2": {
    code: 'mochila = ["poção", "mapa"]\nmochila.append("chave")\ntotal = len(mochila)\n',
    explain:
      "A lista já nasce com os dois primeiros itens. `append` coloca `chave` no final, sem substituir nada. `len` conta os itens depois da inclusão, então `total` vale 3.",
  },
  "3-3": {
    code: "def soma_pares(nums):\n    total = 0\n    for n in nums:\n        if n % 2 == 0:\n            total += n\n    return total\n",
    explain:
      "Começo o acumulador em 0. Para cada número, `% 2 == 0` diz se ele é par. Só esses entram na soma. Lista vazia não entra no `for` e devolve 0. Ímpares são ignorados.",
  },
  "3-4": {
    code: "def dobrar_ate(limite):\n    valor, vezes = 1, 0\n    while valor <= limite:\n        valor *= 2\n        vezes += 1\n    return vezes\n",
    explain:
      "Parto de 1 e conto cada dobra. O `while` continua enquanto o valor ainda não passou do limite. Para 100 a sequência é 1, 2, 4, 8, 16, 32, 64 e a sétima dobra chega a 128, que já passou: 7 vezes. Se o limite é 0, 1 já é maior, então o laço nem começa.",
  },
  "3-5": {
    code: "def maior(nums):\n    if not nums:\n        return None\n    melhor = nums[0]\n    for n in nums:\n        if n > melhor:\n            melhor = n\n    return melhor\n",
    explain:
      "Lista vazia não tem maior, então devolvo `None` antes de olhar o índice 0. O primeiro item vira o candidato. Cada número seguinte substitui o candidato só se for maior. Começar em 0 quebraria com negativos, porque -1 é maior que -5, mas menor que 0.",
  },
  "4-1": {
    code: "def dano(base, critico=False):\n    if critico:\n        return base * 2\n    return base\n",
    explain:
      "`critico=False` deixa o segundo argumento opcional: `dano(10)` não é crítico. Quando alguém passa `True`, ou `critico=True` pelo nome, o retorno dobra. Sem o valor padrão, chamar com um argumento só daria erro.",
  },
  "4-2": {
    code: "def contar_letras(texto):\n    cont = {}\n    for c in texto:\n        if c == \" \":\n            continue\n        cont[c] = cont.get(c, 0) + 1\n    return cont\n",
    explain:
      "O dicionário começa vazio. Cada letra vira uma chave. `.get(c, 0)` devolve a contagem atual, ou 0 se a letra ainda não apareceu, e eu guardo esse valor mais um. O espaço é pulado com `continue`, por isso `\"a a\"` conta só duas letras `a`.",
  },
  "4-3": {
    code: "def min_max(nums):\n    return min(nums), max(nums)\n",
    explain:
      "`return a, b` empacota os dois valores numa tupla. `min` e `max` já percorrem a lista. Com um único item, menor e maior são o mesmo número, então `(5, 5)`.",
  },
  "4-4": {
    code: "def em_comum(l1, l2):\n    return sorted(set(l1) & set(l2))\n",
    explain:
      "`set` elimina repetidos. O operador `&` fica só com o que existe nos dois conjuntos. `sorted` transforma isso numa lista em ordem, que é o formato que o teste compara.",
  },
  "4-5": {
    code: "def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)\n",
    explain:
      "O caso base impede a recursão infinita: fib(0) é 0 e fib(1) é 1. Qualquer outro número é a soma dos dois anteriores, e cada chamada resolve um problema menor até chegar na base. fib(15) soma essa cadeia até 610.",
  },
  "5-1": {
    code: "class Heroi:\n    def __init__(self, nome, vida=100):\n        self.nome = nome\n        self.vida = vida\n\n    def sofrer(self, dano):\n        self.vida = max(0, self.vida - dano)\n",
    explain:
      "`__init__` guarda nome e vida no próprio objeto, `self`. `sofrer` tira o dano e usa `max(0, ...)` para a vida nunca ficar negativa: se o dano passa da vida, o maior entre 0 e um número negativo é 0.",
  },
  "5-2": {
    code: "class Personagem:\n    def atacar(self):\n        return 10\n\nclass Mago(Personagem):\n    def atacar(self):\n        return super().atacar() * 2\n",
    explain:
      "`Mago(Personagem)` herda tudo do personagem. Reescrever `atacar` substitui o método, mas `super().atacar()` ainda chama a versão da classe mãe e pega o 10. Multiplicar por 2 dá 20, e se a mãe mudar o dano base o mago acompanha.",
  },
  "5-3": {
    code: "class Vetor:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n\n    def __add__(self, outro):\n        return Vetor(self.x + outro.x, self.y + outro.y)\n\n    def __eq__(self, outro):\n        return (self.x, self.y) == (outro.x, outro.y)\n\n    def __str__(self):\n        return f\"Vetor({self.x}, {self.y})\"\n",
    explain:
      "O Python chama métodos especiais por baixo dos operadores. `+` vira `__add__` e devolve um vetor novo, sem alterar os dois originais. `==` vira `__eq__`. `str()` e `print` usam `__str__`, que monta o texto `Vetor(4, 6)`.",
  },
  "5-4": {
    code: "def dividir(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return None\n\ndef sacar(saldo, valor):\n    if valor > saldo:\n        raise ValueError(\"saldo insuficiente\")\n    return saldo - valor\n",
    explain:
      "Dividir por zero estoura `ZeroDivisionError`. O `try` tenta a conta e o `except` transforma esse erro em `None`, em vez de quebrar o programa. Em `sacar` o erro é intencional: se o valor passa do saldo, `raise ValueError` avisa quem chamou. Caso contrário, devolvo o saldo novo.",
  },
  "5-5": {
    code: "class ItemFaltando(Exception):\n    pass\n\nclass Inventario:\n    def __init__(self):\n        self.itens = {}\n\n    def adicionar(self, item, qtd=1):\n        self.itens[item] = self.itens.get(item, 0) + qtd\n\n    def remover(self, item, qtd=1):\n        if self.qtd(item) < qtd:\n            raise ItemFaltando(item)\n        self.itens[item] -= qtd\n\n    def qtd(self, item):\n        return self.itens.get(item, 0)\n\n    def __len__(self):\n        return sum(self.itens.values())\n",
    explain:
      "O dicionário guarda item e quantidade. `adicionar` soma em cima do que já existe, usando 0 quando a chave é nova. `remover` confere antes: se não houver unidades suficientes, lança `ItemFaltando`, uma exceção criada por nós. `qtd` usa `.get` para item inexistente valer 0. `__len__` soma todas as unidades, então `len(inv)` conta poções e mapas juntos.",
  },
  "6-1": {
    code: "def quadrados_impares(nums):\n    return [n ** 2 for n in nums if n % 2]\n",
    explain:
      "A compreensão lê como a frase: para cada `n` em `nums`, se `n % 2` for diferente de zero (ímpar), guarde `n ** 2`. O `if` no fim filtra; o que fica antes do `for` é o valor novo. Pares somem da lista.",
  },
  "6-2": {
    code: "def ordenar_por_poder(herois):\n    ordem = sorted(herois, key=lambda h: h[1], reverse=True)\n    return [nome for nome, poder in ordem]\n",
    explain:
      "Cada herói é uma tupla `(nome, poder)`. `sorted` com `key=lambda h: h[1]` ordena pelo segundo item, o poder, e `reverse=True` põe o maior primeiro. Depois a compreensão fica só com os nomes, na ordem já definida.",
  },
  "6-3": {
    code: "def potencias_de_2():\n    n = 1\n    while True:\n        yield n\n        n *= 2\n",
    explain:
      "`yield` pausa a função e entrega um valor, sem montar a lista infinita. Na próxima leitura ela continua logo depois do `yield` e dobra `n`. O teste pede só os 6 primeiros com `islice`, então o `while True` nunca precisa terminar.",
  },
  "6-4": {
    code: "def contar_chamadas(f):\n    def wrapper(*a, **k):\n        wrapper.chamadas += 1\n        return f(*a, **k)\n    wrapper.chamadas = 0\n    return wrapper\n\n@contar_chamadas\ndef ola():\n    return \"oi\"\n",
    explain:
      "O decorator recebe a função original e devolve outra no lugar. `@contar_chamadas` faz `ola` passar a ser o `wrapper`. Cada chamada soma 1 em `wrapper.chamadas` e só então chama a função de verdade, repassando argumentos com `*a, **k`. O contador começa em 0 antes de qualquer chamada.",
  },
  "6-5": {
    code: "from dataclasses import dataclass\n\n@dataclass\nclass Missao:\n    nome: str\n    recompensa: int\n    feita: bool = False\n\ndef total_pendente(missoes: list[Missao]) -> int:\n    return sum(m.recompensa for m in missoes if not m.feita)\n",
    explain:
      "`@dataclass` gera o construtor, a comparação e a representação a partir dos campos anotados. `feita` tem padrão `False`, então `Missao(\"x\", 1)` já nasce pendente. `total_pendente` soma, numa expressão geradora, só as recompensas de quem ainda não foi feita. A anotação `-> int` documenta o retorno e é o que o teste confere.",
  },
};
