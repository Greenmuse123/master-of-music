import { describe, expect, it } from 'vitest';

import { parseAtlas } from './atlas';

describe('parseAtlas', () => {
  it('parses the project atlas format into a sprite sheet and durations', () => {
    const image = document.createElement('canvas');
    const atlas = parseAtlas(
      {
        frames: {
          idle: { duration: 0.2, h: 16, w: 12, x: 1, y: 2 },
          walk: { h: 16, w: 12, x: 13, y: 2 },
        },
        image: 'hero.png',
      },
      image,
    );

    expect(atlas.data.image).toBe('hero.png');
    expect(atlas.sheet.get('idle').frame).toEqual({ duration: 0.2, h: 16, w: 12, x: 1, y: 2 });
    expect(atlas.durations.get('idle')).toBe(0.2);
    expect(atlas.durations.has('walk')).toBe(false);
  });

  it('rejects malformed atlas data', () => {
    const image = document.createElement('canvas');

    expect(() => parseAtlas(null, image)).toThrow('Atlas data must be an object.');
    expect(() => parseAtlas({ frames: {}, image: '' }, image)).toThrow(
      'Atlas image must be a non-empty string.',
    );
    expect(() => parseAtlas({ frames: [], image: 'bad.png' }, image)).toThrow(
      'Atlas frames must be an object.',
    );
  });

  it('rejects malformed frame data', () => {
    const image = document.createElement('canvas');

    expect(() =>
      parseAtlas({ frames: { bad: { h: 1, w: 1, x: Number.NaN, y: 0 } }, image: 'bad.png' }, image),
    ).toThrow('Atlas frame bad.x must be a finite number.');
    expect(() =>
      parseAtlas({ frames: { bad: { h: 0, w: 1, x: 0, y: 0 } }, image: 'bad.png' }, image),
    ).toThrow('Atlas frame bad must have positive dimensions.');
    expect(() =>
      parseAtlas(
        { frames: { bad: { duration: 0, h: 1, w: 1, x: 0, y: 0 } }, image: 'bad.png' },
        image,
      ),
    ).toThrow('Atlas frame bad duration must be positive.');
  });
});
