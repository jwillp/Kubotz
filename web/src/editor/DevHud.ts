import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { ALL_LAYERS, type DebugLayers } from '../scenes/DebugScene';
import { ARENA_IDS, ARENA_INFO, DEFAULT_SIZE } from '../map/Arenas';
import { ArenaScene, type ArenaTool } from './ArenaScene';
import { installHelp } from './Help';
import { store } from './Host';
import { PIECE_NAMES, POINT_KINDS, piecesOf, pointOf, setPoint, type PointKind } from './Store';
import type { ArenaData, NpcBehaviour } from '../map/Arenas';
import './devhud.css';

/**
 * The in-match dev HUD (dev builds only): F2 or the DEV button shows a panel
 * over the running match with
 *  - time: pause, one frame, slow motion;
 *  - debug views: physics bodies, hit and hurt boxes, AI paths and plans,
 *    the robots' states, the frame stats (the F3 overlay, layer by layer);
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

const TOOLS: [ArenaTool, string, string][] = [
  ['select', 'Select', 'Pick a piece to move it (drag) or resize it (drag a white corner). Drag empty space to pan the camera.'],
  ['walls', 'Wall', 'Drag to draw a solid block.'],
  ['platforms', 'Platform', 'Drag to draw a drop-through platform (one unit thick).'],
  ['warps', 'Portal', 'Click to place a portal; an arena has none or two, which lead to each other.'],
  ['spawns', 'Spawn', 'Click to place a spawn point (where a robot appears, on its feet).'],
  ['bonus', 'Bonus', 'Click to place a spot where power-up balls drop.'],
  ['emitters', 'Particles', 'Click to place a particle effect in the map; pick the effect and how it plays below.'],
  ['npcs', 'NPC', 'Click to place a hostile CPU of the map (black team, no HUD card): it comes back to its spot after a K.O. Pick what it does below.'],
];

const LAYERS: [keyof DebugLayers, string, string][] = [
  ['bodies', 'Physics bodies', 'The Box2D bodies: green solid, cyan platforms, yellow robots, white feet sensors, purple portals.'],
  ['boxes', 'Hit and hurt boxes', 'Each robot\'s hurtbox (red outline) and its attack circles while they are active.'],
  ['ai', 'AI paths', 'The navigation graph (surfaces and jump, drop and fall links) and each CPU\'s path and destination.'],
  ['states', 'Robot states', 'A readout over each robot: health, clip and progress, combo, speed, ground or air, stun, AI mode.'],
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

  // Typing in the HUD's fields must not move the robots (nor the game's captured keys swallow the typing).
  panel.addEventListener('focusin', (e) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) game.input.keyboard!.enabled = false; });
  panel.addEventListener('focusout', () => { game.input.keyboard!.enabled = true; });

  const setOpen = (on: boolean) => {
    open = on && inMatch();
    panel.hidden = !open;
    if (!open) setEditing(false);
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
    if (!d.on) d.show = { bodies: false, boxes: false, ai: false, states: false, stats: false };
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
      if (!sc.isActive('Arena')) sc.run('Arena');
      bringToolsUp();
    } else if (sc.isActive('Arena')) sc.stop('Arena');
  };
  const bringToolsUp = () => { for (const k of ['Debug', 'Arena']) if (game.scene.isActive(k)) game.scene.bringToTop(k); };

  /** Restarts the match in an arena (its edits in), no intro, the camera kept when it is the same arena. */
  const playArena = (index: number) => {
    const g = match();
    if (!g?.setup) return;
    const cam = g.cameras.main;
    const keep = g.arena === index ? { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom } : null;
    const before = g.setup;
    const d = g.debugState;
    const was = { frozen: d.frozen, on: d.on, show: { ...d.show }, timeScale: d.timeScale };
    const ready = () => {
      if (g.setup === before || !g.sys.isActive()) return;
      game.events.off(Phaser.Core.Events.POST_STEP, ready);
      if (keep) g.cameras.main.setZoom(keep.zoom).setScroll(keep.x, keep.y);
      // The debug views and time as they were.
      Object.assign(g.debugState, { frozen: was.frozen, steps: was.frozen ? 45 : 0, timeScale: was.timeScale, show: was.show, holdCamera: editing });
      if (was.on) { g.debugState.on = true; g.scene.launch('Debug'); }
      bringToolsUp();
    };
    game.events.on(Phaser.Core.Events.POST_STEP, ready);
    g.scene.restart({ ...g.setup, arena: index, editor: true });
  };

  // Arena edits rebuild the match once a drag or a typed value is done (debounced).
  const applied = new Map<string, string>();
  let timer = 0;
  store.on(() => {
    const g = match();
    const id = store.sel.arena;
    const text = JSON.stringify(store.docs.arenas[id] ?? null);
    if (!applied.has(id) || !editing || !g || ARENA_IDS[g.arena] !== id) { applied.set(id, text); return; }
    if (text === applied.get(id) || store.busy) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (store.busy) return;
      applied.set(id, JSON.stringify(store.docs.arenas[id] ?? null));
      const i = ARENA_IDS.indexOf(id);
      if (i > 0) playArena(i);
    }, 250);
  });
  store.on(() => { if (open) build(); });

  const status = h('span', { cls: 'dev-status' });
  const save = async () => {
    try { status.textContent = await store.save(); } catch (e) { status.textContent = `Not saved: ${(e as Error).message ?? e}`; }
  };

  // ---------------------------------------------------------------- the panel
  let shape = '';
  const section = (title: string, ...body: (Node | null | false)[]) => h('details', { cls: 'dev-section', open: true }, h('summary', { textContent: title }), ...body);
  const num = (label: string, value: number, set: (v: number) => void, step = 1) => {
    const input = h('input', { type: 'number', value: String(value), step: String(step) });
    input.onchange = () => set(Number(input.value));
    return h('label', { cls: 'dev-field' }, h('span', { textContent: label }), input);
  };

  function build(): void {
    const g = match();
    const p = store.sel.piece;
    const id = g ? ARENA_IDS[g.arena] : null;
    const piecesNow = id && p && store.docs.arenas[id] ? piecesOf(store.docs.arenas[id], p.kind)[p.index] : null;
    const next = `${open}|${editing}|${g?.arena}|${p?.kind}:${p?.index}|${arena()?.tool}|${JSON.stringify(piecesNow ?? null)}|${store.dirty.size}`;
    if (next === shape || !open || !g) { refresh(); return; }
    shape = next;
    const a = id ? store.docs.arenas[id] : null;
    const tools = TOOLS.map(([t, label, help]) => h('button', {
      cls: `btn tool${arena()?.tool === t ? ' on' : ''}`, textContent: label, help,
      onclick: () => { arena().tool = t; shape = ''; build(); },
    }));
    const arenaPick = h('select', { help: 'Moves the match to another arena (no intro).' }, ...ARENA_INFO.map((info, i) => h('option', { value: String(i), textContent: info.name })));
    arenaPick.value = String(g.arena);
    arenaPick.onchange = () => playArena(Number(arenaPick.value));
    const editBox = h('input', { type: 'checkbox', checked: editing });
    editBox.onchange = () => { setEditing(editBox.checked); shape = ''; build(); };

    let piece: HTMLElement | null = null;
    if (editing && a && p && piecesOf(a, p.kind)[p.index]) {
      const rect = !(POINT_KINDS as string[]).includes(p.kind);
      const v = rect ? piecesOf(a, p.kind)[p.index] as number[] : pointOf(a, p.kind as PointKind, p.index)!;
      const editPiece = (fn: (x: ArenaData) => void) => store.edit('arenas', (d) => fn(d.arenas[id!]));
      const set = (i: number, min = -99) => (n: number) => editPiece((x) => {
        if (rect) { (piecesOf(x, p.kind)[p.index] as number[])[i] = Math.max(min, n); return; }
        const at = pointOf(x, p.kind as PointKind, p.index)!;
        at[i] = n;
        setPoint(x, p.kind as PointKind, p.index, at[0], at[1]);
      });
      const extra: HTMLElement[] = [];
      if (p.kind === 'emitters') {
        const em = a.emitters![p.index];
        const effect = h('select', {}, ...Object.keys(store.docs.particles).sort().map((n) => h('option', { value: n, textContent: n })));
        effect.value = em.effect;
        effect.onchange = () => editPiece((x) => { x.emitters![p.index].effect = effect.value; });
        const flip = h('input', { type: 'checkbox', checked: !!em.flip });
        flip.onchange = () => editPiece((x) => { if (flip.checked) x.emitters![p.index].flip = true; else delete x.emitters![p.index].flip; });
        extra.push(
          h('label', { cls: 'dev-field', help: 'Which particle effect (src/data/particles; made in the title\'s Editor, Particles tab).' }, h('span', { textContent: 'Effect' }), effect),
          num('Again after ms', em.every ?? 0, (n) => editPiece((x) => { x.emitters![p.index].every = Math.max(0, n); }), 50),
          h('label', { help: 'Plays it mirrored left-right.' }, flip, 'Mirrored'),
        );
      }
      if (p.kind === 'npcs') {
        const npc = a.npcs![p.index];
        const behaviour = h('select', {}, ...([['attack', 'Attack: goes for the nearest robot'], ['flee', 'Flee: keeps away from robots'], ['idle', 'Idle: stands its ground']] as const).map(([v2, l]) => h('option', { value: v2, textContent: l })));
        behaviour.value = npc.behaviour;
        behaviour.onchange = () => editPiece((x) => { x.npcs![p.index].behaviour = behaviour.value as NpcBehaviour; });
        const helmet = h('select', {}, ...['flame', 'terminator', 'big buff', 'skull'].map((l, i) => h('option', { value: String(i), textContent: l })));
        helmet.value = String(npc.helmet ?? 3);
        helmet.onchange = () => editPiece((x) => { x.npcs![p.index].helmet = Number(helmet.value); });
        extra.push(
          h('label', { cls: 'dev-field', help: 'What the NPC does. It fights back when hit whatever it does.' }, h('span', { textContent: 'Behaviour' }), behaviour),
          h('label', { cls: 'dev-field', help: 'Its helmet (it is painted black).' }, h('span', { textContent: 'Helmet' }), helmet),
        );
      }
      piece = section(`${PIECE_NAMES[p.kind]} ${p.index + 1}`,
        h('div', { cls: 'dev-grid' }, num('x', v[0], set(0), rect ? 1 : 0.5), num('y', v[1], set(1), rect ? 1 : 0.5),
          ...(rect ? [num('w', v[2], set(2, 1)), num('h', v[3], set(3, 1))] : [])),
        ...extra,
        h('div', { cls: 'dev-row' }, h('button', { cls: 'btn', textContent: 'Delete', help: 'Removes this piece.', onclick: () => {
          editPiece((x) => { piecesOf(x, p.kind).splice(p.index, 1); });
          store.select({ piece: null });
        } })));
    }
    const [w, hh] = a?.size ?? DEFAULT_SIZE;
    panel.replaceChildren(
      h('div', { cls: 'dev-head' }, h('strong', { textContent: 'DEV' }), status, h('button', { cls: 'btn', textContent: 'Close', help: 'Hides the dev HUD (F2).', onclick: () => setOpen(false) })),
      section('Time', h('div', { cls: 'dev-row' }, pauseBtn, stepBtn, speed)),
      section('Show', ...layerBoxes.map((l) => l.el)),
      section('Arena',
        h('label', { cls: 'dev-field', help: 'The arena of this match.' }, h('span', { textContent: 'Arena' }), arenaPick),
        a ? h('label', { help: 'Shows the pieces over the arena and lets you pick, move and add them. The camera is yours meanwhile (drag empty space, wheel or pinch to zoom).' }, editBox, 'Edit this arena') : h('p', { cls: 'dev-note', textContent: 'The Kube is the original Tiled map: it is not edited here. Pick another arena.' }),
        editing && a ? h('div', { cls: 'dev-tools' }, ...tools) : null,
        editing && a ? h('div', { cls: 'dev-row' },
          h('button', { cls: 'btn', textContent: 'Undo', onclick: () => store.undo() }),
          h('button', { cls: 'btn', textContent: 'Redo', onclick: () => store.redo() }),
          h('button', { cls: 'btn', textContent: 'Fit', help: 'Shows the whole arena.', onclick: () => arena().recentre() }),
          h('button', { cls: `btn primary${store.dirty.size ? '' : ' clean'}`, textContent: 'Save', help: 'Writes the changed files (the arena\'s, in src/data/arenas).', onclick: () => void save() })) : null,
        editing && a ? h('p', { cls: 'dev-note', textContent: `${w} x ${hh} units · ${a.walls.length} walls · ${a.platforms.length} platforms · ${a.warps.length} portals · ${a.spawns.length} spawns · ${a.bonus.length} bonus spots · ${a.emitters?.length ?? 0} particles · ${a.npcs?.length ?? 0} NPCs` }) : null,
      ),
      ...(piece ? [piece] : []),
    );
    refresh();
  }

  /** The bits that change every frame: pause label, layer boxes. */
  function refresh(): void {
    const d = debug();
    if (!d) return;
    pauseBtn.textContent = d.frozen ? 'Resume' : 'Pause';
    for (const l of layerBoxes) l.box.checked = d.on && d.show[l.key];
    speed.value = String(d.timeScale);
  }

  // The DEV button shows in matches only; the panel closes when the match ends.
  game.events.on(Phaser.Core.Events.POST_STEP, () => {
    const on = inMatch();
    toggle.hidden = !on;
    if (!on && open) setOpen(false);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'F2') return;
    e.preventDefault();
    setOpen(!open);
  });
}
