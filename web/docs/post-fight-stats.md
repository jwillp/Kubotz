# Post-fight stats and highlights

After a match the review shows a stats table per Kubot, then up to 9 highlights: the 3 best K.O.s, recoveries and combos. Damage is in health points: every Kubot starts at 100 and explodes at 0, so 1 point = 1 % of the health bar.

The stats are counted live in `Kubotz.countHit` and `GameScene.checkDeaths`. The highlights are spotted and scored live by `ReplayRecorder` (`src/game/Replay.ts`) from every hit that gets through (`ArenaHooks.landed`) and every frame's Kubot positions, and played by `ResultsScene`.

## Stats table

A hit counts only when it gets through: hits on a raised guard, a shield power-up, an invincible Kubot or a dodging Kubot add nothing. Laser bolts and flying K.O. debris count like any other hit.

| Column | How it is counted |
| --- | --- |
| K.O.s | +1 for the Kubot that hit the victim last, if that hit was less than 6 s before the K.O. A fall with no recent hit gives nobody a K.O. |
| Falls | +1 every time the Kubot is K.O.'d, whoever caused it (self-destructs included). |
| Damage dealt | Sum of the damage of the Kubot's hits that got through, capped at the health the victim had left. |
| Damage taken | Same sum, seen from the Kubot that was hit. |
| Hits | Number of the Kubot's hits that got through. |
| Best combo | The longest run of hits by this Kubot on one victim, each landing before the previous hit's stun wore off. |

A hit "before the stun wore off" means before the later of the end of the previous hit's hitstun and 250 ms after it landed. A hit from someone else, or one after that window, starts a new run at 1.

## K.O. score

An early K.O. scores most. The blow is the killer's last hit, if it landed less than 3 s before the K.O.

    score = 2 × h / 100 + v / 20 + spike + combo + final

| Term | Meaning |
| --- | --- |
| h | Victim's health just before the blow (100 = full). |
| v | Launch speed of the blow, in units/s (light combo jabs launch at 0). |
| spike | +1 if the blow launched downward, more than 20° below level. |
| combo | +0.4 per hit if the blow ended a combo of 2 hits or more. |
| final | +1.5 if this K.O. ended the match. |

A K.O. with no killer (a fall on its own, or a last hit too long ago) has its score multiplied by 0.25.

## Recovery score

A recovery is a hard launch survived after coming within 7 units of the blast zone (6 units past the arena's sides and bottom, 20 above its top).

1. A hit launching a Kubot at 12 units/s or more starts watching it. Another hit while it is watched becomes the new blow; the closest distance so far is kept.
2. Every frame, the distance to the nearest blast-zone edge is measured; the smallest one and its time (the closest call) are kept.
3. The recovery ends once the Kubot has left the ground and then stands on a platform, or holds or climbs a ledge.
4. It counts only if the closest call was 7 units or less. A Kubot K.O.'d on the way, or still away after 9 s, is dropped.

    score = 3 × (1 − m / 7) + 0.3 × t + v / 25 + (1 − h_low / 100)

| Term | Meaning |
| --- | --- |
| m | Closest distance to the blast zone, in units (0 to 7). |
| t | Seconds from the blow to being safe. |
| v | Launch speed of the blow, in units/s. |
| h_low | Lowest health during the recovery. |

## Combo score

A combo is 3 or more hits by one Kubot on one victim, each landing before the previous hit's stun wore off (the Best combo rule). It ends at the first hit that does not chain, after 1.5 s with no new hit, or at the victim's K.O. (a K.O. within 1.5 s of the last hit is the combo's finish).

    score = d / 6 + 0.5 × min(n, 8) + (3 if it ended in a K.O.)

`d` is the combo's total damage and `n` its number of hits: damage weighs most, so a long chain of light jabs does not beat a few heavy hits.

## Picking and playing the highlights

The 3 highest scores of each kind are shown in this order: K.O.s, recoveries, combos, each opening with a title card and counting down from #3 to #1. While the match runs only the best 6 candidates per kind are kept. A moment is shown once: a recovery or combo is skipped when an already picked highlight shows the same Kubot for more than half of the shorter clip.

| Kind | Clip | Key moment | Speed |
| --- | --- | --- | --- |
| K.O. | 2.6 s before the blow to 0.6 s after the K.O. | The blow | 2.4× run-up, 0.2× from 0.2 s before to 0.35 s after, back to 1× by 0.9 s |
| Recovery | 1 s before the blow to 0.8 s after it is safe (at most 8 s, kept around the closest call) | The closest call | 1.3×, then 0.35× from 0.2 s before to 0.3 s after |
| Combo | 1.2 s before the first hit to 0.9 s after the last, or 0.6 s after its K.O. (at most 8 s) | The last hit | 1×, then 0.3× from 0.2 s before to 0.3 s after |
