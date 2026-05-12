import { RENDER_H, RENDER_W } from '../config/constants';
import type { InputManager } from '../engine/input/input-manager';
import type { Renderer } from '../engine/render/renderer';
import type { SaveStore } from '../engine/save/store';
import type { SaveSlot, SaveSummary } from '../engine/save/types';
import type { FrameStep, Scene } from '../engine/scene/scene';

export type SaveSelectEvent = 'confirm' | 'cancel';

export type SaveSelectEventHandler = (event: SaveSelectEvent, slotIndex?: SaveSlot) => void;

export interface SaveSelectSceneOptions {
  readonly renderer: Renderer;
  readonly input: Pick<InputManager, 'pressed'>;
  readonly onEvent: SaveSelectEventHandler;
  readonly store: Pick<SaveStore, 'list'>;
}

const SLOT_COUNT = 3;
const SLOTS: readonly SaveSlot[] = [0, 1, 2];
const HEADER_TEXT = 'SELECT SAVE';
const HEADER_Y = 32;
const FIRST_SLOT_Y = 80;
const SLOT_SPACING = 32;
const SLOT_X = 80;
const CURSOR_X = 60;

export class SaveSelectScene implements Scene {
  readonly #renderer: Renderer;
  readonly #input: Pick<InputManager, 'pressed'>;
  readonly #onEvent: SaveSelectEventHandler;
  readonly #store: Pick<SaveStore, 'list'>;
  #selected: SaveSlot = 0;
  #summaries: ReadonlyMap<SaveSlot, SaveSummary> = new Map();
  #loaded = false;
  #active = false;

  constructor(options: SaveSelectSceneOptions) {
    this.#renderer = options.renderer;
    this.#input = options.input;
    this.#onEvent = options.onEvent;
    this.#store = options.store;
  }

  get renderer(): Renderer {
    return this.#renderer;
  }

  get selected(): SaveSlot {
    return this.#selected;
  }

  enter(_prev?: Scene): void {
    this.#active = true;
    this.#selected = 0;
    void this.refresh();
  }

  exit(_next?: Scene): void {
    this.#active = false;
  }

  async refresh(): Promise<void> {
    const list = await this.#store.list();
    const summaries = new Map<SaveSlot, SaveSummary>();
    for (const item of list) {
      summaries.set(item.slot, item);
    }
    this.#summaries = summaries;
    this.#loaded = true;
  }

  update(_step: FrameStep): void {
    if (!this.#active) {
      return;
    }
    if (this.#input.pressed('up')) {
      this.#selected = clampSlot(this.#selected - 1);
    }
    if (this.#input.pressed('down')) {
      this.#selected = clampSlot(this.#selected + 1);
    }
    if (this.#input.pressed('confirm')) {
      this.#onEvent('confirm', this.#selected);
    }
    if (this.#input.pressed('cancel')) {
      this.#onEvent('cancel');
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(HEADER_TEXT, SLOT_X, HEADER_Y);

    for (let i = 0; i < SLOT_COUNT; i += 1) {
      const slot = SLOTS[i] as SaveSlot;
      const y = FIRST_SLOT_Y + i * SLOT_SPACING;
      if (slot === this.#selected) {
        ctx.fillText('>', CURSOR_X, y);
      }
      const summary = this.#summaries.get(slot);
      const label = !this.#loaded
        ? `Slot ${slot + 1} - LOADING`
        : summary === undefined
          ? `Slot ${slot + 1} - NEW GAME`
          : `Slot ${slot + 1} - ${summary.updatedAt}`;
      ctx.fillText(label, SLOT_X, y);
    }
  }

  handleInput(_event: Event): void {
    return;
  }
}

function clampSlot(value: number): SaveSlot {
  if (value <= 0) {
    return 0;
  }
  if (value >= 2) {
    return 2;
  }
  return 1;
}
