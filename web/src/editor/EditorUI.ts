import Phaser from 'phaser';
import './editor.css';
import { BootScene } from '../scenes/BootScene';
import type { Pose } from '../anim/Rig';
import { PARTS, type ClipEvent } from '../anim/ClipEvents';
import type { EffectData, EmitterData } from '../fx/ParticleEffect';
import { PARTICLE_IMAGES } from '../scenes/BootScene';
import { installHelp } from './Help';
import { sampleClip, type Ease } from '../anim/Clips';
import type { MoveData } from '../game/Kubotz';
import { StageScene } from './StageScene';
import { ArenaScene, type ArenaTool } from './ArenaScene';
import { DEFAULT_BLAST, DEFAULT_SIZE, type ArenaData, type TilePaint } from '../map/Arenas';
import { ROOMS } from '../fx/Backdrops';
import type { TmxMap } from '../map/TmxMap';
import { FRAME_MS, PIECE_NAMES, POINT_KINDS, piecesOf, pointOf, setPoint, type PointKind } from './Store';
import { Timeline } from './Timeline';
import { host, store } from './Host';

/**
 * Kubotz Editor: tune the robots' clips and moves (poses, hit circles,
 * active frames, launches, particle events), the particle effects and the
 * arenas, then save them back to src/data. It runs on a page of its own
 * (editor.html, `npm run editor`) or inside the game (dev builds: the
 * title's Editor entry), drawn over the game's canvas: there it has the
 * Animation and Particles tabs (arenas are edited in a match, DevHud.ts).
 */

const root = document.getElementById('editor') ?? (host.gameEl ?? document.body).appendChild(Object.assign(document.createElement('div'), { id: 'editor' }));
if (host.inGame) { root.classList.add('in-game'); root.hidden = true; }

// ------------------------------------------------------------------ helpers
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...kids: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const { cls, ...rest } = props;
  if (cls) el.className = cls;
  Object.assign(el, rest);
  for (const k of kids) if (k !== null && k !== false) el.append(k);
  return el;
}
const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

// ------------------------------------------------------------------ layout
const status = h('span', { cls: 'status' });
const saveBtn = h('button', { cls: 'btn primary', textContent: 'Save', title: 'Writes the changed files (Ctrl+S). On the published page it downloads them instead.' });
/** The editor's tabs: robot animation and moves, particle effects, and arenas (next). */
type Tab = 'anim' | 'particles' | 'arena';
let tab: Tab = 'anim';
const tabBtn = (t: Tab, label: string, help: string) => { const b = h('button', { textContent: label, title: help, onclick: () => setTab(t) }); b.dataset.tab = t; return b; };
const nav = h('nav', {},
  tabBtn('anim', 'Animation', 'Clips, poses, hit circles and particle events.'),
  tabBtn('particles', 'Particles', 'Particle effects: what they look like and how they move.'),
  // Inside the game arenas are edited in a match (the dev HUD, F2).
  ...(host.inGame ? [] : [tabBtn('arena', 'Arena', 'Arenas: walls, platforms, portals, spawns, bonus spots, tiles and the room behind.')]));
const filesLabel = h('span', { cls: 'files' });
const header = h('header', {},
  h('span', { cls: 'brand', textContent: 'KUBOTZ EDITOR' }),
  nav,
  filesLabel,
  h('span', { cls: 'grow' }),
  status,
  h('button', { cls: 'btn', textContent: 'Undo', title: 'Undo the last change (Ctrl+Z).', onclick: () => store.undo() }),
  h('button', { cls: 'btn', textContent: 'Redo', title: 'Redo what was undone (Ctrl+Shift+Z).', onclick: () => store.redo() }),
  ...(host.inGame
    ? [h('button', { cls: 'btn solid', textContent: 'Back to title', title: 'Leaves the editor. Unsaved changes stay in the game (matches play them) until you reload.', onclick: () => host.close?.() })]
    : [h('button', { cls: 'btn solid', textContent: 'Test in game', title: 'Opens the game in a new tab with these changes, saved or not', onclick: () => testInGame() })]),
  saveBtn,
);
saveBtn.onclick = () => void save();

const search = h('input', { cls: 'search', placeholder: 'Find a move or clip', type: 'search', title: 'Filters the list by name, clip or category.' });
const list = h('div');
const left = h('aside', { cls: 'left' }, search, list);

