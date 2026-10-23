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
import { ROOM_CHOICES } from '../fx/Backdrops';
import type { TmxMap } from '../map/TmxMap';
import { FRAME_MS, PIECE_NAMES, POINT_KINDS, piecesOf, pointOf, setPoint, type PointKind } from './Store';
import { Timeline } from './Timeline';
import { host, store } from './Host';
import { SoundView } from './SoundView';
import { GLASS, type Envelope, type Layer, type Lfo, type NoiseLayer, type SoundDef, type Sweep } from '../audio/SoundDef';
import { GAME_SOUNDS } from '../audio/Synth';

/**
 * Kubotz Editor: tune the Kubotz' clips and moves (poses, hit circles,
 * active frames, launches, particle events), the particle effects and the
 * arenas, then save them back to src/data. It runs on a page of its own
 * (editor.html, `npm run editor`) or inside the game (dev builds: the
 * title's Editor entry), drawn over the game's canvas: there it has the
 * Animation, Particles and Sound tabs (arenas are edited in a match, DevHud.ts).
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
// Inside the game Save keeps the edits in this browser (the game plays them) and Export writes the files; on editor.html Save writes the files.
const saveBtn = h('button', { cls: 'btn primary', textContent: 'Save', title: host.inGame
  ? 'Keeps your edits in this browser (Ctrl+S): the game plays them, and they are still here after a reload. Export writes them to files.'
  : 'Writes the changed files (Ctrl+S). On the published page it downloads them instead.' });
const exportBtn = h('button', { cls: 'btn', textContent: 'Export', title: 'Writes the changed data files (src/data): on the dev server straight into the project, on a published page as downloads.', onclick: () => void exportFiles() });
/** The editor's tabs: Kubot animation and moves, particle effects, and arenas (next). */
type Tab = 'anim' | 'particles' | 'sound' | 'arena';
let tab: Tab = 'anim';
const tabBtn = (t: Tab, label: string, help: string) => { const b = h('button', { textContent: label, title: help, onclick: () => setTab(t) }); b.dataset.tab = t; return b; };
const nav = h('nav', {},
  tabBtn('anim', 'Animation', 'Clips, poses, hit circles and particle events.'),
  tabBtn('particles', 'Particles', 'Particle effects: what they look like and how they move.'),
  tabBtn('sound', 'Sound', 'The sounds made in code: layers of tones, noise and pings, with chorus, delay and reverb; play them and export them as WAV files.'),
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
    ? [h('button', { cls: 'btn solid', textContent: 'Back', title: 'Back to the editor menu. Save keeps your edits in this browser; Export writes them to files.', onclick: () => host.close?.() })]
    : [h('button', { cls: 'btn solid', textContent: 'Test in game', title: 'Opens the game in a new tab with these changes, saved or not', onclick: () => testInGame() })]),
  ...(host.inGame ? [exportBtn] : []),
  saveBtn,
);
saveBtn.onclick = () => void save();

const search = h('input', { cls: 'search', placeholder: 'Find a move or clip', type: 'search', title: 'Filters the list by name, clip or category.' });
const list = h('div');
const left = h('aside', { cls: 'left' }, search, list);

// Inside the game the stage is a window onto the game's canvas, under the panels.
const stageEl = h('div', { id: 'stage' }, host.inGame ? '' : h('div', { cls: 'splash', textContent: 'Loading the Kubot…' }));
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
const soundView = new SoundView(store, host.game);
soundView.el.hidden = true;
const main = h('main', {}, toolbar, stageEl, h('div', {}, transport, timeline.el));
// Over the Kubot stage, which keeps its size (a Phaser canvas sized to nothing breaks).
stageEl.append(soundView.el);
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
          // A tab picked while the Kubot was loading.
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
  if (tab === 'sound') { buildSoundToolbar(); return; }
  const v = stage!.view;
  if (tab === 'arena') { buildArenaToolbar(); return; }
  if (tab === 'particles') {
    const p = stage!.preview;
    toolbar.replaceChildren(
      check('Mirrored', 'Plays the effect mirrored, the way a Kubot facing left plays it (effects are made facing right).', p.flip, (on) => (p.flip = on)),
      check('Kubot for scale', 'Shows a faint Kubot beside the effect, to judge its size.', p.kubot, (on) => (p.kubot = on)),
      h('button', { cls: 'btn', textContent: 'Recentre', title: 'Frames the stage again at the default zoom.', onclick: () => stage?.recentre() }),
      h('span', { cls: 'hint', textContent: 'The effect plays over and over from the cross · pinch or wheel to zoom · drag to pan' }),
    );
    return;
  }
  toolbar.replaceChildren(
    check('Handles', 'Shows the orange bone knobs: drag one to turn that bone and the bones it carries (hold Shift to turn it alone). Drag the white square on the hips to move the whole body.', v.handles, (on) => (v.handles = on)),
    check('Onion skin', 'Shows faint white copies of the Kubot at the key before and the key after this frame, so you can see where the motion comes from and goes to.', v.onion, (on) => (v.onion = on)),
    check('Target dummy', 'A blue Kubot standing in front, with its hurtbox. It flashes white when an active hit circle touches it. Drag it to move it closer or further.', v.dummy, (on) => (v.dummy = on)),
    labelledSelect('Helmet', 'Which helmet the Kubot wears on the stage (only for looking; every Kubot plays the same moves).', ['flame', 'terminator', 'big buff', 'skull'], (i) => (v.helmet = i)),
    h('button', { cls: 'btn', textContent: 'Recentre', title: 'Frames the Kubot again at the default zoom.', onclick: () => stage?.recentre() }),
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
  if (host.inGame) { status.textContent = store.keep(); return; }
  await exportFiles();
}

