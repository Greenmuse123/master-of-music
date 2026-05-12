import { describe, expect, it, vi } from 'vitest';

import type { InputAction } from '../../engine/input/actions';
import { Renderer } from '../../engine/render/renderer';
import type { FrameStep } from '../../engine/scene/scene';
import { OverworldScene } from './overworld-scene';
import { PlayerController, type PlayerInput } from './player-controller';
import { Tilemap } from './tilemap';
import type { OverworldEventCallback, TileId } from './types';

function stubCanvasContext(): CanvasRenderingContext2D & {
  fillRect: ReturnType<typeof vi.fn>;
} {
  const ctx = {
    fillRect: vi.fn(),
    fillStyle: '',
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D;

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);

  return ctx as CanvasRenderingContext2D & { fillRect: ReturnType<typeof vi.fn> };
}

class FakeInput implements PlayerInput {
  #pressed = new Set<InputAction>();

  set(action: InputAction, value: boolean): void {
    if (value) {
      this.#pressed.add(action);
    } else {
      this.#pressed.delete(action);
    }
  }

  pressed(action: InputAction): boolean {
    return this.#pressed.has(action);
  }
}

const STEP: FrameStep = { beat: null, beatPhase: 0, dt: 1 / 60, now: 0 };

describe('OverworldScene', () => {
  it('makeDefault returns a 3x3 scene with player at center and an encounter east of center', () => {
    stubCanvasContext();
    const renderer = new Renderer();
    const input = new FakeInput();

    const scene = OverworldScene.makeDefault(renderer, input);

    expect(scene.map.width).toBe(3);
    expect(scene.map.height).toBe(3);
    expect(scene.map.tileAt(1, 1)).toBe('grass');
    expect(scene.map.tileAt(2, 1)).toBe('encounter');
    expect(scene.map.tileAt(0, 0)).toBe('wall');
    expect(scene.player.state).toEqual({ facing: 's', tileX: 1, tileY: 1 });
  });

  it('walks the player east one step and triggers the encounter callback exactly once', () => {
    stubCanvasContext();
    const renderer = new Renderer();
    const input = new FakeInput();
    const onEvent: OverworldEventCallback = vi.fn();

    const scene = OverworldScene.makeDefault(renderer, input, onEvent);

    input.set('right', true);
    scene.update(STEP);

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ kind: 'encounter', tileX: 2, tileY: 1 });
    expect(scene.player.state).toEqual({ facing: 'e', tileX: 2, tileY: 1 });
    expect(scene.onEventCallback).toBe(onEvent);
  });

  it('enter, exit, and handleInput are safe no-ops', () => {
    stubCanvasContext();
    const renderer = new Renderer();
    const input = new FakeInput();
    const scene = OverworldScene.makeDefault(renderer, input);

    expect(() => {
      scene.enter();
      scene.exit();
      scene.handleInput(new Event('keydown'));
    }).not.toThrow();
  });

  it('render clears the screen, draws the map tiles, and draws the player rect', () => {
    const ctx = stubCanvasContext();
    const renderer = new Renderer();
    const input = new FakeInput();
    const scene = OverworldScene.makeDefault(renderer, input);

    scene.render(ctx);

    // 1 screen clear + 9 map tiles + 1 player rect = 11 fillRect calls.
    expect(ctx.fillRect).toHaveBeenCalledTimes(11);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(11, 16, 16, 16, 16);
  });

  it('accepts an externally-built map and player via constructor', () => {
    stubCanvasContext();
    const renderer = new Renderer();
    const input = new FakeInput();
    const onEvent: OverworldEventCallback = vi.fn();
    const map = new Tilemap({
      height: 3,
      tileSize: 16,
      tiles: [
        'grass', 'grass', 'grass',
        'grass', 'grass', 'grass',
        'grass', 'grass', 'grass',
      ] as TileId[],
      width: 3,
    });
    const player = new PlayerController({ input, map, onEvent, startTile: { x: 0, y: 0 } });
    const scene = new OverworldScene({ input, map, onEvent, player, renderer });

    expect(scene.map).toBe(map);
    expect(scene.player).toBe(player);
    expect(scene.onEventCallback).toBe(onEvent);
  });
});