// Inside the game the stage is a window onto the game's canvas, under the panels.
const stageEl = h('div', { id: 'stage' }, host.inGame ? '' : h('div', { cls: 'splash', textContent: 'Loading the robot…' }));
const readout = h('div', { cls: 'readout' });
const check = (label: string, help: string, on: boolean, fn: (v: boolean) => void) => {
  const box = h('input', { type: 'checkbox', checked: on });
  box.onchange = () => fn(box.checked);
  const el = h('label', {}, box, label);
  el.dataset.help = help;
  return el;
};
const toolbar = h('div', { cls: 'toolbar' });
/** Transport icons (24 px grid, drawn in the button's text colour). */
const ICON = {
  prevKey: '<path d="M6 5v14M18 5 9 12l9 7z"/>',
  prevFrame: '<path d="M15 6l-6 6 6 6"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  nextFrame: '<path d="M9 6l6 6-6 6"/>',
  nextKey: '<path d="M18 5v14M6 5l9 7-9 7z"/>',
};
function iconButton(icon: keyof typeof ICON, help: string, onclick: () => void, cls = 'btn icon'): HTMLButtonElement {
  const b = h('button', { cls, title: help, onclick });
  b.setAttribute('aria-label', help);
  b.innerHTML = svg(icon);
  return b;
}
const svg = (icon: keyof typeof ICON) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[icon].replace(/z"/g, 'z" fill="currentColor"')}</svg>`;
const playBtn = iconButton('play', 'Play or pause (Space).', () => { if (stage) { stage.playing = !stage.playing; store.emit(); } }, 'btn icon solid');
const SPEEDS = [1, 0.5, 0.33, 0.25, 0.1];
const speed = h('select', { title: 'Playback speed. "Custom..." lets you type any speed.' },
  ...SPEEDS.map((v) => h('option', { value: String(v), textContent: `${v}x` })),
  h('option', { value: 'custom', textContent: 'Custom...' }));
const customSpeed = h('input', { cls: 'custom-speed', type: 'number', min: '0.01', max: '4', step: '0.05', value: '0.75', hidden: true, title: 'Playback speed, from 0.01x to 4x.' });
const info = h('span', { cls: 'info' });
const transport = h('div', { cls: 'transport' },
  iconButton('prevKey', 'Previous key (Shift+Left).', () => jumpKey(-1)),
  iconButton('prevFrame', 'Previous frame (Left).', () => step(-1)),
  playBtn,
  iconButton('nextFrame', 'Next frame (Right).', () => step(1)),
  iconButton('nextKey', 'Next key (Shift+Right).', () => jumpKey(1)),
  speed,
  customSpeed,
  info,
);
const timeline = new Timeline(store);
const main = h('main', {}, toolbar, stageEl, h('div', {}, transport, timeline.el));
const right = h('aside', { cls: 'right' });
root.append(header, h('div', { cls: 'body' }, left, main, right));

// ------------------------------------------------------------------ the stage (Phaser)
let stage: StageScene | null = null;
const game = host.game ?? new Phaser.Game({
  type: Phaser.AUTO,
  parent: stageEl,
  backgroundColor: '#0d1015',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  render: { antialias: true, maxLights: 8 },
  scene: [BootScene, StageScene, ArenaScene],
  callbacks: {
    preBoot: (game) => { game.registry.set('bootNext', 'Editor'); game.registry.set('store', store); },
    postBoot: (game) => {
      game.events.on('step', () => {
        const s = game.scene.getScene('Editor') as StageScene | null;
        if (s && s.sys.isActive() && !stage) {
          stage = s;
          stageEl.querySelector('.splash')?.remove();
          stageEl.append(readout);
          buildToolbar();
          // A tab picked while the robot was loading.
          if (tab === 'arena') { game.scene.sleep('Editor'); game.scene.run('Arena'); }
          stage.mode = tab === 'particles' ? 'particles' : 'anim';
          store.emit();
        }
      });
    },
  },
});

function labelledSelect(label: string, help: string, options: string[], fn: (i: number) => void): HTMLElement {
  const sel = h('select', {}, ...options.map((o, i) => h('option', { value: String(i), textContent: o })));
  sel.onchange = () => fn(Number(sel.value));
  const el = h('label', {}, label, sel);
  el.dataset.help = help;
  return el;
}

function buildToolbar(): void {
  const v = stage!.view;
  if (tab === 'arena') { buildArenaToolbar(); return; }
  if (tab === 'particles') {
    const p = stage!.preview;
    toolbar.replaceChildren(
      check('Mirrored', 'Plays the effect mirrored, the way a robot facing left plays it (effects are made facing right).', p.flip, (on) => (p.flip = on)),
      check('Robot for scale', 'Shows a faint robot beside the effect, to judge its size.', p.robot, (on) => (p.robot = on)),
      h('button', { cls: 'btn', textContent: 'Recentre', title: 'Frames the stage again at the default zoom.', onclick: () => stage?.recentre() }),
      h('span', { cls: 'hint', textContent: 'The effect plays over and over from the cross · pinch or wheel to zoom · drag to pan' }),
    );
    return;
  }
  toolbar.replaceChildren(
    check('Handles', 'Shows the orange bone knobs: drag one to turn that bone and the bones it carries (hold Shift to turn it alone). Drag the white square on the hips to move the whole body.', v.handles, (on) => (v.handles = on)),
    check('Onion skin', 'Shows faint white copies of the robot at the key before and the key after this frame, so you can see where the motion comes from and goes to.', v.onion, (on) => (v.onion = on)),
    check('Target dummy', 'A blue robot standing in front, with its hurtbox. It flashes white when an active hit circle touches it. Drag it to move it closer or further.', v.dummy, (on) => (v.dummy = on)),
    labelledSelect('Helmet', 'Which helmet the robot wears on the stage (only for looking; every robot plays the same moves).', ['flame', 'terminator', 'big buff', 'skull'], (i) => (v.helmet = i)),
    h('button', { cls: 'btn', textContent: 'Recentre', title: 'Frames the robot again at the default zoom.', onclick: () => stage?.recentre() }),
    h('span', { cls: 'hint', textContent: 'Drag knobs to pose · red dots move hit points · pinch or wheel to zoom · drag empty space or two fingers to pan' }),
  );
}

// ------------------------------------------------------------------ transport
const frames = () => Math.max(1, Math.round(store.playMs / FRAME_MS));
function step(d: number): void {
  if (stage) stage.playing = false;
  const f = frames();
  store.select({ t: ((Math.round(store.sel.t * f) + d + f) % f) / f });
}
function jumpKey(d: number): void {
  if (stage) stage.playing = false;
  const keys = store.clipData.keys.map((k) => k.t);
  const t = store.sel.t;
  const next = d > 0 ? keys.find((k) => k > t + 1e-4) ?? keys[0] : [...keys].reverse().find((k) => k < t - 1e-4) ?? keys[keys.length - 1];
  store.select({ t: next });
}
speed.onchange = () => {
  const custom = speed.value === 'custom';
  customSpeed.hidden = !custom;
  if (custom) { customSpeed.focus(); customSpeed.select(); }
  if (stage) stage.rate = custom ? Math.max(0.01, Number(customSpeed.value) || 1) : Number(speed.value);
};
customSpeed.oninput = () => { if (stage && Number(customSpeed.value) > 0) stage.rate = Math.min(4, Number(customSpeed.value)); };

/** The game page: index.html next to the editor (game.html in the published build, whose own page is the editor). */
function testInGame(): void {
  store.stash();
  // From the Arena tab: straight into a match in the open arena.
  const arena = tab === 'arena' && store.sel.arena ? `&arena=${encodeURIComponent(store.sel.arena)}` : '';
  const url = `./${import.meta.env.DEV ? 'index' : 'game'}.html?edited${arena}`;
  if (!window.open(url, '_blank')) location.href = url;
}

async function save(): Promise<void> {
  try { status.textContent = await store.save(); } catch (e) {
    const code = (e as { code?: string }).code;
    status.textContent = code === 'declined' ? 'Not saved' : `Save failed: ${(e as Error).message ?? String(e)}`;
  }
}

// ------------------------------------------------------------------ the list
/** Moves and clips in the game's move-list groups, with the game's names. */
function buildList(): void {
  if (tab === 'particles') { buildEffectList(); return; }
  if (tab === 'arena') { buildArenaList(); return; }
  const q = search.value.trim().toLowerCase();
  const kids: HTMLElement[] = [];
  let group = '';
  for (const e of store.fullList()) {
    if (q && !`${e.group} ${e.label} ${e.anim}`.toLowerCase().includes(q)) continue;
    if (e.group !== group) { group = e.group; kids.push(h('div', { cls: 'group', textContent: group })); }
    const on = e.ref ? store.sel.move?.table === e.ref.table && store.sel.move.key === e.ref.key : !store.sel.move && store.sel.clip === e.anim;
    const item = h('button', { cls: `item${on ? ' on' : ''}`, onclick: () => store.select({ move: e.ref, clip: e.anim, t: 0 }) }, e.label, h('small', { textContent: e.anim }));
    item.dataset.help = e.ref
      ? `A move: plays the "${e.anim}" clip. Its hit circles, active frames and launch are tuned here.`
      : `A clip with no hit of its own: pose it here. ${store.docs.clips[e.anim].ms} ms.`;
    kids.push(item);
  }
  list.replaceChildren(...kids);
}
search.oninput = buildList;

// ------------------------------------------------------------------ the inspector
interface Bound { input: HTMLInputElement | HTMLSelectElement; get: () => string | boolean }
let bound: Bound[] = [];
let shape = '';
/** Which sections are open (remembered between visits). */
const OPEN_KEY = 'kubotz-editor-open';
const open: Record<string, boolean> = (() => { try { return JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}') as Record<string, boolean>; } catch { return {}; } })();
const propSearch = h('input', { cls: 'search', type: 'search', placeholder: 'Find a property' });
const sectionsEl = h('div');
right.append(h('div', { cls: 'prop-search' }, propSearch), sectionsEl);
propSearch.oninput = () => filterProps();

/** A field's label with its help (shown on hover or a long press). */
function labelled(cls: string, label: string, help: string, input: HTMLElement): HTMLElement {
  const el = h('label', { cls }, h('span', { textContent: label }), input);
  el.dataset.help = help;
  el.dataset.find = `${label} ${help}`.toLowerCase();
  return el;
}
function num(label: string, help: string, get: () => number | undefined, set: (v: number | undefined) => void, opts: { step?: number; placeholder?: string; cls?: string; digits?: number } = {}): HTMLElement {
  const input = h('input', { type: 'number', step: String(opts.step ?? 1), placeholder: opts.placeholder ?? '' });
  input.oninput = () => set(input.value === '' ? undefined : Number(input.value));
  input.onchange = () => store.endDrag();
  bound.push({ input, get: () => { const v = get(); return v === undefined ? '' : String(round(v, opts.digits ?? 2)); } });
  return labelled(`field ${opts.cls ?? ''}`, label, help, input);
}
/** A drop-down; options are values, or [value, label] pairs. */
function pick(label: string, help: string, options: (string | [string, string])[], get: () => string, set: (v: string) => void): HTMLElement {
  const input = h('select', {}, ...options.map((o) => (typeof o === 'string' ? [o, o] : o)).map(([v, l]) => h('option', { value: v, textContent: l })));
  input.onchange = () => set(input.value);
  bound.push({ input, get });
  return labelled('field', label, help, input);
}
function flag(label: string, help: string, get: () => boolean, set: (v: boolean) => void): HTMLElement {
  const input = h('input', { type: 'checkbox' });
  input.onchange = () => set(input.checked);
  bound.push({ input, get });
  const el = h('label', {}, input, label);
  el.dataset.help = help;
  el.dataset.find = `${label} ${help}`.toLowerCase();
  return el;
}
/** A collapsible section; `extra` sits at the right of its heading. */
function section(id: string, title: string, body: HTMLElement[], opts: { extra?: HTMLElement; closed?: boolean } = {}): HTMLElement {
  const d = h('details', { cls: 'section', open: open[id] ?? !opts.closed });
  d.dataset.id = id;
  d.addEventListener('toggle', () => {
    if (propSearch.value) return;
    open[id] = d.open;
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(open)); } catch { /* not remembered */ }
  });
  const sum = h('summary', {}, h('span', { textContent: title }));
  if (opts.extra) { opts.extra.addEventListener('click', (e) => e.preventDefault(), true); sum.append(opts.extra); }
  d.append(sum, ...body);
  return d;
}
const grid = (cols: 1 | 2 | 3, ...kids: HTMLElement[]) => h('div', { cls: `fields${cols === 3 ? ' three' : cols === 1 ? ' one' : ''}` }, ...kids);

/** Edits the selected move's data. */
function editMove(fn: (m: MoveData) => void, drag = true): void {
  const ref = store.sel.move!;
  store.edit('moves', (d) => fn((d.moves[ref.table] as unknown as Record<string, MoveData>)[ref.key]), drag);
}
const setOpt = <T extends object, K extends keyof T>(o: T, k: K, v: T[K] | undefined) => { if (v === undefined) delete o[k]; else o[k] = v; };

/** The pose fields, by body part: what each bone is, and its key in the data. */
const POSE_GROUPS: { id: string; title: string; fields: [keyof Pose, string, string][] }[] = [
  { id: 'pose-body', title: 'Body', fields: [
    ['x', 'forward', 'Moves the whole robot forwards (pixels of the art). On a root-motion clip the body really travels by it in the game.'],
    ['y', 'up', 'Lifts the whole robot (pixels of the art). With "feet on the ground", this is a hop above the floor.'],
    ['tilt', 'lean', 'Leans the whole robot forwards round its feet (degrees).'],
    ['spin', 'flip', 'Turns the whole robot round the middle of its body (degrees, positive is a forward flip).'],
    ['yaw', 'turn', 'Turns the robot round the vertical axis (degrees), for spins.'],
    ['body', 'hips', 'Direction of the hips bone (degrees, facing right: 0 forwards, 90 up). Its children (torso and thighs) follow it on the stage.'],
  ] },
  { id: 'pose-top', title: 'Torso and head', fields: [
    ['torso', 'torso', 'Direction of the torso (degrees, 90 is upright).'],
    ['head', 'head', 'Direction of the head (degrees, 90 is upright).'],
  ] },
  { id: 'pose-armF', title: 'Front arm', fields: [
    ['shoulderF', 'upper arm', 'Front upper arm (shoulderF), degrees: 0 forwards, 90 up, -90 down.'],
    ['armF', 'forearm', 'Front forearm (armF), degrees.'],
    ['handF', 'fist', 'Front fist (handF), degrees.'],
  ] },
  { id: 'pose-armB', title: 'Back arm', fields: [
    ['shoulderB', 'upper arm', 'Back upper arm (shoulderB), degrees.'],
    ['armB', 'forearm', 'Back forearm (armB), degrees.'],
    ['handB', 'fist', 'Back fist (handB), degrees.'],
  ] },
  { id: 'pose-legF', title: 'Front leg', fields: [
    ['thighF', 'thigh', 'Front thigh (thighF), degrees: -90 is straight down.'],
    ['legF', 'shin', 'Front shin (legF), degrees.'],
    ['footF', 'boot', 'Front boot (footF), degrees: it points down to the sole.'],
  ] },
  { id: 'pose-legB', title: 'Back leg', fields: [
    ['thighB', 'thigh', 'Back thigh (thighB), degrees.'],
    ['legB', 'shin', 'Back shin (legB), degrees.'],
    ['footB', 'boot', 'Back boot (footB), degrees.'],
  ] },
];

function buildInspector(): void {
  bound = [];
  const s = store;
  const out: HTMLElement[] = [];
  const key = s.keyAt();
  const f = frames();
  const fr = Math.round(s.sel.t * f);

  // The move: what the hit does, when, and where its circles are.
  const m = s.move();
  if (m) {
    const name = s.sel.move!.table === 'combo' || s.sel.move!.table === 'swordCombo' ? `${s.sel.move!.table === 'combo' ? 'jab' : 'sword jab'} ${Number(s.sel.move!.key) + 1}` : s.sel.move!.key;
    out.push(h('div', { cls: 'inspector-title', textContent: `Move · ${name}` }));
    out.push(section('hit', 'Hit', [grid(2,
      num('Damage %', 'Damage dealt to the robot that is hit.', () => s.move()!.damage, (v) => editMove((mm) => { mm.damage = v ?? 0; })),
      num('Knockback', 'How hard the hit sends the robot flying (units per second, before damage makes it grow).', () => s.move()!.launch.knockback, (v) => editMove((mm) => { mm.launch.knockback = v ?? 0; })),
      num('Launch angle °', 'Direction the robot is sent: 0 straight forwards, 90 straight up, negative angles spike downwards. Shown as the red arrow on the stage.', () => s.move()!.launch.angle, (v) => editMove((mm) => { mm.launch.angle = v ?? 0; })),
      num('Hitstun ms', 'How long the hit robot cannot act. Leave empty to work it out from the knockback; a short fixed stun lets combo hits link.', () => s.move()!.launch.stun, (v) => editMove((mm) => setOpt(mm.launch, 'stun', v)), { placeholder: 'from knockback' }),
      num('Growth', 'How much more the knockback grows with the damage the target has taken (1 = normal).', () => s.move()!.launch.growth, (v) => editMove((mm) => setOpt(mm.launch, 'growth', v)), { step: 0.1, placeholder: '1' }),
    )]));
    out.push(section('timing', 'Timing', [grid(2,
      num('Length ms', `How long the move lasts; the clip is stretched to it (${f} frames at 60 fps).`, () => s.move()!.ms, (v) => editMove((mm) => { mm.ms = v ?? mm.ms; })),
      pick('Clip', 'The animation this move plays.', Object.keys(s.docs.clips), () => s.move()!.anim, (v) => { editMove((mm) => { mm.anim = v; }, false); s.select({ clip: v }); }),
      num('Active from frame', 'First frame the hit circles can hurt (startup). Also the left end of the red bar on the timeline.', () => s.move()!.active[0] * f, (v) => editMove((mm) => { mm.active = [Math.max(0, (v ?? 0) / f), mm.active[1]]; }), { digits: 0 }),
      num('Active to frame', 'Last frame the hit circles can hurt. The frames after it are the end lag.', () => s.move()!.active[1] * f, (v) => editMove((mm) => { mm.active = [mm.active[0], Math.min(1, (v ?? 0) / f)]; }), { digits: 0 }),
    )]));
    out.push(section('circles', 'Hit circles', [
      grid(2,
        pick('Points', `Which parts strike: a set of points on the part images (fists, feet, blade...). Shared by ${s.pointSetUsers(m.points)} moves, so dragging a red dot moves it for all of them.`, Object.keys(s.docs.moves.pointSets), () => s.move()!.points, (v) => editMove((mm) => { mm.points = v; }, false)),
        num('Radius units', 'Size of each hit circle (1 unit = one map tile). Empty uses the default: 0.35, or 0.3 for the sword.', () => s.move()!.radius, (v) => editMove((mm) => setOpt(mm, 'radius', v)), { step: 0.05, placeholder: m.points === 'blade' ? '0.3' : '0.35' }),
      ),
      h('div', { cls: 'checks' },
        flag('every point hits', 'Off: only the point furthest forward strikes (the leading fist or foot). On: every point has a circle (spins, splits).', () => !!s.move()!.all, (v) => editMove((mm) => setOpt(mm, 'all', v || undefined), false)),
        flag('both sides', 'Hits on both sides, each robot sent away from the attacker (down smash).', () => !!s.move()!.both, (v) => editMove((mm) => setOpt(mm, 'both', v || undefined), false)),
        flag('behind', 'The strike goes backwards (back air): the point furthest back strikes and the launch goes the other way.', () => !!s.move()!.behind, (v) => editMove((mm) => setOpt(mm, 'behind', v || undefined), false)),
      ),
    ]));
    out.push(section('effects', 'Effects', [
      h('p', { cls: 'note', textContent: 'What the move shows besides the hit itself. They play for the whole move and show on the Effects row of the timeline.' }),
      h('div', { cls: 'checks' },
        flag('afterimages', 'Leaves fading copies of the robot behind it while it moves fast.', () => !!s.move()!.ghosts, (v) => editMove((mm) => setOpt(mm, 'ghosts', v || undefined), false)),
      ),
    ]));
    out.push(section('burst', 'Special motion', [grid(2,
      num('Burst forward', 'Specials: speed pushed forwards (units per second) during the first part of the move. Empty keeps the robot\'s own speed.', () => s.move()!.burst?.[0] ?? undefined, (v) => editMove((mm) => { mm.burst = [v ?? null, mm.burst?.[1] ?? null]; if (mm.burst.every((b) => b === null)) delete mm.burst; })),
      num('Burst up', 'Specials: speed pushed upwards (units per second, negative dives). Empty keeps the robot\'s own speed.', () => s.move()!.burst?.[1] ?? undefined, (v) => editMove((mm) => { mm.burst = [mm.burst?.[0] ?? null, v ?? null]; if (mm.burst.every((b) => b === null)) delete mm.burst; })),
      num('Sustain', 'Share of the move (0 to 1) the burst speed is held for.', () => s.move()!.sustain, (v) => editMove((mm) => setOpt(mm, 'sustain', v)), { step: 0.05, placeholder: '-' }),
    )], { closed: !m.burst }));
  }

  // The clip's particle events.
  out.push(section('particles', `Particles (${s.sel.clip})`, particleRows(), { extra: addParticleBtn() }));

  // The pose at this frame, by body part.
  out.push(h('div', { cls: 'inspector-title', textContent: key ? `Pose · key at frame ${fr}` : `Pose · frame ${fr} (no key)` }));
  const keyBtn = key
    ? h('button', { cls: 'btn', textContent: 'Delete key', onclick: () => deleteKey() })
    : h('button', { cls: 'btn', textContent: 'Add key', onclick: () => stage?.editPose(() => {}, false) });
  keyBtn.dataset.help = key ? 'Removes the key at this frame (Delete).' : 'Adds a key at this frame holding the pose shown (K). Changing any value below does it too.';
  out.push(section('key', 'Key', [
    key ? grid(2, pick('Ease into this key', 'How the motion from the previous key reaches this one: inOut is smooth, linear is even, snap whips most of the way at once, back overshoots then settles.', ['inOut', 'linear', 'in', 'out', 'back', 'snap'], () => s.keyAt()?.ease ?? 'inOut',
      (v) => s.edit('clips', () => { const k = s.keyAt(); if (k) k.ease = v as Ease; }))) : h('p', { cls: 'note', textContent: 'No key on this frame: the pose is blended from the keys around it. Changing a value adds a key here.' }),
  ], { extra: keyBtn }));
  for (const g of POSE_GROUPS) {
    out.push(section(g.id, g.title, [grid(3, ...g.fields.map(([b, label, help]) =>
      num(label, help, () => (s.keyAt()?.pose ?? sampleClip(s.clip, s.sel.t))[b], (v) => stage?.editPose((p) => { p[b] = v ?? 0; }),
        { cls: `bone${s.sel.bone === b ? ' picked' : ''}`, digits: 1 })))], { closed: g.id !== 'pose-body' && !g.fields.some(([b]) => b === s.sel.bone) && open[g.id] === undefined }));
  }

  // The clip and the hurtbox.
  out.push(h('div', { cls: 'inspector-title', textContent: `Clip · ${s.sel.clip}` }));
  out.push(section('clip', 'Clip settings', [
    grid(2, num('Length ms', 'The clip\'s own length. A move stretches it to its own length.', () => s.clipData.ms, (v) => s.edit('clips', (d) => { d.clips[s.sel.clip].ms = v ?? d.clips[s.sel.clip].ms; }, true))),
    h('div', { cls: 'checks' },
      flag('loops', 'Plays round and round (idle, run).', () => s.clipData.loop, (v) => s.edit('clips', (d) => { d.clips[s.sel.clip].loop = v; })),
      flag('feet on the ground', 'Lifts the robot so its lowest boot always touches the floor; "up" then adds a hop.', () => s.clipData.planted, (v) => s.edit('clips', (d) => { d.clips[s.sel.clip].planted = v; })),
      flag('root motion', 'The clip\'s forward motion moves the robot itself in the game, instead of only its drawing.', () => !!s.clipData.rootMotion, (v) => s.edit('clips', (d) => setOpt(d.clips[s.sel.clip], 'rootMotion', v || undefined))),
    ),
  ], { closed: true }));
  out.push(section('hurtbox', 'Hurtbox (every robot)', [grid(2,
    num('Width units', 'Width of the blue box where a robot can be hit, centred on it (1 unit = one map tile).', () => s.docs.moves.hurtbox.width, (v) => s.edit('moves', (d) => { d.moves.hurtbox.width = v ?? 1; }, true), { step: 0.05 }),
    num('Height units', 'Height of the blue box from the feet up.', () => s.docs.moves.hurtbox.height, (v) => s.edit('moves', (d) => { d.moves.hurtbox.height = v ?? 2.8; }, true), { step: 0.05 }),
  )], { closed: true }));
  out.push(section('shortcuts', 'Shortcuts and gestures', [
    h('div', { cls: 'keyline' }, ...['Space play', '← → frame', 'Shift+← → key', 'K add key', 'Del delete key', 'Ctrl+Z undo', 'Ctrl+S save'].map((t) => h('kbd', { textContent: t }))),
    h('p', { cls: 'note', textContent: 'Stage: two fingers pinch to zoom and move to pan (touch screen or touchpad); the mouse wheel zooms. Timeline: drag a key to retime it, right-click it to delete; drag the ends of the red bar to change the active frames. Hold the pointer on anything (or long-press it) to see what it does.' }),
  ], { closed: true }));
  sectionsEl.replaceChildren(...out);
  filterProps();
}

/** Edits one particle event of the selected clip. */
function editEvent(i: number, fn: (e: ClipEvent) => void, drag = false): void {
  store.edit('clips', (d) => fn(d.clips[store.sel.clip].events![i]), drag);
}

function addParticleBtn(): HTMLElement {
  const b = h('button', { cls: 'btn', textContent: 'Add here', onclick: () => {
    const effect = Object.keys(store.docs.particles)[0];
    if (!effect) return;
    store.edit('clips', (d) => {
      const clip = d.clips[store.sel.clip];
      clip.events = [...(clip.events ?? []), { t: Math.round(store.sel.t * 1000) / 1000, effect, part: 'hand', x: 0.5, y: 0.5, follow: true }].sort((a, b) => a.t - b.t);
    });
  } });
  b.dataset.help = 'Adds a particle effect starting at this frame, on the front fist. Pick the effect and the body part below, then drag the purple diamond on the stage to place it on that part.';
  return b;
}

/** One block per event: frame, effect, part, follow and charge. */
function particleRows(): HTMLElement[] {
  const s = store;
  const events = s.clipData.events ?? [];
  if (!events.length) return [h('p', { cls: 'note', textContent: 'No particles on this clip. "Add here" starts one at the current frame; it then shows as a purple diamond on the timeline and on the stage.' })];
  const f = frames();
  const effects = Object.keys(s.docs.particles);
  return events.map((_, i) => {
    const ev = () => s.clipData.events![i];
    const del = h('button', { cls: 'btn', textContent: 'Remove', onclick: () => s.edit('clips', (d) => { d.clips[s.sel.clip].events!.splice(i, 1); }) });
    del.dataset.help = 'Removes this particle event.';
    const go = h('button', { cls: 'btn', textContent: 'Go to', onclick: () => s.select({ t: ev().t }) });
    go.dataset.help = 'Moves the playhead to this event\'s frame, where its diamond can be dragged on the stage.';
    return h('div', { cls: 'event-row' },
      grid(2,
        pick('Effect', 'Which particle effect starts (src/data/particles).', effects, () => ev().effect, (v) => editEvent(i, (e) => { e.effect = v; })),
        num('Frame', `The frame it starts on (0 to ${f}).`, () => ev().t * f, (v) => editEvent(i, (e) => { e.t = Math.min(1, Math.max(0, (v ?? 0) / f)); }, true), { digits: 0 }),
        pick('On', 'The body part it starts on; "feet" is the ground under the robot.', Object.entries(PARTS), () => ev().part, (v) => editEvent(i, (e) => { e.part = v; })),
      ),
      h('div', { cls: 'checks' },
        flag('follows the part', 'On: the effect keeps coming from the part as it moves (a trail). Off: it stays where it started (a burst).', () => !!ev().follow, (v) => editEvent(i, (e) => setOpt(e, 'follow', v || undefined))),
        flag('while charging', 'Plays for as long as a smash attack is held charging on this clip, instead of at its frame. Tick "Preview charging" to see it.', () => !!ev().charge, (v) => editEvent(i, (e) => setOpt(e, 'charge', v || undefined))),
      ),
      h('div', { cls: 'keyline' }, go, del),
    );
  }).concat(s.clipData.events!.some((e) => e.charge)
    ? [h('div', { cls: 'checks' }, flag('Preview charging', 'Holds the stage as if the smash were charging, so the "while charging" effects play.', () => !!stage?.charging, (v) => { if (stage) stage.charging = v; }))]
    : []);
}

/** Shows only the properties matching the search, opening their sections. */
function filterProps(): void {
  const q = propSearch.value.trim().toLowerCase();
  for (const d of Array.from(sectionsEl.querySelectorAll<HTMLDetailsElement>('details.section'))) {
    const items = Array.from(d.querySelectorAll<HTMLElement>('[data-find]'));
    let any = false;
    for (const el of items) { const hit = !q || el.dataset.find!.includes(q); el.hidden = !hit; any ||= hit; }
    const titleHit = !!q && d.querySelector('summary')!.textContent!.toLowerCase().includes(q);
    if (titleHit) for (const el of items) el.hidden = false;
    d.hidden = !!q && !any && !titleHit;
    d.open = q ? true : open[d.dataset.id!] ?? d.open;
  }
  for (const t of Array.from(sectionsEl.querySelectorAll<HTMLElement>('.inspector-title'))) t.hidden = !!q;
}

function refreshInspector(): void {
  const s = store;
  const next = tab === 'arena' ? arenaShape() : tab === 'particles' ? `p|${s.sel.effect}|${s.docs.particles[s.sel.effect]?.emitters.length}|${Object.keys(s.docs.particles).length}|${particleShape()}` : `${s.clipData.events?.length ?? 0}|${s.sel.clip}|${s.sel.move?.table}:${s.sel.move?.key}|${!!s.keyAt()}|${s.sel.bone}|${frames()}|${Math.round(s.sel.t * frames())}`;
  if (next !== shape) { shape = next; if (tab === 'arena') buildArenaInspector(); else if (tab === 'particles') buildEffectInspector(); else buildInspector(); }
  for (const b of bound) {
    if (document.activeElement === b.input) continue;
    const v = b.get();
    if (b.input instanceof HTMLInputElement && b.input.type === 'checkbox') b.input.checked = v as boolean;
    else b.input.value = String(v);
  }
}

function deleteKey(): void {
  const k = store.keyAt();
  if (!k || store.clipData.keys.length <= 1) return;
  store.edit('clips', (d) => { const keys = d.clips[store.sel.clip].keys; keys.splice(keys.findIndex((x) => Math.abs(x.t - k.t) < 1e-9), 1); });
}

// ------------------------------------------------------------------ redraw on every change
let lastList = '';
store.on(() => {
  const s = store;
  const listShape = `${tab}|${s.sel.arena}|${Object.keys(s.docs.arenas).join()}|${Object.values(s.docs.arenas).map((a) => a.name + a.order).join()}|${s.sel.effect}|${Object.keys(s.docs.particles).join()}|${s.sel.clip}|${s.sel.move?.table}:${s.sel.move?.key}`;
  if (listShape !== lastList) { lastList = listShape; buildList(); stage?.clearEffects(); }
  refreshInspector();
  const f = frames();
  const fr = Math.round(s.sel.t * f);
  const m = s.move();
  const active = m && s.sel.t >= m.active[0] && s.sel.t <= m.active[1];
  readout.innerHTML = `${s.sel.clip} · frame ${fr} / ${f}${m ? (active ? ' · <b>active</b>' : ' · not active') : ''}${s.keyAt() ? ' · key' : ''}`;
  info.textContent = m ? `${m.ms} ms · ${f} frames · startup ${Math.round(m.active[0] * f)} · active ${Math.round(m.active[0] * f)}-${Math.round(m.active[1] * f)} · endlag ${f - Math.round(m.active[1] * f)}` : `${s.clipData.ms} ms · ${f} frames${s.clipData.loop ? ' · loops' : ''}`;
  const playing = !!stage?.playing;
  if (playBtn.dataset.state !== String(playing)) { playBtn.dataset.state = String(playing); playBtn.innerHTML = svg(playing ? 'pause' : 'play'); }
  saveBtn.classList.toggle('clean', s.dirty.size === 0);
  saveBtn.textContent = s.dirty.size ? `Save (${[...s.dirty].join(', ')})` : 'Saved';
});

window.addEventListener('keydown', (e) => {
  if (root.hidden) return; // inside the game, closed: the keys are the game's
  const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); void save(); return; }
  if (typing) return;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); store.redo(); return; }
  if (tab === 'arena' && (e.key === 'Delete' || e.key === 'Backspace')) { deletePiece(); return; }
  if (tab !== 'anim') return;
  if (e.key === ' ') { e.preventDefault(); playBtn.click(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); if (e.shiftKey) jumpKey(-1); else step(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); if (e.shiftKey) jumpKey(1); else step(1); }
  else if (e.key.toLowerCase() === 'k') stage?.editPose(() => {}, false);
  else if (e.key === 'Delete' || e.key === 'Backspace') deleteKey();
});
window.addEventListener('beforeunload', (e) => { if (store.dirty.size) e.preventDefault(); });