async function exportFiles(): Promise<void> {
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
  if (tab === 'sound') { buildSoundList(); return; }
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
    ['x', 'forward', 'Moves the whole Kubot forwards (pixels of the art). On a root-motion clip the body really travels by it in the game.'],
    ['y', 'up', 'Lifts the whole Kubot (pixels of the art). With "feet on the ground", this is a hop above the floor.'],
    ['tilt', 'lean', 'Leans the whole Kubot forwards round its feet (degrees).'],
    ['spin', 'flip', 'Turns the whole Kubot round the middle of its body (degrees, positive is a forward flip).'],
    ['yaw', 'turn', 'Turns the Kubot round the vertical axis (degrees), for spins.'],
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
    const name = s.sel.move!.table === 'combo' || s.sel.move!.table === 'bladeCombo' ? `${s.sel.move!.table === 'combo' ? 'jab' : 'blade jab'} ${Number(s.sel.move!.key) + 1}` : s.sel.move!.key;
    out.push(h('div', { cls: 'inspector-title', textContent: `Move · ${name}` }));
    out.push(section('hit', 'Hit', [grid(2,
      num('Damage %', 'Damage dealt to the Kubot that is hit.', () => s.move()!.damage, (v) => editMove((mm) => { mm.damage = v ?? 0; })),
      num('Knockback', 'How hard the hit sends the Kubot flying (units per second, before damage makes it grow).', () => s.move()!.launch.knockback, (v) => editMove((mm) => { mm.launch.knockback = v ?? 0; })),
      num('Launch angle °', 'Direction the Kubot is sent: 0 straight forwards, 90 straight up, negative angles spike downwards. Shown as the red arrow on the stage.', () => s.move()!.launch.angle, (v) => editMove((mm) => { mm.launch.angle = v ?? 0; })),
      num('Hitstun ms', 'How long the hit Kubot cannot act. Leave empty to work it out from the knockback; a short fixed stun lets combo hits link.', () => s.move()!.launch.stun, (v) => editMove((mm) => setOpt(mm.launch, 'stun', v)), { placeholder: 'from knockback' }),
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
        num('Radius units', 'Size of each hit circle (1 unit = one map tile). Empty uses the default: 0.35, or 0.3 for the plasma blade.', () => s.move()!.radius, (v) => editMove((mm) => setOpt(mm, 'radius', v)), { step: 0.05, placeholder: m.points === 'blade' ? '0.3' : '0.35' }),
      ),
      h('div', { cls: 'checks' },
        flag('every point hits', 'Off: only the point furthest forward strikes (the leading fist or foot). On: every point has a circle (spins, splits).', () => !!s.move()!.all, (v) => editMove((mm) => setOpt(mm, 'all', v || undefined), false)),
        flag('both sides', 'Hits on both sides, each Kubot sent away from the attacker (down smash).', () => !!s.move()!.both, (v) => editMove((mm) => setOpt(mm, 'both', v || undefined), false)),
        flag('behind', 'The strike goes backwards (back air): the point furthest back strikes and the launch goes the other way.', () => !!s.move()!.behind, (v) => editMove((mm) => setOpt(mm, 'behind', v || undefined), false)),
      ),
    ]));
    out.push(section('effects', 'Effects', [
      h('p', { cls: 'note', textContent: 'What the move shows besides the hit itself. They play for the whole move and show on the Effects row of the timeline.' }),
      h('div', { cls: 'checks' },
        flag('afterimages', 'Leaves fading copies of the Kubot behind it while it moves fast.', () => !!s.move()!.ghosts, (v) => editMove((mm) => setOpt(mm, 'ghosts', v || undefined), false)),
      ),
    ]));
    out.push(section('burst', 'Special motion', [grid(2,
      num('Burst forward', 'Specials: speed pushed forwards (units per second) during the first part of the move. Empty keeps the Kubot\'s own speed.', () => s.move()!.burst?.[0] ?? undefined, (v) => editMove((mm) => { mm.burst = [v ?? null, mm.burst?.[1] ?? null]; if (mm.burst.every((b) => b === null)) delete mm.burst; })),
      num('Burst up', 'Specials: speed pushed upwards (units per second, negative dives). Empty keeps the Kubot\'s own speed.', () => s.move()!.burst?.[1] ?? undefined, (v) => editMove((mm) => { mm.burst = [mm.burst?.[0] ?? null, v ?? null]; if (mm.burst.every((b) => b === null)) delete mm.burst; })),
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
      flag('feet on the ground', 'Lifts the Kubot so its lowest boot always touches the floor; "up" then adds a hop.', () => s.clipData.planted, (v) => s.edit('clips', (d) => { d.clips[s.sel.clip].planted = v; })),
      flag('root motion', 'The clip\'s forward motion moves the Kubot itself in the game, instead of only its drawing.', () => !!s.clipData.rootMotion, (v) => s.edit('clips', (d) => setOpt(d.clips[s.sel.clip], 'rootMotion', v || undefined))),
    ),
  ], { closed: true }));
  out.push(section('hurtbox', 'Hurtbox (every Kubot)', [grid(2,
    num('Width units', 'Width of the blue box where a Kubot can be hit, centred on it (1 unit = one map tile).', () => s.docs.moves.hurtbox.width, (v) => s.edit('moves', (d) => { d.moves.hurtbox.width = v ?? 1; }, true), { step: 0.05 }),
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
        pick('On', 'The body part it starts on; "feet" is the ground under the Kubot.', Object.entries(PARTS), () => ev().part, (v) => editEvent(i, (e) => { e.part = v; })),
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
  const next = tab === 'sound' ? soundShape() : tab === 'arena' ? arenaShape() : tab === 'particles' ? `p|${s.sel.effect}|${s.docs.particles[s.sel.effect]?.emitters.length}|${Object.keys(s.docs.particles).length}|${particleShape()}` : `${s.clipData.events?.length ?? 0}|${s.sel.clip}|${s.sel.move?.table}:${s.sel.move?.key}|${!!s.keyAt()}|${s.sel.bone}|${frames()}|${Math.round(s.sel.t * frames())}`;
  if (next !== shape) { shape = next; if (tab === 'sound') buildSoundInspector(); else if (tab === 'arena') buildArenaInspector(); else if (tab === 'particles') buildEffectInspector(); else buildInspector(); }
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
  const listShape = `${tab}|${s.sel.arena}|${Object.keys(s.docs.arenas).join()}|${Object.values(s.docs.arenas).map((a) => a.name + a.order).join()}|${s.sel.effect}|${Object.keys(s.docs.particles).join()}|${s.sel.sound}|${Object.keys(s.docs.sounds).join()}|${s.docs.sounds[s.sel.sound]?.layers.length}|${s.sel.clip}|${s.sel.move?.table}:${s.sel.move?.key}`;
  if (listShape !== lastList) { lastList = listShape; buildList(); stage?.clearEffects(); }
  refreshInspector();
  if (tab === 'sound') soundView.update();
  const f = frames();
  const fr = Math.round(s.sel.t * f);
  const m = s.move();
  const active = m && s.sel.t >= m.active[0] && s.sel.t <= m.active[1];
  readout.innerHTML = `${s.sel.clip} · frame ${fr} / ${f}${m ? (active ? ' · <b>active</b>' : ' · not active') : ''}${s.keyAt() ? ' · key' : ''}`;
  info.textContent = m ? `${m.ms} ms · ${f} frames · startup ${Math.round(m.active[0] * f)} · active ${Math.round(m.active[0] * f)}-${Math.round(m.active[1] * f)} · endlag ${f - Math.round(m.active[1] * f)}` : `${s.clipData.ms} ms · ${f} frames${s.clipData.loop ? ' · loops' : ''}`;
  const playing = !!stage?.playing;
  if (playBtn.dataset.state !== String(playing)) { playBtn.dataset.state = String(playing); playBtn.innerHTML = svg(playing ? 'pause' : 'play'); }
  if (host.inGame) {
    saveBtn.classList.toggle('clean', !s.unsaved);
    saveBtn.textContent = s.unsaved ? 'Save' : 'Saved';
  } else {
    saveBtn.classList.toggle('clean', s.dirty.size === 0);
    saveBtn.textContent = s.dirty.size ? `Save (${[...s.dirty].join(', ')})` : 'Saved';
  }
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
  if (tab === 'sound' && e.key === ' ') { e.preventDefault(); if (soundView.playing) soundView.stop(); else soundView.play(); return; }
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
  filesLabel.textContent = { anim: 'src/data/clips · src/data/moves', particles: 'src/data/particles', sound: 'src/data/sounds', arena: 'src/data/arenas' }[t];
  filesLabel.title = { anim: 'Where Save writes: one file per clip and one per move, only the ones you changed. The game reads them too.', particles: 'Where Save writes: one file per effect.', sound: 'Where Save writes: one file per sound. Export WAV writes the rendered sounds to web/sound-exports.', arena: 'Where Save writes: one file per arena.' }[t];
  search.placeholder = { anim: 'Find a move or clip', particles: 'Find an effect', sound: 'Find a sound', arena: 'Find an arena' }[t];
  // The Sound tab has its own stage (the waveform) over the Kubot stage's.
  root.classList.toggle('sound-tab', t === 'sound');
  soundView.el.hidden = t !== 'sound';
  if (t !== 'sound') soundView.stop();
  if (t === 'sound') buildToolbar();
  // The arena has its own stage (ArenaScene); the other tabs share the Kubot's.
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
/** Inside the game: the Kubot stage draws in the part of the canvas the panels leave free. */
function fitStage(): void {
  if (!host.inGame || !stage?.sys.isActive()) return;
  const c = game.canvas.getBoundingClientRect();
  const r = stageEl.getBoundingClientRect();
  const k = game.scale.width / c.width;
  // The hole, clipped to the canvas (the canvas is letterboxed in its container); the whole canvas if the hole is off it.
  const x0 = Math.max(0, (r.left - c.left) * k); const y0 = Math.max(0, (r.top - c.top) * k);
  const x1 = Math.min(game.scale.width, (r.right - c.left) * k); const y1 = Math.min(game.scale.height, (r.bottom - c.top) * k);
  if (x1 - x0 < 80 || y1 - y0 < 80) stage.cameras.main.setViewport(0, 0, game.scale.width, game.scale.height);
  else stage.cameras.main.setViewport(x0, y0, x1 - x0, y1 - y0);
  stage.recentre();
}
if (host.inGame) new ResizeObserver(() => fitStage()).observe(stageEl);

/** Inside the game: the editor opens (the title's Editor entry) or closes. */
export function editorShown(on: boolean, which?: 'anim' | 'particles' | 'sound'): void {
  if (which) tab = which;
  root.hidden = !on;
  // A field focused when the editor closes never reports losing focus: give the game its keys back.
  game.input.keyboard!.enabled = true;
  if (!on) {
    soundView.stop();
    if (game.scene.isActive('Editor')) game.scene.stop('Editor');
    return;
  }
  if (tab === 'arena') tab = 'anim';
  // The stage fits the hole between the panels once it runs (the scene starts on the game's next step).
  stage!.events.once(Phaser.Scenes.Events.CREATE, () => { game.scene.bringToTop('Editor'); fitStage(); setTab(tab); });
  game.scene.run('Editor');
  setTab(tab);
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
  ['walls', 'Wall', 'Drag to draw a solid block: Kubotz stand on it and cannot pass through. The tiles are laid on it automatically.'],
  ['platforms', 'Platform', 'Drag to draw a platform (one unit thick): Kubotz land on it from above, jump up through it and drop down through it.'],
  ['warps', 'Portal', 'Click to place a portal. An arena has none or two: going into one brings you out of the other (left and right).'],
  ['spawns', 'Spawn', 'Click to place a spawn point (where a Kubot appears, on its feet). Up to four Kubotz play.'],
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
    item.dataset.help = a.description;
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
    order: nextOrder(), name: 'New arena', description: 'A new arena', room: 'kube',
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
  if (a.spawns.length < 4) out.push(`${a.spawns.length} spawn point${a.spawns.length === 1 ? '' : 's'}: a four-Kubot match needs four.`);
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
    grid(1,
      text('Name', 'Shown on the arena select.', () => A().name, (v) => editArena((x) => { x.name = v; }, false)),
    ),
    grid(1, text('Description', 'The line under the name on the arena select.', () => A().description, (v) => editArena((x) => { x.description = v; }, false))),
    grid(2,
      num('Width units', 'Map width (1 unit = 64 px; the Kube is 52).', () => (A().size ?? DEFAULT_SIZE)[0], (v) => editArena((x) => { x.size = [Math.max(10, Math.round(v ?? 52)), (x.size ?? DEFAULT_SIZE)[1]]; })),
      num('Height units', 'Map height (the Kube is 38).', () => (A().size ?? DEFAULT_SIZE)[1], (v) => editArena((x) => { x.size = [(x.size ?? DEFAULT_SIZE)[0], Math.max(10, Math.round(v ?? 38))]; })),
    ),
    grid(1,
      pick('Background', 'The room behind the arena, and the colours of its light and tiles.', ROOM_CHOICES, () => A().room ?? 'kube', (v) => editArena((x) => { x.room = v; }, false)),
    ),
    h('div', { cls: 'keyline' }, up, down, dup, del),
  ]));
  out.push(section('blast', 'Blast zone', [
    h('p', { cls: 'note', textContent: 'The red dashed line: a Kubot that goes past it is out. Distances are in units past the map\'s edges.' }),
    grid(2, ...(['Left', 'Top', 'Right', 'Bottom'] as const).map((label, i) =>
      num(label, `How far past the map's ${label.toLowerCase()} edge a Kubot can go before it is out.`, () => (A().blast ?? DEFAULT_BLAST)[i], (v) => editArena((x) => { const b = [...(x.blast ?? DEFAULT_BLAST)] as [number, number, number, number]; b[i] = Math.max(0, v ?? 0); x.blast = b; })))),
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

// ------------------------------------------------------------------ the Sound tab
const isGameSound = (k: string) => GAME_SOUNDS.includes(k);
/** Sounds that mix this one in (a layer of theirs plays it). */
const soundUsers = (key: string) => Object.entries(store.docs.sounds).filter(([k, d]) => k !== key && d.layers.some((l) => l.type === 'sound' && l.sound === key)).map(([k]) => k);
const SOUND_GROUPS: [RegExp, string][] = [[/^(boom|step-|holo-)/, 'Kubotz'], [/^blade-/, 'Plasma Blades'], [/^portal-/, 'Arena'], [/^orb-/, 'Power-ups'], [/^ui-/, 'Menus']];
const LAYER_NAMES: Record<Layer['type'], string> = { tone: 'Tone', noise: 'Noise', ping: 'Ping', sound: 'Sound' };
const PLATE: [number, number, number][] = [[1, 0.13, 55], [2.698, 0.07, 70], [4.395, 0.045, 90], [7.023, 0.025, 120]];
const NEW_LAYERS: Record<Layer['type'], () => Layer> = {
  tone: () => ({ name: 'Tone', type: 'tone', at: 0, dur: 0.3, gain: 0.2, freq: { from: 440, to: 880, curve: 'exp' }, env: { attack: 0.005, shape: 'exp', k: 4 } }),
  noise: () => ({ name: 'Noise', type: 'noise', at: 0, dur: 0.3, gain: 0.2, filters: [{ type: 'lowpass', cutoff: { from: 4000, to: 300, curve: 'exp' } }], env: { attack: 0.005, shape: 'exp', k: 5 } }),
  ping: () => ({ name: 'Ping', type: 'ping', at: 0, freq: 2640, gain: 0.2 }),
  sound: () => ({ name: 'Sound', type: 'sound', at: 0, gain: 0.8, sound: Object.keys(store.docs.sounds).find((k) => k !== store.sel.sound) ?? 'ui-confirm', pitch: 0 }),
};

const sound = (): SoundDef | undefined => store.docs.sounds[store.sel.sound];
function editSound(fn: (d: SoundDef) => void, drag = true): void {
  const key = store.sel.sound;
  store.edit('sounds', (d) => fn(d.sounds[key]), drag);
}
function editLayer<L extends Layer>(i: number, fn: (l: L) => void, drag = true): void { editSound((d) => fn(d.layers[i] as L), drag); }

/** A slider with its number beside it; `log` spreads the slider evenly over octaves (pitches). */
function slide(label: string, help: string, get: () => number, set: (v: number) => void, o: { min: number; max: number; step?: number; log?: boolean; digits?: number }): HTMLElement {
  const toPos = (v: number) => (o.log ? (Math.log(Math.max(o.min, v) / o.min) / Math.log(o.max / o.min)) * 1000 : v);
  const fromPos = (p: number) => (o.log ? o.min * Math.pow(o.max / o.min, p / 1000) : p);
  const range = h('input', { type: 'range', min: o.log ? '0' : String(o.min), max: o.log ? '1000' : String(o.max), step: o.log ? '1' : String(o.step ?? 0.001) });
  const box = h('input', { type: 'number', step: String(o.step ?? 0.001) });
  range.oninput = () => set(round(fromPos(Number(range.value)), o.digits ?? 4));
  range.onchange = () => store.endDrag();
  box.oninput = () => { if (box.value !== '' && Number.isFinite(Number(box.value))) set(Number(box.value)); };
  box.onchange = () => store.endDrag();
  bound.push({ input: range, get: () => String(toPos(get())) });
  bound.push({ input: box, get: () => String(round(get(), o.digits ?? 4)) });
  const el = h('label', { cls: 'field slide' }, h('span', { textContent: label }), h('div', { cls: 'slide-row' }, range, box));
  el.dataset.help = help;
  el.dataset.find = `${label} ${help}`.toLowerCase();
  return el;
}
function text(label: string, help: string, get: () => string, set: (v: string) => void): HTMLElement {
  const input = h('input', { type: 'text' });
  input.onchange = () => set(input.value);
  bound.push({ input, get });
  return labelled('field', label, help, input);
}
function button(label: string, help: string, onclick: () => void, disabled = false): HTMLButtonElement {
  const b = h('button', { cls: 'btn', textContent: label, onclick, disabled });
  b.dataset.help = help;
  return b;
}

function uniqueSound(base: string): string {
  let n = base; let i = 2;
  while (store.docs.sounds[n]) n = `${base}-${i++}`;
  return n;
}

function buildSoundToolbar(): void {
  const play = button('▶ Play', 'Plays the sound (Space). Clicking the waveform plays it too.', () => soundView.play());
  play.classList.add('solid');
  toolbar.replaceChildren(
    play,
    button('Stop', 'Stops playing (Space).', () => soundView.stop()),
    button('Play layer', 'Plays only the picked layer (orange), without the others or the effects.', () => soundView.play(true)),
    check('Loop', 'Plays the sound over and over.', soundView.loop, (on) => { soundView.loop = on; if (soundView.playing) soundView.play(); }),
    check('Play after each change', 'Plays the sound each time you let go of a slider or change a value.', soundView.autoPlay, (on) => (soundView.autoPlay = on)),
    button('Export WAV', 'Renders this sound to a WAV file (44.1 kHz, 16-bit): on the dev server into web/sound-exports, on a published page as a download.', () => void exportWavs([store.sel.sound])),
    button('Export all WAVs', 'Renders every sound to WAV files (on a published page, one zip).', () => void exportWavs(Object.keys(store.docs.sounds))),
    h('span', { cls: 'hint', textContent: 'Click a lane to pick a layer · drag it to move it in time' }),
  );
}

async function exportWavs(keys: string[]): Promise<void> {
  try { status.textContent = await soundView.exportWavs(keys); } catch (e) {
    const code = (e as { code?: string }).code;
    status.textContent = code === 'declined' ? 'Not exported' : `Export failed: ${(e as Error).message ?? String(e)}`;
  }
}

function buildSoundList(): void {
  const q = search.value.trim().toLowerCase();
  const groups = new Map<string, HTMLElement[]>();
  for (const key of Object.keys(store.docs.sounds).sort()) {
    const d = store.docs.sounds[key];
    if (q && !`${key} ${d.note ?? ''}`.toLowerCase().includes(q)) continue;
    const group = isGameSound(key) ? SOUND_GROUPS.find(([re]) => re.test(key))?.[1] ?? 'Game' : 'New sounds';
    const item = h('button', { cls: `item${store.sel.sound === key ? ' on' : ''}`, onclick: () => { store.select({ sound: key, layer: 0 }); soundView.play(); } },
      key, h('small', { textContent: `${d.layers.length} layer${d.layers.length > 1 ? 's' : ''}` }));
    item.dataset.help = d.note ?? (isGameSound(key) ? 'Played by the game.' : 'Not played by the game yet: mix it into another sound with a Sound layer, or export it.');
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(item);
  }
  const kids: HTMLElement[] = [];
  for (const g of ['Kubotz', 'Plasma Blades', 'Arena', 'Power-ups', 'Menus', 'Game', 'New sounds']) if (groups.has(g)) kids.push(h('div', { cls: 'group', textContent: g }), ...groups.get(g)!);
  const add = button('+ New sound', 'Makes a new sound: one tone to start from.', () => {
    const key = uniqueSound('new-sound');
    store.edit('sounds', (d) => { d.sounds[key] = { note: 'A new sound.', length: 0.6, layers: [NEW_LAYERS.tone()] }; });
    store.select({ sound: key, layer: 0 });
  });
  list.replaceChildren(...kids, h('div', { cls: 'list-actions' }, add));
}

/** What the inspector's layout depends on (not the values): it is rebuilt when this changes. */
function soundShape(): string {
  return `snd|${store.sel.sound}|${store.sel.layer}|${JSON.stringify(sound() ?? null, (k, v: unknown) => (typeof v === 'number' ? (k === 'count' ? v > 1 : 0) : v))}`;
}

/** A pitch or cutoff that can glide: from, to, how, how fast, over how long. */
function sweepFields(i: number, label: string, get: (l: Layer) => Sweep, o: { min: number; max: number }, dur: number): HTMLElement[] {
  const sw = () => get(sound()!.layers[i]);
  const edit = (fn: (s: Sweep) => void, drag = true) => editLayer(i, (l) => fn(get(l)), drag);
  const s = sw();
  const out = [
    slide(`${label}`, `Where it starts (Hz).`, () => sw().from, (v) => edit((x) => { x.from = Math.max(o.min, v); }), { ...o, log: true, digits: 1 }),
    pick(`${label} glide`, 'How it moves to the end value: steady (no glide), linear, even (the same musical interval each moment), drop (falls fast then settles) or arch (out to the end value and back).',
      [['none', 'steady'], ['linear', 'linear'], ['exp', 'even'], ['drop', 'drop'], ['arch', 'arch']],
      () => (sw().to === undefined ? 'none' : sw().curve ?? 'linear'),
      (v) => edit((x) => { if (v === 'none') { delete x.to; delete x.curve; delete x.k; delete x.time; } else { x.to ??= x.from * 2; x.curve = v as Sweep['curve']; } }, false)),
  ];
  if (s.to !== undefined) {
    out.push(slide(`${label} to`, 'Where it ends (Hz).', () => sw().to ?? sw().from, (v) => edit((x) => { x.to = Math.max(o.min, v); }), { ...o, log: true, digits: 1 }));
    if (s.curve === 'drop' || s.curve === 'arch') out.push(slide('Bend', s.curve === 'drop' ? 'How fast it drops.' : 'Leans the arch: below 1 it peaks early, above 1 late.', () => sw().k ?? (s.curve === 'drop' ? 6 : 1), (v) => edit((x) => { x.k = v; }), { min: 0.1, max: 30, step: 0.1 }));
    out.push(slide('Glide time', 'Seconds the glide takes (0: the whole layer).', () => sw().time ?? 0, (v) => edit((x) => { if (v > 0) x.time = v; else delete x.time; }), { min: 0, max: Math.max(0.05, dur), step: 0.001 }));
  }
  return out;
}

function envFields(i: number): HTMLElement[] {
  const env = (): Envelope => (sound()!.layers[i] as { env?: Envelope }).env ?? {};
  const edit = (fn: (e: Envelope) => void, drag = true) => editLayer<Layer & { env?: Envelope }>(i, (l) => { l.env ??= {}; fn(l.env); }, drag);
  const shape = env().shape ?? 'hold';
  const out = [
    slide('Attack', 'Seconds it takes to fade in.', () => env().attack ?? 0, (v) => edit((e) => { if (v > 0) e.attack = v; else delete e.attack; }), { min: 0, max: 0.5, step: 0.0005 }),
    pick('Fade', 'How the level moves over the layer: hold (stays full), linear (down to the end level), decay (dies away), curve ((1 - t) to a power), arch (up and down), release (holds, then dies away).',
      [['hold', 'hold'], ['linear', 'linear'], ['exp', 'decay'], ['pow', 'curve'], ['arch', 'arch'], ['release', 'release']], () => env().shape ?? 'hold', (v) => edit((e) => { e.shape = v as Envelope['shape']; }, false)),
  ];
  if (shape === 'exp' || shape === 'pow' || shape === 'release') out.push(slide(shape === 'pow' ? 'Power' : 'Decay speed', 'Higher dies away faster.', () => env().k ?? 4, (v) => edit((e) => { e.k = v; }), { min: 0.1, max: 40, step: 0.1 }));
  if (shape === 'linear') out.push(slide('End level', 'The level it fades to (0 to 1).', () => env().end ?? 0, (v) => edit((e) => { e.end = v; }), { min: 0, max: 1, step: 0.01 }));
  if (shape === 'release') out.push(slide('Hold', 'Seconds at full level before dying away.', () => env().hold ?? 0, (v) => edit((e) => { e.hold = v; }), { min: 0, max: 5, step: 0.01 }));
  return out;
}

function lfoFields(i: number): HTMLElement[] {
  const lfo = () => (sound()!.layers[i] as { lfo?: Lfo }).lfo;
  const edit = (fn: (e: Lfo) => void, drag = true) => editLayer<Layer & { lfo?: Lfo }>(i, (l) => { if (l.lfo) fn(l.lfo); }, drag);
  const out = [pick('Tremolo', 'Sways the level: sine (smooth) or square (chops it, for stutters and blips).', [['off', 'off'], ['sine', 'sine'], ['square', 'square']], () => lfo()?.shape ?? 'off',
    (v) => editLayer<Layer & { lfo?: Lfo }>(i, (l) => { if (v === 'off') delete l.lfo; else l.lfo = { ...(l.lfo ?? { rate: 12, depth: 0.5 }), shape: v as Lfo['shape'] }; }, false))];
  if (!lfo()) return out;
  out.push(
    slide('Tremolo rate', 'Cycles per second.', () => lfo()!.rate, (v) => edit((e) => { e.rate = v; }), { min: 0.1, max: 800, log: true, digits: 2 }),
    slide('Tremolo depth', 'How much it lowers the level (0 to 1).', () => lfo()!.depth, (v) => edit((e) => { e.depth = v; }), { min: 0, max: 1, step: 0.01 }),
  );
  if (lfo()!.shape === 'square') out.push(slide('Duty', 'Below 0 the sound is on longer than off, above 0 shorter.', () => lfo()!.duty ?? 0, (v) => edit((e) => { e.duty = v; }), { min: -1, max: 1, step: 0.01 }));
  return out;
}

/** Pairs or triples of numbers as text: "1:1, 1.5:0.4". */
const tuplesText = (t: number[][] | undefined) => (t ?? []).map((p) => p.map((v) => round(v, 3)).join(':')).join(', ');
const parseTuples = (s: string, n: number) => s.split(/[,;]/).map((p) => p.trim().split(/[:\s]+/).map(Number)).filter((p) => p.length === n && p.every(Number.isFinite));

function layerFields(i: number): HTMLElement[] {
  const def = sound()!;
  const l = def.layers[i];
  const L = <T extends Layer>() => sound()!.layers[i] as T;
  const common = [
    text('Name', 'What this layer is (only for you).', () => L().name ?? '', (v) => editLayer(i, (x) => { x.name = v.trim() || undefined; }, false)),
    slide('Start', 'Seconds from the start of the sound.', () => L().at, (v) => editLayer(i, (x) => { x.at = Math.max(0, v); }), { min: 0, max: def.length, step: 0.001 }),
    slide('Level', 'How loud this layer is.', () => L().gain, (v) => editLayer(i, (x) => { x.gain = v; }), { min: 0, max: 1.5, step: 0.001 }),
  ];
  const out: HTMLElement[] = [];
  if (l.type === 'tone' || l.type === 'noise') common.push(slide('Length', 'Seconds the layer lasts.', () => L<typeof l>().dur, (v) => editLayer<typeof l>(i, (x) => { x.dur = Math.max(0.001, v); }), { min: 0.001, max: def.length, step: 0.001 }));
  out.push(grid(2, ...common));
  if (l.type === 'tone') {
    const T = () => L<typeof l>();
    const fields = [
      pick('Wave', 'The oscillator: sine (pure), soft (a sine pushed into clipping: digital blips), square, saw, triangle.', ['sine', 'soft', 'square', 'saw', 'triangle'], () => T().wave ?? 'sine', (v) => editLayer<typeof l>(i, (x) => { x.wave = v as typeof l.wave; }, false)),
      ...(l.wave === 'soft' ? [slide('Drive', 'How hard the soft wave clips: higher is buzzier.', () => T().drive ?? 2.2, (v) => editLayer<typeof l>(i, (x) => { x.drive = v; }), { min: 0.5, max: 10, step: 0.1 })] : []),
      ...sweepFields(i, 'Pitch', (x) => (x as typeof l).freq, { min: 20, max: 16000 }, l.dur),
      slide('Vibrato rate', 'Wobbles of the pitch per second (0: none).', () => T().wobble?.rate ?? 0, (v) => editLayer<typeof l>(i, (x) => { if (v > 0) x.wobble = { depth: 0.05, ...x.wobble, rate: v }; else delete x.wobble; }), { min: 0, max: 200, step: 0.1 }),
      ...(l.wobble ? [slide(l.wobble.hz ? 'Vibrato Hz' : 'Vibrato depth', l.wobble.hz ? 'How far the pitch wobbles, in Hz.' : 'How far the pitch wobbles, as a fraction of it (0.05 = 5%).', () => T().wobble?.depth ?? 0, (v) => editLayer<typeof l>(i, (x) => { if (x.wobble) x.wobble.depth = v; }), { min: 0, max: l.wobble.hz ? 1000 : 0.5, step: l.wobble.hz ? 1 : 0.005 })] : []),
      text('Voices', 'Extra voices at pitch ratios, as ratio:level pairs ("1:1, 2:0.3" adds an octave). Empty: one voice. A chorus of slightly detuned voices: "1:1, 1.01:0.7".', () => tuplesText(T().partials), (v) => editLayer<typeof l>(i, (x) => { const p = parseTuples(v, 2) as [number, number][]; if (p.length) x.partials = p; else delete x.partials; }, false)),
    ];
    out.push(grid(2, ...fields), h('div', { cls: 'sub', textContent: 'Level over time' }), grid(2, ...envFields(i), ...lfoFields(i)));
  } else if (l.type === 'noise') {
    const N = () => L<typeof l>();
    const filterRows = (l.filters ?? []).map((f, fi) => {
      const F = () => N().filters![fi];
      const editF = (fn: (x: NonNullable<NoiseLayer['filters']>[number]) => void, drag = true) => editLayer<typeof l>(i, (x) => fn(x.filters![fi]), drag);
      const rows: HTMLElement[] = [pick('Filter', 'lowpass keeps the lows (darker), highpass keeps the highs (thinner), bandpass keeps a band (resonant, for whooshes), tilt brightens gently.', ['lowpass', 'highpass', 'bandpass', 'tilt'], () => F().type,
        (v) => editF((x) => { x.type = v as typeof x.type; if (v !== 'tilt') x.cutoff ??= { from: 2000 }; }, false))];
      if (f.type === 'tilt') rows.push(slide('Amount', 'How much brighter (0 to 1).', () => F().amount ?? 0.5, (v) => editF((x) => { x.amount = v; }), { min: 0, max: 1, step: 0.01 }));
      else rows.push(...sweepFields(i, 'Cutoff', (x) => (x as typeof l).filters![fi].cutoff ?? { from: 1000 }, { min: 20, max: 18000 }, l.dur));
      if (f.type === 'bandpass') rows.push(slide('Resonance', 'Q: higher is a narrower, whistlier band.', () => F().q ?? 1.4, (v) => editF((x) => { x.q = v; }), { min: 0.3, max: 20, step: 0.05 }));
      const rm = button('Remove filter', 'Takes this filter off.', () => editLayer<typeof l>(i, (x) => { x.filters!.splice(fi, 1); if (!x.filters!.length) delete x.filters; }, false));
      return h('div', { cls: 'value-box' }, grid(2, ...rows), h('div', { cls: 'keyline' }, rm));
    });
    const addF = button('+ Filter', 'Adds a filter after the others (two lowpasses make a steeper one).', () => editLayer<typeof l>(i, (x) => { (x.filters ??= []).push({ type: 'lowpass', cutoff: { from: 2000 } }); }, false));
    out.push(...filterRows, h('div', { cls: 'keyline' }, addF),
      grid(2,
        slide('Ring mod', 'A ring modulator\'s pitch (Hz): a metallic, synthetic grit. Set its depth above 0 to hear it.', () => N().ring?.freq ?? 200, (v) => editLayer<typeof l>(i, (x) => { x.ring = { depth: 0, ...x.ring, freq: v }; }), { min: 1, max: 4000, log: true, digits: 1 }),
        slide('Ring depth', 'How much of the ring modulation (0: none).', () => N().ring?.depth ?? 0, (v) => editLayer<typeof l>(i, (x) => { if (v > 0) x.ring = { freq: 200, ...x.ring, depth: v }; else delete x.ring; }), { min: 0, max: 1, step: 0.01 }),
      ),
      h('div', { cls: 'sub', textContent: 'Level over time' }), grid(2, ...envFields(i), ...lfoFields(i)));
  } else if (l.type === 'ping') {
    const P = () => L<typeof l>();
    const preset = () => { const p = JSON.stringify(P().partials ?? GLASS); return p === JSON.stringify(GLASS) ? 'glass' : p === JSON.stringify(PLATE) ? 'plate' : 'custom'; };
    out.push(grid(2,
      slide('Pitch', 'The struck note (Hz).', () => P().freq, (v) => editLayer<typeof l>(i, (x) => { x.freq = v; }), { min: 40, max: 12000, log: true, digits: 1 }),
      pick('Material', 'What is struck: glass (rings long and bright) or a metal plate (short and dull). Edit the partials for your own.', [['glass', 'glass'], ['plate', 'metal plate'], ['custom', 'custom']], preset,
        (v) => editLayer<typeof l>(i, (x) => { if (v === 'glass') delete x.partials; else if (v === 'plate') x.partials = PLATE.map((p) => [...p] as [number, number, number]); }, false)),
      text('Partials', 'ratio:level:decay for each partial ("1:1:9, 2.32:0.55:14"); a higher decay dies faster.', () => tuplesText(P().partials ?? GLASS), (v) => editLayer<typeof l>(i, (x) => { const p = parseTuples(v, 3) as [number, number, number][]; if (p.length) x.partials = p; }, false)),
      slide('Click', 'Seconds for the strike to come in (0: a hard click).', () => P().click ?? 0.0005, (v) => editLayer<typeof l>(i, (x) => { x.click = v; }), { min: 0, max: 0.02, step: 0.0001 }),
      slide('Count', 'More than 1 scatters random pings: sparks, crackle.', () => P().count ?? 1, (v) => editLayer<typeof l>(i, (x) => { if (v > 1) x.count = Math.round(v); else { delete x.count; delete x.spread; delete x.freqTo; } }), { min: 1, max: 80, step: 1 }),
      ...((l.count ?? 1) > 1 ? [
        slide('Spread', 'Seconds the pings are scattered over (more of them early).', () => P().spread ?? 1, (v) => editLayer<typeof l>(i, (x) => { x.spread = v; }), { min: 0.01, max: 4, step: 0.01 }),
        slide('Pitch to', 'Each ping takes a random pitch between Pitch and this.', () => P().freqTo ?? P().freq, (v) => editLayer<typeof l>(i, (x) => { x.freqTo = v; }), { min: 40, max: 12000, log: true, digits: 1 }),
      ] : []),
    ));
  } else {
    const S = () => L<typeof l>();
    out.push(grid(2,
      pick('Sound', 'Which sound this layer plays (with its own effects).', Object.keys(def === sound() ? store.docs.sounds : {}).filter((k) => k !== store.sel.sound).sort(), () => S().sound, (v) => editLayer<typeof l>(i, (x) => { x.sound = v; }, false)),
      slide('Pitch', 'Semitones up or down (12 = an octave). Like a tape: higher also plays faster and shorter.', () => S().pitch ?? 0, (v) => editLayer<typeof l>(i, (x) => { x.pitch = v; }), { min: -24, max: 24, step: 0.1, digits: 1 }),
    ));
  }
  out.push(h('div', { cls: 'keyline' },
    button('Play layer', 'Plays only this layer.', () => { store.select({ layer: i }); soundView.play(true); }),
    button(l.mute ? 'Unmute' : 'Mute', 'Leaves this layer out of the sound (it stays here to bring back).', () => editLayer(i, (x) => { if (x.mute) delete x.mute; else x.mute = true; }, false)),
    button('Duplicate', 'Copies this layer (then change its pitch for a chorus or a harmony).', () => { editSound((d) => { d.layers.splice(i + 1, 0, JSON.parse(JSON.stringify(d.layers[i])) as Layer); }, false); store.select({ layer: i + 1 }); }),
    button('Remove', 'Removes this layer.', () => { editSound((d) => { d.layers.splice(i, 1); }, false); store.select({ layer: Math.max(0, i - 1) }); }, def.layers.length < 2),
  ));
  return out;
}

function buildSoundInspector(): void {
  bound = [];
  const key = store.sel.sound;
  const def = sound();
  if (!def) { sectionsEl.replaceChildren(h('p', { cls: 'note', textContent: 'Pick a sound on the left.' })); return; }
  const game = isGameSound(key);
  const users = soundUsers(key);
  const out: HTMLElement[] = [h('div', { cls: 'inspector-title', textContent: `Sound · ${key}` })];
  const nameInput = h('input', { value: key, disabled: game });
  nameInput.onchange = () => {
    const next = nameInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!next || next === key || store.docs.sounds[next]) { nameInput.value = key; return; }
    store.edit('sounds', (d) => {
      d.sounds[next] = d.sounds[key]; delete d.sounds[key];
      for (const s of Object.values(d.sounds)) for (const l of s.layers) if (l.type === 'sound' && l.sound === key) l.sound = next;
    }, false);
    store.select({ sound: next });
  };
  const nameField = h('label', { cls: 'field' }, h('span', { textContent: 'Name' }), nameInput);
  nameField.dataset.help = game ? 'The game plays this sound by this name, so it cannot be renamed.' : 'The sound\'s name and file name (src/data/sounds/<name>.json, <name>.wav).';
  const ed = (fn: (d: SoundDef) => void, drag = true) => editSound(fn, drag);
  out.push(section('sound', 'Sound', [
    grid(2, nameField,
      slide('Length', 'Seconds: everything after is cut (make room for reverb and echoes).', () => sound()!.length, (v) => ed((d) => { d.length = Math.max(0.02, v); }), { min: 0.02, max: 5, step: 0.01 }),
      slide('Peak limit', 'Turns the whole sound down if its loudest point goes over this (0: off).', () => sound()!.normalize ?? 0, (v) => ed((d) => { if (v > 0) d.normalize = v; else delete d.normalize; }), { min: 0, max: 1, step: 0.01 }),
      num('Noise seed', 'Which random noise and sparks it uses: change it for another take of the same sound.', () => sound()!.seed ?? 1, (v) => ed((d) => { d.seed = Math.round(v ?? 1); }, false), { step: 1, digits: 0 })),
    grid(1, text('Note', 'What the sound is for.', () => sound()!.note ?? '', (v) => ed((d) => { d.note = v || undefined; }, false))),
    h('div', { cls: 'keyline' },
      button('Duplicate', 'Makes a copy of this sound to try changes on.', () => { const copy = uniqueSound(`${key}-copy`); store.edit('sounds', (d) => { d.sounds[copy] = JSON.parse(JSON.stringify(d.sounds[key])) as SoundDef; }, false); store.select({ sound: copy, layer: 0 }); }),
      button('Delete', game ? 'The game plays this sound: it cannot be deleted.' : users.length ? `Mixed into ${users.join(', ')}: take it out of those first.` : 'Deletes this sound (its file goes on Save).',
        () => { store.edit('sounds', (d) => { delete d.sounds[key]; }, false); store.select({ sound: Object.keys(store.docs.sounds)[0] ?? '', layer: 0 }); }, game || users.length > 0)),
    h('p', { cls: 'note', textContent: game ? 'Played by the game.' : users.length ? `Mixed into ${users.join(', ')}.` : 'Not played by the game.' }),
  ]));
  const fx = <K extends 'delay' | 'chorus'>(k: K, dflt: NonNullable<SoundDef[K]>) => (fn: (e: NonNullable<SoundDef[K]>) => void) => ed((d) => { d[k] ??= { ...dflt }; fn(d[k]!); });
  const delay = fx('delay', { time: 0.18, feedback: 0.35, mix: 0 });
  const chorus = fx('chorus', { voices: 3, depth: 4, rate: 0.8, mix: 0 });
  out.push(section('sound-fx', 'Effects', [
    grid(2, slide('Reverb', 'A small room: how much of it (0: dry).', () => sound()!.reverb ?? 0, (v) => ed((d) => { if (v > 0) d.reverb = v; else delete d.reverb; }), { min: 0, max: 1, step: 0.01 })),
    h('div', { cls: 'sub', textContent: 'Delay (echoes)' }),
    grid(3,
      slide('Mix', 'How loud the echoes are (0: off).', () => sound()!.delay?.mix ?? 0, (v) => delay((e) => { e.mix = v; }), { min: 0, max: 1, step: 0.01 }),
      slide('Time', 'Seconds between echoes.', () => sound()!.delay?.time ?? 0.18, (v) => delay((e) => { e.time = Math.max(0.005, v); }), { min: 0.005, max: 1, step: 0.005 }),
      slide('Feedback', 'How much of each echo comes back again (more: longer tail).', () => sound()!.delay?.feedback ?? 0.35, (v) => delay((e) => { e.feedback = Math.min(0.95, v); }), { min: 0, max: 0.95, step: 0.01 })),
    h('div', { cls: 'sub', textContent: 'Chorus' }),
    grid(2,
      slide('Mix', 'How much of the chorus (0: off).', () => sound()!.chorus?.mix ?? 0, (v) => chorus((e) => { e.mix = v; }), { min: 0, max: 1, step: 0.01 }),
      slide('Voices', 'Copies of the sound, each swaying on its own.', () => sound()!.chorus?.voices ?? 3, (v) => chorus((e) => { e.voices = Math.round(v); }), { min: 1, max: 6, step: 1 }),
      slide('Depth', 'How far the voices sway (ms): more is more detuned.', () => sound()!.chorus?.depth ?? 4, (v) => chorus((e) => { e.depth = v; }), { min: 0.1, max: 20, step: 0.1 }),
      slide('Rate', 'How fast they sway (per second).', () => sound()!.chorus?.rate ?? 0.8, (v) => chorus((e) => { e.rate = v; }), { min: 0.05, max: 8, step: 0.05 })),
  ]));
  def.layers.forEach((l, i) => {
    // Only the picked layer is open; opening another picks it.
    const sec = h('details', { cls: `section${i === store.sel.layer ? ' picked' : ''}`, open: i === store.sel.layer });
    sec.dataset.id = `snd-layer-${i}`;
    const sum = h('summary', {}, h('span', { textContent: `${i + 1} · ${LAYER_NAMES[l.type]}${l.name ? ` · ${l.name}` : ''}${l.mute ? ' (muted)' : ''}` }));
    sum.addEventListener('click', (e) => { if (store.sel.layer !== i) { e.preventDefault(); store.select({ layer: i }); } });
    sec.append(sum, ...layerFields(i));
    out.push(sec);
  });
  out.push(h('div', { cls: 'keyline' }, ...(Object.keys(NEW_LAYERS) as Layer['type'][]).map((t) => button(`+ ${LAYER_NAMES[t]}`,
    { tone: 'Adds a tone: an oscillator gliding in pitch.', noise: 'Adds noise through filters: hiss, whooshes, blasts.', ping: 'Adds a struck glass or metal ping (or scattered sparks).', sound: 'Adds another whole sound, at its own pitch and time: build sounds out of sounds.' }[t],
    () => { editSound((d) => { d.layers.push(NEW_LAYERS[t]()); }, false); store.select({ layer: sound()!.layers.length - 1 }); }))));
  sectionsEl.replaceChildren(...out);
  filterProps();
}
soundView.onPick = (i) => { sectionsEl.querySelector(`details[data-id="snd-layer-${i}"]`)?.scrollIntoView({ block: 'nearest' }); };

// Inside the game: the Kubot stage joins the running game (started when the editor opens).
if (host.inGame) {
  game.registry.set('store', store);
  stage = game.scene.add('Editor', StageScene, false) as StageScene;
  stageEl.append(readout);
}

// Handy for debugging from the browser console.
(window as unknown as { editor: object }).editor = { store, game, get stage() { return stage; }, get arena() { return arenaScene(); } };

buildList();
store.emit();
