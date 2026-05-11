import { describe, expect, it } from 'vitest';
import { buildAssetManifest } from './manifest';

describe('buildAssetManifest', () => {
  it('produces the documented manifest JSON shape', () => {
    const manifest = buildAssetManifest(
      [
        {
          id: 'sol-reed-idle',
          image: '/sprites/characters/sol-reed-idle.png',
          atlas: '/sprites/characters/sol-reed-idle.atlas.json',
          bytes: 4321,
          hash: 'sha256:abc123'
        }
      ],
      '2026-05-11T00:00:00.000Z'
    );

    expect(manifest).toEqual({
      version: 1,
      builtAt: '2026-05-11T00:00:00.000Z',
      sprites: {
        'sol-reed-idle': {
          image: '/sprites/characters/sol-reed-idle.png',
          atlas: '/sprites/characters/sol-reed-idle.atlas.json',
          bytes: 4321,
          hash: 'sha256:abc123'
        }
      },
      audio: {},
      tilesets: {}
    });
  });
});
