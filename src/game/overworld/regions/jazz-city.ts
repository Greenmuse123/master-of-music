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
 * Phase-3 Jazz City overworld: a 5x5 grid with a stone perimeter, a central
 * grass plaza, one encounter trigger (a hollow streetlamp ambush), and an
 * east-edge portal that warps the player into the Bayou.
 *
 * Layout (W = wall, g = grass, e = encounter, ▶ = region-portal-bayou):
 *   W W W W W
 *   W g g g W
 *   W g g e ▶
 *   W g g g W
 *   W W W W W
 *
 * The player spawns at (1, 2) on first entry, immediately east of the west
 * wall — equidistant to the encounter and the portal.
 */

function build(): readonly TileId[] {
  const tiles: TileId[] = [];
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (x === 0 || x === WIDTH - 1 || y === 0 || y === HEIGHT - 1) {
        if (y === 2 && x === WIDTH - 1) {
          tiles.push('region-portal-bayou');
        } else {
          tiles.push('wall');
        }
      } else if (x === 3 && y === 2) {
        tiles.push('encounter');
      } else {
        tiles.push('grass');
      }
    }
  }
  return tiles;
}

export const JAZZ_CITY_MAP: MapData = {
  height: HEIGHT,
  tileSize: TILE_SIZE,
  tiles: build(),
  width: WIDTH,
};

export const JAZZ_CITY_START = { x: 1, y: 2 } as const;

export function makeJazzCityScene(
  renderer: Renderer,
  input: PlayerInput,
  onEvent?: OverworldEventCallback,
): OverworldScene {
  const map = new Tilemap(JAZZ_CITY_MAP);
  const player = new PlayerController({
    input,
    map,
    onEvent,
    startTile: JAZZ_CITY_START,
  });
  return new OverworldScene({ input, map, onEvent, player, renderer });
}
