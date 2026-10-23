import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { ALL_LAYERS, type DebugLayers } from '../scenes/DebugScene';
import { ARENAS, ARENA_IDS, ARENA_INFO, DEFAULT_SIZE } from '../map/Arenas';
import { ArenaScene } from './ArenaScene';
import { installHelp } from './Help';
import { host, store } from './Host';
import { Config } from '../config';
import type { TmxMap } from '../map/TmxMap';
import { PIECE_NAMES, POINT_KINDS, piecesOf, pointOf, setPoint, type ArenaPiece, type PointKind } from './Store';
import { CONE_ANGLE, CONE_SPREAD, MAX_MAP_LIGHTS, arenaFromTmx, npcRecharges, warpExit, type ArenaData, type ArenaDef, type BlockLook, type LightEffect, type MapLayer, type MapLight, type NpcBehaviour, type TilePaint } from '../map/Arenas';
import { MUSIC } from '../audio/Sounds';
import { parseTmx } from '../map/TmxMap';
import { CpuController } from '../game/Ai';
import { addMusic } from '../game/Settings';
import { ROOM_CHOICES } from '../fx/Backdrops';
import './devhud.css';

/**
 * The in-match dev HUD (dev builds only): F2 or the DEV button shows a panel
 * over the running match with
 *  - time: pause, one frame, slow motion;
 *  - debug views: physics bodies, hit and hurt boxes, AI paths and plans,
 *    the Kubotz' states, the frame stats (the F3 overlay, layer by layer);
 *  - the arena being played: pick, move, resize, add and delete its pieces
 *    over the real arena (ArenaScene on top of the match); each change
 *    rebuilds the match there (no intro or music, camera kept); Save writes
 *    the arena's file.
 */

function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string; help?: string } = {}, ...kids: (Node | string | null | false)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const { cls, help, ...rest } = props;
  if (cls) el.className = cls;
  if (help) el.dataset.help = help;
  Object.assign(el, rest);
  for (const k of kids) if (k !== null && k !== false) el.append(k);
  return el;
}

/** The palette: what can be dragged onto the map (or tapped: it lands in the middle of the view). */
const ELEMENTS: [ArenaPiece['kind'], string, string][] = [
  ['walls', 'Wall', 'A solid block (4 x 2 units to start: drag its white corners to resize it).'],
  ['platforms', 'Platform', 'A drop-through platform (6 units wide, one thick).'],
  ['warps', 'Portal', 'A portal: drag its purple ring to where it leads (a faint dotted line shows the way).'],
  ['spawns', 'Spawn', 'Where a Kubot appears (on its feet).'],
  ['bonus', 'Bonus', 'A spot where power-up balls drop.'],
  ['emitters', 'Particles', 'A particle effect playing in the map: pick the effect and how often it plays.'],
  ['npcs', 'NPC', 'A hostile CPU of the map (black team, no HUD card): pick its behaviour, level and whether it comes back.'],
  ['lights', 'Light', 'A light for ambience: it lights the tiles and the Kubotz near it. Pick its colour, reach, strength and whether it pulses or flickers.'],
];

const LAYERS: [keyof DebugLayers, string, string][] = [
  ['bodies', 'Physics bodies', 'The Box2D bodies: green solid, cyan platforms, yellow Kubotz, white feet sensors, purple portals.'],
  ['boxes', 'Hit and hurt boxes', 'Each Kubot\'s hurtbox (red outline) and its attack circles while they are active.'],
  ['ledges', 'Ledge grabs', 'Each ledge\'s grab box (green, amber while held): a falling Kubot catches the ledge when the top of its body (green dot) is in it. A red cross marks a block corner with no ledge: no room to hang under it, or to stand just inside it.'],
  ['ai', 'AI paths', 'The navigation graph (surfaces and jump, drop and fall links) and each CPU\'s path and destination.'],
  ['states', 'Kubot states', 'A readout over each Kubot: health, clip and progress, combo, speed, ground or air, stun, AI mode.'],
  ['stats', 'Frame stats', 'FPS, frame time graph, body and object counts.'],
];