installHelp(host.inGame ? root : document.body);
setTab('anim');

// ------------------------------------------------------------------ the Particles tab
function setTab(t: Tab): void {
  tab = t;
  for (const b of Array.from(nav.querySelectorAll<HTMLButtonElement>('button[data-tab]'))) b.classList.toggle('on', b.dataset.tab === t);
  filesLabel.textContent = { anim: 'src/data/clips · src/data/moves', particles: 'src/data/particles', arena: 'src/data/arenas' }[t];
  filesLabel.title = { anim: 'Where Save writes: one file per clip and one per move, only the ones you changed. The game reads them too.', particles: 'Where Save writes: one file per effect.', arena: 'Where Save writes: one file per arena.' }[t];
  search.placeholder = { anim: 'Find a move or clip', particles: 'Find an effect', arena: 'Find an arena' }[t];
  // The arena has its own stage (ArenaScene); the other tabs share the robot's.
  if (!host.inGame && (game.scene.isActive('Editor') || game.scene.isSleeping('Editor'))) {
    if (t === 'arena') { game.scene.sleep('Editor'); game.scene.run('Arena'); } else { game.scene.sleep('Arena'); game.scene.run('Editor'); }
  }
  (transport.parentElement as HTMLElement).hidden = t !== 'anim';
  readout.hidden = t !== 'anim';
  if (stage) { stage.mode = t === 'particles' ? 'particles' : 'anim'; stage.playing = false; buildToolbar(); }
  shape = ''; lastList = '';
  store.emit();
}

