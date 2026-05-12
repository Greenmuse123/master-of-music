export type AnimationMode = 'loop' | 'once' | 'ping-pong';

export interface AnimationFrame<TFrame = string> {
  readonly duration: number;
  readonly frame: TFrame;
}

export interface AnimationClip<TFrame = string> {
  readonly frames: readonly AnimationFrame<TFrame>[];
  readonly mode: AnimationMode;
}

export interface AnimationPlayerOptions {
  readonly onComplete?: () => void;
}

export class AnimationPlayer<TFrame = string> {
  readonly clip: AnimationClip<TFrame>;
  #complete = false;
  #direction: 1 | -1 = 1;
  #elapsed = 0;
  #frameIndex = 0;
  #onComplete?: () => void;

  constructor(clip: AnimationClip<TFrame>, options: AnimationPlayerOptions = {}) {
    if (clip.frames.length === 0) {
      throw new Error('Animation clip must contain at least one frame.');
    }

    for (const frame of clip.frames) {
      if (frame.duration <= 0) {
        throw new Error('Animation frame duration must be positive.');
      }
    }

    this.clip = clip;
    this.#onComplete = options.onComplete;
  }

  get complete(): boolean {
    return this.#complete;
  }

  get currentFrame(): TFrame {
    return this.clip.frames[this.#frameIndex]!.frame;
  }

  get frameIndex(): number {
    return this.#frameIndex;
  }

  reset(): void {
    this.#complete = false;
    this.#direction = 1;
    this.#elapsed = 0;
    this.#frameIndex = 0;
  }

  tick(seconds: number): TFrame {
    if (seconds < 0) {
      throw new Error('Animation tick seconds must be non-negative.');
    }

    if (this.#complete || seconds === 0) {
      return this.currentFrame;
    }

    this.#elapsed += seconds;

    while (!this.#complete && this.#elapsed >= this.frameDuration) {
      this.#elapsed -= this.frameDuration;
      this.advance();
    }

    return this.currentFrame;
  }

  private advance(): void {
    if (this.clip.mode === 'loop') {
      this.#frameIndex = (this.#frameIndex + 1) % this.clip.frames.length;
      return;
    }

    if (this.clip.mode === 'once') {
      this.advanceOnce();
      return;
    }

    this.advancePingPong();
  }

  private advanceOnce(): void {
    if (this.#frameIndex === this.clip.frames.length - 1) {
      this.finish();
      return;
    }

    this.#frameIndex += 1;
  }

  private advancePingPong(): void {
    if (this.clip.frames.length === 1) {
      this.finish();
      return;
    }

    const nextIndex = this.#frameIndex + this.#direction;

    if (nextIndex >= this.clip.frames.length) {
      this.#direction = -1;
      this.#frameIndex -= 1;
      return;
    }

    if (nextIndex < 0) {
      this.#direction = 1;
      this.#frameIndex += 1;
      return;
    }

    this.#frameIndex = nextIndex;
  }

  private finish(): void {
    if (this.#complete) {
      return;
    }

    this.#complete = true;
    this.#onComplete?.();
  }

  private get frameDuration(): number {
    return this.clip.frames[this.#frameIndex]!.duration;
  }
}
