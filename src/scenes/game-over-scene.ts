import { RENDER_H, RENDER_W } from '../config/constants';
import type { InputManager } from '../engine/input/input-manager';
import type { Renderer } from '../engine/render/renderer';
import type { FrameStep, Scene } from '../engine/scene/scene';

export type GameOverEvent = 'confirm';

export interface GameOverSceneOptions {
  readonly renderer: Renderer;
  readonly input: Pick<InputManager, 'pressed'>;
  readonly onEvent: (event: GameOverEvent) => void;
}

const TITLE_TEXT = 'GAME OVER';
const PROMPT_TEXT = 'Press Confirm to return to title';
const TITLE_Y = Math.trunc(RENDER_H / 2) - 12;
const PROMPT_Y = Math.trunc(RENDER_H / 2) + 12;

export class GameOverScene implements Scene {
  readonly #renderer: Renderer;
  readonly #input: Pick<InputManager, 'pressed'>;
  readonly #onEvent: (event: GameOverEvent) => void;
  #active = false;

  constructor(options: GameOverSceneOptions) {
    this.#renderer = options.renderer;
    this.#input = options.input;
    this.#onEvent = options.onEvent;
  }

  get renderer(): Renderer {
    return this.#renderer;
  }

  enter(_prev?: Scene): void {
    this.#active = true;
  }

  exit(_next?: Scene): void {
    this.#active = false;
  }

  update(_step: FrameStep): void {
    if (!this.#active) {
      return;
    }
    if (this.#input.pressed('confirm')) {
      this.#onEvent('confirm');
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
    ctx.fillText(PROMPT_TEXT, Math.trunc(RENDER_W / 2), PROMPT_Y);
  }

  handleInput(_event: Event): void {
    return;
  }
}
