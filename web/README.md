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

## Editor

In a dev build (`npm run dev`), press **F2** during a match: the match freezes
and the editor docks round it; **Play** lets it run with your changes, F2
again closes it. The same editor also opens on a page of its own:

```bash
npm run editor        # http://localhost:5173/editor.html
npm run build:editor  # a build with the editor in, in dist-editor/
```

`npm run build` (production) leaves the editor out.

Tune the robots' clips (bone poses, keys and particle events) and the moves
(hit circles, active frames, damage, launch) on the game's own renderer. Save writes
the changed files in `src/data/clips` and `src/data/moves` (one per clip and
one per move); "Test in game" opens the
game with the current edits, saved or not. The Particles tab edits the
effects in `src/data/particles`, and the Arena tab the arenas in
`src/data/arenas` (walls, platforms, portals, spawns, bonus spots, blast
zone, room and painted tiles); its "Test in game" starts a match there.

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

Each robot has 5 lives. Power-ups drop at the four bonus spots every 5–10
seconds; walk up to one and press Grab. Falling out of the arena costs a life;
the side openings warp you across. Last robot standing wins.

## Layout

```
web/
  src/main.ts              Phaser game config
  src/data/                clips, moves, particle effects and arenas (JSON, one file each, written by the editor)
  src/editor/              the editor (editor.html)
  src/config.ts            tuning values copied from Config.java / Constants.java
  src/spriter/Spriter.ts   small SCML runtime (bones, tweening, character maps)
  src/map/TmxMap.ts        TMX reader (base64 + gzip layers, object layer)
  src/game/Kubotz.ts       the robot: movement, attacks, power-ups, respawn
  src/game/PowerUps.ts     power-up effects and pick-up orbs
  src/game/Combat.ts       laser bullets (they also go through the portals)
  src/fx/ParticleEffect.ts LibGDX .pe particle effects runtime
  src/game/Ai.ts           CPU player (after KubotzBehaviourScript)
  src/game/Input.ts        keyboard / gamepad virtual pad
  src/scenes/*.ts          boot, title, backdrop, arena, HUD
```
