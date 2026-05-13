import { RENDER_H, RENDER_W } from '../../config/constants';
import type { RenderLayer } from './layers';
import type { Camera } from './camera';
import type { Renderer } from './renderer';
import type { Sprite } from './sprite';

export interface TileLayer {
  readonly data: readonly number[];
  readonly name: string;
  readonly visible?: boolean;
}

export interface TilemapData {
  readonly height: number;
  readonly layers: readonly TileLayer[];
  readonly tileSize: number;
  readonly width: number;
}

export interface Atlas {
  get(name: string): Sprite | undefined;
}

interface AtlasTilemapOptions {
  readonly atlas: Atlas;
  readonly layer?: RenderLayer;
  readonly map: TilemapData;
}

/**
 * Renders a Tiled-style tilemap through sprite atlas frames.
 *
 * Tile value 0 is empty. Any non-zero tile value N resolves to the atlas frame
 * named `tile-${N}`.
 */
export class AtlasTilemap {
  readonly #atlas: Atlas;
  readonly #layer: RenderLayer;
  readonly #map: TilemapData;

  constructor({ atlas, layer = 'world', map }: AtlasTilemapOptions) {
    this.#atlas = atlas;
    this.#layer = layer;
    this.#map = map;
  }

  render(renderer: Renderer, camera?: Camera): void {
    const view = camera === undefined ? undefined : makeViewRect(camera);

    for (const tileLayer of this.#map.layers) {
      if (tileLayer.visible === false) {
        continue;
      }

      this.renderLayer(renderer, tileLayer, view);
    }
  }

  private renderLayer(renderer: Renderer, layer: TileLayer, view?: ViewRect): void {
    for (let index = 0; index < layer.data.length; index += 1) {
      const tileIndex = layer.data[index] ?? 0;

      if (tileIndex === 0) {
        continue;
      }

      const x = (index % this.#map.width) * this.#map.tileSize;
      const y = Math.floor(index / this.#map.width) * this.#map.tileSize;

      if (view !== undefined && !intersectsView(x, y, this.#map.tileSize, view)) {
        continue;
      }

      renderer.drawSprite(this.getTileSprite(tileIndex), Math.round(x), Math.round(y), this.#layer);
    }
  }

  private getTileSprite(tileIndex: number): Sprite {
    const frameName = `tile-${tileIndex}`;
    const sprite = this.#atlas.get(frameName);

    if (sprite === undefined) {
      throw new Error(`AtlasTilemap missing atlas frame: ${frameName}`);
    }

    return sprite;
  }
}

interface ViewRect {
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
}

function makeViewRect(camera: Camera): ViewRect {
  const left = camera.renderX;
  const top = camera.renderY;

  return {
    bottom: top + RENDER_H,
    left,
    right: left + RENDER_W,
    top,
  };
}

function intersectsView(x: number, y: number, size: number, view: ViewRect): boolean {
  return x < view.right && x + size > view.left && y < view.bottom && y + size > view.top;
}
