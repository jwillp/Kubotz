# Combat mechanics

How a fight works in Kubotz, and the Super Smash Bros. Ultimate terms
players use for it: hitlag, DI, SDI, hitstun, teching and the rest. Inputs
are given for a gamepad (A fists, X legs, B / Y jump, LB / RB grab, LT / RT
shield, left stick to move and aim).

Times are in frames at 60 frames a second (1 frame ≈ 16.7 ms), as in
Ultimate. Every number below is a constant at the top of
`web/src/game/Kubotz.ts` (or in `web/src/config.ts`), so all of it can be
tuned.

## Health and knockback

A Kubot starts at 100 % health and explodes at 0 %. The lower its health,
the further hits send it: knockback is multiplied by
1 + 6.2 × (health lost / 100), so a Kubot at 50 % flies about 4 times as far
as a fresh one. In Ultimate terms, 1 point of health lost is about 3 % of
damage (0 % health ≈ 300 %).

A hit sends the Kubot along the move's **launch angle** (0° straight
forwards, 90° straight up). Light hits (the first jab hits, the first plasma blade
slashes) only push and briefly stun, so the next hit of the combo connects.

## What happens when a hit lands

A hit plays out in this order:

1. **Hitlag** (both Kubotz freeze)
2. **SDI** (during the freeze, the struck Kubot nudges itself)
3. **DI** (as the freeze ends, the stick bends the launch)
4. **Hitstun** (the struck Kubot flies and can't act)
5. **Tumble, tech or knockdown** (how it lands)

### Hitlag

Hitlag is the short freeze when a hit connects. Both the attacker and the
Kubot it hit stop in place, and the struck one shudders. It is what makes a
hit feel heavy, and it gives the struck player a moment to react.

- Length: (damage × 0.65 + 6) frames, at most 30. A jab (3 damage) freezes
  for 7 frames; a forward smash (14) for 15; the Ion Punch (22) for 20.
- On a shield the freeze is 0.67 × as long.
- Lasers and throws only freeze the target, not the shooter or thrower.

Everything timed on the Kubot waits during the freeze: the attack resumes
where it stopped, and hitstun starts only once the freeze ends.

### SDI (smash directional influence)

During hitlag, each newly pushed stick direction moves the struck Kubot a
little in that direction (0.22 units, up to 3 times per hit). Tap or wiggle
the stick to slip out of a multi-hit move or away from a follow-up. You
can't SDI down into the floor.

### DI (directional influence)

DI is the stick direction you hold as the hitlag ends. It bends your launch
angle by up to about 10° (0.17 radians). Only the part of the stick that is
across the launch counts:

- Launched to the side: hold up or down to send yourself higher or lower.
- Launched upwards: hold left or right to drift sideways.
- Holding along the launch (or against it) does nothing.

On launches that are nearly vertical (65° to 115°), holding up also flies
9.5 % faster and holding down 8 % slower. Ultimate calls this LSI (launch
speed influence).

Good DI is how you survive. Near a side blast zone, hold up and towards the
stage ("survival DI"). Against a combo, hold away from the attacker so the
next hit misses ("combo DI").

### Hitstun

After hitlag, the struck Kubot flies and can't act for its hitstun. Hitstun
grows with the launch speed (Ultimate's 0.4 × knockback frames, about
28 ms per unit/s). A combo is a string of hits that each land before the
hitstun of the previous one ends.

When a launch is strong enough, the Kubot **tumbles** (spins through the
air) and bounces off walls and ceilings. A tumbling Kubot can cut its
hitstun short, as in Ultimate:

- From frame 40 of hitstun: an air dodge (LT / RT).
- From frame 45: an aerial attack (A) or a special (X).

### Teching

A tech is how a tumbling Kubot recovers when it hits a surface. Press LT /
RT at most 11 frames before you touch it:

- **Floor tech**: you land on your feet, intangible for 20 frames.
- **Tech roll**: hold left or right as you tech to roll that way.
- **Wall or ceiling tech**: you stop against it, intangible for 20 frames,
  then fall instead of bouncing off.

Pressing too early locks you out for 40 frames, so mashing doesn't work. You
have to time the press.

### Missed tech and getting up

Without a tech, a tumbling Kubot bounces off the floor and lands lying down
(the bounce means the tech was missed; the next landing can't tech). After
26 frames you choose how to get up:

- Up, B / Y or LT / RT: stand up (intangible for 22 frames).
- Left or right: roll that way.
- A or X: a get-up attack that kicks both sides.

If you press nothing, the Kubot stands up by itself after 60 frames. While
it lies down it can be hit but not grabbed.

## Grabs

LB / RB grabs an opponent in front of you (a raised shield can't be
grabbed). While holding, A pummels (a knee, 3 damage) and a stick direction
throws forwards, backwards, up or down.

**Mashing out.** A grabbed Kubot breaks free when its hold timer runs out:

- The hold lasts 90 frames + 1.7 frames per Ultimate % (1.5 s at full
  health, about 4 s at 70 %, 6.6 s at 40 %).
- Every button pressed takes 14.4 frames off. That includes A, X, B / Y,
  LB / RB and LT / RT.
- Every newly pushed stick direction takes 8 frames off, so spin the stick.
- A grab always lasts at least 19 frames. Pummels don't stop the mashing.

Mashing hard gets you out in well under a second at most health levels.

**Grab release.** When the timer runs out, both Kubotz are pushed apart and
stuck for 29 frames. The Kubot that broke free then blinks for 60 frames,
and grabs miss it while it blinks, so it can't be grabbed again straight
away.

## Shield

Hold LT / RT on the ground to raise the shield bubble. It soaks hits but
shrinks while held and with every hit, and breaking it leaves you stunned
(2.5 s).

- **Shieldstun**: a hit keeps the shield up for damage × 0.8 + 2 frames (a
  third of that from aerials), even if you let go. That gap is what lets
  an attacker act before you can punish.
- **Shield drop**: letting go takes 11 frames before you can act.
- **Parry**: let go of the shield at most 5 frames before a hit lands. The
  hit does nothing, and you can act at once.
- **Out of shield**: these skip the shield drop:
  - B / Y or a flick up: jump.
  - LB / RB: grab.
  - Up + X: up special.
  - Up + A: up smash.
- **Roll**: shield + left or right.
- **Spot dodge**: shield + down dodges in place. It is intangible from
  frame 3 to 17 of 27.

## Dodges and intangibility

An **intangible** Kubot can't be touched: hits and lasers pass through it.
An **invincible** one is touched but takes nothing. Kubotz are intangible
during:

- the middle of a roll, a spot dodge or an air dodge;
- techs and get-ups;
- the first ledge catch (see below);
- the spawn beam.

## Ledges

Falling past a ledge catches it. From the ledge:

- Toward the stage: climb up.
- Up: jump.
- A: get-up attack.
- LT / RT: roll in.
- Down or away from the stage: let go.

- The catch makes you intangible for 37 frames, but only once. You get it
  back after landing on the stage or being hit, so hanging on and
  re-catching the ledge is not a safe way to wait.
- **Ledge trump**: catching a ledge that another Kubot is hanging from takes
  it and pops the other Kubot off backwards, helpless for 30 frames. A Kubot
  already climbing up keeps the ledge.

## Respawning

After a K.O., the Kubot reforms in the spawn hologram (intangible), then
drops into the arena. It is then **invincible for 2 seconds** (120 frames),
and the hologram's cyan orbs keep swirling around it while that lasts.
Attacking doesn't end it.

## Sources

Ultimate values from [SmashWiki](https://www.ssbwiki.com/) (hitlag, DI,
grabs, teching, respawn) and [ultimateframedata.com](https://ultimateframedata.com)
(see `docs/ultimate-reference/`). Some values have no published Ultimate
number and are estimates: the SDI distance, the tech and get-up lengths,
the shieldstun, and what a parry does to the attacker.
