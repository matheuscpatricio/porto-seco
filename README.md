# Porto Seco

Um jogo de ação no navegador para aprender Python do zero ao avançado.

Léo é motoboy em Porto Seco, está devendo para o agiota Caveira e nunca programou. A hacker Dani recruta o Léo para derrubar a Vértice Segurança, a empresa de Augusto Vidal que controla a cidade. Ao longo de 30 missões em 6 capítulos, o jogador:

- controla o Léo em 3D, em terceira pessoa, num bairro aberto com prédios, sacadas, toldos, árvores, postes, calçada de pedra portuguesa, pedestres andando e carros circulando: anda, corre, pula, atira com a pistola de choque e derruba seguranças, drones e chefes (todos com uma seta vermelha em cima da cabeça);
- joga missões com roteiros diferentes: invasão do complexo, entrega com um contato na rua, perseguição de carro (atirando nos pneus), escolta da Dani, fuga a pé com alarme e confronto com o chefe na praça;
- chega ao terminal e, ao apertar E, vê o Léo digitando e mergulhando dentro do computador, num ciberespaço onde as travas do sistema são cadeados 3D;
- hackeia escrevendo Python de verdade, que roda no navegador com [Pyodide](https://pyodide.org): cada trava abre ou quebra conforme o resultado do código;
- volta para a rua: com o código certo, a missão avança; com o código errado, o alarme dispara, os pedestres correm e chegam reforços;
- termina a missão no próprio objetivo. A fuga de carro com o Tio Rui fica para a perseguição e para o confronto com o chefe.

A cidade é uma ilha só. Continuar a história deixa o Léo em casa, no mesmo mapa, com o dinheiro da missão. Em casa ele estuda o Python da próxima lição. Na oficina, com 500, compra a moto e pilota a rua entre uma missão e outra. Atirar num pedestre chama a polícia. O mar devolve o Léo para o último ponto seguro.

Os carros param para pedestres e buzinam se o Léo ficar na frente. Tiros assustam quem está por perto.

## Capítulos

1. Quebrada: `print`, variáveis, contas, `input` e `int`
2. Centro: `if`, `elif`, `else`, `and`, `or` e `not`
3. Porto: `for`, `while` e listas
4. Desmanche: funções, dicionários, tuplas, conjuntos e recursão
5. Torre Vértice: classes, herança, métodos especiais e exceções
6. O Golpe: compreensões, `lambda`, geradores, decorators e dataclasses

## Som

Não há música. Todo o som é gerado no navegador com a Web Audio API (`src/game/audio.ts`), sem arquivos de áudio: ronco da cidade, motores dos carros que passam (com volume e lado de acordo com a distância), buzinas, sirenes ao longe, passarinhos de dia, cachorro à noite, passos, tiros com eco, vozes sintetizadas de pedestres conversando e dos personagens nos diálogos. O botão Som, na barra do topo, liga e desliga tudo, e a escolha fica salva.

## Controles

- Teclado e mouse: clique no jogo para prender o mouse na câmera. W A S D (ou ↑ ↓) andam, ← → giram a câmera, Shift corre, espaço pula, clique ou F atira (com mira assistida), E hackeia e Esc solta o mouse.
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
