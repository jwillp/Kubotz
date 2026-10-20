# Kubotz — web version

A browser port of Kubotz (the LibGDX game in `core/`), written with
[Phaser 3](https://phaser.io), TypeScript and Vite. It reuses the original
assets in `core/assets` untouched: the Spriter animation (`kubotz.scml`), the
Tiled map (`DebugMap.tmx`), the HUD art and the particles.

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

## Play

Pick a mode on the title screen (mouse, arrows + Enter, or keys 1-5).

| Action                       | Player 1          | Player 2                 |
|------------------------------|-------------------|--------------------------|
| Run left / right             | A / D             | ← / →                    |
| Jump (hold for up to 3 jumps)| W                 | ↑                        |
| Fast fall                    | S                 | ↓                        |
| Attack (punch / shoot / slash)| O (or J)         | Numpad 1 (or ,)          |
| Grab power-up                | I (or K)          | Numpad 2 (or .)          |
| Skill: drone gauntlet        | Left Shift (or L) | Numpad 3 (or /)          |
| Pause                        | Esc / P           | Esc / P                  |

Gamepads: stick/D-pad to move, A jump, X attack, B grab, Y or R1 skill,
Start pause. The first pad drives P1, the second P2.

Each robot has 5 lives. Power-ups drop at the four bonus spots every 5–10
seconds; walk up to one and press Grab. Falling out of the arena costs a life;
the side openings warp you across. Last robot standing wins.

## Layout

```
web/
  src/main.ts              Phaser game config
  src/config.ts            tuning values copied from Config.java / Constants.java
  src/spriter/Spriter.ts   small SCML runtime (bones, tweening, character maps)
  src/map/TmxMap.ts        TMX reader (base64 + gzip layers, object layer)
  src/game/Kubotz.ts       the robot: movement, attacks, power-ups, respawn
  src/game/PowerUps.ts     power-up effects and pick-up orbs
  src/game/Combat.ts       laser bullets and drones
  src/game/Ai.ts           CPU player (after KubotzBehaviourScript)
  src/game/Input.ts        keyboard / gamepad virtual pad
  src/scenes/*.ts          boot, title, backdrop, arena, HUD
```
