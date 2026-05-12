import { RENDER_H, RENDER_W } from '../config/constants';
import type { InputManager } from '../engine/input/input-manager';
import type { Renderer } from '../engine/render/renderer';
import type { FrameStep, Scene } from '../engine/scene/scene';

export type TitleSceneEvent = 'confirm' | 'settings';

export interface TitleSceneOptions {
  readonly renderer?: Renderer;
  readonly input?: Pick<InputManager, 'pressed'>;
  readonly onEvent?: (event: TitleSceneEvent) => void;
}

const TITLE_TEXT = 'MASTER OF MUSIC';
const TITLE_Y = Math.trunc(RENDER_H / 2) - 32;
const ROW_LABELS: ReadonlyArray<{ label: string; event: TitleSceneEvent }> = [
  { event: 'confirm', label: 'Start' },
  { event: 'settings', label: 'Settings' },
];
const FIRST_ROW_Y = Math.trunc(RENDER_H / 2) + 4;
const ROW_SPACING = 16;

export class TitleScene implements Scene {
  readonly #renderer: Renderer | null;
  readonly #input: Pick<InputManager, 'pressed'> | null;
  readonly #onEvent: ((event: TitleSceneEvent) => void) | null;
  #selected = 0;
  entered = false;

  constructor(options: TitleSceneOptions = {}) {
    this.#renderer = options.renderer ?? null;
    this.#input = options.input ?? null;
    this.#onEvent = options.onEvent ?? null;
  }

  get renderer(): Renderer | null {
    return this.#renderer;
  }

  enter(_prev?: Scene): void {
    this.entered = true;
    this.#selected = 0;
  }

  exit(_next?: Scene): void {
    this.entered = false;
  }

  update(_step: FrameStep): void {
    if (!this.entered || this.#input === null) {
      return;
    }
    if (this.#input.pressed('down')) {
      this.#selected = Math.min(ROW_LABELS.length - 1, this.#selected + 1);
    } else if (this.#input.pressed('up')) {
      this.#selected = Math.max(0, this.#selected - 1);
    }
    if (this.#input.pressed('confirm')) {
      const row = ROW_LABELS[this.#selected];
      if (row !== undefined) {
        this.#onEvent?.(row.event);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TITLE_TEXT, Math.trunc(RENDER_W / 2), TITLE_Y);

    ctx.font = '8px monospace';
    for (let i = 0; i < ROW_LABELS.length; i += 1) {
      const row = ROW_LABELS[i];
      if (row === undefined) {
        continue;
      }
      const text = i === this.#selected ? `> ${row.label}` : `  ${row.label}`;
      ctx.fillText(text, Math.trunc(RENDER_W / 2), FIRST_ROW_Y + i * ROW_SPACING);
    }
  }

  handleInput(_event: Event): void {
    return;
  }
}