/** Clip events using an effect, to warn before deleting or to rename them along. */
function effectUsers(name: string): string[] {
  return Object.entries(store.docs.clips).filter(([, c]) => c.events?.some((e) => e.effect === name)).map(([n]) => n);
}

function buildEffectList(): void {
  const q = search.value.trim().toLowerCase();
  const kids: HTMLElement[] = [h('div', { cls: 'group', textContent: 'Effects' })];
  for (const name of Object.keys(store.docs.particles).sort()) {
    if (q && !name.toLowerCase().includes(q)) continue;
    const users = effectUsers(name);
    const item = h('button', { cls: `item${store.sel.effect === name ? ' on' : ''}`, onclick: () => store.select({ effect: name }) },
      name, h('small', { textContent: `${store.docs.particles[name].emitters.length} emitter${store.docs.particles[name].emitters.length > 1 ? 's' : ''}` }));
    item.dataset.help = users.length ? `Started by the clips ${users.join(', ')}.` : 'Played by the game itself (dust, stars, smoke...) or not used yet.';
    kids.push(item);
  }
  const add = h('button', { cls: 'btn', textContent: '+ New effect', onclick: () => newEffect() });
  add.dataset.help = 'Makes a new effect: a simple burst of sparks to start from.';
  list.replaceChildren(...kids, h('div', { cls: 'list-actions' }, add));
}

