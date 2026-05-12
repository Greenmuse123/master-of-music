import type { Renderer } from '../../../engine/render/renderer';
import { OverworldScene } from '../overworld-scene';
import type { PlayerInput } from '../player-controller';
import { PlayerController } from '../player-controller';
import { Tilemap } from '../tilemap';
import type { MapData, OverworldEventCallback, TileId } from '../types';

const TILE_SIZE = 16;
const WIDTH = 5;
const HEIGHT = 5;

/**
 * Phase-3 Bayou overworld: a 5x5 grid the player arrives at from Jazz City.
 *
 * Layout (W = wall, g = grass, e = encounter (swamp imp), ◀ = portal to
 * Jazz City, B = boss-encounter (Diminuendo)):
 *   W W W W W
 *   W g g g W
 *   ◀ g g e W
 *   W g g g W
 *   W W W W B
 *
 * Player spawns at (1, 2), one step east of the Jazz City portal. The
 * Diminuendo trigger sits in the SE corner, deliberately a few steps away
 * so the player can level on the encounter tile before the boss.
 */

function build(): readonly TileId[] {
  const tiles: TileId[] = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (x === 0 && y === 2) {
        tiles.push('region-portal-jazz-city');
      } else if (x === WIDTH - 1 && y === HEIGHT - 1) {
        tiles.push('boss-encounter');
      } else if (x === 0 || x === WIDTH - 1 || y === 0 || y === HEIGHT - 1) {
        tiles.push('wall');
      } else if (x === 3 && y === 2) {
        tiles.push('encounter');
      } else {
        tiles.push('grass');
      }
    }
  }
  return tiles;
}

export const BAYOU_MAP: MapData = {
  height: HEIGHT,
  tileSize: TILE_SIZE,
  tiles: build(),
  width: WIDTH,
};

export const BAYOU_START = { x: 1, y: 2 } as const;

export function makeBayouScene(
  renderer: Renderer,
  input: PlayerInput,
  onEvent?: OverworldEventCallback,
): OverworldScene {
  const map = new Tilemap(BAYOU_MAP);
  const player = new PlayerController({
    input,
    map,
    onEvent,
    startTile: BAYOU_START,
  });
  return new OverworldScene({ input, map, onEvent, player, renderer });
}
