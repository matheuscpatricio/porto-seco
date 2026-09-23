# PyQuest 🐍

Um jogo web para aprender Python do zero ao avançado. Você atravessa 6 mundos, com 30 fases e um chefe no fim de cada mundo, escrevendo código Python de verdade. O código roda no próprio navegador com [Pyodide](https://pyodide.org), então não precisa de servidor Python.

## Mundos

1. Vila das Variáveis: `print`, variáveis, operadores, `input`, conversão de tipos
2. Floresta das Condições: `if`, `elif`, `else` e lógica booleana
3. Rio dos Loops: `for`, `while`, `range` e listas
4. Montanha das Funções: parâmetros, dicionários, tuplas, sets e recursão
5. Castelo dos Objetos: classes, herança, métodos mágicos e exceções
6. Torre Avançada: compreensões, lambda, geradores, decorators, dataclasses e type hints

Cada fase tem teoria, exemplo, missão, dicas (que custam estrelas), testes automáticos e o botão **Resolver desafio**, que preenche a solução, roda os testes e explica o raciocínio. Revelar a solução conclui a fase com 1 estrela. Você ganha XP, níveis de mago, até 3 estrelas por fase, sequência de dias e conquistas. O progresso fica salvo no `localStorage`.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra http://localhost:43123. Na primeira execução o navegador baixa o Pyodide pela CDN, então é preciso internet.

## Estrutura

- `src/content/worlds.ts`: conteúdo e testes de todas as fases
- `public/pyodide-worker.js`: Web Worker que executa o código do jogador
- `src/lib/runPython.ts`: fala com o worker, aplica o tempo limite e traduz os erros
- `src/lib/progress.ts`: XP, estrelas, conquistas e salvamento
- `src/app/page.tsx`: mapa dos mundos
- `src/app/level/[id]/page.tsx`: tela da fase

Para criar uma fase nova, adicione um objeto `Level` em `worlds.ts`. O campo `check` é código Python executado depois do código do jogador; a variável `__out` contém o que foi impresso.
