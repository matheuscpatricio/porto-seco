# Porto Seco

Um jogo de ação no navegador para aprender Python do zero ao avançado.

Cole é motoboy em Porto Seco, está devendo para o agiota Kane e nunca programou. A hacker Maya recruta o Cole para derrubar a Vértice Segurança, a empresa de Victor Hale que controla a cidade. Ao longo de 30 missões em 6 capítulos, o jogador:

- controla o Cole em 3D, em terceira pessoa, num bairro aberto com prédios, sacadas, toldos, árvores, postes, calçada de pedra portuguesa, pedestres andando e carros circulando: anda, corre, pula, atira com a pistola de choque e derruba seguranças, drones e chefes (todos com uma seta vermelha em cima da cabeça);
- joga missões com roteiros diferentes: invasão do complexo, entrega com um contato na rua, perseguição de carro (atirando nos pneus), fuga de jet ski pelo mar, fuga a pé com alarme e confronto com o chefe na praça;
- chega ao terminal e, ao apertar E, vê o Cole digitando e mergulhando dentro do computador, num ciberespaço onde as travas do sistema são cadeados 3D;
- hackeia escrevendo Python de verdade, que roda no navegador com [Pyodide](https://pyodide.org): cada trava abre ou quebra conforme o resultado do código;
- volta para a rua: com o código certo, a missão avança; com o código errado, o alarme dispara, os pedestres correm e chegam reforços;
- termina a missão no próprio objetivo. A fuga de carro com o Hank fica para a perseguição e para o confronto com o chefe.

A ilha fica sempre de noite: céu lilás escuro, lua e estrelas, com a cidade acesa pelas janelas azuis, as faixas de LED e os postes. O chão da ilha é foto de verdade: asfalto, calçada de concreto, reboco nas paredes, telha, areia e grama, com relevo. A Maya continua com a malha da ajudante. O Cole, os pedestres, a polícia, os capangas e os chefes usam o mesmo soldado: a armadura muda de cor (vermelha, cinza, azul e dourada) e o chefe é maior. Os carros passam de 200 mil triângulos. A moto é uma malha real, com textura, no mesmo nível dos carros. A cidade é uma ilha só, maior e mais densa, com a costa torta: enseadas e pontas, praia e grama entre a rua e o mar. Os prédios levam faixas de LED por fora e painéis eletrônicos que trocam de anúncio e de letra (serifada, manuscrita, cartaz), além das janelas acesas. No centro, em volta da torre da Maya, os lotes viram arranha-céus. As lojas têm placa desenhada: armas, motos, porto, café, banco. Cada carro, parado ou andando, leva um motorista sentado. Pedestres se desviam uns dos outros, e os carros tentam passar em vez de empilhar. Os navios têm casco sólido. Coqueiros, árvores e arbustos têm tronco, folha e volume. O jet ski é um casco de verdade, com banco, guidão e bocal, e o motor da moto e do jet ski soam enquanto se pilota. Um tiro arranca um grito de dor. Dá para entrar na água até ela cobrir o Cole. Passou da altura dele, andando, um tubarão ataca. O jet ski fica no cais e anda no mar; em cima dele o tubarão não morde. No sul, um porto com cais, pier e navios que entram e saem. Continuar a história deixa o Cole em casa, no mesmo mapa, com o dinheiro da missão. A casa, a Central da Maya e as oficinas ficam no lote, fora da pista. Em casa ele estuda o Python da próxima lição, no meio dos móveis. A Maya fica no esconderijo, na cobertura do arranha-céu do centro. Não há placa. No mapa, o prédio é o ponto azul. No saguão, E chama o elevador: uma cena mostra o Cole subindo até a cobertura. A cobertura é uma sala fechada e escura, com teto e um computador de várias telas. A Maya fica sentada no teclado. Apertar E entra na tela: ela explica um passo de cada vez e a tela mostra o exemplo do que ela está falando, da lógica de programação ao avançado. Essa aula não tira o dinheiro da missão. O pagamento some só quando, no terminal da missão, ela escreve o código no lugar dele. A moto de entrega já é dele. Na loja de motos, o dinheiro compra uma esportiva ou a noturna, mais rápidas. Na loja de armas, compra a rajada ou a pesada, que disparam mais vezes e causam mais dano. Perto da moto, E sobe; E de novo desce. Dá para pilotar na rua, na ilha e durante a missão. Depois de alguns hacks, duas viaturas saem atrás dele até o porto. Carros se empurram, e um impacto forte derruba o Cole sem falhar a missão. Numa das missões ele hackeia o portão do porto e foge de jet ski até uma boia no mar. A vida do Cole é uma barra. A cidade tem mais pedestres. Um tiro os assusta; só a morte chama a polícia, e a pessoa surge de novo em outra rua. Os capangas do Kane atacam o Cole assim que o veem. A polícia de patrulha só atira se ele hackeou o sistema ou matou alguém. Conforme as missões avançam, aumentam os policiais especiais e federais nas ruas. Matar um pedestre ainda escala da guarda para a especial e a federal, cada uma com mais dano e mais vida. Nas missões mais avançadas a perseguição de carro já começa num nível mais alto.

Os carros reduzem para pedestres e buzinam se o Cole ficar na frente. Perto de outro carro, desviam para o lado. Tiros assustam quem está por perto e o atingido grita.

## Capítulos

1. Quebrada: `print`, variáveis, contas, `input` e `int`
2. Centro: `if`, `elif`, `else`, `and`, `or` e `not`
3. Porto: `for`, `while` e listas
4. Desmanche: funções, dicionários, tuplas, conjuntos e recursão
5. Torre Vértice: classes, herança, métodos especiais e exceções
6. O Golpe: compreensões, `lambda`, geradores, decorators e dataclasses

## Som

A trilha é um tema tecnológico pesado, em tom menor, gerado no navegador, sem arquivo de áudio: baixo distorcido, bumbo grave, palmas e um eco. Dentro do sistema o tema fica mais digital. O resto do som também sai da Web Audio API (`src/game/audio.ts`): ronco da cidade, motores dos carros que passam (com volume e lado de acordo com a distância), buzinas, sirenes ao longe, passarinhos de dia, cachorro à noite, passos, tiros com eco, vozes sintetizadas de pedestres conversando e dos personagens nos diálogos. O botão Som, na barra do topo, liga e desliga música e efeitos, e a escolha fica salva.

## Controles

- Teclado e mouse: clique no jogo para prender o mouse na câmera. W A S D (ou ↑ ↓) andam, ← → giram a câmera, Shift corre, espaço pula, clique ou F atira (com mira assistida), E hackeia, sobe e desce da moto ou do jet ski, estuda em casa e liga para a Maya na central. Esc solta o mouse.
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
- `src/game3d/world.ts`: gerador do bairro. O chão usa fotos reais (asfalto, areia, grama, concreto, reboco e telha) com relevo. Os carros são uma malha de conceito com cerca de 213 mil triângulos
- `src/game3d/human.ts` e `src/game3d/cast.ts`: a Maya usa a Michelle, de pé. Todo o resto usa o Soldier, com o rosto da foto e a armadura recolorida por papel. Os chefes são o mesmo soldado, maiores
- `src/game3d/vehicles.ts`: o carro escaneado, sem a placa e sem o emblema do volante, e a moto com textura

## Créditos das malhas e fotos

- Texturas de asfalto, areia, grama, reboco, telha e concreto: [Poly Haven](https://polyhaven.com), CC0.
- Personagens Xbot, Michelle e Soldier: modelos Mixamo redistribuídos com o three.js. Podem entrar no jogo; não são uma biblioteca avulsa de personagens.
- Carro: [Car Concept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept), Khronos glTF Sample Assets, CC-BY-4.0. A placa e o emblema do volante ficam ocultos.
- Moto: [motorcycle](https://sketchfab.com/3d-models/motorcycle-d3077af5fcf8464c884c6c1d611ff69b), Chenchanchong, CC-BY-4.0. Cerca de 95 mil triângulos.
- `src/game3d/cyber.ts`: o ciberespaço, a cena dentro do computador
- `src/game/characters.ts`: aparência de cada personagem; `src/game/draw.ts` desenha os retratos dos diálogos
- `src/components/game-view-3d.tsx`: tela 3D, controles, bússola e diálogos sobre o jogo
- `src/components/hack-panel.tsx`: terminal compacto onde o jogador escreve o código
- `public/pyodide-worker.js`: executa o código do jogador e testa cada trava

Numa missão, `check` é código Python executado depois do código do jogador (a variável `__out` guarda o que foi impresso). Em `display.events`, cada item é uma trava do portão: `expr` é avaliado e comparado com `expect`. Um `expect` que começa com `!` espera um erro com esse nome.
