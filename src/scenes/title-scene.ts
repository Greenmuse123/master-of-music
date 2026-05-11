import { RENDER_H, RENDER_W } from '../config/constants';
import type { FrameStep, Scene } from '../engine/scene/scene';

export class TitleScene implements Scene {
  entered = false;

  enter(): void {
    this.entered = true;
  }

  exit(): void {
    this.entered = false;
  }

  update(_step: FrameStep): void {
    return;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MASTER OF MUSIC', Math.trunc(RENDER_W / 2), Math.trunc(RENDER_H / 2));
  }

  handleInput(_event: Event): void {
    return;
  }
}
