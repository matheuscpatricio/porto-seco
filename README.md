# Porto Seco

Um jogo de ação no navegador para aprender Python do zero ao avançado.

Léo é motoboy em Porto Seco, está devendo para o agiota Caveira e nunca programou. A hacker Dani recruta o Léo para derrubar a Vértice Segurança, a empresa de Augusto Vidal que controla a cidade. Ao longo de 30 missões em 6 capítulos, o jogador:

- controla o Léo em 3D, em terceira pessoa, num bairro aberto com prédios, sacadas, toldos, árvores, postes, calçada de pedra portuguesa, pedestres andando e carros circulando: anda, corre, pula, atira com a pistola de choque e derruba seguranças, drones e chefes (todos com uma seta vermelha em cima da cabeça);
- joga missões com roteiros diferentes: invasão do complexo, entrega com um contato na rua, perseguição de carro (atirando nos pneus), fuga de jet ski pelo mar, fuga a pé com alarme e confronto com o chefe na praça;
- chega ao terminal e, ao apertar E, vê o Léo digitando e mergulhando dentro do computador, num ciberespaço onde as travas do sistema são cadeados 3D;
- hackeia escrevendo Python de verdade, que roda no navegador com [Pyodide](https://pyodide.org): cada trava abre ou quebra conforme o resultado do código;
- volta para a rua: com o código certo, a missão avança; com o código errado, o alarme dispara, os pedestres correm e chegam reforços;
- termina a missão no próprio objetivo. A fuga de carro com o Tio Rui fica para a perseguição e para o confronto com o chefe.

A cidade é uma ilha só. Entre a última rua e o mar tem grama, palmeiras e uma praia. No sul, um porto com cais, pier e navios que entram e saem. Continuar a história deixa o Léo em casa, no mesmo mapa, com o dinheiro da missão. A casa, a Central da Dani e as oficinas ficam no lote, fora da pista. Em casa ele estuda o Python da próxima lição, no meio dos móveis. A Dani fica no esconderijo, na cobertura do arranha-céu do centro. Não há placa. No mapa, o prédio é o ponto azul. No saguão, E chama o elevador: uma cena mostra o Léo subindo até a cobertura. A cobertura é uma sala fechada e escura, com teto e um computador de várias telas. A Dani fica sentada no teclado. Apertar E entra na tela: ela explica um passo de cada vez e a tela mostra o exemplo do que ela está falando, da lógica de programação ao avançado. Essa aula não tira o dinheiro da missão. O pagamento some só quando, no terminal da missão, ela escreve o código no lugar dele. A moto de entrega já é dele. Na loja de motos, o dinheiro compra uma esportiva ou a noturna, mais rápidas. Na loja de armas, compra a rajada ou a pesada, que disparam mais vezes e causam mais dano. Perto da moto, E sobe; E de novo desce. Dá para pilotar na rua, na ilha e durante a missão. Depois de alguns hacks, duas viaturas saem atrás dele até o porto. Carros se empurram, e um impacto forte derruba o Léo sem falhar a missão. Numa das missões ele hackeia o portão do porto e foge de jet ski até uma boia no mar. A vida do Léo é uma barra. Atirar num pedestre chama a guarda; outro tiro sobe para a polícia especial e o terceiro para a polícia federal, cada uma com mais dano e mais vida. Nas missões mais avançadas a perseguição já começa num nível mais alto. O mar, sem o jet ski, devolve o Léo para o último ponto seguro.

Os carros param para pedestres e buzinam se o Léo ficar na frente. Tiros assustam quem está por perto.

## Capítulos

1. Quebrada: `print`, variáveis, contas, `input` e `int`
2. Centro: `if`, `elif`, `else`, `and`, `or` e `not`
3. Porto: `for`, `while` e listas
4. Desmanche: funções, dicionários, tuplas, conjuntos e recursão
5. Torre Vértice: classes, herança, métodos especiais e exceções
6. O Golpe: compreensões, `lambda`, geradores, decorators e dataclasses

## Som

A trilha é um tema tecnológico gerado no navegador, sem arquivo de áudio: baixo, arpejo, bateria eletrônica e um eco. Dentro do sistema o tema fica mais digital. O resto do som também sai da Web Audio API (`src/game/audio.ts`): ronco da cidade, motores dos carros que passam (com volume e lado de acordo com a distância), buzinas, sirenes ao longe, passarinhos de dia, cachorro à noite, passos, tiros com eco, vozes sintetizadas de pedestres conversando e dos personagens nos diálogos. O botão Som, na barra do topo, liga e desliga música e efeitos, e a escolha fica salva.

## Controles

- Teclado e mouse: clique no jogo para prender o mouse na câmera. W A S D (ou ↑ ↓) andam, ← → giram a câmera, Shift corre, espaço pula, clique ou F atira (com mira assistida), E hackeia, sobe e desce da moto ou do jet ski, estuda em casa e liga para a Dani na central. Esc solta o mouse.
- Celular: joystick virtual no lado esquerdo, arraste no lado direito para girar a câmera, e botões de pular, atirar e hackear.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra http://localhost:43123. Na primeira execução, o navegador baixa o Pyodide pela CDN, então é preciso internet.

## Estrutura

- `src/content/chapters-a.ts` e `src/content/chapters-b.ts`: roteiro, diálogos, exercícios, testes e soluções de cada missão
- `src/content/worlds.ts`: prólogo e junção dos capítulos
- `src/game3d/engine.ts`: motor 3D com Three.js (câmera em terceira pessoa, física, inimigos, pedestres, trânsito, objetivos da missão, mergulho no terminal, alarme e fuga)
- `src/game3d/missions.ts`: escolhe o roteiro de cada missão e monta a lista de objetivos
- `src/game3d/world.ts`: gerador do bairro de cada missão, com texturas geradas no navegador e o visual de cada capítulo
- `src/game3d/human.ts`: personagens 3D articulados e suas animações
- `src/game3d/cyber.ts`: o ciberespaço, a cena dentro do computador
- `src/game/characters.ts`: aparência de cada personagem; `src/game/draw.ts` desenha os retratos dos diálogos
- `src/components/game-view-3d.tsx`: tela 3D, controles, bússola e diálogos sobre o jogo
- `src/components/hack-panel.tsx`: terminal compacto onde o jogador escreve o código
- `public/pyodide-worker.js`: executa o código do jogador e testa cada trava

Numa missão, `check` é código Python executado depois do código do jogador (a variável `__out` guarda o que foi impresso). Em `display.events`, cada item é uma trava do portão: `expr` é avaliado e comparado com `expect`. Um `expect` que começa com `!` espera um erro com esse nome.
