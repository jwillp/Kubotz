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
6. **Guard** — the owner asked for a Super Smash Bros.-style shield instead of
   a skill: hold the guard button to raise a bubble that soaks hits, drains
   while held and refills when released; breaking it stuns the robot.
   (Drones were removed: they were not part of the released game.)
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
| Guard (hold)    | Left Shift / L | Numpad 0 / Numpad 3 / /  |
| Pause           | Esc      | Esc           |

The original mapped both players to the same keys (P2 was never finished),
so player 2 gets its own keys here. Gamepads are a later improvement.

## Status

- [x] 1. Scaffold
- [x] 2. Arena + movement
- [x] 3. Spriter animations
- [x] 4. Combat
- [x] 5. Power-ups
- [x] 6. Guard bubble (replaces the skill button)
- [x] 7. HUD & game flow
- [x] 8. CPU opponent
- [~] 9. Graphics pass (tile art, backdrop, shake, blink; the original LibGDX `.pe`
  particle effects from the full-on-scripting branch: landing dust, hit stars, laser
  smoke, death dust, pick-up and respawn stars)
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
- Drones were dropped (owner feedback: not part of the released game).
- New, at the owner's request: a held guard bubble (Super Smash Bros.-style),
  helmets painted in each player's colour (P1 red, P2 blue, CPUs green, yellow,
  purple), and laser bullets that go through the warp portals and come back from
  the other side.
- Music, narrator countdown and sounds come from the v0.1-alpha release
  (`audio/` was never committed); they are converted to mp3 in `core/assets/audio`.
- Power-ups use `entities/bonus_*.png` like the release; energy had no art (it
  fell back to bonus_jump, tinted here), shield and invincibility use bonus_shield.
- Particles: `web/src/fx/ParticleEffect.ts` plays the LibGDX ParticleEditor files
  directly, wired where the full-on-scripting branch used them (plus pick-up and
  respawn). `eclatRouille.pe` is that branch's tuned copy of `eclatRouille`.
- Timers (power-ups, cooldowns, respawns, match time) run on a match clock that
  stops while the game is paused.
- Laser Gun Mk II existed but was not in the random table; it now has a small chance.
- The CPU used a grid pathfinder; it now steers directly (chase, flee at low health,
  pick up power-ups) — same behaviour tree, simpler navigation.

Engine differences:
- Arcade physics (axis-aligned boxes) instead of Box2D; robots pass through each
  other instead of shoving, and hitboxes are circles/rectangles checked by hand.
- The camera frames all robots between 24 and 58 units wide (the original could
  zoom out to 136 units, far wider than the map).
- The original drew Box2D debug shapes over a hidden map; the port draws the map's
  tile layers and the background art, and the collision blocks stay invisible.

## Phase 2 — owner feedback round 2 (2026-10-20)

The owner asked for SSB-style depth: Box2D feel, 3D characters, lighting.
Done in four steps, each one playable and republished.

**A. Gameplay fixes** (current engine) — done
- CPUs avoid invincible robots (hitting them does nothing) instead of chasing them.
- A 4th CPU colour (orange), so four CPUs never share a colour.
- Guard in mid-air = air dodge (SSB): a short burst in the held direction with
  intangibility frames (hits and bullets pass through), once per jump.
- Knockback grows as health drops (SSB-like: `base × (1 + 2 × damage taken %)`),
  and firing a laser gun pushes the shooter back (recoil).
- Laser bullets and their smoke take the shooter's colour.

