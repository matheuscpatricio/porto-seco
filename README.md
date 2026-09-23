# Porto Seco

Um jogo de ação no navegador para aprender Python do zero ao avançado.

Léo é motoboy em Porto Seco, está devendo para o agiota Caveira e nunca programou. A hacker Dani recruta o Léo para derrubar a Vértice Segurança, a empresa de Augusto Vidal que controla a cidade. Ao longo de 30 missões em 6 capítulos, o jogador:

- controla o Léo num jogo de plataforma em 2D: corre, pula, atira com a pistola de choque e derruba seguranças, drones e chefes;
- chega a um terminal e hackeia escrevendo Python de verdade, que roda no navegador com [Pyodide](https://pyodide.org);
- vê o resultado no jogo: com o código certo, as travas acendem e o portão abre; com o código errado, o alarme dispara e chegam reforços;
- foge no carro do Tio Rui no fim de cada missão.

## Capítulos

1. Quebrada: `print`, variáveis, contas, `input` e `int`
2. Centro: `if`, `elif`, `else`, `and`, `or` e `not`
3. Porto: `for`, `while` e listas
4. Desmanche: funções, dicionários, tuplas, conjuntos e recursão
5. Torre Vértice: classes, herança, métodos especiais e exceções
6. O Golpe: compreensões, `lambda`, geradores, decorators e dataclasses

## Controles

- Teclado: ← → ou A D para andar, ↑, W ou espaço para pular, F ou J para atirar, E para hackear.
- Celular: botões na tela.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra http://localhost:43123. Na primeira execução, o navegador baixa o Pyodide pela CDN, então é preciso internet.

## Estrutura

- `src/content/chapters-a.ts` e `src/content/chapters-b.ts`: roteiro, diálogos, exercícios, testes e soluções de cada missão
- `src/content/worlds.ts`: prólogo e junção dos capítulos
- `src/game/engine.ts`: motor do jogo (física, inimigos, terminal, portão, alarme e fuga)
- `src/game/draw.ts` e `src/game/characters.ts`: personagens de corpo inteiro desenhados no canvas e suas animações
- `src/components/game-view.tsx`: canvas, controles e diálogos sobre o jogo
- `src/components/hack-panel.tsx`: terminal compacto onde o jogador escreve o código
- `public/pyodide-worker.js`: executa o código do jogador e testa cada trava

Numa missão, `check` é código Python executado depois do código do jogador (a variável `__out` guarda o que foi impresso). Em `display.events`, cada item é uma trava do portão: `expr` é avaliado e comparado com `expect`. Um `expect` que começa com `!` espera um erro com esse nome.
