export const TILE_IDS = ['grass', 'wall', 'encounter'] as const;

export type TileId = (typeof TILE_IDS)[number];

/**
 * Phase-1 tilemap shape. Tiles are stored as a flat 1D array of length
 * `width * height`; index = `y * width + x`. `tileSize` is the side length of
 * each tile in render pixels (integer).
 */
export interface MapData {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly TileId[];
  readonly tileSize: number;
}

/**
 * Grid-anchored player state. Positions are integer tile coordinates; pixel
 * positions are derived (`tileX * tileSize`) at render time.
 */
export interface PlayerState {
  readonly tileX: number;
  readonly tileY: number;
  readonly facing: 'n' | 's' | 'e' | 'w';
}

export type OverworldEvent =
  | { readonly kind: 'encounter'; readonly tileX: number; readonly tileY: number };

export type OverworldEventCallback = (event: OverworldEvent) => void;

export function isTileId(value: string): value is TileId {
  return (TILE_IDS as readonly string[]).includes(value);
}
