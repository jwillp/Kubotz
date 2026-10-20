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
6. **Skills** — Drone Gauntlet (the active skill the original Kubotz had:
   spawns a drone that follows its master and chases threats). Dash, Fly and
   Magnetic boots were commented out of `KubotzFactory`, so they are not
   ported yet.
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
| Attack (A)      | O / J    | Numpad 1 / ,  |
| Grab (B)        | I / K    | Numpad 2 / .  |
| Skill (X)       | Left Shift / L | Numpad 3 / /  |
| Pause           | Esc      | Esc           |

The original mapped both players to the same keys (P2 was never finished),
so player 2 gets its own keys here. Gamepads are a later improvement.

## Status

- [x] 1. Scaffold
- [x] 2. Arena + movement
- [x] 3. Spriter animations
- [x] 4. Combat
- [x] 5. Power-ups
- [x] 6. Skills (drone gauntlet; boots not ported)
- [x] 7. HUD & game flow
- [x] 8. CPU opponent
- [~] 9. Graphics pass (tile art, backdrop, particles, shake, blink done; more to come)
- [ ] 10. Deploy (on hold: the owner tests locally first)

## Known differences from the original

Bugs fixed or unfinished features completed:
- Player 2 had the same keys as player 1; it now has its own keys, plus gamepads.
- Holding up blocked running in the same frame; now you can run and jump together.
- Health/energy power-ups gave 2% (`max * 1/50`) although commented 50%; now 50%.
- Punch/kick animations never played (the state was only ever cleared); now they do,
  along with Hit and Sword slash. The art is drawn ~30% larger to fill its 2-unit body.
- Knockback was always 0; hits now push a little.
- A punch overlapping several fixtures (head, torso, legs) could hit several times;
  now each swing hits a target once.
- The map has one player spawn; mirrored and central spawns were added for 4 players.
- `WARP_ZONE` objects were never used; they now wrap robots across the arena, and
  falling out of the arena costs a life.
- Drones only followed their master; they now chase and zap enemies in sight, last
  15 s, and a robot can have two at a time.
- Laser Gun Mk II existed but was not in the random table; it now has a small chance.
- The CPU used a grid pathfinder; it now steers directly (chase, flee at low health,
  pick up power-ups) — same behaviour tree, simpler navigation.

Engine differences:
- Arcade physics (axis-aligned boxes) instead of Box2D; robots pass through each
  other instead of shoving, and hitboxes are circles/rectangles checked by hand.
- The camera frames all robots between 24 and 58 units wide (the original could
  zoom out to 136 units, far wider than the map).
- The original drew Box2D debug shapes over a hidden map; the port draws the map's
  tile layers and the background art.