**B. Box2D physics** — [planck.js](https://github.com/piqnt/planck.js) 1.5, a JS
port of Box2D, replaces Phaser Arcade — done:
- Same world as `PhysicsSystem`: gravity −40, fixed 60 Hz step (6/2 iterations).
- Same Kubotz body as `KubotzFactory.buildBody`: fixed-rotation dynamic body
  made of a box + head circle + legs circle (a capsule) and a foot sensor; robots
  collide with each other and slide off heads and ledges like the original.
- Movement keeps `MovementSystem` (set the velocity, accelerate towards max speed);
  knockback becomes a linear impulse (`DamageSystem`).
- Power-ups: dynamic circles, density 0.8, restitution 0.5 (they only hit the arena).
  Bullets fly in straight lines, so they are moved directly and tested against the blocks.
- The original body was 2 x 4 units (`withHeight(2)` gives half-extents 1 x 2); the
  same capsule is scaled to the 1 x 2 robot that the art and map of this port use.

**C. 3D (2.5D) rendering** — [three.js](https://threejs.org) r186 — done:
- Gameplay stays on the 2D plane (an SSB-style platformer); only the view is 3D.
- A three.js canvas draws the world behind Phaser's (now transparent) canvas;
  Phaser keeps the title screen, HUD, input and sound.
- Kubotz robots are built in code from the original art (`three/Extrude.ts`): each
  Spriter body part's outline is traced and extruded into a bevelled solid with
  its painting on the faces, parts are stacked front to back in drawing order,
  and the `.scml` animations drive them (`SpriterAnimator`). Extra motion on top:
  3/4 view, turning round, run lean, landing squash, air-dodge spin, stun wobble.
  Helmets and laser sword are painted in the player's colour.
- Hitboxes follow the striking part: circles along the laser blade, the fist for
  punches, the foot for air kicks; lasers leave from the gun barrel.
- Arena blocks are extruded in 3D and textured with the original tile art; the
  background image becomes a distant backdrop; the camera keeps framing all robots.

**D. Lighting** — done (add `?lowfx` to the URL to turn bloom and shadows off) — scene lights (key, rim, per-player light), emissive lasers with
point lights, shadows on the arena, and a post-processing pass (bloom, vignette,
subtle colour grading) for mood.

## Phase 3 — owner feedback round 3 (2026-10-20)

- **Camera:** power-ups on offer count like robots when framing and zooming, so
  every player sees a new bonus.
- **One-way platforms:** `STATIC_PLATFORM` blocks are soft (SSB style): robots
  jump through them from below and land on them from above; holding down while
  standing on one drops through it. Walls stay solid.
- **CPU pathfinding** (`game/Nav.ts`): like the original's A*, but on the surfaces
  robots can stand on, linked by the moves between them (jump up, through a soft
  platform from below or beside a solid block; drop through; run off an edge;
  jump across a gap). The CPU plays the first move of the path: walks to the
  take-off window, then jumps (again, until above the target), drops or falls.
  It takes off beside a robot standing right above (robots bump into each other),
  never runs off an edge after a robot flying over the void, flees to the
  reachable surface farthest away, and steers back when knocked over the void.
- **K.O. explosion** (`game/Debris.ts`): the robot blows apart; every body part
  becomes a tumbling 3D piece on a Box2D circle that bounces around the arena,
  hurts the robots it hits (2 damage + knockback, once per piece and robot,
  only while flying fast) and fades after about 3 s. Flash of light and a
  synthesised explosion sound (the original had none).
- **Arenas** (`map/Arenas.ts`): the original cube plus three arenas built from
  its tiles, picked on the title screen (◀ ▶): *The Foundry* (pillars and a
  centre block), *Sky Deck* (open stage, falling off is a K.O.) and *The Pit*
  (a hole in the floor). Each is a list of blocks; the tile art is laid on them
  the way the original map does (ground/ceiling strips, side pieces, platform
  end caps, outer fades).

## Phase 4 — Blender models (2026-10-20)

The robot, the bonus chips and the arena tiles were remade in Blender from the
original art (sources and build script: `W:\claude\kubotz-blender`, outside this
repo). The exports live in `core/assets/models/` and replace the 3D the game
built from the sprites:
- `robot.glb` (`three/RobotGltf.ts`): the original Spriter bones and animations,
  played at the point the game's Spriter clock is at, so attack timings and
  hitboxes are unchanged (hit points still come from the Spriter pose, through a
  skeleton-only `Robot3D`). Helmet and weapon variants follow the character maps;
  `player_color` / `player_glow` materials take the player's colour; the extra
  `Guard` animation plays while guarding.
- `pickups/bonus_*.glb`: spinning bonus chips (golden for invincibility, yellow for energy).
- `tiles.glb`: tiles on blocks are placed as 2 x 2 x 2 unit 3D blocks (instanced).
- If the models cannot be loaded, the game falls back to the sprite-built 3D.
  On hosts with a strict content policy (the published artifact) the loader
  fetches the files itself and rebuilds the GLB in memory (no data:/blob:
  fetches); a failure is shown on the title screen.

## Phase 5 — Combos, animation polish, particles (2026-10-20)

- **Combos** (SSB jab chain): unarmed on the ground, three presses chain a jab
  (`Punching`), a cross (`Punching_dom`) and a kick (`Kicking`). A press during
  a move is buffered and starts the next one as it ends; a short window after a
  move also continues the chain. The first two hits push lightly and stun
  briefly so the chain connects; the kick finishes with a strong launch. The hit
  point is whichever fist or foot is furthest forward.
- **Animations**: each move plays exactly once over its hit window; longer
  blends between locomotion clips, short ones into attacks; `Landing` on
  touchdown, `Hit` / `Hit_2` alternate, `Grab` when grabbing, the run cycle
  follows the speed, a fresh `Jumping` on double jumps.
- **Platform lights**: tile glow and neon edge strips toned down a little.
- **Particles** (`fx/Impact.ts`): hit sparks stretched along their motion and
  tinted by the attacker, an impact flash ring and a brief 3D light, scaled by
  damage; a motion trail behind the striking fist, foot or blade; a ring burst
  on double jumps; run dust.

## Phase 6 — Back to 2D, a new animation set, debug mode (2026-10-21)

The owner asked to drop the 3D look and go back to 2D, with smoother
animations, combat moves that travel further, and a debug mode.

- **2D rendering again**: Phaser draws everything. The arena is the original
  tile art baked into one texture (as in phase 1), robots are their original
  part images, bonuses are their original icons, K.O. debris are the robot's
  own part images flying on Box2D bodies. Glow comes from additive sprites and
  an optional camera bloom (F toggles it). three.js, the Blender models and the
  3D code are removed from the build (the models stay in `core/assets/models`).
- **New animation set** (`anim/Rig.ts`, `anim/Clips.ts`): the original
  skeleton (15 bones of `kubotz.scml`) and part images, posed by a new set of
  clips written in code instead of the Spriter keyframes. Poses are bone
  rotations from the original stance plus a body offset, keyed with easing
  curves (anticipation, snappy strikes, follow-through), and every switch
  between clips blends over a few frames. Clips: idle, run, jump, double jump
  flip, fall, land, crouch, guard, air dodge, hit (2), grab, shoot, jab,
  cross, roundhouse kick, air kick, three sword slashes.
- **Moves travel**: each strike carries the robot forward (lunge) on its
  active frames, larger for later hits of a combo; the laser sword gets its own
  three-hit combo; the air kick dives.
- **Debug mode** (F3 or `): Box2D fixtures, hurtboxes, attack and grab
  circles, the navigation graph and each CPU's path and state, per-robot
  readouts (animation, velocity, combo step, stun), FPS and frame time graph,
  entity counts. While it is on: F4 cycles slow motion (1, ½, ¼), F6 freezes,
  F7 steps one frame while frozen, F8 toggles the navigation graph.
- **Hurtbox** covers the physics body plus the head drawn above it (40% of the
  body height), so blows that visibly land connect.
- `tools/rig.html` (dev only) draws contact sheets of every clip, used to
  tune the animations.
