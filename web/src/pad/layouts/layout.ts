/** A phone pad layout: chosen on the phone's layout screen (src/pad/main.ts). */
export interface Layout {
  id: string;
  name: string;
  /** One line on the layout screen. */
  blurb: string;
  /** Held upright instead of sideways. */
  portrait?: boolean;
  /** Builds the layout in `root` and starts listening; returns the teardown. */
  mount(root: HTMLElement): () => void;
}
