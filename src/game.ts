import { MAX_FRAME_DT } from './config/constants';
import { Renderer } from './engine/render/renderer';
import { SceneStack } from './engine/scene/scene-stack';
import { TitleScene } from './scenes/title-scene';

export class Game {
  readonly renderer: Renderer;
  readonly scenes = new SceneStack();
  #animationFrame = 0;
  #startedAt = 0;
  #lastFrameAt = 0;

  constructor(renderer = new Renderer()) {
    this.renderer = renderer;
    this.scenes.push(new TitleScene());
  }

  mount(parent: HTMLElement): void {
    this.renderer.mount(parent);
  }

  start(now = performance.now()): void {
    this.#startedAt = now;
    this.#lastFrameAt = now;
    this.#animationFrame = requestAnimationFrame(this.#tick);
  }

  stop(): void {
    cancelAnimationFrame(this.#animationFrame);
    this.#animationFrame = 0;
  }

  readonly #tick = (now: number): void => {
    const dt = Math.min((now - this.#lastFrameAt) / 1000, MAX_FRAME_DT);
    this.#lastFrameAt = now;

    this.scenes.update({
      dt,
      now: now - this.#startedAt,
      beat: null,
      beatPhase: 0,
    });

    this.renderer.clear();
    this.scenes.render(this.renderer.ctx);
    this.#animationFrame = requestAnimationFrame(this.#tick);
  };
}
