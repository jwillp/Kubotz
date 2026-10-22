import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { ALL_LAYERS, type DebugLayers } from '../scenes/DebugScene';
import { ARENA_IDS, ARENA_INFO, DEFAULT_SIZE } from '../map/Arenas';
import { ArenaScene } from './ArenaScene';
import { installHelp } from './Help';
import { store } from './Host';
import { PIECE_NAMES, POINT_KINDS, piecesOf, pointOf, setPoint, type ArenaPiece, type PointKind } from './Store';
import { warpExit, type ArenaData, type NpcBehaviour } from '../map/Arenas';
import { ROOMS } from '../fx/Backdrops';
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
];

const LAYERS: [keyof DebugLayers, string, string][] = [
  ['bodies', 'Physics bodies', 'The Box2D bodies: green solid, cyan platforms, yellow Kubotz, white feet sensors, purple portals.'],
  ['boxes', 'Hit and hurt boxes', 'Each Kubot\'s hurtbox (red outline) and its attack circles while they are active.'],
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

  // Typing in the HUD's fields must not move the Kubotz (nor the game's captured keys swallow the typing).
  panel.addEventListener('focusin', (e) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) game.input.keyboard!.enabled = false; });
  panel.addEventListener('focusout', () => { game.input.keyboard!.enabled = true; });

  /** Closing the HUD gives the match back as it plays: running, full speed, keys on, its camera its own. */
  const setOpen = (on: boolean) => {
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
      // Editing pauses the match (Resume, at the top, lets it run while you edit).
      if (d) { d.frozen = true; d.steps = 2; }
      if (!sc.isActive('Arena')) sc.run('Arena');
      arena().tool = 'select';
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
    h('div', { cls: 'dev-row' }, pauseBtn, stepBtn, speed, undoBtn, redoBtn),
    h('div', { cls: 'dev-row' }, saveBtn, exportBtn, revertBtn),
  );

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
      d.arenas[id] = { order, name: `New arena ${n}`, blurb: 'Made in the dev HUD', room: 'kube', walls: [[6, 34, 40, 3]], platforms: [], warps: [], spawns: [[12, 34], [40, 34], [20, 34], [32, 34]], bonus: [[26, 30]] };
    });
    store.select({ arena: id, piece: null });
    const i = ARENA_IDS.indexOf(id);
    if (i > 0) { playArena(i); setEditing(true); }
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
    const next = `${open}|${editing}|${g?.arena}|${p?.kind}:${p?.index}|${JSON.stringify(piecesNow ?? null)}|${a?.name}|${a?.room}|${ARENA_INFO.length}`;
    if (next === shape || !open || !g) { refresh(); return; }
    shape = next;
    const editArena = (fn: (x: ArenaData) => void) => store.edit('arenas', (d) => fn(d.arenas[id!]));

    const arenaPick = choose('Arena', 'Moves the match to another arena (no intro).', ARENA_INFO.map((info, i) => [String(i), info.name]), String(g.arena), (v) => playArena(Number(v)));
    const newBtn = h('button', { cls: 'btn', textContent: 'New arena', help: 'Makes a new arena from scratch (a floor and four spawns) and moves the match there to build it.', onclick: () => newArena() });

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
      if (p.kind === 'emitters') {
        const em = a.emitters![p.index];
        extra.push(
          choose('Effect', 'Which particle effect (src/data/particles; made in the title\'s Editor, Particles tab).', Object.keys(store.docs.particles).sort().map((n) => [n, n]), em.effect, (val) => editArena((x) => { x.emitters![p.index].effect = val; })),
          num('Again after ms', em.every ?? 0, (n) => editArena((x) => { x.emitters![p.index].every = Math.max(0, n); }), 50),
          check('Mirrored', 'Plays it mirrored left-right.', !!em.flip, (on) => editArena((x) => { if (on) x.emitters![p.index].flip = true; else delete x.emitters![p.index].flip; })),
        );
      }
      if (p.kind === 'npcs') {
        const npc = a.npcs![p.index];
        extra.push(
          choose('Behaviour', 'What the NPC does. It fights back when hit whatever it does.', [['attack', 'Attack: goes for the nearest Kubot'], ['flee', 'Flee: keeps away from Kubotz'], ['idle', 'Idle: stands its ground']], npc.behaviour, (val) => editArena((x) => { x.npcs![p.index].behaviour = val as NpcBehaviour; })),
          choose('Level', 'How good it is, like a CPU in the setup screen: how fast it reacts.', Array.from({ length: 9 }, (_, i) => [String(i + 1), `${i + 1}${i === 0 ? ' (easiest)' : i === 4 ? ' (normal)' : i === 8 ? ' (hardest)' : ''}`] as [string, string]), String(npc.level ?? 5), (val) => editArena((x) => { x.npcs![p.index].level = Number(val); })),
          check('Comes back after a K.O.', 'On: it reappears at its spot a few seconds after each K.O. Off: once out, it is gone for the match.', npc.respawn !== false, (on) => editArena((x) => { if (on) delete x.npcs![p.index].respawn; else x.npcs![p.index].respawn = false; })),
          choose('Helmet', 'Its helmet (it is painted black).', ['flame', 'terminator', 'big buff', 'skull'].map((l, i) => [String(i), l] as [string, string]), String(npc.helmet ?? 3), (val) => editArena((x) => { x.npcs![p.index].helmet = Number(val); })),
        );
      }
      piece = section(`${PIECE_NAMES[p.kind]} ${p.index + 1}`,
        h('div', { cls: 'dev-grid' }, num('x', v[0], set(0), rect ? 1 : 0.5), num('y', v[1], set(1), rect ? 1 : 0.5),
          ...(rect ? [num('w', v[2], set(2, 1)), num('h', v[3], set(3, 1))] : [])),
        ...extra,
        h('div', { cls: 'dev-row' }, h('button', { cls: 'btn', textContent: 'Delete', help: 'Removes this piece (Delete key).', onclick: () => deletePiece() })));
    }
    const [w, hh] = a?.size ?? DEFAULT_SIZE;
    panel.replaceChildren(...[
      topBar,
      section('Show', ...layerBoxes.map((l) => l.el)),
      section('Arena',
        h('div', { cls: 'dev-row dev-arena' }, arenaPick, newBtn),
        a ? h('div', { cls: 'dev-grid' },
          (() => { const input = h('input', { value: a.name }); input.onchange = () => editArena((x) => { x.name = input.value.trim() || x.name; }); return h('label', { cls: 'dev-field', help: 'Its name on the setup screen.' }, h('span', { textContent: 'Name' }), input); })(),
          choose('Background', 'The room behind the arena, and the colour of its light and tiles.', ROOMS.map((r) => [r, { kube: 'The Kube (blue)', foundry: 'Foundry (amber)', skyDeck: 'Sky Deck (violet)', pit: 'The Pit (teal)' }[r] ?? r] as [string, string]), a.room ?? 'kube', (val) => editArena((x) => { x.room = val; })),
        ) : h('p', { cls: 'dev-note', textContent: 'The Kube is the original Tiled map: it is not edited here. Pick another arena, or make a new one.' }),
        a ? check('Edit this arena', 'Pauses the match and shows its pieces to pick, move and resize, with the elements to drag onto the map. The camera is yours meanwhile: drag empty space, wheel or pinch to zoom.', editing, (on) => { setEditing(on); shape = ''; build(); }) : null,
        editing && a ? h('div', { cls: 'dev-row' }, h('button', { cls: 'btn', textContent: 'Fit', help: 'Shows the whole arena.', onclick: () => arena().recentre() })) : null,
      ),
      editing && a ? section('Elements', h('p', { cls: 'dev-note', textContent: 'Drag one onto the map (or tap it: it lands in the middle of the view).' }), palette) : null,
      piece,
      editing && a ? h('p', { cls: 'dev-note', textContent: `${w} x ${hh} units · ${a.walls.length} walls · ${a.platforms.length} platforms · ${a.warps.length} portals · ${a.spawns.length} spawns · ${a.bonus.length} bonus spots · ${a.emitters?.length ?? 0} particles · ${a.npcs?.length ?? 0} NPCs` }) : null,
    ].filter((el): el is HTMLElement => !!el));
    refresh();
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
