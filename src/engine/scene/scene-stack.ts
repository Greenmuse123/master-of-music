import type { FrameStep, Scene } from './scene';

export class SceneStack {
  readonly #scenes: Scene[] = [];

  get size(): number {
    return this.#scenes.length;
  }

  current(): Scene | undefined {
    return this.#scenes[this.#scenes.length - 1];
  }

  push(scene: Scene): void {
    const prev = this.current();
    this.#scenes.push(scene);
    scene.enter(prev);
  }

  pop(): Scene | undefined {
    const removed = this.#scenes.pop();
    const next = this.current();

    if (removed !== undefined) {
      removed.exit(next);
    }

    return removed;
  }

  replace(scene: Scene): Scene | undefined {
    const removed = this.pop();
    this.push(scene);
    return removed;
  }

  update(step: FrameStep): void {
    this.current()?.update(step);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.current()?.render(ctx);
  }

  handleInput(event: Event): void {
    this.current()?.handleInput(event);
  }
}
