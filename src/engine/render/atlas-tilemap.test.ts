import { describe, expect, it } from 'vitest';

import { Camera } from './camera';
import { AtlasTilemap, type Atlas, type TilemapData } from './atlas-tilemap';
import type { RenderLayer } from './layers';
import type { Renderer } from './renderer';
import { Sprite } from './sprite';

interface DrawCall {
  readonly frame: string;
  readonly layer: RenderLayer;
  readonly x: number;
  readonly y: number;
}

function makeSprite(frame: string): Sprite {
  const sprite = new Sprite(document.createElement('canvas'), { h: 16, w: 16, x: 0, y: 0 });

  return Object.assign(sprite, { testFrame: frame });
}

function makeAtlas(frames: readonly string[] = ['tile-1', 'tile-2']): Atlas {
  return new Map(frames.map((frame) => [frame, makeSprite(frame)]));
}

function makeMap(tileSize = 16): TilemapData {
  return {
    height: 3,
    layers: [
      {
        data: [0, 1, 0, 1, 2, 1, 0, 1, 0],
        name: 'ground',
      },
    ],
    tileSize,
    width: 3,
  };
}

function makeRenderer(draws: DrawCall[]): Renderer {
  return {
    drawSprite(sprite: Sprite, x: number, y: number, layer: RenderLayer): void {
      draws.push({
        frame: (sprite as Sprite & { readonly testFrame: string }).testFrame,
        layer,
        x,
        y,
      });
    },
  } as Renderer;
}

describe('AtlasTilemap', () => {
  it('queues one drawSprite call per non-empty visible tile with no camera', () => {
    const draws: DrawCall[] = [];
    const tilemap = new AtlasTilemap({ atlas: makeAtlas(), map: makeMap() });

    tilemap.render(makeRenderer(draws));

    expect(draws).toEqual([
      { frame: 'tile-1', layer: 'world', x: 16, y: 0 },
      { frame: 'tile-1', layer: 'world', x: 0, y: 16 },
      { frame: 'tile-2', layer: 'world', x: 16, y: 16 },
      { frame: 'tile-1', layer: 'world', x: 32, y: 16 },
      { frame: 'tile-1', layer: 'world', x: 16, y: 32 },
    ]);
  });

  it('culls tiles outside the camera viewport', () => {
    const draws: DrawCall[] = [];
    const tilemap = new AtlasTilemap({ atlas: makeAtlas(), layer: 'bg', map: makeMap(300) });

    tilemap.render(makeRenderer(draws), new Camera(0, 300));

    expect(draws).toEqual([
      { frame: 'tile-1', layer: 'bg', x: 0, y: 300 },
      { frame: 'tile-2', layer: 'bg', x: 300, y: 300 },
    ]);
  });

  it('skips invisible layers and tile index 0', () => {
    const draws: DrawCall[] = [];
    const map: TilemapData = {
      ...makeMap(),
      layers: [
        { data: [1, 1, 1, 1, 1, 1, 1, 1, 1], name: 'hidden', visible: false },
        { data: [0, 0, 0, 0, 2, 0, 0, 0, 0], name: 'visible', visible: true },
      ],
    };
    const tilemap = new AtlasTilemap({ atlas: makeAtlas(), map });

    tilemap.render(makeRenderer(draws));

    expect(draws).toEqual([{ frame: 'tile-2', layer: 'world', x: 16, y: 16 }]);
  });

  it('throws a clear render-time error for a missing atlas frame', () => {
    const tilemap = new AtlasTilemap({ atlas: makeAtlas(['tile-1']), map: makeMap() });

    expect(() => tilemap.render(makeRenderer([]))).toThrow(
      'AtlasTilemap missing atlas frame: tile-2',
    );
  });
});