function uniqueName(base: string): string {
  let n = base; let i = 2;
  while (store.docs.particles[n]) n = `${base}${i++}`;
  return n;
}

const SPARKS: EmitterData = {
  name: 'sparks', image: 'star.png', additive: true,
  duration: { low: [300, 300] }, count: [0, 40],
  emission: { low: [0, 0], high: [120, 120], curve: [[0, 1]] },
  life: { low: [0, 0], high: [300, 600], curve: [[0, 1]] },
  shape: 'point', spawnWidth: { low: [0, 0], high: [0, 0], curve: [[0, 1]] }, spawnHeight: { low: [0, 0], high: [0, 0], curve: [[0, 1]] },
  scale: { low: [0, 0], high: [0.3, 0.5], curve: [[0, 1], [1, 0]] },
  velocity: { low: [0, 0], high: [3, 7], curve: [[0, 1], [1, 0.2]] },
  angle: { low: [0, 0], high: [0, 360], curve: [[0, 1]] },
  gravity: { low: [0, 0], high: [-6, -6], curve: [[0, 1]] },
  colors: [[0, 1, 0.8, 0.4], [1, 1, 0.3, 0.1]],
  transparency: { low: [0, 0], high: [1, 1], curve: [[0, 1], [0.7, 1], [1, 0]] },
};

function newEffect(): void {
  const name = uniqueName('newEffect');
  store.edit('particles', (d) => { d.particles[name] = { emitters: [JSON.parse(JSON.stringify(SPARKS)) as EmitterData] }; });
  store.select({ effect: name });
}

/** Edits an emitter of the open effect. */
function editEmitter(i: number, fn: (e: EmitterData) => void, drag = true): void {
  const name = store.sel.effect;
  store.edit('particles', (d) => fn(d.particles[name].emitters[i]), drag);
}

/** Which optional values are on, per emitter (the inspector is rebuilt when one is switched). */
function particleShape(): string {
  const e = store.docs.particles[store.sel.effect];
  return e ? e.emitters.map((m) => OPTIONAL.map((k) => (m[k] ? 1 : 0)).join('') + m.colors.length).join('|') : '';
}

type ValueKey = 'duration' | 'delay' | 'emission' | 'life' | 'lifeOffset' | 'xOffset' | 'yOffset' | 'spawnWidth' | 'spawnHeight' | 'scale' | 'velocity' | 'angle' | 'rotation' | 'wind' | 'gravity' | 'transparency';
const OPTIONAL: ValueKey[] = ['delay', 'velocity', 'angle', 'rotation', 'wind', 'gravity', 'xOffset', 'yOffset', 'lifeOffset'];
const CURVES: [string, [number, number][]][] = [
  ['steady', [[0, 1]]], ['fades out', [[0, 1], [1, 0]]], ['grows in', [[0, 0], [1, 1]]], ['rises then falls', [[0, 0], [0.5, 1], [1, 0]]], ['quick fade at the end', [[0, 1], [0.7, 1], [1, 0]]],
];
const curveName = (c?: [number, number][]) => CURVES.find(([, v]) => JSON.stringify(v) === JSON.stringify(c ?? [[0, 1]]))?.[0] ?? 'custom';

/**
 * One emitter value: on/off when optional, "from" (low) and "to" (high)
 * ranges, and the curve between them over the particle's life.
 */
