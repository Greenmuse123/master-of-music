import type { FrameStep } from '../../engine/scene/scene';
import type { InputAction } from '../../engine/input/actions';
import type { InputManager } from '../../engine/input/input-manager';
import type { Tilemap } from './tilemap';
import type { OverworldEventCallback, PlayerState } from './types';

/**
 * Minimal grid-anchored input surface — the bits of `InputManager` the player
 * controller needs. Lets tests substitute a featherweight fake without the
 * keyboard plumbing.
 */
export interface PlayerInput {
  pressed(action: InputAction): boolean;
}

export interface PlayerControllerOptions {
  readonly input: PlayerInput;
  readonly map: Tilemap;
  readonly startTile: { readonly x: number; readonly y: number };
  readonly onEvent?: OverworldEventCallback;
}

const DIRECTIONS = [
  { action: 'up' as const, dx: 0, dy: -1, facing: 'n' as const },
  { action: 'down' as const, dx: 0, dy: 1, facing: 's' as const },
  { action: 'left' as const, dx: -1, dy: 0, facing: 'w' as const },
  { action: 'right' as const, dx: 1, dy: 0, facing: 'e' as const },
];

/**
 * Grid-stepping overworld player controller.
 *
 * One discrete tile move per `pressed` direction action — never diagonal. The
 * controller asks the `InputManager` for `pressed` (frame-edge) rather than
 * `held`, so holding a key does not auto-step; that's the input manager's
 * repeat callback's job once enabled. Walls block movement; stepping onto an
 * `'encounter'` tile fires the `onEvent` callback exactly once per step.
 */
export class PlayerController {
  readonly #input: PlayerInput;
  readonly #map: Tilemap;
  readonly #onEvent: OverworldEventCallback | undefined;
  #state: PlayerState;

  constructor(options: PlayerControllerOptions) {
    if (!Number.isInteger(options.startTile.x) || !Number.isInteger(options.startTile.y)) {
      throw new Error('PlayerController startTile must use integer coordinates.');
    }

    if (options.map.isBlocked(options.startTile.x, options.startTile.y)) {
      throw new Error('PlayerController startTile cannot be a blocked (wall) tile.');
    }

    this.#input = options.input;
    this.#map = options.map;
    this.#onEvent = options.onEvent;
    this.#state = {
      facing: 's',
      tileX: options.startTile.x,
      tileY: options.startTile.y,
    };
  }

  get state(): PlayerState {
    return this.#state;
  }

  /** Pixel-space X position derived from grid state (top-left of the tile). */
  get pixelX(): number {
    return this.#state.tileX * this.#map.tileSize;
  }

  /** Pixel-space Y position derived from grid state (top-left of the tile). */
  get pixelY(): number {
    return this.#state.tileY * this.#map.tileSize;
  }

  /**
   * Drives one frame of movement input. Only the first direction whose
   * `pressed` is true gets to step — diagonal input is impossible, and a
   * simultaneous two-direction press resolves deterministically (up > down >
   * left > right).
   *
   * `step` is accepted to honor the Scene frame contract (docs/03 §2.1) and
   * future-proof for animation; the current implementation ignores it because
   * grid steps are instantaneous.
   */
  update(_step: FrameStep): void {
    for (const dir of DIRECTIONS) {
      if (!this.#input.pressed(dir.action)) {
        continue;
      }

      const nextX = this.#state.tileX + dir.dx;
      const nextY = this.#state.tileY + dir.dy;

      // Always update facing so the player turns even into a wall.
      this.#state = { ...this.#state, facing: dir.facing };

      if (this.#map.isBlocked(nextX, nextY)) {
        return;
      }

      this.#state = { facing: dir.facing, tileX: nextX, tileY: nextY };

      if (this.#map.tileAt(nextX, nextY) === 'encounter' && this.#onEvent !== undefined) {
        this.#onEvent({ kind: 'encounter', tileX: nextX, tileY: nextY });
      }

      return;
    }
  }
}

/**
 * Convenience guard so callers can pass a real `InputManager` (which already
 * implements `pressed`) without typing every site to the wider interface.
 */
export function asPlayerInput(manager: InputManager): PlayerInput {
  return manager;
}
