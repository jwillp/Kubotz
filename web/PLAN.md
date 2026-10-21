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
| Assets     | `core/assets`                      | Served as-is from `web/public` (moved there in phase 10c) |

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

## Phase 7 — Rig fix, lights and shading back in 2D (2026-10-21)

Owner feedback: the lights and shaders were lost with the 3D version, and the
robots' skeletons were broken (heads inside bodies).

- **Rig bug**: the Spriter keys carry each part image's pivot; the rig used the
  file default (bottom-left) instead, so every part hung off its bone wrongly
  (the helmet sat inside the chest). `Rig.solve` now returns the key's pivot
  per part and the drawing, hit points, ground lift and K.O. pieces use it.
  The bone angles of the clips were right; only the images moved.
- **Lighting (Phaser Light2D)**: normal maps are generated at boot from the
  art itself (`fx/NormalMaps.ts`: a bevel from the alpha edge plus embossed
  brightness detail), for the robot parts, the recoloured helmets and blades,
  the bonus chips and the arena tiles. The arena is baked into a canvas with a
  matching normal canvas. A warm key light and a cool rim light follow the
  camera; a pool of 12 point lights goes to lasers, laser blades, power-ups,
  explosions and hits (brightest first).
- **Glow**: the tiles' light strips are added on top of the lit arena so they
  glow and bloom; every block gets a lit cyan rim along its top.
- **Grade**: a post-processing pass after the bloom (`fx/Grade.ts`): vignette,
  a touch of contrast and cool shadows / warm highlights. F turns bloom and
  grade off together; `?lowfx` starts without them.
- Blends no longer unwind a full spin (dodge, flip) when the next clip starts.
- Sprite sheets were considered: the only art is the original part images, so
  pre-rendered sheets would just be frames of this rig with no extra fluidity;
  the skeleton stays (and blends between moves, which sheets could not).

## Phase 8 — Smash-style directional moves, real turns, helmets, knockback (2026-10-21)