function valueFields(i: number, key: ValueKey, label: string, unit: string, help: string, step = 0.1): HTMLElement {
  const v = () => store.docs.particles[store.sel.effect].emitters[i][key];
  const optional = OPTIONAL.includes(key);
  const body: HTMLElement[] = [];
  if (!optional || v()) {
    const range = (which: 'low' | 'high', at: 0 | 1, l: string, h2: string) =>
      num(l, h2, () => v()?.[which]?.[at], (n) => editEmitter(i, (e) => {
        const val = e[key] ?? { low: [0, 0] };
        const r = [...(val[which] ?? [0, 0])] as [number, number];
        r[at] = n ?? 0;
        if (which === 'low') r[1] = r[0]; // one start value, not a random range
        val[which] = r;
        e[key] = val;
      }), { step, digits: 3 });
    body.push(grid(2,
      range('high', 0, 'Min', `${help} Each particle gets a random value between Min and Max. ${unit}`),
      range('high', 1, 'Max', `${help} Each particle gets a random value between Min and Max. ${unit}`),
    ));
    body.push(grid(2,
      pick('Over life', 'How the value changes over each particle\'s life (or over the emitter\'s duration for emission): "steady" keeps it, "fades out" goes from it to the start value, and so on.', [...CURVES.map(([n]) => n), ...(curveName(v()?.curve) === 'custom' ? ['custom'] : [])], () => curveName(v()?.curve),
        (n) => editEmitter(i, (e) => { const c = CURVES.find(([k]) => k === n); if (c && e[key]) e[key]!.curve = c[1].map((p) => [...p]) as [number, number][]; }, false)),
      range('low', 0, 'Curve floor', `The value where the curve is at 0 ("fades out" ends here, "grows in" starts here). ${unit}`),
    ));
  }
  const title = h('span', { textContent: label });
  const box = h('div', { cls: 'value-box' }, title, ...body);
  if (optional) {
    const on = h('input', { type: 'checkbox', checked: !!v() });
    on.onchange = () => editEmitter(i, (e) => { if (on.checked) e[key] = { low: [0, 0], high: [0, 0], curve: [[0, 1]] }; else delete e[key]; }, false);
    title.prepend(on);
  }
  box.dataset.help = help;
  box.dataset.find = `${label} ${help}`.toLowerCase();
  return box;
}

function buildEffectInspector(): void {
  bound = [];
  const s = store;
  const name = s.sel.effect;
  const effect = s.docs.particles[name];
  const out: HTMLElement[] = [];
  if (!effect) { sectionsEl.replaceChildren(h('p', { cls: 'note', textContent: 'Pick an effect on the left.' })); return; }
  const users = effectUsers(name);
  out.push(h('div', { cls: 'inspector-title', textContent: `Effect · ${name}` }));
  const nameInput = h('input', { value: name });
  nameInput.onchange = () => {
    const next = nameInput.value.trim().replace(/[^A-Za-z0-9_-]/g, '');
    if (!next || next === name || s.docs.particles[next]) { nameInput.value = name; return; }
    s.edit('particles', (d) => {
      d.particles[next] = d.particles[name]; delete d.particles[name];
      for (const c of Object.values(d.clips)) for (const e of c.events ?? []) if (e.effect === name) e.effect = next;
    });
    s.dirty.add('clips');
    s.select({ effect: next });
  };
  const nameField = h('label', { cls: 'field' }, h('span', { textContent: 'Name' }), nameInput);
  nameField.dataset.help = 'The effect\'s name and file name (src/data/particles/<name>.json). Renaming updates the clips that start it. The game plays some effects by name (landingDust, hitStars, laserSmoke, deathDust, pickUp, stars): renaming those stops it finding them.';
  const dup = h('button', { cls: 'btn', textContent: 'Duplicate', onclick: () => {
    const copy = uniqueName(`${name}Copy`);
    s.edit('particles', (d) => { d.particles[copy] = JSON.parse(JSON.stringify(d.particles[name])) as EffectData; });
    s.select({ effect: copy });
  } });
  dup.dataset.help = 'Makes a copy of this effect to try changes on.';
  const del = h('button', { cls: 'btn', textContent: 'Delete', disabled: users.length > 0, onclick: () => {
    s.edit('particles', (d) => { delete d.particles[name]; });
    s.select({ effect: Object.keys(s.docs.particles)[0] ?? '' });
  } });
  del.dataset.help = users.length ? `Used by ${users.join(', ')}: remove it from those clips first.` : 'Deletes this effect (its file goes on Save).';
  out.push(section('effect', 'Effect', [grid(2, nameField), h('div', { cls: 'keyline' }, dup, del),
    h('p', { cls: 'note', textContent: users.length ? `Started by: ${users.join(', ')}.` : 'Not started by any clip.' })]));

  effect.emitters.forEach((em, i) => {
    const e = () => s.docs.particles[name].emitters[i];
    const removeBtn = h('button', { cls: 'btn', textContent: 'Remove', disabled: effect.emitters.length < 2, onclick: () => s.edit('particles', (d) => { d.particles[name].emitters.splice(i, 1); }) });
    removeBtn.dataset.help = 'Removes this emitter from the effect.';
    const colorRows = em.colors.map((_, ci) => {
      const c = () => e().colors[ci];
      const input = h('input', { type: 'color' });
      input.oninput = () => editEmitter(i, (x) => { const n = parseInt(input.value.slice(1), 16); x.colors[ci] = [x.colors[ci][0], (n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; });
      bound.push({ input, get: () => '#' + c().slice(1).map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('') });
      const at = num('At (0-1)', 'When in the particle\'s life this colour is reached (0 = born, 1 = gone).', () => c()[0], (v) => editEmitter(i, (x) => { x.colors[ci][0] = Math.min(1, Math.max(0, v ?? 0)); x.colors.sort((a, b) => a[0] - b[0]); }), { step: 0.05 });
      const rm = h('button', { cls: 'btn', textContent: '×', disabled: em.colors.length < 2, onclick: () => editEmitter(i, (x) => { x.colors.splice(ci, 1); }, false) });
      rm.setAttribute('aria-label', 'Remove this colour');
      return h('div', { cls: 'color-row' }, h('label', { cls: 'field' }, h('span', { textContent: 'Colour' }), input), at, rm);
    });
    const addColor = h('button', { cls: 'btn', textContent: '+ Colour', onclick: () => editEmitter(i, (x) => { const last = x.colors[x.colors.length - 1]; x.colors.push([1, last[1], last[2], last[3]]); if (x.colors.length > 1 && last[0] === 1) last[0] = 0.5; x.colors.sort((a, b) => a[0] - b[0]); }, false) });
    addColor.dataset.help = 'Adds a colour the particles fade to over their life.';
    out.push(section(`em${i}`, `Emitter · ${em.name}`, [
      grid(2,
        pick('Image', 'The particle picture (public/particles).', PARTICLE_IMAGES, () => e().image, (v) => editEmitter(i, (x) => { x.image = v; }, false)),
        pick('Shape', 'Where particles are born: a point, along a line, in a square or in an ellipse (size below).', ['point', 'line', 'square', 'ellipse'], () => e().shape, (v) => editEmitter(i, (x) => { x.shape = v as EmitterData['shape']; }, false)),
        num('Duration ms', 'How long the emitter sends particles.', () => e().duration.low[0], (v) => editEmitter(i, (x) => { x.duration.low = [v ?? 0, v ?? 0]; })),
        num('Max particles', 'The most particles alive at once.', () => e().count[1], (v) => editEmitter(i, (x) => { x.count = [x.count[0], Math.max(0, Math.round(v ?? 0))]; })),
        num('Burst at start', 'Particles sent at once when the emitter starts (the minimum alive).', () => e().count[0], (v) => editEmitter(i, (x) => { x.count = [Math.max(0, Math.round(v ?? 0)), x.count[1]]; })),
      ),
      h('div', { cls: 'checks' },
        flag('glow (additive)', 'Adds light instead of covering what is behind: sparks, fire, lasers.', () => !!e().additive, (v) => editEmitter(i, (x) => setOpt(x, 'additive', v || undefined), false)),
        flag('faces its direction', 'Each particle turns to point where it flies (streaks).', () => !!e().aligned, (v) => editEmitter(i, (x) => setOpt(x, 'aligned', v || undefined), false)),
      ),
      valueFields(i, 'emission', 'Particles per second', 'per second.', 'How many particles are sent each second while the emitter runs.', 1),
      valueFields(i, 'life', 'Life', 'In ms.', 'How long each particle lives.', 10),
      valueFields(i, 'scale', 'Size', 'In units (1 = one map tile, 64 px).', 'How big each particle is.', 0.05),
      valueFields(i, 'transparency', 'Opacity', 'From 0 (invisible) to 1.', 'How opaque each particle is.', 0.05),
      valueFields(i, 'velocity', 'Speed', 'In units per second.', 'How fast each particle flies.', 0.5),
      valueFields(i, 'angle', 'Direction', 'In degrees: 0 forwards, 90 up.', 'Which way each particle flies.', 5),
      valueFields(i, 'gravity', 'Gravity', 'In units per second (negative falls).', 'Pull up or down on each particle.', 0.5),
      valueFields(i, 'wind', 'Wind', 'In units per second (positive pushes forwards).', 'A sideways push on each particle.', 0.5),
      valueFields(i, 'rotation', 'Spin', 'In degrees.', 'How each particle is turned over its life.', 5),
      valueFields(i, 'spawnWidth', 'Birth area width', 'In units.', 'Width of the line, square or ellipse particles are born in.', 0.05),
      valueFields(i, 'spawnHeight', 'Birth area height', 'In units.', 'Height of the square or ellipse particles are born in.', 0.05),
      valueFields(i, 'delay', 'Delay', 'In ms.', 'Waits this long before the emitter starts.', 10),
      h('div', { cls: 'value-box' }, h('span', { textContent: 'Colours over life' }), ...colorRows, h('div', { cls: 'keyline' }, addColor)),
      h('div', { cls: 'keyline' }, removeBtn),
    ]));
  });
  const addEm = h('button', { cls: 'btn', textContent: '+ Emitter', onclick: () => s.edit('particles', (d) => { d.particles[name].emitters.push({ ...JSON.parse(JSON.stringify(SPARKS)) as EmitterData, name: `emitter${d.particles[name].emitters.length + 1}` }); }) });
  addEm.dataset.help = 'Adds another emitter to this effect (smoke plus sparks, for instance).';
  out.push(h('div', { cls: 'keyline' }, addEm));
  sectionsEl.replaceChildren(...out);
  filterProps();
}

// ------------------------------------------------------------------ inside the game
/** Inside the game: the robot stage draws in the part of the canvas the panels leave free. */
function fitStage(): void {
  if (!host.inGame || !stage?.sys.isActive()) return;
  const c = game.canvas.getBoundingClientRect();
  const r = stageEl.getBoundingClientRect();
  const k = game.scale.width / c.width;
  stage.cameras.main.setViewport((r.left - c.left) * k, (r.top - c.top) * k, r.width * k, r.height * k);
  stage.recentre();
}
if (host.inGame) new ResizeObserver(() => fitStage()).observe(stageEl);

/** Inside the game: the editor opens (the title's Editor entry) or closes. */
export function editorShown(on: boolean): void {
  root.hidden = !on;
  if (!on) {
    if (game.scene.isActive('Editor')) game.scene.stop('Editor');
    return;
  }
  if (tab === 'arena') tab = 'anim';
  game.scene.run('Editor');
  game.scene.bringToTop('Editor');
  setTab(tab);
  requestAnimationFrame(() => fitStage());
}

// Typing in the editor's fields must not reach the game's keys (and the game's captured keys must not swallow the typing).
if (host.inGame) {
  root.addEventListener('focusin', (e) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) game.input.keyboard!.enabled = false; });
  root.addEventListener('focusout', () => { game.input.keyboard!.enabled = true; });
}

