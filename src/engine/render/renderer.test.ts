import { describe, expect, it, vi } from 'vitest';

import { RENDER_H, RENDER_W } from '../../config/constants';
import { TitleScene } from '../../scenes/title-scene';
import { Renderer } from './renderer';
import { Sprite } from './sprite';

function stubCanvas(): CanvasRenderingContext2D & {
  drawImage: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
} {
  const ctx = {
    drawImage: vi.fn(),
    fillStyle: '',
    font: '',
    imageSmoothingEnabled: true,
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);

  return ctx as CanvasRenderingContext2D & {
    drawImage: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
  };
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

  it('queues sprites and flushes draw calls in layer order with pixel snapping', () => {
    const ctx = stubCanvas();
    const image = document.createElement('canvas');
    const bg = new Sprite(image, { h: 4, w: 4, x: 0, y: 0 });
    const entity = new Sprite(image, { h: 8, w: 8, x: 4, y: 0 });
    const ui = new Sprite(image, { h: 2, w: 2, x: 12, y: 0 });
    const renderer = new Renderer();

    renderer.drawSprite(ui, 9.6, 10.2, 'ui');
    renderer.drawSprite(entity, 5.5, 6.49, 'entities');
    renderer.drawSprite(bg, 1.2, 2.7, 'bg');
    renderer.flush();

    expect(ctx.drawImage).toHaveBeenNthCalledWith(1, bg.image, 0, 0, 4, 4, 1, 3, 4, 4);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(2, entity.image, 4, 0, 8, 8, 6, 6, 8, 8);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(3, ui.image, 12, 0, 2, 2, 10, 10, 2, 2);

    renderer.flush();

    expect(ctx.drawImage).toHaveBeenCalledTimes(3);
  });

  it('clears and draws snapped text', () => {
    const ctx = stubCanvas();
    const renderer = new Renderer();

    renderer.clear();
    renderer.drawText('hello', 4.8, 9.8);

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, RENDER_W, RENDER_H);
    expect(ctx.fillText).toHaveBeenCalledWith('hello', 4, 9);
  });
});

describe('TitleScene', () => {
  it('marks itself entered when enter is called', () => {
    const scene = new TitleScene();

    scene.enter();

    expect(scene.entered).toBe(true);
  });
});