Owner feedback: the moves looked stiff; attacks should depend on direction
like Super Smash Bros. (the robots are agile ninjas, think Captain Falcon);
turning looked like an image flip; helmets were painted whole; heavy hits
should stun and bounce off walls. Sources read: SmashWiki's
[Hitstun](https://ssbwiki.com/Hitstun) and [Knockback](https://www.ssbwiki.com/KB)
pages (hitstun ≈ 0.4 × knockback, tumble past ~32 frames of hitstun,
knockback grows with the damage taken) and the
[aerial attack](https://www.ssbwiki.com/aerial_attack) page (neutral,
forward, back, up and down airs).

- **Directional attacks** (`Kubotz.attackDirection`): up and down win, then
  towards / away from the way the robot faced before this frame's input.
  - Ground: neutral = the 3-hit combo; forward while running = dash attack
    (sliding kick); down = down tilt (low sweep that pops up); up = jump +
    backflip kick (the up air).
  - Air: neutral air (side kick held out), forward air (flying knee), back air
    (reverse kick behind, the robot keeps facing the way it struck), up air
    (backflip kick with a hop), down air (the dive kick). With nothing held:
    within 180 ms of a jump the attack is the backflip; falling faster than 6
    units/s it is the dive.
  - Laser sword: slashes for the combo, thrust for the dash, low sweep slash,
    and air versions (overhead, rising, back cut over the shoulder, rising
    flip, plunging stab).
  - Every move has a launch angle (0 forwards, 90 up; the dives meteor at
    -70). Light combo links keep a fixed short hitstun so the next hit lands.
- **Knockback and hitstun** (`takeDamage`): launch speed = move knockback ×
  (1 + 2 × damage taken); hitstun = 120 ms + 30 ms per unit/s (max 1.5 s).
  Past 600 ms the robot *tumbles*: no control, spinning; it rebounds off
  walls and ceilings (65% of its speed), bounces once on the floor, then lies
  in a knockdown for a moment before getting up.
- **Turning**: the facing eases more slowly, the body narrows to 22% at the
  middle of the turn while its parts fan out by depth (the far side swings
  round) and the back is drawn in front past half-way; on the ground a pivot
  step clip plays.
- **Helmets**: only the saturated pixels (eyes, stripes, domes, flames) take
  the player colour; whites, greys and blacks stay the helmet's base.
- **CPU** uses the aerials by where the enemy is (above, below, behind), the
  backflip for enemies above, dash attacks when running in, and the sweep now
  and then.

## Phase 9 — Smash attacks, charged laser, real turns, lighting, ninja moves (2026-10-21)

Owner feedback: ground attacks directional like Smash with sword versions;
the laser gun taps light shots and charges a heavy bolt with a longer
cooldown and more recoil; turns looked like a flipped sheet of paper; the
lights did nothing in a bright room; blue platforms should glow; a little
film grain and scanlines; the robots moved like retro boxers.

- **Smash inputs** (`Kubotz.handleActions`): a direction pressed within
  100 ms of the attack is a *smash*; holding the attack charges it (wind-up
  frozen, the robot shakes and flashes at full charge) for up to 1 s, +60%
  damage and knockback. Forward smash = a lunging fire-gauntlet punch (sword:
  leaping overhead cleave); down smash = a split kick hitting both sides
  (sword: crouched spin slash). A direction already held, then attack, is a
  *tilt*: forward tilt = side kick (sword: spinning slash), down tilt = low
  sweep. Running fast + attack stays the dash attack, up + attack the
  backflip kick (so no separate up tilt / up smash).
- **Laser gun**: a tap (≤ 160 ms) fires a light shot (60% damage); holding
  charges up to 1.2 s: damage ×(1 + 2c), a bigger bolt, more push, recoil
  ×(1 + 2.5c), cooldown + 0.8 × held time × c. The muzzle glows while
  charging.
- **Real turns** (`anim/Robot2D.ts`): the robot is a layered 2.5D puppet.
  Every part has a depth (near limbs in front, far limbs behind, head and
  torso in the middle) and a roundness; yaw swings each part round by its
  depth, narrows flat parts edge-on and mirrors them past 90°, so a turn
  shows the robot from the front or back mid-way. The head leads and the
  legs follow. Clips can carry a yaw track, used for spinning moves (spin
  back fist, spin hook kick, tornado kick, spinning slashes).
- **Ninja animation set** (`anim/Clips.ts`): a low wide ready stance, a
  leaning sprint with the arms swept back, palm strike / spin back fist /
  jumping spin hook kick combo, and the new tilts and smashes.
- **Swooshes and afterimages**: fast moves leave a crescent smear (colour
  with a white core) behind the striking limb or blade, and coloured
  afterimages of the whole robot during spins, dodges and tumbles.
- **Lighting**: the backdrop is dimmed and the ambient lowered; key and rim
  lights are stronger; blue lights rise off every platform; the tiles' blue
  strips glow on their own (an emissive layer extracted from the art,
  blurred and breathing). `maxLights` is 36.
- **Grade** (`fx/Grade.ts`): film grain (stronger in shadows) and faint
  drifting scanlines on top of the vignette and split tone. F toggles it
  with the bloom.
- **CPU**: smashes now and then (more when the enemy is weak), sometimes
  charged; quick laser shots with the occasional charged bolt.

### Phase 9b — owner feedback (2026-10-21)

- **Players can smash and charge**: the keyboard attack was a one-frame
  press, so holding it did nothing. Attack is now a held button (grab stays a
  press); holding attack also chains the ground combo. The smash window is
  120 ms; a tilt needs the direction held a little longer first.
- **Run**: rebuilt from the original game's Running animation (converted
  from kubotz.scml to rig poses, resampled to 20 keys and smoothed), leaning
  slightly into it, 640 ms per stride at full speed.