// ------------------------------------------------------------------ the Arena tab
const arenaScene = () => game.scene.getScene('Arena') as ArenaScene | null;
const TOOLS: [ArenaTool, string, string][] = [
  ['select', 'Select', 'Pick a piece to move it (drag) or resize it (drag a white corner). Drag empty space to pan. Delete removes the picked piece.'],
  ['walls', 'Wall', 'Drag to draw a solid block: robots stand on it and cannot pass through. The tiles are laid on it automatically.'],
  ['platforms', 'Platform', 'Drag to draw a platform (one unit thick): robots land on it from above, jump up through it and drop down through it.'],
  ['warps', 'Portal', 'Click to place a portal. An arena has none or two: going into one brings you out of the other (left and right).'],
  ['spawns', 'Spawn', 'Click to place a spawn point (where a robot appears, on its feet). Up to four robots play.'],
  ['bonus', 'Bonus spot', 'Click to place a spot where power-up balls drop.'],
  ['tile', 'Tile brush', 'Paints the chosen tile image on the cell under the pointer, over the automatic ones. Right-click or the eraser clears a cell.'],
  ['erase', 'Eraser', 'Clears the tile of the chosen layer on a cell, even an automatic one.'],
];

function buildArenaToolbar(): void {
  const scene = arenaScene();
  if (!scene) return;
  const tools = TOOLS.map(([t, label, help]) => {
    const b = h('button', { cls: `btn tool${scene.tool === t ? ' on' : ''}`, textContent: label, onclick: () => { scene.tool = t; buildArenaToolbar(); shape = ''; store.emit(); } });
    b.dataset.help = help;
    return b;
  });
  const v = scene.view;
  toolbar.replaceChildren(h('div', { cls: 'tools' }, ...tools),
    check('Grid', 'Shows the unit grid (1 unit = one 64 px cell; the tiles are 2 x 2 units).', v.grid, (on) => (v.grid = on)),
    // Inside the game the room and tiles are the match's own.
    ...(host.inGame ? [] : [
      check('Room', 'Shows the room behind the arena.', v.room, (on) => (v.room = on)),
      check('Tiles', 'Shows the tile art the game lays on the blocks.', v.tiles, (on) => (v.tiles = on)),
    ]),
    check('Pieces', 'Shows the walls, platforms, portals, spawns and bonus spots as coloured shapes.', v.pieces, (on) => (v.pieces = on)),
    h('button', { cls: 'btn', textContent: 'Recentre', title: 'Fits the whole arena on screen.', onclick: () => scene.recentre() }),
  );
}

function buildArenaList(): void {
  const q = search.value.trim().toLowerCase();
  const kube = h('button', { cls: 'item', disabled: true }, 'The Kube', h('small', { textContent: 'original' }));
  kube.dataset.help = 'The original arena is a Tiled map (maps/debug-map.tmx): it is not edited here. "Duplicate" on another arena, or "New arena", starts from its frame.';
  const kids: HTMLElement[] = [h('div', { cls: 'group', textContent: 'Arenas' }), kube];
  const ids = Object.keys(store.docs.arenas).sort((a, b) => store.docs.arenas[a].order - store.docs.arenas[b].order);
  for (const id of ids) {
    const a = store.docs.arenas[id];
    if (q && !`${a.name} ${id}`.toLowerCase().includes(q)) continue;
    const item = h('button', { cls: `item${store.sel.arena === id ? ' on' : ''}`, onclick: () => {
      store.select({ arena: id, piece: null });
      arenaScene()?.recentre();
    } }, a.name, h('small', { textContent: id }));
    item.dataset.help = a.blurb;
    kids.push(item);
  }
  const add = h('button', { cls: 'btn', textContent: '+ New arena', onclick: () => newArena() });
  add.dataset.help = 'Makes a new arena: the Kube\'s frame (ceiling, side walls with portals, floor) and four spawns, to build on.';
  list.replaceChildren(...kids, h('div', { cls: 'list-actions' }, add));
}

function uniqueArenaId(base: string): string {
  let id = base; let i = 2;
  while (store.docs.arenas[id]) id = `${base}-${i++}`;
  return id;
}
const nextOrder = () => Math.max(0, ...Object.values(store.docs.arenas).map((a) => a.order)) + 1;

function newArena(): void {
  const id = uniqueArenaId('new-arena');
  const arena: ArenaData = {
    order: nextOrder(), name: 'New arena', blurb: 'A new arena', room: 'kube',
    walls: [[6, 1, 40, 2], [4, 3, 2, 13], [1, 16, 5, 2], [1, 23, 5, 2], [4, 25, 2, 11], [46, 3, 2, 13], [46, 16, 5, 2], [46, 23, 5, 2], [46, 25, 2, 11], [6, 34, 40, 3]],
    platforms: [[20, 26, 12, 1]], warps: [[1, 18, 1, 5], [50, 18, 1, 5]],
    spawns: [[10, 34], [42, 34], [18, 34], [34, 34]], bonus: [[26, 23], [14, 30], [38, 30]],
  };
  store.edit('arenas', (d) => { d.arenas[id] = arena; });
  store.select({ arena: id, piece: null });
  arenaScene()?.recentre();
}

function editArena(fn: (a: ArenaData) => void, drag = true): void {
  const id = store.sel.arena;
  store.edit('arenas', (d) => fn(d.arenas[id]), drag);
}

function deletePiece(): void {
  const p = store.sel.piece;
  if (!p) return;
  editArena((a) => { piecesOf(a, p.kind).splice(p.index, 1); }, false);
  store.select({ piece: null });
}

function arenaShape(): string {
  const a = store.docs.arenas[store.sel.arena];
  const p = store.sel.piece;
  return `a|${store.sel.arena}|${p?.kind}:${p?.index}|${arenaScene()?.tool}|${a ? [a.walls.length, a.platforms.length, a.warps.length, a.spawns.length, a.bonus.length, a.tiles?.length ?? 0].join() : ''}|${Object.keys(store.docs.arenas).length}`;
}

/** Problems the game would have with the arena. */
function arenaChecks(a: ArenaData): string[] {
  const out: string[] = [];
  const [w, h] = a.size ?? DEFAULT_SIZE;
  if (a.warps.length !== 0 && a.warps.length !== 2) out.push(`Portals work in pairs: there are ${a.warps.length}, so none of them works. Use two, or none.`);
  if (a.spawns.length < 4) out.push(`${a.spawns.length} spawn point${a.spawns.length === 1 ? '' : 's'}: a four-robot match needs four.`);
  if (a.bonus.length === 0) out.push('No bonus spot: power-ups will not drop.');
  const inside = ([x, y]: [number, number]) => a.walls.some(([wx, wy, ww, wh]) => x > wx && x < wx + ww && y > wy && y <= wy + wh - 0.01);
  a.spawns.forEach((sp, i) => { if (inside(sp)) out.push(`Spawn ${i + 1} is inside a wall.`); });
  const off = (x: number, y: number) => x < 0 || y < 0 || x > w || y > h;
  if ([...a.walls, ...a.platforms].some(([x, y, rw, rh]) => off(x, y) || off(x + rw, y + rh))) out.push('Some pieces stick out of the map: their tiles are cut off.');
  return out;
}

