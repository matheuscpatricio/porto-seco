export type CharacterId = "pytha" | "bug" | "vera" | "coruja" | "marina" | "bruno" | "rei" | "lua" | "voce";

export type Character = { name: string; avatar: string; role: string; ring: string };

export const characters: Record<CharacterId, Character> = {
  pytha: { name: "Pytha", avatar: "🐍", role: "sua mentora, uma serpente muito paciente", ring: "from-emerald-400 to-teal-600" },
  bug: { name: "Bug, o Bagunçador", avatar: "🐛", role: "o vilão que embaralhou o reino", ring: "from-rose-500 to-red-700" },
  vera: { name: "Dona Vera", avatar: "👩‍🍳", role: "padeira da Vila das Variáveis", ring: "from-amber-300 to-orange-500" },
  coruja: { name: "Dra. Coruja", avatar: "🦉", role: "guardiã da Floresta das Condições", ring: "from-lime-400 to-green-700" },
  marina: { name: "Capitã Marina", avatar: "🧜‍♀️", role: "barqueira do Rio dos Loops", ring: "from-sky-400 to-blue-700" },
  bruno: { name: "Bruno, o Ferreiro", avatar: "🧔", role: "ferreiro da Montanha das Funções", ring: "from-orange-400 to-amber-700" },
  rei: { name: "Rei Objeto III", avatar: "🤴", role: "rei do Castelo dos Objetos", ring: "from-violet-400 to-purple-800" },
  lua: { name: "Arquimaga Lua", avatar: "🧙‍♀️", role: "sábia da Torre Avançada", ring: "from-fuchsia-400 to-rose-700" },
  voce: { name: "Você", avatar: "🧑‍💻", role: "aprendiz de mago do código", ring: "from-slate-300 to-slate-600" },
};

export type Line = { who: CharacterId; text: string };

export const prologue: Line[] = [
  { who: "pytha", text: "Olá! Eu sou a Pytha. Bem-vindo a Pythonia, um reino onde tudo funciona com feitiços escritos numa língua chamada Python." },
  { who: "pytha", text: "Um feitiço aqui é só uma instrução escrita para o computador. Ele é muito obediente, mas também muito literal: faz exatamente o que você escreve, nada a mais." },
  { who: "bug", text: "Hehehe! Eu sou o Bug! Embaralhei todos os feitiços do reino. Agora nada funciona e ninguém sabe escrever Python!" },
  { who: "pytha", text: "Calma. Você nunca programou? Ótimo, é justamente para isso que eu estou aqui. Vamos aprender juntos, um passo pequeno de cada vez." },
  { who: "pytha", text: "Em cada fase eu explico a ideia, você escreve o feitiço no quadro preto e aperta \"Lançar feitiço\". Errar faz parte: o computador avisa o que houve e eu traduzo." },
  { who: "voce", text: "Tudo bem. Vamos consertar Pythonia!" },
];

export type Scene = { intro: Line[]; win: Line };

