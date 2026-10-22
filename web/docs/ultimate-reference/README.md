# Smash Ultimate reference fighters vs Kubotz

Reference data for tuning Kubotz to feel like Super Smash Bros. Ultimate:
Fox, Falco, Captain Falcon and Samus, next to a Kubot as it is now. The raw
numbers are in [fighters.json](fighters.json).

Source: [ultimateframedata.com](https://ultimateframedata.com) (character
stats and frame data, game version 13.0.x), cross-checked with
[kuroganehammer.com](https://kuroganehammer.com/Ultimate/Fox) for Fox.
Fetched 2026-10-22. Kubotz values are from `web/src/config.ts` and
`web/src/game/Kubotz.ts` on the controls branch (PR #23).

## Converting between the two

Ultimate measures distance in its own units and time in frames (60 per
second). Kubotz measures distance in units (a Kubot is 2 units tall, 1 unit =
64 px) and time in seconds or milliseconds.

The only free choice is the size ratio **s**, Kubotz units per Ultimate unit.
A typical Ultimate fighter stands about 15 units tall and a Kubot 2, so
**s = 2 / 15 ≈ 0.133**. (This is an estimate; change `s` and every converted
value scales with it.)

| Quantity | Ultimate | Kubotz | Ultimate → Kubotz | Kubotz → Ultimate |
|---|---|---|---|---|
| Time | frames (f) | ms | ms = f × 16.67 | f = ms / 16.67 |
| Speed | units/frame | units/s | × 60 × s (≈ × 8.0) | ÷ 8.0 |
| Acceleration, gravity | units/frame² | units/s² | × 3600 × s (≈ × 477) | ÷ 477 |
| Damage | % (rises, ~300 % is lethal) | health % (falls from 100 %, 0 % explodes) | health lost = % / 3 | % = 3 × health lost |
| Knockback growth | formula below | multiplier 1 + 6.2 × health lost | — | — |

Knockback: Ultimate's formula is
KB = ((((p/10 + p·d/20) · 200/(w+100) · 1.4) + 18) · KBG/100) + BKB
(p = target % after the hit, d = damage, w = weight). For a forward smash it
is about 3× harder at 100 % than at 0 %, 4× at 150 % and 7× at 300 %, which
Kubotz follows with 1 + 6.2 × (health lost / 100).

## Movement (converted to Kubotz units, s = 0.133)

| | Fox | Falco | Captain Falcon | Samus | **Kubot** |
|---|---|---|---|---|---|
| Walk (max) | 12.1 | 10.7 | 7.9 | 8.9 | **8.4** |
| Initial dash | 16.6 | 16.2 | 15.8 | 14.9 | **15.4** |
| Run | 19.1 | 12.9 | 20.3 | 13.2 | **14** |
| Air speed | 8.8 | 7.8 | 9.7 | 8.8 | **18** |
| Air acceleration (u/s²) | 43 | 48 | 36 | 43 | **30** |
| Gravity (u/s²) | 110 | 62 | 57 | 36 | **44 up, 132 down** |
| Fall speed | 16.7 | 14.3 | 14.8 | 10.6 | **32** |
| Fast fall | 26.7 | 22.9 | 23.7 | 16.9 | **44** |
| Weight | 77 | 82 | 104 | 108 | **(none: all equal)** |

Speeds in units/s. The Ultimate originals, in units/frame:

| | Fox | Falco | Captain Falcon | Samus |
|---|---|---|---|---|
| Walk / initial dash / run | 1.523 / 2.09 / 2.402 | 1.344 / 2.035 / 1.619 | 0.987 / 1.98 / 2.552 | 1.115 / 1.87 / 1.654 |
| Air speed / air accel | 1.11 / 0.09 | 0.977 / 0.1 | 1.218 / 0.075 | 1.103 / 0.09 |
| Gravity / fall / fast fall | 0.23 / 2.1 / 3.36 | 0.13 / 1.8 / 2.88 | 0.12 / 1.865 / 2.984 | 0.075 / 1.33 / 2.128 |

## Jumps and timing (frames, 60 per second)

| | Fox | Falco | Captain Falcon | Samus | **Kubot** |
|---|---|---|---|---|---|
| Jump squat | 3 | 3 | 3 | 3 | **3** (50 ms) |
| Short hop air time | 24 | 32 | 34 | 44 | **30** |
| Full hop air time | 36 | 57 | 48 | 61 | **44** (28 up, 16 down) |
| Short / full hop, fast-fallen | 17 / 27 | 23 / 41 | 24 / 34 | 31 / 43 | — |
| Jumps | 2 | 2 | 2 | 2 | **3** |
| Shield drop | 11 | 11 | 11 | 11 | **0** |
| Shield grab | 10 | 10 | 10 | 19 | — |

## Attacks and defence (frames)

| | Fox | Falco | Captain Falcon | Samus | **Kubot** |
|---|---|---|---|---|---|
| Jab 1: first hit / total | 2 / 17 | 2 / 22 | 3 / 17 | 3 / 17 | **5 / 16** |
| Forward tilt: first hit / total | 6 / 23 | 6 / 24 | 7 / 29 | 8 / 33 | **7 / 23** |
| Forward smash: first hit / total | 13 / 45 | 17 / 48 | 19 / 59 | 10 / 48 | **14 / 34** (+ charge) |
| Forward smash damage | 14 % | 16 % | 19 % | 12–14 % | **14** (= 42 % in Ultimate terms) |
| Standing grab: first frame / total | 6 / 36 | 6 / 34 | 6 / 35 | 15 / 59 | — |
| Spot dodge intangible | 3–14 | 3–17 | 3–17 | 3–17 | — |
| Forward roll: intangible / total | 4–12 / 26 | 4–15 / 29 | 4–15 / 30 | 4–18 / 34 | **4–15 / 31** |
| Back roll: intangible / total | 4–14 / 32 | 5–16 / 34 | 5–16 / 35 | 5–20 / 39 | **4–15 / 31** |
| Neutral air dodge: intangible / total | 2–26 / 38 | 2–27 / 43 | 3–30 / 42 | 3–29 / 56 | **0–21 / 21** |

Some frame totals (spot dodge, air dodge) come from table cells without
column headers on the source page and were read from their layout.

## What stands out

- **Falling is about twice as fast as in Ultimate.** Kubot gravity on the way
  down is 132 u/s² against 36–110, and its fall speed 32 against 11–17. That is
  most of the "floaty vs heavy" difference.
- **Air speed is about twice Ultimate's** (18 against 8–10), and air
  acceleration lower. Bringing it down shortens jumps between platforms, so
  the arenas would need checking.
- **Ground movement now sits between Falco/Samus and Fox/Falcon**: run 14,
  initial dash 15.4.
- **Jabs come out late**: frame 5 against 2–3.
- **The forward smash damage is 42 % in Ultimate terms**, about three times a
  real forward smash, because health counts down from 100 and 0 explodes.
- **Kubots have three jumps, no shield drop delay and no weight**; Ultimate
  fighters have two jumps, an 11-frame shield drop and a weight from 77
  (Fox) to 108 (Samus).
