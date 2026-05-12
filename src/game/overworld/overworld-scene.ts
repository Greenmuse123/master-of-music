import { RENDER_H, RENDER_W } from '../../config/constants';
import type { Renderer } from '../../engine/render/renderer';
import type { FrameStep, Scene } from '../../engine/scene/scene';
import { PlayerController, type PlayerInput } from './player-controller';
import { Tilemap } from './tilemap';
import type { MapData, OverworldEventCallback, TileId } from './types';

export interface OverworldSceneOptions {
  readonly renderer: Renderer;
  readonly input: PlayerInput;
  readonly map: Tilemap;
  readonly player: PlayerController;
  readonly onEvent?: OverworldEventCallback;
}

const DEFAULT_TILE_SIZE = 16;
const DEFAULT_WIDTH = 3;
const DEFAULT_HEIGHT = 3;

/**
 * Builds the Phase-1 default 3x3 map: center is grass, perimeter is wall, and
 * the tile immediately east of center is an encounter trigger. Static factory
 * lives here (not in `data/`) because Phase 1 has no map JSON yet — the asset
 * pipeline (docs/05) is deferred.
 */
function makeDefaultMapData(): MapData {
  const tiles: TileId[] = new Array<TileId>(DEFAULT_WIDTH * DEFAULT_HEIGHT).fill('wall');
  const centerX = 1;
  const centerY = 1;

  tiles[centerY * DEFAULT_WIDTH + centerX] = 'grass';
  tiles[centerY * DEFAULT_WIDTH + (centerX + 1)] = 'encounter';

  return {
    height: DEFAULT_HEIGHT,
    tileSize: DEFAULT_TILE_SIZE,
    tiles,
    width: DEFAULT_WIDTH,
  };
}

/**
 * Overworld scene — owns the tilemap and the player controller. Wired by
 * `Game` via the scene router (see `scene-router` in Task 7 of PHASE-1.md).
 * `enter` is where allocations happen; `update` is allocation-free in
 * steady-state per docs/03 §2.1.
 */
export class OverworldScene implements Scene {
  readonly renderer: Renderer;
  readonly map: Tilemap;
  readonly player: PlayerController;
  readonly #onEvent: OverworldEventCallback | undefined;

  constructor(options: OverworldSceneOptions) {
    this.renderer = options.renderer;
    this.map = options.map;
    this.player = options.player;
    this.#onEvent = options.onEvent;
  }

  /**
   * Static factory for the Phase-1 default map. Used by both `Game` (for the
   * vertical slice) and the scene's own test, which exercises the
   * encounter-on-step golden path.
   */
  static makeDefault(
    renderer: Renderer,
    input: PlayerInput,
    onEvent?: OverworldEventCallback,
  ): OverworldScene {
    const map = new Tilemap(makeDefaultMapData());
    const player = new PlayerController({
      input,
      map,
      onEvent,
      startTile: { x: 1, y: 1 },
    });

    return new OverworldScene({ input, map, onEvent, player, renderer });
  }

  enter(_prev?: Scene): void {
    return;
  }

  exit(_next?: Scene): void {
    return;
  }

  update(step: FrameStep): void {
    this.player.update(step);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);

    this.map.render(ctx);

    ctx.fillStyle = '#f3d27a';
    ctx.fillRect(this.player.pixelX, this.player.pixelY, this.map.tileSize, this.map.tileSize);
  }

  handleInput(_event: Event): void {
    return;
  }

  /** Read-access for tests / debug overlays — the event sink the scene was built with. */
  get onEventCallback(): OverworldEventCallback | undefined {
    return this.#onEvent;
  }
}