export const scenes: Record<string, Scene> = {
  "1-1": {
    intro: [
      { who: "vera", text: "Socorro! O Bug apagou a placa da minha padaria. Ninguém sabe que ela existe!" },
      { who: "pytha", text: "Vamos resolver com o feitiço mais simples de todos: `print`. Ele mostra uma mensagem na tela, como escrever numa placa." },
      { who: "pytha", text: "Você escreve `print`, abre parênteses e coloca a mensagem entre aspas: `print(\"Oi\")`. As aspas dizem ao computador: isto aqui é texto, copie igualzinho." },
      { who: "pytha", text: "Dica de ouro: o computador é exigente. Uma letra diferente, uma vírgula a mais ou um acento esquecido já muda a mensagem." },
    ],
    win: { who: "vera", text: "A placa voltou! Olha só a fila na porta. Obrigada, aprendiz!" },
  },
  "1-2": {
    intro: [
      { who: "vera", text: "Agora preciso anotar o nome e a idade do mago que encomendou 150 pães. Mas onde eu guardo isso?" },
      { who: "pytha", text: "Numa variável! Imagine uma caixa com uma etiqueta. A etiqueta é o nome da caixa, e dentro fica um valor." },
      { who: "pytha", text: "Em Python: `nome = \"Merlin\"`. Leia assim: coloque \"Merlin\" dentro da caixa chamada nome. O sinal `=` aqui significa guardar, não é igual da matemática." },
      { who: "pytha", text: "Texto vai com aspas. Número vai sem aspas: `idade = 150`. Se você colocar aspas no número, ele vira texto e não dá para fazer conta com ele." },
    ],
    win: { who: "vera", text: "Anotado e guardadinho! Nunca mais perco uma encomenda." },
  },
  "1-3": {
    intro: [
      { who: "vera", text: "Tenho 250 moedas para dividir entre 7 ajudantes goblins. Quanto fica para cada um? E quanto sobra?" },
      { who: "pytha", text: "O Python é uma calculadora poderosa. `+` soma, `-` subtrai, `*` multiplica e `/` divide." },
      { who: "pytha", text: "Mas moedas não se partem ao meio! Para isso existe `//`, a divisão inteira: `7 // 2` dá 3. E `%` dá só o que sobra: `7 % 2` dá 1." },
      { who: "pytha", text: "A caixa `moedas` já está pronta. Crie a caixa `cada` com a divisão inteira e a caixa `sobra` com o resto." },
    ],
    win: { who: "vera", text: "35 moedas para cada goblin e 5 sobrando para mim comprar farinha. Perfeito!" },
  },
  "1-4": {
    intro: [
      { who: "vera", text: "Quero cumprimentar cada cliente pelo nome. Mas eu não sei o nome antes de ele chegar..." },
      { who: "pytha", text: "`input()` resolve: ele para o feitiço e espera a pessoa digitar algo. O que ela digitar você guarda numa caixa: `nome = input()`." },
      { who: "pytha", text: "Para misturar a caixa dentro de uma frase, use uma f-string: coloque um `f` antes das aspas e o nome da caixa entre chaves: `f\"Oi, {nome}\"`." },
      { who: "pytha", text: "Neste teste, o cliente que vai chegar se chama Gandalf. O jogo digita por ele." },
    ],
    win: { who: "vera", text: "\"Salve, Gandalf!\" Ele até tirou o chapéu. Que educação a nossa!" },
  },
  "1-5": {
    intro: [
      { who: "bug", text: "Mandei meu Golem Conversor! Ele transforma todos os números em texto. Quero ver você somar agora!" },
      { who: "pytha", text: "Atenção a esta armadilha: `input()` sempre entrega texto. E texto somado com texto só gruda: `\"12\" + \"30\"` vira `\"1230\"`." },
      { who: "pytha", text: "O contra-feitiço é `int()`, que transforma texto em número inteiro: `int(\"12\")` vira o número 12." },
      { who: "pytha", text: "Leia dois números, converta cada um com `int` e mostre `A soma é` seguido do resultado. O jogo digita 12 e 30." },
    ],
    win: { who: "bug", text: "Nãããão! Meu Golem virou um monte de pedrinhas! Isso não vai ficar assim... Vou para a floresta!" },
  },
  "2-1": {
    intro: [
      { who: "coruja", text: "Huu-huu. Bem-vindo à floresta. O Bug confundiu os caminhos: ninguém sabe mais quando ir para a esquerda ou para a direita." },
      { who: "pytha", text: "Hora de ensinar o computador a tomar decisões. O feitiço é `if`, que quer dizer \"se\"." },
      { who: "pytha", text: "`if ouro >= 50:` quer dizer: se o ouro for 50 ou mais, faça o que está logo abaixo. Repare nos dois-pontos no fim e nos 4 espaços na linha de baixo: eles mostram o que pertence ao `if`." },
      { who: "pytha", text: "`else:` quer dizer \"senão\": é o caminho para quando a condição não acontece." },
    ],
    win: { who: "coruja", text: "Decisão certa! Com 80 moedas o viajante pode comprar sua lanterna." },
  },
  "2-2": {
    intro: [
      { who: "coruja", text: "Os aprendizes da floresta querem saber o seu título. Mas há três títulos, não dois!" },
      { who: "pytha", text: "Para mais de dois caminhos existe `elif`, que é um \"senão, se\". O Python testa de cima para baixo e para no primeiro que der certo." },
      { who: "pytha", text: "Aqui você vai escrever uma função: uma receita com nome. `def classe(xp):` cria a receita chamada classe, que recebe o valor xp." },
      { who: "pytha", text: "Dentro dela, `return` entrega a resposta de volta. Menos de 100 é Aprendiz, menos de 500 é Mago e o resto é Arquimago." },
    ],
    win: { who: "coruja", text: "Cada um com seu título. A ordem das perguntas fez toda a diferença, huu!" },
  },
  "2-3": {
    intro: [
      { who: "coruja", text: "Na festa da clareira só entra quem é maior de idade e tem convite. Ah, e os mais velhos, acima de 60, entram sempre!" },
      { who: "pytha", text: "Às vezes uma pergunta tem duas partes. `and` quer dizer \"e\": as duas coisas precisam ser verdade." },
      { who: "pytha", text: "`or` quer dizer \"ou\": basta uma ser verdade. E `not` inverte: vira verdadeiro o que era falso." },
      { who: "pytha", text: "Os parênteses agrupam, como na matemática: `(idade >= 18 and tem_convite) or idade >= 60`." },
    ],
    win: { who: "coruja", text: "A festa está animada e sem penetras! Excelente lógica." },
  },
  "2-4": {
    intro: [
      { who: "coruja", text: "Alguns visitantes chegam sem dizer o nome. Como cumprimentar alguém assim?" },
      { who: "pytha", text: "Um segredo do Python: coisas vazias contam como falso. Um texto vazio `\"\"`, o número `0` e uma lista vazia `[]` são falsos." },
      { who: "pytha", text: "Então `if not nome:` quer dizer: se não tem nome. Nesse caso responda \"Olá, estranho\". Se tiver, use a f-string." },
    ],
    win: { who: "coruja", text: "Todo mundo foi bem recebido, até os tímidos!" },
  },
  "2-5": {
    intro: [
      { who: "bug", text: "Esta é a minha Esfinge! Ela só deixa passar quem responder ao enigma FizzBuzz!" },
      { who: "pytha", text: "O enigma: para um número, diga Fizz se ele é divisível por 3, Buzz se por 5 e FizzBuzz se por ambos. Senão, diga o próprio número." },
      { who: "pytha", text: "Divisível quer dizer que a divisão não deixa resto. Lembra do `%`? `9 % 3 == 0` é verdade. Os dois sinais `==` servem para comparar." },
      { who: "pytha", text: "Cuidado com a ordem: 15 é divisível por 3 também. Pergunte primeiro o caso mais específico." },
    ],
    win: { who: "bug", text: "A Esfinge... está rindo do enigma resolvido?! Traidora! Vou me esconder no rio!" },
  },
  "3-1": {
    intro: [
      { who: "marina", text: "Ahoy! Meu barco só zarpa depois da contagem regressiva, mas o Bug roubou minha voz de tanto contar!" },
      { who: "pytha", text: "Repetir coisas é o trabalho favorito do computador. O feitiço `for` repete um bloco para cada item de uma sequência." },
      { who: "pytha", text: "`range(10, 0, -1)` cria a sequência 10, 9, 8... até 1. São três números: onde começa, onde para (sem incluir) e o tamanho do passo. O -1 anda para trás." },
      { who: "pytha", text: "`for i in range(...):` coloca cada número na caixa `i`, um de cada vez. Depois que o laço acabar, fora dele, mostre \"Decolar!\"." },
    ],
    win: { who: "marina", text: "10, 9, 8... Decolar! Iça as velas, marujo!" },
  },
  "3-2": {
    intro: [
      { who: "marina", text: "Antes de viajar, arrume a mochila. Precisamos de poção, mapa e uma chave." },
      { who: "pytha", text: "Uma lista guarda várias coisas numa caixa só, em ordem: `[\"poção\", \"mapa\"]`, com colchetes e vírgulas." },
      { who: "pytha", text: "`mochila.append(\"chave\")` coloca mais um item no fim. E `len(mochila)` conta quantos itens tem." },
    ],
    win: { who: "marina", text: "Mochila pronta e contada. Um bom marujo nunca esquece a chave!" },
  },
  "3-3": {
    intro: [
      { who: "marina", text: "Pescamos números no rio. Os números pares valem ouro! Quanto ouro temos?" },
      { who: "pytha", text: "Vamos juntar os pares numa conta. Comece com uma caixa `total = 0`, como um cofrinho vazio." },
      { who: "pytha", text: "Percorra a lista com `for n in nums:`. Se `n % 2 == 0`, o número é par, e você soma no cofrinho com `total += n`." },
      { who: "pytha", text: "No fim, fora do laço, `return total` entrega o cofrinho." },
    ],
    win: { who: "marina", text: "Que tesouro! Sabia que você tinha jeito para contar ouro." },
  },
  "3-4": {
    intro: [
      { who: "marina", text: "Uma alga mágica dobra de tamanho a cada hora. Quantas horas até ela passar de um certo tamanho?" },
      { who: "pytha", text: "Quando você não sabe quantas vezes vai repetir, use `while`, que quer dizer \"enquanto\". Ele repete enquanto a condição for verdade." },
      { who: "pytha", text: "Comece com valor 1 e contador 0. Enquanto o valor não passou do limite, dobre o valor e some 1 no contador." },
      { who: "pytha", text: "Cuidado: se a condição nunca ficar falsa, o laço gira para sempre. O jogo interrompe depois de alguns segundos, fique tranquilo." },
    ],
    win: { who: "marina", text: "Sete horas para passar de 100! Agora sei quando podar essa alga." },
  },
  "3-5": {
    intro: [
      { who: "bug", text: "Minha Serpente do Maior escondeu o maior número da lista. E eu quebrei o feitiço `max`! Hehe!" },
      { who: "pytha", text: "Sem `max`, vamos fazer do jeito antigo, como você faria com cartas na mão: segure a primeira carta como a maior até agora." },
      { who: "pytha", text: "Olhe cada carta. Se ela for maior que a que você segura, troque. No fim, a carta na mão é a maior." },
      { who: "pytha", text: "E se a lista estiver vazia? Não tem carta nenhuma, então devolva `None`, que em Python quer dizer \"nada\"." },
    ],
    win: { who: "bug", text: "Até sem max você achou! Grrr. Vou subir a montanha, lá ninguém me alcança!" },
  },
  "4-1": {
    intro: [
      { who: "bruno", text: "Na minha forja faço espadas. Um golpe normal causa dano normal, mas um golpe crítico causa o dobro!" },
      { who: "pytha", text: "Funções podem ter valores padrão. Em `def dano(base, critico=False):`, se ninguém falar do crítico, ele vale False, ou seja, não." },
      { who: "pytha", text: "`True` quer dizer sim e `False` quer dizer não. Se crítico for True, devolva o dobro; senão, a base." },
    ],
    win: { who: "bruno", text: "Clang! A espada bate forte quando precisa. Bela forja!" },
  },
  "4-2": {
    intro: [
      { who: "bruno", text: "Preciso saber quantas vezes cada letra aparece nas runas das minhas espadas." },
      { who: "pytha", text: "Para isso usamos um dicionário: como uma agenda, onde cada nome aponta para uma informação. `{\"a\": 2}` diz que a letra a aparece 2 vezes." },
      { who: "pytha", text: "`cont.get(c, 0)` pergunta quantas vezes a letra já apareceu, e responde 0 se for a primeira. Some 1 e guarde de novo." },
      { who: "pytha", text: "Os espaços não são letras: pule-os com `continue`, que salta para a próxima volta do laço." },
    ],
    win: { who: "bruno", text: "Runas contadas! Agora sei quanta tinta de cada cor comprar." },
  },
  "4-3": {
    intro: [
      { who: "bruno", text: "Quero saber a espada mais leve e a mais pesada de uma vez só." },
      { who: "pytha", text: "Uma função pode devolver duas coisas juntas numa tupla: `return a, b`. Tupla é uma listinha que não pode ser mudada." },
      { who: "pytha", text: "`min` acha o menor e `max` acha o maior. Junte os dois no return." },
    ],
    win: { who: "bruno", text: "Leve e pesada num golpe só. Você aprende rápido, aprendiz!" },
  },
  "4-4": {
    intro: [
      { who: "bruno", text: "Dois ferreiros fizeram listas de materiais, com repetições. Quais materiais os dois usam?" },
      { who: "pytha", text: "Um conjunto, `set`, é um saco onde nada se repete. `set([1, 1, 2])` vira `{1, 2}`." },
      { who: "pytha", text: "O sinal `&` pega o que está nos dois conjuntos ao mesmo tempo. E `sorted` devolve tudo em ordem, numa lista." },
    ],
    win: { who: "bruno", text: "Materiais em comum encontrados. Vamos dividir as compras!" },
  },
  "4-5": {
    intro: [
      { who: "bug", text: "O Titã Recursivo guarda o topo da montanha! Ele só fala em Fibonacci. Boa sorte, hahaha!" },
      { who: "pytha", text: "Fibonacci é uma sequência: 0, 1, 1, 2, 3, 5, 8... Cada número é a soma dos dois anteriores." },
      { who: "pytha", text: "Recursão é quando uma função chama ela mesma, como bonecas russas: cada uma tem uma menor dentro, até a menorzinha." },
      { who: "pytha", text: "A menorzinha é o caso base: se n for 0 ou 1, devolva o próprio n. Senão, devolva `fib(n - 1) + fib(n - 2)`." },
    ],
    win: { who: "bug", text: "O Titã caiu... de tanto calcular! Vou me trancar no castelo. Lá tem até muralha!" },
  },
  "5-1": {
    intro: [
      { who: "rei", text: "Bem-vindo ao meu castelo! Preciso de heróis, mas não sei como fabricá-los." },
      { who: "pytha", text: "Uma classe é uma forma de biscoito. Com uma forma você faz quantos biscoitos quiser, e cada biscoito é um objeto." },
      { who: "pytha", text: "`__init__` é o que acontece quando um herói nasce: guardamos nome e vida dentro dele usando `self`, que quer dizer \"o próprio herói\"." },
      { who: "pytha", text: "Crie também o método `sofrer`, uma ação do herói. A vida diminui, mas nunca fica abaixo de zero: `max(0, ...)` garante isso." },
    ],
    win: { who: "rei", text: "Um herói de verdade! Ele até aguenta um dragão sem ficar com vida negativa." },
  },
  "5-2": {
    intro: [
      { who: "rei", text: "Todo personagem ataca, mas os magos atacam com o dobro da força. Como fazer isso sem copiar tudo?" },
      { who: "pytha", text: "Herança! Um filho herda as coisas do pai. `class Mago(Personagem):` quer dizer: o Mago é um Personagem, e já nasce sabendo tudo que ele sabe." },
      { who: "pytha", text: "Dentro do Mago você pode reescrever `atacar`. E `super().atacar()` chama a versão do pai. É só multiplicar por 2." },
    ],
    win: { who: "rei", text: "Os magos estão fortíssimos! E a família continua unida." },
  },
  "5-3": {
    intro: [
      { who: "rei", text: "Meus engenheiros querem somar direções com o sinal de mais. Um vetor mais outro vetor..." },
      { who: "pytha", text: "Por trás de cada sinal existe um método especial, com dois tracinhos de cada lado. `+` chama `__add__`, `==` chama `__eq__`." },
      { who: "pytha", text: "E `__str__` decide o que aparece quando você dá print no objeto. Ensine o Vetor a fazer as três coisas." },
    ],
    win: { who: "rei", text: "Vetores somando como mágica! Mandarei construir uma estátua sua." },
  },
  "5-4": {
    intro: [
      { who: "rei", text: "O tesouro real tem armadilhas. Se alguém tentar sacar mais do que tem, algo precisa avisar!" },
      { who: "pytha", text: "Erros em Python se chamam exceções. Com `try:` você tenta algo arriscado; com `except:` você diz o que fazer se der errado." },
      { who: "pytha", text: "Dividir por zero é impossível e gera `ZeroDivisionError`. Capture esse erro e devolva `None`." },
      { who: "pytha", text: "Você também pode criar um alarme de propósito com `raise ValueError(...)`, quando alguém tenta sacar demais." },
    ],
    win: { who: "rei", text: "Nenhuma moeda sumiu e nenhuma armadilha disparou à toa. Tesouro seguro!" },
  },
  "5-5": {
    intro: [
      { who: "bug", text: "Roubei o inventário do Rei! Para recuperar, você vai ter que construir um inventário melhor que o meu!" },
      { who: "pytha", text: "Hora de juntar tudo: uma classe `Inventario` com um dicionário por dentro, que liga cada item à sua quantidade." },
      { who: "pytha", text: "Adicionar soma na quantidade. Remover confere antes e, se não houver o bastante, lança o alarme `ItemFaltando`." },
      { who: "pytha", text: "E `__len__` ensina o `len()` a contar todas as unidades, somando os valores do dicionário." },
    ],
    win: { who: "bug", text: "Até meu inventário perdeu para o seu! Última chance: a Torre! Ninguém chega ao topo!" },
  },
  "6-1": {
    intro: [
      { who: "lua", text: "Chegou à Torre, aprendiz. Aqui os feitiços são curtos e elegantes." },
      { who: "pytha", text: "Uma compreensão de lista cria uma lista numa linha só. Lê-se quase como português: `[n ** 2 for n in nums if n % 2]`." },
      { who: "pytha", text: "Ou seja: o quadrado de n, para cada n em nums, se n for ímpar. `**` é potência, e `n % 2` diferente de zero quer dizer ímpar." },
    ],
    win: { who: "lua", text: "Uma linha só! Elegante como um feitiço antigo." },
  },
  "6-2": {
    intro: [
      { who: "lua", text: "Quero ordenar os heróis do mais forte ao mais fraco, e mostrar só os nomes." },
      { who: "pytha", text: "`lambda` é uma mini função sem nome, escrita na hora: `lambda h: h[1]` recebe um herói e devolve o poder dele, que está na posição 1." },
      { who: "pytha", text: "`sorted(herois, key=..., reverse=True)` ordena usando esse critério, do maior para o menor. Depois pegue só os nomes com uma compreensão." },
    ],
    win: { who: "lua", text: "O ranking dos heróis está perfeito. O mais forte no topo!" },
  },
  "6-3": {
    intro: [
      { who: "lua", text: "Preciso de uma fonte infinita de energia: 1, 2, 4, 8... para sempre." },
      { who: "pytha", text: "Uma lista infinita não cabe na memória. Mas um gerador sim! Ele entrega um valor por vez, só quando pedirem." },
      { who: "pytha", text: "Troque `return` por `yield`: a função entrega o valor, pausa e continua dali quando pedirem o próximo." },
    ],
    win: { who: "lua", text: "Energia sem fim e sem ocupar espaço. A torre brilha de novo!" },
  },
  "6-4": {
    intro: [
      { who: "lua", text: "Quero saber quantas vezes cada feitiço foi lançado, sem mudar o feitiço em si." },
      { who: "pytha", text: "Um decorator é um embrulho de presente: você embrulha uma função com outra, que faz algo a mais antes de chamar a original." },
      { who: "pytha", text: "O `@contar_chamadas` em cima do `def` embrulha a função. O embrulho conta mais 1 e depois chama a função de verdade." },
    ],
    win: { who: "lua", text: "Cada feitiço agora tem seu contador. Você pensa como uma arquimaga!" },
  },
  "6-5": {
    intro: [
      { who: "bug", text: "Chegou ao topo?! Tudo bem... meu último truque: o Arquiteto do Caos. Ele esconde missões por todo o reino!" },
      { who: "pytha", text: "Última lição: `@dataclass` cria uma classe de dados sem precisar escrever o `__init__`. Você só lista os campos e seus tipos." },
      { who: "pytha", text: "`nome: str` quer dizer que nome é texto; `recompensa: int` é um número. `feita: bool = False` começa como não feita." },
      { who: "pytha", text: "Depois, some as recompensas das missões que ainda não foram feitas, e anote que a função devolve um número com `-> int`." },
    ],
    win: { who: "bug", text: "Tá bom, tá bom, você venceu! Pythonia está consertada... Será que... você me ensina Python também?" },
  },
};

export const cheers = [
  "Isso aí!",
  "Mandou muito bem!",
  "Feitiço perfeito!",
  "Pythonia agradece!",
];

export const oops = [
  "Quase lá! Errar é o jeito como programadores aprendem.",
  "Sem problema, até magos experientes erram. Vamos ver o que aconteceu.",
  "Respira, lê a mensagem com calma e tenta de novo. Você consegue.",
];
