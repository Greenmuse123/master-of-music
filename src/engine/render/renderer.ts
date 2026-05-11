import { ASPECT_RATIO, RENDER_H, RENDER_W } from '../../config/constants';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement = document.createElement('canvas')) {
    this.canvas = canvas;
    this.canvas.width = RENDER_W;
    this.canvas.height = RENDER_H;
    this.canvas.style.display = 'block';
    this.canvas.style.background = '#000';
    this.canvas.style.imageRendering = 'pixelated';

    const ctx = this.canvas.getContext('2d');
    if (ctx === null) {
      throw new Error('Canvas2D context is unavailable.');
    }

    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  mount(parent: HTMLElement): void {
    parent.append(this.canvas);
    this.resizeToViewport();
    window.addEventListener('resize', this.resizeToViewport);
  }

  dispose(): void {
    window.removeEventListener('resize', this.resizeToViewport);
    this.canvas.remove();
  }

  clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, RENDER_W, RENDER_H);
  }

  drawText(text: string, x: number, y: number): void {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(text, Math.trunc(x), Math.trunc(y));
  }

  readonly resizeToViewport = (): void => {
    const viewportW = Math.max(1, window.innerWidth);
    const viewportH = Math.max(1, window.innerHeight);
    const viewportAspect = viewportW / viewportH;

    const cssW =
      viewportAspect > ASPECT_RATIO ? Math.floor(viewportH * ASPECT_RATIO) : viewportW;
    const cssH =
      viewportAspect > ASPECT_RATIO ? viewportH : Math.floor(viewportW / ASPECT_RATIO);

    this.canvas.style.width = `${Math.max(1, Math.floor(cssW))}px`;
    this.canvas.style.height = `${Math.max(1, Math.floor(cssH))}px`;
  };
}