function buildArenaInspector(): void {
  bound = [];
  const s = store;
  const id = s.sel.arena;
  const a = s.docs.arenas[id];
  if (!a) { sectionsEl.replaceChildren(h('p', { cls: 'note', textContent: 'Pick an arena on the left, or make a new one.' })); return; }
  const out: HTMLElement[] = [];
  const A = () => s.docs.arenas[id];
  out.push(h('div', { cls: 'inspector-title', textContent: `Arena · ${a.name}` }));
  const text = (label: string, help: string, get: () => string, set: (v: string) => void) => {
    const input = h('input', { value: get() });
    input.onchange = () => set(input.value);
    bound.push({ input, get });
    return labelled('field', label, help, input);
  };
  const dup = h('button', { cls: 'btn', textContent: 'Duplicate', onclick: () => {
    const copy = uniqueArenaId(`${id}-copy`);
    s.edit('arenas', (d) => { d.arenas[copy] = { ...JSON.parse(JSON.stringify(d.arenas[id])) as ArenaData, name: `${a.name} copy`, order: nextOrder() }; });
    s.select({ arena: copy, piece: null });
  } });
  dup.dataset.help = 'Makes a copy of this arena to try changes on.';
  const del = h('button', { cls: 'btn', textContent: 'Delete', onclick: () => {
    s.edit('arenas', (d) => { delete d.arenas[id]; });
    s.select({ arena: Object.keys(s.docs.arenas)[0] ?? '', piece: null });
  } });
  del.dataset.help = 'Deletes this arena (its file goes on Save). Undo brings it back.';
  const move = (d: -1 | 1) => () => {
    const ids = Object.keys(s.docs.arenas).sort((x, y) => s.docs.arenas[x].order - s.docs.arenas[y].order);
    const i = ids.indexOf(id); const j = i + d;
    if (j < 0 || j >= ids.length) return;
    s.edit('arenas', (docs) => { const o = docs.arenas[id].order; docs.arenas[id].order = docs.arenas[ids[j]].order; docs.arenas[ids[j]].order = o; });
  };
  const up = h('button', { cls: 'btn', textContent: 'Move up', onclick: move(-1) }); up.dataset.help = 'Earlier in the arena select.';
  const down = h('button', { cls: 'btn', textContent: 'Move down', onclick: move(1) }); down.dataset.help = 'Later in the arena select.';
  out.push(section('arena', 'Arena', [
    grid(2,
      text('Name', 'Shown on the arena select.', () => A().name, (v) => editArena((x) => { x.name = v; }, false)),
      pick('Room', 'The room behind the arena, and the colours of its light and tiles.', ROOMS.map((r) => [r, { kube: 'The Kube (blue)', foundry: 'Foundry (amber)', skyDeck: 'Sky Deck (violet)', pit: 'The Pit (teal)' }[r] ?? r] as [string, string]), () => A().room ?? 'kube', (v) => editArena((x) => { x.room = v; }, false)),
    ),
    grid(1, text('Blurb', 'The line under the name on the arena select.', () => A().blurb, (v) => editArena((x) => { x.blurb = v; }, false))),
    grid(2,
      num('Width units', 'Map width (1 unit = 64 px; the Kube is 52).', () => (A().size ?? DEFAULT_SIZE)[0], (v) => editArena((x) => { x.size = [Math.max(10, Math.round(v ?? 52)), (x.size ?? DEFAULT_SIZE)[1]]; })),
      num('Height units', 'Map height (the Kube is 38).', () => (A().size ?? DEFAULT_SIZE)[1], (v) => editArena((x) => { x.size = [(x.size ?? DEFAULT_SIZE)[0], Math.max(10, Math.round(v ?? 38))]; })),
    ),
    h('div', { cls: 'keyline' }, up, down, dup, del),
  ]));
  out.push(section('blast', 'Blast zone', [
    h('p', { cls: 'note', textContent: 'The red dashed line: a robot that goes past it is out. Distances are in units past the map\'s edges.' }),
    grid(2, ...(['Left', 'Top', 'Right', 'Bottom'] as const).map((label, i) =>
      num(label, `How far past the map's ${label.toLowerCase()} edge a robot can go before it is out.`, () => (A().blast ?? DEFAULT_BLAST)[i], (v) => editArena((x) => { const b = [...(x.blast ?? DEFAULT_BLAST)] as [number, number, number, number]; b[i] = Math.max(0, v ?? 0); x.blast = b; })))),
  ], { closed: true }));

  // The picked piece.
  const p = s.sel.piece;
  if (p && piecesOf(A(), p.kind)[p.index]) {
    const rect = !(POINT_KINDS as string[]).includes(p.kind);
    const val = (i: number) => () => (rect ? (piecesOf(A(), p.kind)[p.index] as number[])[i] : pointOf(A(), p.kind as PointKind, p.index)?.[i]);
    const set = (i: number, min = -99) => (v: number | undefined) => editArena((x) => {
      if (rect) { (piecesOf(x, p.kind)[p.index] as number[])[i] = Math.max(min, v ?? 0); return; }
      const at = pointOf(x, p.kind as PointKind, p.index)!;
      at[i] = v ?? 0;
      setPoint(x, p.kind as PointKind, p.index, at[0], at[1]);
    });
    const rm = h('button', { cls: 'btn', textContent: 'Delete', onclick: () => deletePiece() });
    rm.dataset.help = 'Removes this piece (Delete).';
    out.push(section('piece', `${PIECE_NAMES[p.kind]} ${p.index + 1}`, [
      grid(2,
        num('x', 'Left edge (or the spot), in units from the map\'s left.', val(0), set(0), { step: rect ? 1 : 0.5 }),
        num('y', rect ? 'Top edge, in units from the map\'s top.' : 'Height of the spot, in units from the map\'s top (a spawn is where the feet stand).', val(1), set(1), { step: rect ? 1 : 0.5 }),
        ...(rect ? [num('Width', 'In units.', val(2), set(2, 1)), num('Height', p.kind === 'platforms' ? 'Platforms are one unit thick.' : 'In units.', val(3), set(3, 1))] : []),
      ),
      h('div', { cls: 'keyline' }, rm),
    ]));
  }

  // The tile brush.
  const scene = arenaScene();
  if (scene && (scene.tool === 'tile' || scene.tool === 'erase')) {
    const sources = [...new Set([...(game.registry.get('map') as TmxMap).tileImages.values()].map((t) => t.source))].sort();
    const swatches = sources.map((src) => {
      const b = h('button', { cls: `swatch${scene.brush.source === src ? ' on' : ''}`, onclick: () => { scene.brush.source = src; scene.tool = 'tile'; shape = ''; buildArenaToolbar(); store.emit(); } },
        h('img', { src: `./maps/${src}`, alt: '' }));
      b.dataset.help = src;
      b.setAttribute('aria-label', src);
      return b;
    });
    out.push(section('brush', 'Tile brush', [
      grid(2, pick('Layer', 'Which tile layer the brush paints: blocks (walls and floors), platforms, or fades (the soft edges outside the frame).', ['blocks', 'platforms', 'fades'], () => scene.brush.layer, (v) => { scene.brush.layer = v as TilePaint[0]; })),
      h('div', { cls: 'swatches' }, ...swatches),
      h('p', { cls: 'note', textContent: `${A().tiles?.length ?? 0} painted cells. Tiles are 2 x 2 units and sit on the bottom of the cell you paint.` }),
      h('div', { cls: 'keyline' }, (() => { const b = h('button', { cls: 'btn', textContent: 'Clear painted tiles', onclick: () => editArena((x) => { delete x.tiles; }, false) }); b.dataset.help = 'Removes every painted tile: only the automatic ones are left.'; return b; })()),
    ]));
  }

  const problems = arenaChecks(A());
  out.push(section('checks', problems.length ? `Checks (${problems.length})` : 'Checks', problems.length
    ? problems.map((t) => h('p', { cls: 'note warn', textContent: t }))
    : [h('p', { cls: 'note', textContent: 'Nothing to fix.' })]));
  out.push(section('legend', 'Legend', [h('p', { cls: 'note', textContent: 'Grey: walls. Teal: platforms. Purple: portals (the dashed line links the pair). Blue triangles: spawns. Yellow rings: bonus spots. Red dashes: the blast zone.' })], { closed: true }));
  sectionsEl.replaceChildren(...out);
  filterProps();
}

// Inside the game: the robot stage joins the running game (started when the editor opens).
if (host.inGame) {
  game.registry.set('store', store);
  stage = game.scene.add('Editor', StageScene, false) as StageScene;
  stageEl.append(readout);
}

// Handy for debugging from the browser console.
(window as unknown as { editor: object }).editor = { store, game, get stage() { return stage; }, get arena() { return arenaScene(); } };

buildList();
store.emit();