- **Feet on the ground**: planted clips grounded the feet's image corners,
  which are transparent; they now ground the feet's opaque outline.
- **Lightsabers**: a white-hot core inside a coloured blade and a wide soft
  halo, drawn additively over the blade art with a slight flicker.

### Phase 9c — owner feedback (2026-10-21)

- **Idle**: back to the fighting stance (the original guard, knees bent),
  bouncing at 860 ms per cycle instead of the slow ninja breathing; the
  attacks start and end in it.
- **Footsteps**: the step sound plays when the run's planted foot changes
  (`Rig.lowestFoot`), so it lands with each footfall.
- **Dust**: no longer while running; a puff when changing direction on the
  ground (and on landing, as before).
- **Power-up balls**: power-ups are rolling physics balls (radius 0.45 units,
  bouncy, bump each other). Robots running into one kick it along, strikes
  knock it away along the move's launch angle, laser bolts push it. The art
  rolls with the ball under a fixed shading and highlight. Grab picks it up.

### Phase 9d — owner feedback (2026-10-21)

- **Screen effects**: F stacked a new grade pass on every press (removing it
  by name missed), which is why the image got more saturated each time. The
  bloom is gone: the owner preferred the grade alone (vignette, split tone,
  grain, scanlines), which is now the default; F toggles it cleanly.
- **Sounds**: step.mp3 had a third of a second of silence and a scuff before
  the step (heard late and doubled); punch had a lead-in. Both are trimmed
  copies (audio/step_tight.mp3, punch_tight.mp3). Music 0.45 → 0.28.
  Crystal sounds synthesised in fx/Synth.ts: a glassy tink when a ball
  bounces (louder the harder, pitch varied), a rising chime on pick-up.
- **Drop-through**: only the platform stood on (`KubotzBody.dropTop`); a
  fresh press of down is needed to drop again (CPUs drop again after a
  moment while holding down along a path).
- **Bonus spawns**: never on a ball already there.
- **Sword trail**: the swoosh follows the blade whenever its tip moves fast,
  not only during strikes.
- **Laser**: the smoke is gone; a bolt leaves a fading beam line and
  flickering square bits. Charging draws sparks in from all round into the
  barrel, more as it fills.
- **Power-up balls**: tiny twinkling motes rise off them.
- **Portals**: everything that moves wraps (robots, bolts, balls, debris)
  through one list of movers.

### Phase 9e — owner feedback (2026-10-21)

- **Crash** on Enter after a win: the title scene object is reused and kept
  its destroyed texts from the first visit; `TitleScene.create` now resets
  them.
- **Quit from the pause**: Q (or Select on a gamepad) goes back to the title.
- **Orb sounds** (fx/Synth.ts): the bounce tink is about an octave higher; the
  pick-up is a sci-fi rising FM sweep with digital blips; the health orb has
  its own warm chord swell. Both pass through a small Schroeder reverb so
  they sit in the room with the sampled sounds.
- **Twirl** (`ImpactFx.twirl`): on pick-up the orb's motes spiral up round
  the robot in two strands for 1.5 s (2.1 s for health), in the orb's colour,
  bright in front and drawn under the robot behind. Health also shows
  "+N HP" with the amount actually restored.
- **Lasting effects** (`ImpactFx.aura`): invincibility (gold, its orb's
  colour) and shield (blue) keep motes circling the robot until they run
  out, replacing the blue ellipse and the invincibility blink.

## Phase 10 — Weight, sci-fi explosion, Melee grabs and ledges (2026-10-21)

Owner asks: robots very slightly heavier (gravity catches up earlier), a
sci-fi explosion when a robot blows up, grabbing opponents and grabbing
ledges like Super Smash Bros. Melee.

Melee references (community frame data, SmashWiki / Smashboards; Melee runs
at 60 frames a second, so 1 frame = 16.7 ms; Melee "%" is our damage taken,
100 - health):

