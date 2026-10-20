# Kubotz Web — Port Plan

Goal: make Kubotz playable in a web browser by reimplementing it with a simple,
modern stack, reusing the original assets, and keeping gameplay close to the
LibGDX version on the `AI2` branch. Graphical improvements come after parity.

## Stack

| Concern    | Original (LibGDX)                  | Web port                                        |
|------------|------------------------------------|-------------------------------------------------|
| Engine     | LibGDX + custom ECS ("GoatEngine") | Phaser 3.90 (TypeScript)                        |
| Build      | Gradle (desktop only)              | Vite → static site (any static host / Pages)    |
| Physics    | Box2D (fixtures, sensors)          | Phaser Arcade (AABB) + manual hitbox overlaps   |
| Animation  | Spriter SCML (brashmonkey runtime) | Small TS Spriter player reading the same `.scml` |
| Map        | Tiled TMX (gzip/base64)            | Same TMX parsed at runtime (DOMParser + DecompressionStream) |
| Assets     | `core/assets`                      | Served as-is (Vite `publicDir` = `../core/assets`) |

Why not keep the ECS: the original ECS is ~3k lines of plumbing for ~10 features.
The port uses plain classes (a `Kubotz` actor with small feature modules) so each
feature stays readable and close to its Java counterpart.

Units: 1 game unit = 1 tile = 64 px, matching the original map (`tilewidth=64`).
All tuning numbers (speeds, gravity, damage, cooldowns) are copied from
`Config.java` / `Constants.java` into `web/src/config.ts`.

## Steps

Each step ends in a playable build and a commit.

1. **Scaffold** — Vite + TS + Phaser project in `web/`, assets served from
   `core/assets`, boot/preload scene.
2. **Arena + movement** — load `maps/DebugMap.tmx` (walls, platforms, spawn
   points, warp zones), Kubotz body (1×2 units), run/decelerate, jump with
   cooldown and jump count, fast-fall, gravity 50 u/s², max speed 18 u/s.
   Two local players. Multi-target camera (centre + zoom on all fighters,
   zoom 0.3–1.7 like `CameraSystem`).
3. **Spriter animations** — TS player for `animations/kubotz.scml` (bones,
   objects, linear tweening, flip, character maps for weapons). States from
   `KubotzAnimationScript`: Idle, Running, Jumping, Falling, Punching,
   Shooting, Sword slash.
4. **Combat** — punch hitbox (damage 3, duration 500 ms, cooldown), damage
   + knockback, health (100), mini health bars, death → respawn after 2 s at
   a player spawn, kills/deaths/lives per player.
5. **Power-ups** — spawn every 5–10 s at bonus spawns (max 5, lifetime 20 s,
   effect 30 s), grab button picks up nearby ones. Effects: health, energy,
   extra jump, Laser Gun Mk I/II (bullets), Laser Sword, invincibility, shield.
6. **Skills** — Drone Gauntlet (default active skill: spawns a drone that
   follows its master and chases threats), Dash boots, Fly boots.
7. **HUD & game flow** — title screen, player badges/labels, lives, match end
   (life-based free-for-all), pause.
8. **CPU opponent** — port of `KubotzBehaviourScript` so one player can play
   against the computer.
9. **Graphics pass** — render the tile layers (hidden in the original, which
   drew Box2D debug shapes), background parallax, particles (landing dust,
   hit stars, laser smoke), screen shake, hit flashes.
10. **Deploy** — GitHub Actions workflow publishing `web/dist` to GitHub Pages.

## Controls (default)

| Action          | Player 1 | Player 2      |
|-----------------|----------|---------------|
| Move / jump     | W A S D  | Arrow keys    |
| Attack (A)      | O        | Numpad 1 / ,  |
| Grab (B)        | I        | Numpad 2 / .  |
| Skill (X)       | Left Shift | Numpad 3 / /  |
| Pause           | Esc      | Esc           |

The original mapped both players to the same keys (P2 was never finished),
so player 2 gets its own keys here. Gamepads are a later improvement.

## Status

- [ ] 1. Scaffold
- [ ] 2. Arena + movement
- [ ] 3. Spriter animations
- [ ] 4. Combat
- [ ] 5. Power-ups
- [ ] 6. Skills
- [ ] 7. HUD & game flow
- [ ] 8. CPU opponent
- [ ] 9. Graphics pass
- [ ] 10. Deploy

## Known differences from the original

(Filled in as the port progresses.)
