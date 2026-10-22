# Kubotz — web version

A browser port of Kubotz (originally a LibGDX game; its Java code lives on
the `AI2` and `master` branches), written with [Phaser 3](https://phaser.io),
TypeScript and Vite. It reuses the original assets, now in `public/`: the
Spriter animation (`kubotz.scml`), the Tiled map (`debug-map.tmx`), the HUD art
and the particles.

See [PLAN.md](PLAN.md) for the port plan, what maps to what, and the known
differences from the original.

## Run it

Requires Node.js 18+ (20+ recommended).

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Production build (static files in `web/dist`, host them anywhere):

```bash
npm run build
npm run preview    # serves dist/ on http://localhost:4173
```

## Dev tools

In a dev build (`npm run dev`, or `npm run build:editor` into dist-editor/):

- **Title → Editor**: the animation and particle editor (poses, keys, hit
  circles, active frames, launches, particle events; particle effects).
- **In a match, F2** (or the DEV button): the dev HUD over the running
  match: pause, step and slow motion; physics bodies, hit and hurt boxes,
  AI paths and Kubot states; and the arena tools (move, resize and add
  walls, platforms, portals, spawns, bonus spots, particle emitters, lights
  and NPCs: hostile CPUs of the map, black team, Attack, Flee or Idle; the
  arena's background and music). Each change rebuilds the match there; Save
  keeps it in the browser, Export writes the arena's file.

`npm run editor` opens the same editor on a page of its own (editor.html).
Save writes the changed files in `src/data` (clips, moves, particles,
arenas). `npm run build` (production) leaves all of this out.

## Play

Pick a mode on the title screen (mouse, arrows + Enter, or keys 1-5).

| Action                       | Player 1          | Player 2                 |
|------------------------------|-------------------|--------------------------|
| Run left / right             | A / D             | ← / →                    |
| Jump (hold for up to 3 jumps)| W                 | ↑                        |
| Fast fall                    | S                 | ↓                        |
| Attack (punch / shoot / slash)| O (or J)         | Numpad 1 (or ,)          |
| Grab power-up                | I (or K)          | Numpad 2 (or .)          |
| Guard bubble (hold)          | Left Shift (or L) | Numpad 0 or 3 (or /)    |
| Pause                        | Esc / P           | Esc / P                  |

Gamepads: stick/D-pad to move, A jump, X attack, B grab, Y, L1 or R1 guard,
Start pause. The first pad drives P1, the second P2.

Each Kubot has 5 lives. Power-ups drop at the four bonus spots every 5–10
seconds; walk up to one and press Grab. Falling out of the arena costs a life;
the side openings warp you across. Last Kubot standing wins.

## Layout

```
web/
  src/main.ts              Phaser game config
  src/data/                clips, moves, particle effects and arenas (JSON, one file each, written by the editor)
  src/editor/              the editor (editor.html)
  src/config.ts            tuning values copied from Config.java / Constants.java
  src/spriter/Spriter.ts   small SCML runtime (bones, tweening, character maps)
  src/map/TmxMap.ts        TMX reader (base64 + gzip layers, object layer)
  src/game/Kubotz.ts       the kubot: movement, attacks, power-ups, respawn
  src/game/PowerUps.ts     power-up effects and pick-up orbs
  src/game/Combat.ts       laser bullets (they also go through the portals)
  src/fx/ParticleEffect.ts LibGDX .pe particle effects runtime
  src/game/Ai.ts           CPU player (after KubotzBehaviourScript)
  src/game/Input.ts        keyboard / gamepad virtual pad
  src/scenes/*.ts          boot, title, backdrop, arena, HUD
```