- Grab hold: about 76 frames at 0 %, plus 1.6 frames per % (read in 5 %
  steps). Each mash (a new button press or a new direction) takes off about
  6 frames. No mashing during a pummel's hitstun.
- Pummel: 3 % per hit.
- Grab release (time out): both robots stuck 29 frames, pushed apart.
- Ledge grab: intangible for the 7-frame catch plus 30 frames. Options open
  after the catch. One robot per ledge (edge hogging). Get-ups are slower at
  high damage (Melee: 100 %; here 60 damage, as our robots die at 100).

Plan:

1. **Weight**: gravity 40 → 44 u/s², and +10 % more for robots once they
   start falling (the apex comes sooner and the drop is quicker). Jump
   speed 20 → 20.5 u/s keeps the jump nearly as high (5.0 → 4.8 units),
   with air time about 1.0 s → 0.9 s.
2. **Explosion**: synthesised (fx/Synth.ts): a sub thump, a falling laser
   zap, a filtered noise blast, a metallic ring and crackling bits, in reverb.
3. **Grabs** (I / `.` on the ground; balls are picked up when no robot is in
   reach):
   - The grab reaches just in front (about 1 unit), works through the guard
     bubble and misses intangible or invincible robots. A miss has 480 ms of
     end lag.
   - Holding: the victim is lifted in front and can't act. They mash out in
     (76 + 1.6 × damage, in steps of 5) frames, minus 6 frames per mash.
   - Grabber options: attack = pummel (3 damage, about 400 ms). A direction
     = a throw (forward, back with a spin, up, down) using the SSB launch
     system: damage 7 / 8 / 7 / 6, angles 40° / 140° / 90° / 75°.
   - Time out: grab release. The victim is pushed away and the grabber back
     a little, and both are stuck 29 frames. If someone else hits the
     grabber, the victim drops free.
4. **Ledges**: the top corners of solid blocks with room above and beside
   them (soft platforms have none, as in Melee).
   - Grabbed automatically while falling past the corner with the hands
     near it, unless holding down, in hitstun, or within 480 ms of letting
     go. One robot per ledge.
   - Hanging: jumps and air dodge restored, intangible for 37 frames
     (620 ms). After 7 frames:
     - toward = climb up (550 ms, 900 ms at 60+ damage);
     - up = ledge jump;
     - attack = get-up attack (climb then a sweep kick, 6 damage);
     - guard = roll in (intangible);
     - down or away = let go.
   - Hit after the intangibility ends: knocked off.
5. **CPUs**:
   - grab guarding robots and sometimes close ones;
   - pummel once or twice, then throw towards the nearest edge or blast zone;
   - mash when held (about 8 a second);
   - pick a ledge option after a short random wait (roll or attack when
     someone stands over the ledge).
6. **Animation clips**: grab hold, held, pummel, four throws, ledge hang,
   climb.

### Phase 10b — owner feedback (2026-10-21)

- **Stars gone**: the respawn star burst and the pick-up star burst are removed.
  The orb twirl marks pick-ups.
- **Camera and orbs**: a new power-up ball stays in the camera's framing for
  its first 2 seconds only.
- **Power-up rate**: a title-screen setting (B):
  - Off;
  - Rare: every 22-35 s, at most 2 out;
  - Normal (the default): every 12-20 s, at most 3;
  - Frequent: the original 5-10 s, at most 5.
- **Colours by slot**: red, blue, green, then yellow, for humans and CPUs
  alike.
- **Camera shake** (trauma model: offset and a slight roll from trauma²,
  wearing off): strong launches (by launch speed), tumble bounces, hard
  landings from long falls, guard breaks, K.O.s. It replaces the old
  fixed shakes.
- **Footsteps**: synthesised soft metal boot steps: a heel thud, a damped
  plate ring and a scuff, in 3 pitch variants with some detune. The old
  step sample now only plays for dodges and throws.
