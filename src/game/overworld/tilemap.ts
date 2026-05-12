import type { Camera } from '../../engine/render/camera';
import { isTileId, type MapData, type TileId } from './types';

const TILE_FILL_STYLES: Record<TileId, string> = {
  encounter: '#a83246',
  grass: '#3a7d44',
  wall: '#4a4a4a',
};

/**
 * Phase-1 placeholder tilemap: flat 1D tile array rendered as solid-colored
 * rectangles. No real sprite atlas yet (see docs/05 — pipeline deferred).
 *
 * Render is pixel-perfect: tile positions are floored before being drawn so the
 * map stays on integer pixels even when the optional camera is mid-shake.
 */
export class Tilemap {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly #tiles: readonly TileId[];

  constructor(data: MapData) {
    if (!Number.isInteger(data.width) || data.width <= 0) {
      throw new Error('Tilemap width must be a positive integer.');
    }

    if (!Number.isInteger(data.height) || data.height <= 0) {
      throw new Error('Tilemap height must be a positive integer.');
    }

    if (!Number.isInteger(data.tileSize) || data.tileSize <= 0) {
      throw new Error('Tilemap tileSize must be a positive integer.');
    }

    const expectedLength = data.width * data.height;
    if (data.tiles.length !== expectedLength) {
      throw new Error(
        `Tilemap tile array length (${String(data.tiles.length)}) does not match width*height (${String(expectedLength)}).`,
      );
    }

    for (const tile of data.tiles) {
      if (!isTileId(tile)) {
        throw new Error(`Tilemap contains unknown tile id "${String(tile)}".`);
      }
    }

    this.width = data.width;
    this.height = data.height;
    this.tileSize = data.tileSize;
    this.#tiles = [...data.tiles];
  }

  /** Pixel width of the rendered map (width * tileSize). */
  get pixelWidth(): number {
    return this.width * this.tileSize;
  }

  /** Pixel height of the rendered map (height * tileSize). */
  get pixelHeight(): number {
    return this.height * this.tileSize;
  }

  /**
   * Returns the tile id at integer tile coordinates. Out-of-bounds reads return
   * `'wall'` so the player controller can treat the map perimeter as solid
   * without callers needing a separate bounds check.
   */
  tileAt(tileX: number, tileY: number): TileId {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return 'wall';
    }

    const index = tileY * this.width + tileX;
    return this.#tiles[index] ?? 'wall';
  }

  /**
   * Whether the given tile blocks player movement. Walls block; grass and
   * encounter tiles do not (the encounter triggers via callback after the
   * player steps onto it).
   */
  isBlocked(tileX: number, tileY: number): boolean {
    return this.tileAt(tileX, tileY) === 'wall';
  }

  /**
   * Renders the map as solid-colored rectangles, one per tile. Camera offset
   * is optional; when supplied, tiles are drawn at `tileX*tileSize - camera.renderX`
   * etc. All draw-rect coordinates are floored to keep pixels aligned.
   */
  render(ctx: CanvasRenderingContext2D, camera?: Pick<Camera, 'renderX' | 'renderY'>): void {
    const offsetX = camera ? camera.renderX : 0;
    const offsetY = camera ? camera.renderY : 0;

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const tile = this.tileAt(x, y);
        ctx.fillStyle = TILE_FILL_STYLES[tile];
        ctx.fillRect(
          Math.floor(x * this.tileSize - offsetX),
          Math.floor(y * this.tileSize - offsetY),
          this.tileSize,
          this.tileSize,
        );
      }
    }
  }
}
