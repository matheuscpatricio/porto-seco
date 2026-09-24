# Porto Seco

**A browser-based 3D action game that teaches Python through gameplay.**

Porto Seco was built as a learning project to combine programming fundamentals with a more immersive way of practicing Python. Instead of completing isolated exercises, the player moves through a story-driven 3D world and uses real Python code to progress through missions.

The game follows **Léo**, a delivery rider in Porto Seco who gets pulled into a conflict involving hacker **Dani** and the security company **Vértice Segurança**. Across 30 missions and 6 chapters, the player alternates between action sequences and Python challenges that run directly in the browser.

## What the player does

- explores a 3D neighborhood in third person;
- runs, jumps, shoots, avoids enemies and completes mission objectives;
- enters terminals and transitions into a cyberspace environment;
- writes real Python code to unlock systems;
- receives immediate in-game consequences when code succeeds or fails;
- progresses from beginner syntax to more advanced Python concepts.

Python runs in the browser with [Pyodide](https://pyodide.org), so exercises are executed and validated locally without requiring a separate Python backend.

## Python curriculum

The game is structured into six chapters:

1. **Quebrada** — `print`, variables, arithmetic, `input`, `int`
2. **Centro** — `if`, `elif`, `else`, `and`, `or`, `not`
3. **Porto** — `for`, `while`, lists
4. **Desmanche** — functions, dictionaries, tuples, sets, recursion
5. **Torre Vértice** — classes, inheritance, special methods, exceptions
6. **O Golpe** — comprehensions, `lambda`, generators, decorators, dataclasses

The goal is to make each new concept part of the mission flow instead of presenting it as a disconnected exercise.

## Tech stack

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Three.js**
- **Pyodide**
- **CodeMirror**
- **Tailwind CSS**
- **Web Audio API**

## Architecture

The project separates game logic, world generation, lesson content and Python execution:

- `src/content/chapters-a.ts` and `src/content/chapters-b.ts` — missions, dialogue, exercises, tests and solutions
- `src/content/worlds.ts` — prologue and chapter composition
- `src/game3d/engine.ts` — main 3D engine, camera, movement, physics, enemies, traffic, objectives and mission state
- `src/game3d/missions.ts` — mission scripting and objective setup
- `src/game3d/world.ts` — procedural world generation and chapter visuals
- `src/game3d/human.ts` — articulated 3D characters and animation
- `src/game3d/cyber.ts` — cyberspace environment
- `src/game/characters.ts` — character appearance
- `src/game/draw.ts` — dialogue portraits
- `src/components/game-view-3d.tsx` — 3D viewport, controls, compass and dialogue UI
- `src/components/hack-panel.tsx` — embedded Python coding terminal
- `public/pyodide-worker.js` — executes and validates player-written Python

## Python challenge system

Each hacking challenge evaluates real Python written by the player.

A mission can define validation code through `check`, while `display.events` represents the locks that must be opened. Each `expr` is evaluated and compared against its expected result. Expected values beginning with `!` represent expected Python exceptions.

This allows the game to test not only printed output, but also values, behavior and error handling.

## World and interaction

The game includes:

- third-person movement;
- open neighborhood environments;
- pedestrians and traffic;
- enemy guards, drones and bosses;
- mission-specific sequences such as chases, escorts and escapes;
- contextual reactions to gunfire and player behavior;
- keyboard, mouse and mobile controls.

Vehicles react to pedestrians, pedestrians react to danger, and failed hacking attempts can trigger alarms and reinforcements.

## Audio

The project does not use pre-recorded music.

Sound is generated in the browser with the Web Audio API, including:

- ambient city noise;
- vehicle engines;
- horns;
- distant sirens;
- birds and dogs;
- footsteps;
- weapon sounds and echoes;
- synthesized pedestrian and character voices.

Audio can be enabled or disabled in the game UI, and the preference is persisted.

## Running locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:43123
```

The first run requires an internet connection so the browser can load Pyodide from its CDN.

## Why I built it

I built Porto Seco as a practical way to learn and reinforce Python while working on a project with real product and engineering constraints.

The project gave me a reason to work with:

- state management;
- game loops and interaction logic;
- 3D rendering;
- browser-based Python execution;
- validation systems;
- modular architecture;
- real-time user feedback;
- progressively harder programming concepts.

The main idea was simple: **make learning Python feel less like solving worksheets and more like progressing through a game.**