- **Portals** (fx/Portals.ts):
  - blue (left) and orange (right) energy rifts with a dark core and a
    glowing rim;
  - spiral arms, motes drawn in and sparks thrown off;
  - a coloured light;
  - a flare at the exit portal when something comes through.
- **Backdrop** (BackdropScene): the room art lens-blurred once into its own
  texture, drifting bokeh discs on three depths with parallax, slow light
  shafts, and haze towards the floor.

### Phase 10c — web port only (2026-10-21)

The owner asked for the branch to hold only the web port.
- The original assets moved from `core/assets` to `web/public` (Vite's
  default public folder), so `vite.config.ts` no longer points outside `web/`.
- Removed: the Java/LibGDX modules (`core/src`, `desktop/`), the Gradle
  build, the root config and the todo list.
- Also removed: assets the web port never loads (checked by recording
  every request across the title and all four arenas). That covers the
  glTF models from the 3D detour, the bitmap font, the Spriter autosave and
  reference sheets, the .psd, BasicCube.tmx, unused particle files, and the
  untrimmed step and punch sounds.
- The Java game is still on the `AI2` and `master` branches.

### Phase 10d — owner feedback (2026-10-21)

- **Fast-fall landing shake**: holding down while falling marks a fast
  fall; landing from one shakes the camera (0.2 + speed/90, at most 0.45
  trauma). Ordinary hard landings still shake above 22 U/s.
- **Slot colours**: red, blue, green, purple (red asked again after a short yellow detour), for humans and CPUs alike.
  The P1, P2 and CPU labels take the robot's colour.
- **Portals**: both the same cyan-blue, each with a strong light (radius
  11 U) that pulses with the rift and an additive halo, so they light the
  walls and robots around them.
- **Outer hull** (GameScene.buildHull, cube arenas): dark plating carries on
  past the frame into the non-playable area and fades out over ~9 cells.
  Outside cells are the ones a flood fill from the spawns cannot reach
  (portals stop it); the fade follows the distance to the frame or the
  map's own art. Half resolution, blurred mask, under the arena art.
  The arena glow now uses plain additive blending (ONE, ONE): Phaser's ADD
  showed the glow layer's rectangle over the translucent hull.
- **Bokeh**: 40% of the discs take accent colours (teal, violet, magenta,
  amber, pink, pale blue); the disc has a wider soft edge and a fainter rim,
  and the discs are ~15% larger.

## Phase 11 — Smash Ultimate controls (2026-10-21)

