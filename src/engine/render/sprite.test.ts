import { describe, expect, it, vi } from 'vitest';

import { Sprite, SpriteSheet } from './sprite';

describe('Sprite', () => {
  it('draws source frame to integer destination pixels', () => {
    const image = document.createElement('canvas');
    const drawImage = vi.fn();
    const ctx = { drawImage } as unknown as CanvasRenderingContext2D;
    const sprite = new Sprite(image, { h: 8, w: 12, x: 2, y: 3 });

    sprite.draw(ctx, 10.4, 20.6);

    expect(drawImage).toHaveBeenCalledWith(image, 2, 3, 12, 8, 10, 21, 12, 8);
  });
});

describe('SpriteSheet', () => {
  it('creates named sprites from frame data', () => {
    const image = document.createElement('canvas');
    const sheet = new SpriteSheet(image, {
      idle: { h: 16, w: 16, x: 0, y: 0 },
    });

    expect(sheet.has('idle')).toBe(true);
    expect(sheet.get('idle').frame.w).toBe(16);
  });

  it('throws for unknown frames', () => {
    const image = document.createElement('canvas');
    const sheet = new SpriteSheet(image, {});

    expect(() => sheet.get('missing')).toThrow('Unknown sprite frame: missing');
  });
});
