import { describe, expect, it, vi } from 'vitest';

import { Tilemap } from './tilemap';
import type { MapData, TileId } from './types';

function makeData(overrides: Partial<MapData> = {}): MapData {
  return {
    height: 3,
    tileSize: 16,
    tiles: [
      'wall', 'wall', 'wall',
      'wall', 'grass', 'encounter',
      'wall', 'wall', 'wall',
    ] as TileId[],
    width: 3,
    ...overrides,
  };
}

function stubCtx(): CanvasRenderingContext2D & { fillRect: ReturnType<typeof vi.fn> } {
  return {
    fillRect: vi.fn(),
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D & { fillRect: ReturnType<typeof vi.fn> };
}

describe('Tilemap', () => {
  it('constructs from valid MapData and exposes derived pixel dimensions', () => {
    const map = new Tilemap(makeData());

    expect(map.width).toBe(3);
    expect(map.height).toBe(3);
    expect(map.tileSize).toBe(16);
    expect(map.pixelWidth).toBe(48);
    expect(map.pixelHeight).toBe(48);
  });

  it('reports the tile at integer coordinates', () => {
    const map = new Tilemap(makeData());

    expect(map.tileAt(1, 1)).toBe('grass');
    expect(map.tileAt(2, 1)).toBe('encounter');
    expect(map.tileAt(0, 0)).toBe('wall');
  });

  it('treats out-of-bounds reads as wall and reports isBlocked accordingly', () => {
    const map = new Tilemap(makeData());

    expect(map.tileAt(-1, 0)).toBe('wall');
    expect(map.tileAt(0, -1)).toBe('wall');
    expect(map.tileAt(3, 0)).toBe('wall');
    expect(map.tileAt(0, 3)).toBe('wall');
    expect(map.isBlocked(-1, 0)).toBe(true);
    expect(map.isBlocked(1, 1)).toBe(false);
    expect(map.isBlocked(2, 1)).toBe(false);
    expect(map.isBlocked(0, 0)).toBe(true);
  });

  it('renders one fillRect per tile with floored offsets and no camera', () => {
    const map = new Tilemap(makeData());
    const ctx = stubCtx();

    map.render(ctx);

    expect(ctx.fillRect).toHaveBeenCalledTimes(9);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 16, 16);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(5, 16, 16, 16, 16);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(6, 32, 16, 16, 16);
  });

  it('applies camera offset and floors the result to keep pixels aligned', () => {
    const map = new Tilemap(makeData());
    const ctx = stubCtx();

    map.render(ctx, { renderX: 3, renderY: 5 });

    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, -3, -5, 16, 16);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(5, 13, 11, 16, 16);
  });

  it('rejects non-integer or non-positive width', () => {
    expect(() => new Tilemap(makeData({ width: 0 }))).toThrow(/width/);
    expect(() => new Tilemap(makeData({ width: 1.5 }))).toThrow(/width/);
  });

  it('rejects non-integer or non-positive height', () => {
    expect(() => new Tilemap(makeData({ height: -1 }))).toThrow(/height/);
    expect(() => new Tilemap(makeData({ height: 2.5 }))).toThrow(/height/);
  });

  it('rejects non-integer or non-positive tileSize', () => {
    expect(() => new Tilemap(makeData({ tileSize: 0 }))).toThrow(/tileSize/);
    expect(() => new Tilemap(makeData({ tileSize: 1.5 }))).toThrow(/tileSize/);
  });

  it('rejects tile array length that does not match width*height', () => {
    expect(() => new Tilemap(makeData({ tiles: ['grass'] as TileId[] }))).toThrow(/length/);
  });

  it('rejects unknown tile ids', () => {
    expect(
      () => new Tilemap(makeData({ tiles: Array.from({ length: 9 }, () => 'lava') as unknown as TileId[] })),
    ).toThrow(/unknown tile/);
  });
});
