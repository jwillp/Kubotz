import Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import { ARENA_IDS } from '../map/Arenas';
import { host } from './Host';

/**
 * The editor inside the game (dev builds only, see main.ts): F2 during a
 * match freezes it and docks the editor round it, F2 again plays on. The
 * Arena tab edits the arena being played on the real renderer: each change
 * rebuilds the match there (no intro), the camera kept where it was.
 */
export function installInGameEditor(game: Phaser.Game): void {
  let ui: typeof import('./EditorUI') | null = null;
  let open = false;
  let playing = false;
  const gameEl = game.canvas.parentElement!;
  const match = () => game.scene.getScene('Game') as GameScene | null;
  const inMatch = () => { const g = match(); return !!g && g.sys.isActive() && !g.setup?.preview; };

  /** Frozen to edit (a couple of frames drawn so the robots show), or running to play. */
  const freeze = (on: boolean) => {
    const g = match();
    if (!g) return;
    g.debugState.frozen = on;
    g.debugState.steps = on ? 2 : 0;
    g.debugState.holdCamera = on;
  };
  const hud = (visible: boolean) => { const s = game.scene.getScene('Hud'); if (s?.sys.isActive()) s.sys.setVisible(visible); };

  /** Restarts the match in an arena (its edits in), keeping the camera, frozen unless playing. */
  const playArena = (id: string) => {
    const g = match();
    const index = ARENA_IDS.indexOf(id);
    if (!g?.setup || index < 0) return;
    const cam = g.cameras.main;
    const keep = g.arena === index ? { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom } : null;
    // Once the new match is made (its setup object replaced): camera back, frozen again, the editor's scenes on top.
    const before = g.setup;
    const ready = () => {
      if (g.setup === before || !g.sys.isActive()) return;
      game.events.off(Phaser.Core.Events.POST_STEP, ready);
      if (keep) g.cameras.main.setZoom(keep.zoom).setScroll(keep.x, keep.y);
      freeze(!playing);
      // Enough frames for the robots to beam in (there is no intro), then frozen again.
      if (!playing) g.debugState.steps = 45;
      hud(!open);
      for (const k of ['Arena', 'Editor']) if (game.scene.isActive(k)) game.scene.bringToTop(k);
    };
    game.events.on(Phaser.Core.Events.POST_STEP, ready);
    g.scene.restart({ ...g.setup, arena: index, editor: true });
  };

  const toggle = async () => {
    if (!open && !inMatch()) return; // only over a match
    open = !open;
    if (!ui) {
      host.inGame = true;
      host.game = game;
      host.gameEl = gameEl;
      host.close = () => void toggle();
      host.play = (on) => { playing = on; freeze(!on); };
      host.playArena = playArena;
      // The robot the Animation and Particles tabs work on: one of the match's, frozen (none while it plays).
      game.registry.set('editorSubject', () => {
        const g = match();
        if (!g || playing || !open) return null;
        const i = Math.min(game.registry.get('editorFighter') ?? 0, g.fighters.length - 1);
        const k = g.fighters[i];
        if (!k) return null;
        const targets = g.fighters.filter((f) => f !== k && f.isAlive()).map((f) => f.hurtbox());
        return { model: k.model, x: k.body.x, y: k.body.bottom, facing: k.facing, targets };
      });
      ui = await import('./EditorUI');
      watchArenaEdits(ui.store);
    }
    playing = false;
    freeze(open);
    hud(!open);
    if (!open) document.body.append(gameEl);
    ui.editorShown(open);
    // The game refits to its new room (the editor's stage, or the whole page again).
    requestAnimationFrame(() => { game.scale.getParentBounds(); game.scale.refresh(); });
  };

  /** Arena edits rebuild the match once a drag or a typed value is done (debounced). */
  const watchArenaEdits = (store: import('./Store').Store) => {
    /** Each arena as the match last got it. */
    const applied = new Map<string, string>();
    let timer = 0;
    store.on(() => {
      const g = match();
      const id = store.sel.arena;
      const text = JSON.stringify(store.docs.arenas[id] ?? null);
      if (!applied.has(id) || !open || !g || ARENA_IDS[g.arena] !== id) { applied.set(id, text); return; }
      if (text === applied.get(id) || store.busy) return;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (store.busy) return;
        applied.set(id, JSON.stringify(store.docs.arenas[id] ?? null));
        playArena(id);
      }, 250);
    });
  };

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'F2') return;
    e.preventDefault();
    void toggle();
  });
}