The owner sent the Super Smash Bros. Ultimate control card (Switch Pro
Controller) and asked for those controls. Gamepad buttons are read by
position (the browser's standard mapping), so the Nintendo labels land
where the card shows them on any pad.

| Card | Gamepad | P1 keyboard | P2 keyboard |
| --- | --- | --- | --- |
| Move: tilt = walk, flick = dash | left stick (half tilt walks, full or fast flick dashes); D-pad not used for moving | A / D (digital: always the dash) | arrows |
| Stick up = jump, down = crouch, flick down = drop through | left stick | W / S | up / down |
| Jump, midair jump (X / Y) | top and left face buttons | Space (W still jumps) | Numpad 5, M |
| A: standard attack; tilt + A = strong (tilt) attack; flick + A = smash attack | right face button | O | , |
| B: special moves, neutral or with a direction | bottom face button | P | N |
| Right stick: smash attack (in the air: aerial) | right stick | — | — |
| Grab (L) | L | I | . |
| Shield (R, ZL, ZR) | R, ZL, ZR | Shift | / |
| Taunt (D-pad) | D-pad | U | Numpad 6 |

Steps, each one built and published on its own:
1. **Input model**: `PadState` gains `jump`, `special`, `taunt`, `walk`
   (stick tilted, not pushed), `flick` (the stick slammed from the centre
   in under ~3 frames) and `cstick`. Gamepad mapping as above; keyboard
   keys added. Walk speed ~45% of the run, walking clip at a slower rate.
2. **Strong vs smash from the stick**: on a pad a flick + A is the smash,
   a tilt + A the strong attack (keyboard keeps the timing rule: direction
   pressed with the button = smash, held first = tilt). New grounded **up
   tilt** and **up smash** (the card's up + A); up + A no longer jumps.
3. **Right stick**: an instant smash in its direction on the ground, the
   matching aerial in the air.
4. **Special moves (B)**, unarmed, Captain Falcon flavoured ninja moves:
   - neutral: **Ion Punch**, a slow wind-up and a huge fire punch (can
     turn round at the start);
   - side: **Raptor Dash**, a dashing uppercut (in the air a downward
     strike);
   - up: **Shadow Dive**, a rising strike for recovery, then helpless until
     landing or a ledge;
   - down: **Plasma Kick**, a sliding fire kick on the ground, a diagonal
     dive kick in the air.
5. **Taunt**: a short pose on the D-pad.
6. **CPUs** use the specials (up special to recover, side and neutral to
   punish) and the up moves.
7. Key help on the page and the title screen.

Done (2026-10-21), one build per step:
- Input (game/Input.ts): new `PadState` fields; gamepad by position; flick =
  centred to past 0.8 within 70 ms; tilted stick (0.3 to 0.8, or not
  flicked) walks at 45% speed. People jump on the press after a 50 ms jump
  squat (let go within it: short hop at 68%), so holding up no longer
  re-jumps; the CPU still holds up and jumps on a cooldown, but not while
  it aims an up attack or special.
- Up tilt (rising palm) and up smash (vertical scissor kick, chargeable);
  sword versions use a new overhead arc (`susmash`). Up + attack in the
  jump squat cancels the jump into the up smash.
- Right stick: smash on the ground (charges if A is held too), aerial in
  the air.
- Specials (`SPECIALS` in Kubotz.ts, clips `ionPunch`, `raptor`,
  `shadowDive`; the Plasma Kick reuses `dash` and `airKick`). A move's
  `burst` velocity is held for its `sustain` share. Up special: helpless
  after the rise until landing or a ledge (no jumps, attacks, dodge);
  side and up specials once per trip in the air.
- Taunt: 1 s, committed (a hit ends it).
- CPUs: up tilt / up smash on robots above, Raptor Dash to close in,
  Plasma Kick or Ion Punch now and then, Raptor Dash and Shadow Dive to
  recover once out of jumps.


## Phase 11 — Feature batch (2026-10-21)

The owner asked for a batch of features, each group in its own branch and PR.
`web-port` is merged into `dev` (the repository's default branch) first, and
every feature branch starts from `dev`.

| PR | Branch | Asks |
|----|--------|------|
| A | `feat/heavier-fall-roll` | Heavier robots: normal jump, much stronger pull on the way down (fall gravity and fast-fall). Ground dodge roll: guard + left/right on the ground rolls through enemies, intangible, the ground version of the air dodge. Fix: debug on, off, on again crashed. |
| B | `feat/settings` | Settings screen: music, sound effects and visual effects volumes (VFX intensity), saved in the browser, reachable from the title screen and the pause menu mid-battle. |
| C | `feat/match-setup` | Join screen: each human presses to join, picks a helmet and a colour; the colour is a faction (same colour = same team, no friendly damage, the last team standing wins); the number of CPUs and their colours. Then an arena select with a live preview of each arena. |
| D | `feat/post-match` | The winners dance; "press to continue" prompt; a results screen with per-player stats (K.O.s, falls, damage dealt and taken, hits, longest combo) and a replay of each K.O.: the frames before it, slowing to slow motion at the blow. |
| E | `feat/move-list` | Move list: every move and combo, grouped (ground, smash, air, special, sword, gun); the selected move plays on a robot in a loop with its input. |

PRs B to E each build on the previous one where they touch the same scenes
(C uses B's menu helpers, D uses C's teams), so they are stacked in that order.
