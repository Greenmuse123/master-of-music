import { describe, expect, it, vi } from 'vitest';

import { RENDER_H, RENDER_W } from '../../config/constants';
import { TitleScene } from '../../scenes/title-scene';
import { Renderer } from './renderer';

function stubCanvas(): void {
  const ctx = {
    fillStyle: '',
    font: '',
    imageSmoothingEnabled: true,
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
}

describe('Renderer', () => {
  it('instantiates a fixed 480x270 Canvas2D surface with smoothing disabled', () => {
    stubCanvas();

    const renderer = new Renderer();

    expect(renderer.canvas.width).toBe(RENDER_W);
    expect(renderer.canvas.height).toBe(RENDER_H);
    expect(renderer.ctx.imageSmoothingEnabled).toBe(false);
  });

  it('keeps the render surface inside a 16:9 viewport fit', () => {
    stubCanvas();
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 500);

    const renderer = new Renderer();
    renderer.resizeToViewport();

    expect(renderer.canvas.style.width).toBe('888px');
    expect(renderer.canvas.style.height).toBe('500px');
  });
});

describe('TitleScene', () => {
  it('marks itself entered when enter is called', () => {
    const scene = new TitleScene();

    scene.enter();

    expect(scene.entered).toBe(true);
  });
});
