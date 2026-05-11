export type FrameStep = {
  readonly dt: number;
  readonly now: number;
  readonly beat: number | null;
  readonly beatPhase: number;
};

export interface Scene {
  enter(prev?: Scene): void;
  exit(next?: Scene): void;
  update(step: FrameStep): void;
  render(ctx: CanvasRenderingContext2D): void;
  handleInput(event: Event): void;
}