export function installDevHud(game: Phaser.Game): void {
  const gameEl = document.getElementById('game')!;
  const match = () => game.scene.getScene('Game') as GameScene | null;
  const inMatch = () => { const g = match(); return !!g && (g.sys.isActive() || g.sys.isPaused()) && !g.setup?.preview; };
  game.scene.add('Arena', new ArenaScene(true), false);
  const arena = () => game.scene.getScene('Arena') as ArenaScene;

  const toggle = h('button', { cls: 'dev-toggle', textContent: 'DEV', help: 'The dev HUD (F2): time controls, debug views and the arena tools.', onclick: () => setOpen(!open) });
  const panel = h('div', { cls: 'dev-hud' });
  panel.hidden = true;
  gameEl.append(toggle, panel);
  installHelp(gameEl);
  let open = false;
  let editing = false;

  /** A field's identity across rebuilds: its section, its label, and its place among that label's controls. */
  const fieldKey = (el: HTMLElement): string => {
    const section = el.closest('details')?.querySelector('summary')?.textContent ?? '';
    const holder = el.closest('label') ?? el.parentElement;
    const label = holder?.querySelector('span')?.textContent ?? el.textContent ?? '';
    const index = holder ? [...holder.querySelectorAll('input, select, textarea, button')].indexOf(el) : 0;
    return `${section}|${label}|${index}|${el.tagName}`;
  };

  // Typing in the HUD's fields must not move the Kubotz (nor the game's captured keys swallow the typing).
  panel.addEventListener('focusin', (e) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) game.input.keyboard!.enabled = false; });
  panel.addEventListener('focusout', () => { game.input.keyboard!.enabled = true; });

  /** Closing the HUD gives the match back as it plays: running, full speed, keys on, its camera its own. */
  const setOpen = (on: boolean) => {
    if (!on) stopListening();
    open = on && inMatch();
    panel.hidden = !open;
    if (!open) {
      setEditing(false);
      const d = debug();
      if (d) { d.frozen = false; d.timeScale = 1; }
      game.input.keyboard!.enabled = true;
    }
    build();
  };

  // ---------------------------------------------------------------- time
  const debug = () => match()?.debugState;
  const pauseBtn = h('button', { cls: 'btn', textContent: 'Pause', help: 'Freezes the match (the dev HUD keeps working).', onclick: () => { const d = debug(); if (d) { d.frozen = !d.frozen; refresh(); } } });
  const stepBtn = h('button', { cls: 'btn', textContent: 'Step', help: 'Runs one frame (1/60 s) and freezes.', onclick: () => { const d = debug(); if (d) { d.frozen = true; d.steps++; refresh(); } } });
  const speed = h('select', { help: 'Game speed.' }, ...[1, 0.5, 0.25, 0.1].map((v) => h('option', { value: String(v), textContent: `${v}x` })));
  speed.onchange = () => { const d = debug(); if (d) d.timeScale = Number(speed.value); };

  // ---------------------------------------------------------------- debug views
  const layerBoxes = LAYERS.map(([key, label, help]) => {
    const box = h('input', { type: 'checkbox' });
    box.onchange = () => setLayer(key, box.checked);
    return { key, box, el: h('label', { help }, box, label) };
  });
  const setLayer = (key: keyof DebugLayers, on: boolean) => {
    const g = match();
    if (!g) return;
    const d = g.debugState;
    if (!d.on) d.show = { bodies: false, boxes: false, ledges: false, ai: false, states: false, stats: false };
    d.show[key] = on;
    const any = Object.values(d.show).some(Boolean);
    if (any && !d.on) { d.on = true; g.scene.launch('Debug'); }
    if (!any && d.on) { d.on = false; g.scene.stop('Debug'); d.show = { ...ALL_LAYERS }; }
    if (d.on) g.scene.bringToTop('Debug');
    bringToolsUp();
  };

  // ---------------------------------------------------------------- arena
  const setEditing = (on: boolean) => {
    editing = on && inMatch();
    const d = debug();
    if (d) d.holdCamera = editing; // the camera is yours while editing
    const sc = game.scene;
    if (editing) {
      const g = match()!;
      const id = ARENA_IDS[g.arena];
      if (id) store.select({ arena: id, piece: null });
      // Editing pauses the match (Resume, at the top, lets it run while you edit).
      if (d) { d.frozen = true; d.steps = 2; }
      if (!sc.isActive('Arena')) sc.run('Arena');
      arena().tool = 'select';
      bringToolsUp();
    } else if (sc.isActive('Arena')) sc.stop('Arena');
  };
  const bringToolsUp = () => { for (const k of ['Debug', 'Arena']) if (game.scene.isActive(k)) game.scene.bringToTop(k); };

  /** Restarts the match in an arena (its edits in), no intro, the camera kept when it is the same arena. */
  const playArena = (index: number, opts: { edit?: boolean } = {}) => {
    const g = match();
    if (!g?.setup) return;
    const cam = g.cameras.main;
    const keep = g.arena === index ? { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom } : null;
    const before = g.setup;
    const d = g.debugState;
    const was = { frozen: d.frozen, on: d.on, show: { ...d.show }, timeScale: d.timeScale };
    // The same arena rebuilt: the players' Kubotz stay where they are (no respawn, no spawn sound).
    const keepKubotz = g.arena === index
      ? g.fighters.filter((k) => !k.home && k.isAlive()).length === g.setup.fighters.length
        ? g.fighters.filter((k) => !k.home).map((k) => ({ x: k.body.x, y: k.body.y, facing: k.facing as 1 | -1, health: k.health, lives: k.lives }))
        : undefined
      : undefined;
    // Kept Kubotz only need a frame or two drawn; new ones (frozen) a moment to beam in.
    const kept = !!keepKubotz;
    const ready = () => {
      if (g.setup === before || !g.sys.isActive()) return;
      game.events.off(Phaser.Core.Events.POST_STEP, ready);
      if (keep) g.cameras.main.setZoom(keep.zoom).setScroll(keep.x, keep.y);
      // The overlay edits the arena now playing (this runs once the new match exists, so its arena is the new one).
      const id = ARENA_IDS[g.arena];
      if (opts.edit) setEditing(true);
      else if (editing && id && id !== store.sel.arena) store.select({ arena: id, piece: null });
      // A different arena: while editing, show all of it (the match's camera is held, so it would stay on the first spawn).
      if (!keep && editing) { g.cameras.main.preRender(); arena().recentre(); }
      // The debug views and time as they were.
      Object.assign(g.debugState, { frozen: was.frozen || !!opts.edit, steps: was.frozen || opts.edit ? (kept ? 2 : 45) : 0, timeScale: was.timeScale, show: was.show, holdCamera: editing });
      if (was.on) { g.debugState.on = true; g.scene.launch('Debug'); }
      bringToolsUp();
      // The panel shows the arena now playing.
      shape = '';
      build();
    };
    game.events.on(Phaser.Core.Events.POST_STEP, ready);
    g.scene.restart({ ...g.setup, arena: index, editor: true, keep: keepKubotz });
  };

  // Edits to the arena playing rebuild the match once a drag or a typed value is done (debounced),
  // in play mode too (a new background).
  // The match knows the arena it was built from (GameScene.arenaBuilt): it is rebuilt when that changed.
  let timer = 0;
  const changed = (g: GameScene) => g.arena > 0 && JSON.stringify(ARENAS[g.arena] ?? null) !== g.arenaBuilt;
  store.on(() => {
    const g = match();
    if (!g || !changed(g) || store.busy) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const now = match();
      if (!now || store.busy || !changed(now)) return;
      playArena(now.arena);
    }, 250);
  });
  store.on(() => { if (open) build(); });

  // ---------------------------------------------------------------- top bar: time, undo, save
  const status = h('span', { cls: 'dev-status' });
  const say = (text: string) => { status.textContent = text; status.title = text; };
  const undoBtn = h('button', { cls: 'btn', textContent: 'Undo', help: 'Undoes the last change (arena, clips, moves or particles).', onclick: () => store.undo() });
  const redoBtn = h('button', { cls: 'btn', textContent: 'Redo', help: 'Redoes what was undone.', onclick: () => store.redo() });
  const saveBtn = h('button', { cls: 'btn primary', textContent: 'Save', help: 'Keeps your edits in this browser: the game plays them, and they are still here after a reload. Export writes them to files.', onclick: () => say(store.keep()) });
  const exportBtn = h('button', { cls: 'btn', textContent: 'Export', help: 'Writes the changed data files (src/data: arenas, clips, moves, particles): on the dev server straight into the project, on a published page as downloads.', onclick: () => void exportFiles() });
  let revertArmed = 0;
  const revertBtn = h('button', { cls: 'btn', textContent: 'Revert', help: 'Drops every edit (saved in this browser or not) and goes back to the data the game was built with. Click twice.', onclick: () => {
    if (Date.now() - revertArmed > 3000) { revertArmed = Date.now(); revertBtn.textContent = 'Sure?'; setTimeout(() => { revertBtn.textContent = 'Revert'; }, 3000); return; }
    revertArmed = 0;
    revertBtn.textContent = 'Revert';
    store.revert();
    say('Back to the built data');
    const g = match();
    if (g) playArena(g.arena);
  } });
  const exportFiles = async () => {
    try { say(await store.save()); } catch (e) { say(`Not exported: ${(e as Error).message ?? e}`); }
  };
  const topBar = h('div', { cls: 'dev-top' },
    h('div', { cls: 'dev-head' }, h('strong', { textContent: 'DEV' }), status, h('button', { cls: 'btn', textContent: 'Close', help: 'Hides the dev HUD (F2); the match plays on.', onclick: () => setOpen(false) })),
    h('div', { cls: 'dev-row' }, saveBtn, exportBtn, revertBtn),
  );
  // The mode box, at the top: Play mode or Edit mode, and that mode's controls (filled by build()).
  const modeBox = h('div', { cls: 'dev-modebox' });
  topBar.insertBefore(modeBox, topBar.children[1]);

  // ---------------------------------------------------------------- the palette (drag onto the map)
  /** Drags a palette element onto the map: a label follows the pointer and the piece lands where it is let go (a tap: the middle of the view). */
  const dragFromPalette = (kind: ArenaPiece['kind'], label: string, e: PointerEvent) => {
    e.preventDefault();
    const from = { x: e.clientX, y: e.clientY };
    const ghost = h('div', { cls: 'dev-ghost', textContent: label });
    gameEl.append(ghost);
    const place = (ev: PointerEvent) => { ghost.style.left = `${ev.clientX - gameEl.getBoundingClientRect().left}px`; ghost.style.top = `${ev.clientY - gameEl.getBoundingClientRect().top}px`; };
    place(e);
    const move = (ev: PointerEvent) => place(ev);
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      ghost.remove();
      const moved = Math.hypot(ev.clientX - from.x, ev.clientY - from.y) > 8;
      const overPanel = panel.contains(document.elementFromPoint(ev.clientX, ev.clientY));
      const at = moved ? (overPanel ? null : arena().worldAt(ev.clientX, ev.clientY)) : arena().viewCentre();
      if (at) arena().dropAt(kind, at.x, at.y);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // ---------------------------------------------------------------- new arenas
  const newArena = () => {
    let n = 1;
    while (store.docs.arenas[`arena-${n}`]) n++;
    const id = `arena-${n}`;
    const order = Math.max(0, ...Object.values(store.docs.arenas).map((a) => a.order)) + 1;
    // From scratch: a floor to stand on and four spawns on it; the rest is yours.
    store.edit('arenas', (d) => {
      d.arenas[id] = { order, name: `New arena ${n}`, description: 'Made in the dev HUD', room: 'kube', walls: [[6, 34, 40, 3]], platforms: [], warps: [], spawns: [[12, 34], [40, 34], [20, 34], [32, 34]], bonus: [[26, 30]] };
    });
    store.select({ arena: id, piece: null });
    const i = ARENA_IDS.indexOf(id);
    if (i > 0) playArena(i, { edit: true });
  };

  /**
   * Import: an arena file (.json, as Export writes it) or a Tiled map made
   * like the original (.tmx), added as a new arena (named after the file)
   * and opened in edit mode.
   */
  const importArena = async (file: File) => {
    const base = file.name.replace(/\.[^.]+$/, '');
    let def: ArenaDef;
    try {
      if (/\.tmx$/i.test(file.name)) def = arenaFromTmx(await parseTmx(await file.text()), base);
      else {
        const j = JSON.parse(await file.text()) as Partial<ArenaData>;
        if (!Array.isArray(j.walls) || !Array.isArray(j.spawns)) throw new Error('no walls or spawns in it');
        def = { ...j, name: j.name ?? base, description: j.description ?? (j as { blurb?: string }).blurb ?? 'Imported', walls: j.walls, platforms: j.platforms ?? [], warps: j.warps ?? [], spawns: j.spawns, bonus: j.bonus ?? [] };
      }
    } catch (e) {
      say(`Could not import ${file.name}: ${(e as Error).message}`);
      return;
    }
    if (!def.spawns.length) def.spawns = [[(def.size ?? DEFAULT_SIZE)[0] / 2, 4]];
    const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'imported';
    let id = slug;
    for (let n = 2; store.docs.arenas[id]; n++) id = `${slug}-${n}`;
    const order = Math.max(0, ...Object.values(store.docs.arenas).map((a) => a.order)) + 1;
    store.edit('arenas', (d) => { d.arenas[id] = { ...def, order }; });
    store.select({ arena: id, piece: null });
    say(`Imported ${file.name} as "${def.name}". Save keeps it, Export writes its file.`);
    const i = ARENA_IDS.indexOf(id);
    if (i > 0) playArena(i, { edit: true });
  };
  const importInput = h('input', { type: 'file', accept: '.json,.tmx' });
  importInput.hidden = true;
  importInput.onchange = () => { const f = importInput.files?.[0]; importInput.value = ''; if (f) void importArena(f); };

  /** A new id for an arena (its file name): lower case, digits and dashes, not taken. */
  const renameArena = (from: string, raw: string) => {
    const to = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!to || to === from) { shape = ''; build(); return; }
    if (store.docs.arenas[to]) { say(`There is already an arena "${to}".`); shape = ''; build(); return; }
    store.edit('arenas', (d) => { d.arenas[to] = d.arenas[from]; delete d.arenas[from]; });
    store.select({ arena: to, piece: null });
    say(`Renamed to ${to}: Export writes ${to}.json and removes ${from}.json.`);
  };

  // ---------------------------------------------------------------- the panel
  let shape = '';
  const section = (title: string, ...body: (Node | null | false)[]) => h('details', { cls: 'dev-section', open: true }, h('summary', { textContent: title }), ...body);
  const num = (label: string, value: number, set: (v: number) => void, step = 1) => {
    const input = h('input', { type: 'number', value: String(value), step: String(step) });
    input.onchange = () => set(Number(input.value));
    return h('label', { cls: 'dev-field' }, h('span', { textContent: label }), input);
  };
  const choose = (label: string, help: string, options: [string, string][], value: string, set: (v: string) => void) => {
    const sel = h('select', {}, ...options.map(([v, l]) => h('option', { value: v, textContent: l })));
    sel.value = value;
    sel.onchange = () => set(sel.value);
    return h('label', { cls: 'dev-field', help }, h('span', { textContent: label }), sel);
  };
  // The arena's music, and a button to hear it (the editor's matches play none).
  let listening: Phaser.Sound.BaseSound | null = null;
  const stopListening = () => { listening?.destroy(); listening = null; };
  const musicField = (value: string, set: (v: string) => void) => {
    const sel = h('select', {}, ...MUSIC.map(([v, l]) => h('option', { value: v, textContent: l })));
    sel.value = value;
    const listen = h('button', { cls: 'btn', textContent: listening ? 'Stop' : 'Listen', help: 'Plays the chosen music here (the match plays it when it starts from the setup screen).' });
    listen.onclick = () => {
      if (listening) { stopListening(); listen.textContent = 'Listen'; return; }
      if (sel.value === 'none') return;
      listening = addMusic(match()!, sel.value, 0.28);
      listening.play();
      listen.textContent = 'Stop';
    };
    sel.onchange = () => { const was = !!listening; stopListening(); set(sel.value); if (was && sel.value !== 'none') listen.click(); else listen.textContent = 'Listen'; };
    return h('label', { cls: 'dev-field', help: 'The music the match plays.' }, h('span', { textContent: 'Music' }), h('div', { cls: 'dev-row' }, sel, listen));
  };
  /** Play mode: the players' CPUs fight, or stand still as dummies to test the map on (map NPCs keep their own behaviour). */
  const cpuMode = (g: GameScene) => choose('CPUs', 'Fight: the CPUs play as in a match. Dummy: they do nothing at all, targets to test the map on.',
    [['fight', 'Fight'], ['dummy', 'Dummy (do nothing)']], (g.setup?.fighters ?? []).every((f) => f.input !== 'CPU' || f.dummy) ? 'dummy' : 'fight', (v) => {
      for (const f of g.setup?.fighters ?? []) if (f.input === 'CPU') f.dummy = v === 'dummy';
      for (const k of g.fighters) if (!k.home && k.controller instanceof CpuController) k.controller.behaviour = v === 'dummy' ? 'dummy' : undefined;
    });
  /** Where a light's glow or a particle effect is drawn (its z-index). */
  const layerField = (value: MapLayer, set: (v: MapLayer) => void) => choose('Layer', 'Where it is drawn: behind the arena\'s blocks (seen through the gaps), over the blocks but behind the Kubotz, or in front of everything.',
    [['behind', 'Behind the arena'], ['arena', 'Over the arena, behind the Kubotz'], ['front', 'In front of everything']], value, (v) => set(v as MapLayer));
  const clampSize = (n: number, min: number, max: number) => Math.round(Phaser.Math.Clamp(n || min, min, max));
  const check = (label: string, help: string, on: boolean, set: (v: boolean) => void) => {
    const box = h('input', { type: 'checkbox', checked: on });
    box.onchange = () => set(box.checked);
    return h('label', { help }, box, label);
  };

  function build(): void {
    const g = match();
    const p = store.sel.piece;
    const id = g ? ARENA_IDS[g.arena] : null;
    const a = id ? store.docs.arenas[id] : null;
    const piecesNow = a && p ? piecesOf(a, p.kind)[p.index] : null;
    const next = `${open}|${editing}|${g?.arena}|${id}|${a?.description}|${p?.kind}:${p?.index}|${JSON.stringify(piecesNow ?? null)}|${a?.name}|${a?.room}|${a?.music}|${ARENA_INFO.length}|${arena()?.tool}|${arena()?.brush.source}`;
    if (next === shape || !open || !g) { refresh(); return; }
    shape = next;
    const editArena = (fn: (x: ArenaData) => void) => store.edit('arenas', (d) => fn(d.arenas[id!]));

    const arenaPick = choose('Arena', 'Moves the match to another arena (no intro).', ARENA_INFO.map((info, i) => [String(i), info.name]), String(g.arena), (v) => playArena(Number(v)));
    const newBtn = h('button', { cls: 'btn', textContent: 'New arena', help: 'Makes a new arena from scratch (a floor and four spawns) and moves the match there to build it.', onclick: () => newArena() });
    const importBtn = h('button', { cls: 'btn', textContent: 'Import', help: 'Adds an arena from a file: one Export wrote (.json), or a Tiled map made like the original (.tmx: its WALL, STATIC_PLATFORM, WARP_ZONE, PLAYER_SPAWN and BONUS_SPAWN objects). The match moves there in edit mode.', onclick: () => importInput.click() });

    const palette = h('div', { cls: 'dev-palette' }, ...ELEMENTS.map(([kind, label, help]) => {
      const item = h('div', { cls: `dev-element dev-${kind}`, textContent: label, help });
      item.addEventListener('pointerdown', (e) => dragFromPalette(kind, label, e));
      return item;
    }));

    let piece: HTMLElement | null = null;
    if (editing && a && p && piecesOf(a, p.kind)[p.index]) {
      const rect = !(POINT_KINDS as string[]).includes(p.kind);
      const v = rect ? piecesOf(a, p.kind)[p.index] as number[] : pointOf(a, p.kind as PointKind, p.index)!;
      const set = (i: number, min = -99) => (n: number) => editArena((x) => {
        if (rect) { (piecesOf(x, p.kind)[p.index] as number[])[i] = Math.max(min, n); return; }
        const at = pointOf(x, p.kind as PointKind, p.index)!;
        at[i] = n;
        setPoint(x, p.kind as PointKind, p.index, at[0], at[1]);
      });
      const extra: HTMLElement[] = [];
      if (p.kind === 'warps') {
        const w = a.warps[p.index];
        const exit = warpExit(w);
        extra.push(exit
          ? h('div', { cls: 'dev-grid' },
            num('leads to x', exit[0], (n) => editArena((x) => { const q = x.warps[p.index]; x.warps[p.index] = [q[0], q[1], q[2], q[3], n, q[5] ?? 0]; }), 0.5),
            num('leads to y', exit[1], (n) => editArena((x) => { const q = x.warps[p.index]; x.warps[p.index] = [q[0], q[1], q[2], q[3], q[4] ?? 0, n]; }), 0.5))
          : h('p', { cls: 'dev-note', textContent: 'No exit of its own: with exactly two such portals, they lead to each other.' }),
        h('div', { cls: 'dev-row' }, exit
          ? h('button', { cls: 'btn', textContent: 'No exit', help: 'Removes its exit: two portals without exits lead to each other.', onclick: () => editArena((x) => { const q = x.warps[p.index]; x.warps[p.index] = [q[0], q[1], q[2], q[3]]; }) })
          : h('button', { cls: 'btn', textContent: 'Give it an exit', help: 'Adds an exit point a few units away; drag its purple ring where the portal should lead.', onclick: () => editArena((x) => { const q = x.warps[p.index]; x.warps[p.index] = [q[0], q[1], q[2], q[3], q[0] + q[2] + 4, q[1] + q[3] / 2]; }) })));
      }
      if (p.kind === 'walls' || p.kind === 'platforms') {
        const look = (a[p.kind][p.index][4] ?? 'auto') as BlockLook;
        extra.push(choose('Look', 'Which tiles cover it: as the game sees fit (auto), a floor strip, a ceiling strip, side pieces, or none (an invisible block). Tiles can also be painted one by one (Tiles, below).',
          [['auto', p.kind === 'walls' ? 'Auto' : 'Auto (platform)'], ['floor', 'Floor strip'], ['ceiling', 'Ceiling strip'], ['side', 'Side pieces'], ['none', 'None (invisible)']], look,
          (val) => editArena((x) => { const q = x[p.kind as 'walls'][p.index]; x[p.kind as 'walls'][p.index] = val === 'auto' ? [q[0], q[1], q[2], q[3]] : [q[0], q[1], q[2], q[3], val as BlockLook]; })));
      }
      if (p.kind === 'emitters') {
        const em = a.emitters![p.index];
        extra.push(
          choose('Effect', 'Which particle effect (src/data/particles; made in the title\'s Editor, Particles tab).', Object.keys(store.docs.particles).sort().map((n) => [n, n]), em.effect, (val) => editArena((x) => { x.emitters![p.index].effect = val; })),
          choose('Plays', 'Over and over (waiting "Again after" between plays), or only once when the match starts.', [['loop', 'over and over'], ['once', 'once']], em.once ? 'once' : 'loop', (val) => editArena((x) => { if (val === 'once') x.emitters![p.index].once = true; else delete x.emitters![p.index].once; })),
          h('div', { cls: 'dev-grid' },
            num('Again after ms', em.every ?? 0, (n) => editArena((x) => { x.emitters![p.index].every = Math.max(0, n); }), 50),
            num('Size %', Math.round((em.scale ?? 1) * 100), (n) => editArena((x) => { const v = Math.max(5, n) / 100; if (v === 1) delete x.emitters![p.index].scale; else x.emitters![p.index].scale = v; }), 10)),
          (() => {
            const color = h('input', { type: 'color', value: em.tint ?? '#ffffff' });
            color.onchange = () => editArena((x) => { x.emitters![p.index].tint = color.value; });
            const own = h('button', { cls: 'btn', textContent: 'Own colours', help: 'Back to the effect\'s own colours.', onclick: () => editArena((x) => { delete x.emitters![p.index].tint; }) });
            return h('label', { cls: 'dev-field dev-tint', help: 'Paints the whole effect one colour (its own colours when none is set).' }, h('span', { textContent: em.tint ? 'Colour' : 'Colour (its own)' }), h('div', { cls: 'dev-row' }, color, own));
          })(),
          check('Mirrored', 'Plays it mirrored left-right.', !!em.flip, (on) => editArena((x) => { if (on) x.emitters![p.index].flip = true; else delete x.emitters![p.index].flip; })),
          layerField(em.layer ?? 'front', (v) => editArena((x) => { if (v === 'front') delete x.emitters![p.index].layer; else x.emitters![p.index].layer = v; })),
          h('p', { cls: 'dev-note', textContent: 'The effect itself (its particles, colours over life, speed...) is edited in the title\'s Editor, Particles.' }),
        );
      }
      if (p.kind === 'npcs') {
        const npc = a.npcs![p.index];
        extra.push(
          choose('Behaviour', 'What the NPC does. It fights back when hit whatever it does.', [['attack', 'Attack: goes for the nearest Kubot'], ['flee', 'Flee: keeps away from Kubotz'], ['idle', 'Idle: stands its ground']], npc.behaviour, (val) => editArena((x) => { x.npcs![p.index].behaviour = val as NpcBehaviour; })),
          choose('Level', 'How good it is, like a CPU in the setup screen: how fast it reacts.', Array.from({ length: 9 }, (_, i) => [String(i + 1), `${i + 1}${i === 0 ? ' (easiest)' : i === 4 ? ' (normal)' : i === 8 ? ' (hardest)' : ''}`] as [string, string]), String(npc.level ?? 5), (val) => editArena((x) => { x.npcs![p.index].level = Number(val); })),
          h('div', { cls: 'dev-grid' },
            num('Recharges (<0: infinite)', npcRecharges(npc), (n) => editArena((x) => { const q = x.npcs![p.index]; delete q.respawn; q.recharges = Math.round(n); }), 1),
            num('Respawn after ms', npc.respawnMs ?? Config.RESPAWN_DELAY, (n) => editArena((x) => { x.npcs![p.index].respawnMs = Math.max(0, n); }), 100)),
          choose('Helmet', 'Its helmet (it is painted black).', ['flame', 'terminator', 'big buff', 'skull'].map((l, i) => [String(i), l] as [string, string]), String(npc.helmet ?? 3), (val) => editArena((x) => { x.npcs![p.index].helmet = Number(val); })),
        );
      }
      if (p.kind === 'lights') {
        const l = a.lights![p.index];
        const setL = (fn: (q: MapLight) => void) => editArena((x) => fn(x.lights![p.index]));
        const color = h('input', { type: 'color', value: l.color });
        color.onchange = () => setL((q) => { q.color = color.value; });
        extra.push(
          h('label', { cls: 'dev-field', help: 'The light\'s colour.' }, h('span', { textContent: 'Colour' }), color),
          h('div', { cls: 'dev-grid' },
            num('Reach (units)', l.radius, (n) => setL((q) => { q.radius = Math.max(1, n); }), 1),
            num('Strength', l.intensity, (n) => setL((q) => { q.intensity = Math.max(0, n); }), 0.1)),
          choose('Shape', 'Round: lights all around it. Cone: a beam in one direction, like a spotlight or a lamp under a ceiling.', [['round', 'round'], ['cone', 'cone']], l.shape ?? 'round',
            (val) => setL((q) => { if (val === 'cone') q.shape = 'cone'; else { delete q.shape; delete q.angle; delete q.spread; } })),
          (l.shape === 'cone' ? h('div', { cls: 'dev-grid' },
            num('Direction °', l.angle ?? CONE_ANGLE, (n) => setL((q) => { q.angle = ((Math.round(n) % 360) + 360) % 360; }), 15),
            num('Spread °', l.spread ?? CONE_SPREAD, (n) => setL((q) => { q.spread = Phaser.Math.Clamp(Math.round(n), 5, 360); }), 5)) : null)!,
          layerField(l.layer ?? 'behind', (v) => setL((q) => { if (v === 'behind') delete q.layer; else q.layer = v; })),
          choose('Effect', 'Steady, a slow pulse, or a flicker like a failing tube.', [['steady', 'steady'], ['pulse', 'pulse'], ['flicker', 'flicker']], l.effect ?? 'steady',
            (val) => setL((q) => { if (val === 'steady') delete q.effect; else q.effect = val as LightEffect; })),
          (a.lights!.length > MAX_MAP_LIGHTS ? h('p', { cls: 'dev-note', textContent: `Only the first ${MAX_MAP_LIGHTS} lights are lit.` }) : null)!,
        );
      }
      piece = section(`${PIECE_NAMES[p.kind]} ${p.index + 1}`,
        h('div', { cls: 'dev-grid' }, num('x', v[0], set(0), rect ? 1 : 0.5), num('y', v[1], set(1), rect ? 1 : 0.5),
          ...(rect ? [num('w', v[2], set(2, 1)), num('h', v[3], set(3, 1))] : [])),
        ...extra,
        h('div', { cls: 'dev-row' }, h('button', { cls: 'btn', textContent: 'Delete', help: 'Removes this piece (Delete key).', onclick: () => deletePiece() })));
    }
    // The mode box: the toggle (an arena that can be edited), then the mode's own controls.
    modeBox.replaceChildren(...[
      a ? h('div', { cls: 'dev-mode', help: 'Edit mode pauses the match and shows its pieces to pick, move and resize, with the elements to drag onto the map; the camera is yours (drag empty space with one finger or the mouse, wheel or pinch to zoom). Play mode runs it. Closing the HUD goes back to play mode.'  },
        h('button', { cls: `btn${editing ? '' : ' on'}`, textContent: 'Play mode', onclick: () => { setEditing(false); const d = debug(); if (d) d.frozen = false; shape = ''; build(); } }),
        h('button', { cls: `btn${editing ? ' on' : ''}`, textContent: 'Edit mode', onclick: () => { setEditing(true); shape = ''; build(); } })) : null,
      editing && a
        ? h('div', { cls: 'dev-row' }, undoBtn, redoBtn, h('button', { cls: 'btn', textContent: 'Fit', help: 'Shows the whole arena.', onclick: () => arena().recentre() }))
        : h('div', { cls: 'dev-row' }, pauseBtn, stepBtn, speed),
      !editing && g.setup?.fighters.some((f) => f.input === 'CPU') ? cpuMode(g) : null,
    ].filter((x): x is HTMLDivElement => !!x));
    const [w, hh] = a?.size ?? DEFAULT_SIZE;
    // The panel is rebuilt after each edit: keep its scroll and the field being typed in
    // (else the arrows scroll the panel, and Enter sends it back to the top).
    const scroll = panel.scrollTop;
    const was = document.activeElement instanceof HTMLElement && panel.contains(document.activeElement) ? fieldKey(document.activeElement) : null;
    panel.replaceChildren(...[
      topBar,
      section('Arena',
        h('div', { cls: 'dev-row dev-arena' }, arenaPick, newBtn, importBtn, importInput),
        a ? h('div', { cls: 'dev-grid' },
          (() => { const input = h('input', { value: id! }); input.onchange = () => renameArena(id!, input.value); return h('label', { cls: 'dev-field', help: 'Its id: the name of its file (src/data/arenas/<id>.json). Lower case letters, digits and dashes; Export writes it under the new name and removes the old file.' }, h('span', { textContent: 'Id' }), input); })(),
          (() => { const input = h('input', { value: a.name }); input.onchange = () => editArena((x) => { x.name = input.value.trim() || x.name; }); return h('label', { cls: 'dev-field', help: 'Its name on the setup screen.' }, h('span', { textContent: 'Name' }), input); })(),
        ) : h('p', { cls: 'dev-note', textContent: 'The Kube is the original Tiled map: it is not edited here. Pick another arena, make a new one, or Import maps/debug-map.tmx for a copy to edit.' }),
        a ? (() => { const input = h('textarea', { value: a.description, rows: 2 }); input.onchange = () => editArena((x) => { x.description = input.value.trim(); }); return h('label', { cls: 'dev-field', help: 'A line about it, under its name on the setup screen.' }, h('span', { textContent: 'Description' }), input); })() : null,
        // The map's size: it grows or shrinks on the right and at the bottom.
        a ? h('div', { cls: 'dev-grid', help: 'The map\'s size in units (tiles). It grows or shrinks on the right and at the bottom; the blast zone moves with it.' },
          num('Width', w, (n) => editArena((x) => { x.size = [clampSize(n, 16, 200), (x.size ?? DEFAULT_SIZE)[1]]; })),
          num('Height', hh, (n) => editArena((x) => { x.size = [(x.size ?? DEFAULT_SIZE)[0], clampSize(n, 12, 160)]; }))) : null,
        // Then the art: the room behind it and its music.
        a ? choose('Background', 'The room behind the arena, and the colour of its light and tiles.', ROOM_CHOICES, a.room ?? 'kube', (val) => editArena((x) => { x.room = val; })) : null,
        a ? musicField(a.music ?? 'music-game', (val) => editArena((x) => { if (val === 'music-game') delete x.music; else x.music = val; })) : null,
      ),
      // Edit mode: the elements, then the picked piece's settings right under them, then the tile brush.
      editing && a ? section('Elements', h('p', { cls: 'dev-note', textContent: 'Drag one onto the map (or tap it: it lands in the middle of the view).' }), palette) : null,
      piece,
      editing && a ? tilesSection() : null,
      // The debug views last (folded while editing, to leave the room to the arena tools).
      (() => { const d = section('Show', ...layerBoxes.map((l) => l.el)); d.open = !editing; return d; })(),
      editing && a ? h('p', { cls: 'dev-note', textContent: `${w} x ${hh} units · ${a.walls.length} walls · ${a.platforms.length} platforms · ${a.warps.length} portals · ${a.spawns.length} spawns · ${a.bonus.length} bonus spots · ${a.emitters?.length ?? 0} particles · ${a.npcs?.length ?? 0} NPCs · ${a.lights?.length ?? 0} lights` }) : null,
    ].filter((el): el is HTMLElement => !!el));
    panel.scrollTop = scroll;
    if (was) {
      const again = [...panel.querySelectorAll<HTMLElement>('input, select, textarea, button')].find((el) => fieldKey(el) === was);
      again?.focus({ preventScroll: true });
    }
    refresh();
  }

  /** The tile brush: tiles are laid on the blocks automatically; this paints one cell at a time over them (or erases). */
  function tilesSection(): HTMLElement {
    const sc = arena();
    const painting = sc.tool === 'tile' || sc.tool === 'erase';
    const sources = [...new Set([...(game.registry.get('map') as TmxMap).tileImages.values()].map((t) => t.source))].sort();
    const mode = (tool: 'select' | 'tile' | 'erase', label: string, help: string) => h('button', { cls: `btn${sc.tool === tool ? ' on' : ''}`, textContent: label, help, onclick: () => { sc.tool = tool; shape = ''; build(); } });
    return section('Tiles',
      h('p', { cls: 'dev-note', textContent: 'Blocks get their tiles on their own (see Look on a wall). Paint here to change single cells.' }),
      h('div', { cls: 'dev-row' },
        mode('select', 'Move pieces', 'Back to picking and moving pieces.'),
        mode('tile', 'Paint', 'Paints the chosen tile on the cell under the pointer (drag to paint several).'),
        mode('erase', 'Erase', 'Clears the tile of the chosen layer on a cell, automatic ones too.')),
      painting ? choose('Layer', 'Blocks (walls and floors), platforms, or fades (the soft edges).', [['blocks', 'Blocks'], ['platforms', 'Platforms'], ['fades', 'Fades']], sc.brush.layer, (v) => { sc.brush.layer = v as TilePaint[0]; }) : null,
      painting ? h('div', { cls: 'dev-swatches' }, ...sources.map((src) => {
        const b = h('button', { cls: `dev-swatch${sc.brush.source === src ? ' on' : ''}`, help: src, onclick: () => { sc.brush.source = src; sc.tool = 'tile'; shape = ''; build(); } }, h('img', { src: `./maps/${src}`, alt: src }));
        return b;
      })) : null,
    );
  }

  const deletePiece = () => {
    const g = match();
    const p = store.sel.piece;
    const id = g ? ARENA_IDS[g.arena] : null;
    if (!editing || !p || !id) return;
    store.edit('arenas', (d) => { piecesOf(d.arenas[id], p.kind).splice(p.index, 1); });
    store.select({ piece: null });
  };

  /** The bits that change every frame: pause label, layer boxes. */
  function refresh(): void {
    saveBtn.classList.toggle('clean', !store.unsaved);
    saveBtn.textContent = store.unsaved ? 'Save' : 'Saved';
    exportBtn.classList.toggle('on', store.dirty.size > 0);
    const d = debug();
    if (!d) return;
    pauseBtn.textContent = d.frozen ? 'Resume' : 'Pause';
    for (const l of layerBoxes) l.box.checked = d.on && d.show[l.key];
    speed.value = String(d.timeScale);
  }

  /** The editor menu's Arena: a new arena from scratch, a match there, the HUD open in edit mode. */
  host.newArenaMatch = () => {
    let n = 1;
    while (store.docs.arenas[`arena-${n}`]) n++;
    const id = `arena-${n}`;
    const order = Math.max(0, ...Object.values(store.docs.arenas).map((x) => x.order)) + 1;
    store.edit('arenas', (d) => {
      d.arenas[id] = { order, name: `New arena ${n}`, description: 'Made in the dev HUD', room: 'kube', walls: [[6, 34, 40, 3]], platforms: [], warps: [], spawns: [[12, 34], [40, 34], [20, 34], [32, 34]], bonus: [[26, 30]] };
    });
    store.select({ arena: id, piece: null });
    const index = ARENA_IDS.indexOf(id);
    const ready = () => {
      const g = match();
      if (!g?.sys.isActive() || g.arena !== index) return;
      game.events.off(Phaser.Core.Events.POST_STEP, ready);
      setOpen(true);
      setEditing(true);
      g.debugState.steps = 45;
      arena().recentre();
      shape = '';
      build();
    };
    game.events.on(Phaser.Core.Events.POST_STEP, ready);
    // Infinite recharges: a K.O. never ends the match (and the editing with it).
    game.scene.start('Game', { fighters: [{ input: 'P1', team: 0, helmet: 0 }, { input: 'CPU', team: 1, helmet: 1, dummy: true }], arena: index, bonuses: 'normal', recharges: -1, editor: true });
  };

  // The DEV button shows in matches only; the panel closes when the match ends.
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    const on = inMatch();
    toggle.hidden = !on;
    if (!on && open) setOpen(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F2') { e.preventDefault(); setOpen(!open); return; }
    if (!open || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); }
    else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); store.redo(); }
    else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); say(store.keep()); }
    else if (e.key === 'Delete') deletePiece();
  });
}
