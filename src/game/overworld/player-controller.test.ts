import { describe, expect, it, vi } from 'vitest';

import type { InputAction } from '../../engine/input/actions';
import type { FrameStep } from '../../engine/scene/scene';
import { PlayerController, type PlayerInput } from './player-controller';
import { Tilemap } from './tilemap';
import type { MapData, OverworldEventCallback, TileId } from './types';

function makeMap(overrides: Partial<MapData> = {}): Tilemap {
  return new Tilemap({
    height: 3,
    tileSize: 16,
    tiles: [
      'wall', 'wall', 'wall',
      'wall', 'grass', 'encounter',
      'wall', 'wall', 'wall',
    ] as TileId[],
    width: 3,
    ...overrides,
  });
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

  clear(): void {
    this.#pressed.clear();
  }

  pressed(action: InputAction): boolean {
    return this.#pressed.has(action);
  }
}

const STEP: FrameStep = { beat: null, beatPhase: 0, dt: 1 / 60, now: 0 };

describe('PlayerController', () => {
  it('starts at the configured tile facing south', () => {
    const input = new FakeInput();
    const map = makeMap();
    const player = new PlayerController({ input, map, startTile: { x: 1, y: 1 } });

    expect(player.state).toEqual({ facing: 's', tileX: 1, tileY: 1 });
    expect(player.pixelX).toBe(16);
    expect(player.pixelY).toBe(16);
  });

  it('steps one tile east on a single "right" press and updates facing', () => {
    const input = new FakeInput();
    const map = makeMap({
      tiles: [
        'grass', 'grass', 'grass',
        'grass', 'grass', 'grass',
        'grass', 'grass', 'grass',
      ] as TileId[],
    });
    const player = new PlayerController({ input, map, startTile: { x: 1, y: 1 } });

    input.set('right', true);
    player.update(STEP);

    expect(player.state).toEqual({ facing: 'e', tileX: 2, tileY: 1 });
  });

  it('does not move when blocked by a wall but still updates facing', () => {
    const input = new FakeInput();
    const map = makeMap();
    const player = new PlayerController({ input, map, startTile: { x: 1, y: 1 } });

    input.set('up', true);
    player.update(STEP);

    expect(player.state).toEqual({ facing: 'n', tileX: 1, tileY: 1 });
  });

  it('emits an encounter event exactly once when stepping onto an encounter tile', () => {
    const onEvent: OverworldEventCallback = vi.fn();
    const input = new FakeInput();
    const map = makeMap();
    const player = new PlayerController({ input, map, onEvent, startTile: { x: 1, y: 1 } });

    input.set('right', true);
    player.update(STEP);

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ kind: 'encounter', tileX: 2, tileY: 1 });
    expect(player.state.tileX).toBe(2);
  });

  it('resolves simultaneous direction presses deterministically (up > down > left > right)', () => {
    const input = new FakeInput();
    const map = makeMap({
      tiles: [
        'grass', 'grass', 'grass',
        'grass', 'grass', 'grass',
        'grass', 'grass', 'grass',
      ] as TileId[],
    });
    const player = new PlayerController({ input, map, startTile: { x: 1, y: 1 } });

    input.set('up', true);
    input.set('left', true);
    player.update(STEP);

    expect(player.state).toEqual({ facing: 'n', tileX: 1, tileY: 0 });
  });

  it('does not step when no direction is pressed', () => {
    const input = new FakeInput();
    const map = makeMap();
    const player = new PlayerController({ input, map, startTile: { x: 1, y: 1 } });

    player.update(STEP);

    expect(player.state).toEqual({ facing: 's', tileX: 1, tileY: 1 });
  });

  it('does not emit an encounter when onEvent is omitted', () => {
    const input = new FakeInput();
    const map = makeMap();
    const player = new PlayerController({ input, map, startTile: { x: 1, y: 1 } });

    input.set('right', true);

    expect(() => {
      player.update(STEP);
    }).not.toThrow();
    expect(player.state.tileX).toBe(2);
  });

  it('rejects non-integer start tile coordinates', () => {
    const input = new FakeInput();
    const map = makeMap();
    expect(() => new PlayerController({ input, map, startTile: { x: 1.5, y: 1 } })).toThrow(/integer/);
  });

  it('rejects start tiles on a wall', () => {
    const input = new FakeInput();
    const map = makeMap();
    expect(() => new PlayerController({ input, map, startTile: { x: 0, y: 0 } })).toThrow(/wall/);
  });

  it('steps south and emits no encounter when target is grass', () => {
    const onEvent: OverworldEventCallback = vi.fn();
    const input = new FakeInput();
    const map = makeMap({
      tiles: [
        'wall', 'wall', 'wall',
        'wall', 'grass', 'wall',
        'wall', 'grass', 'wall',
      ] as TileId[],
    });
    const player = new PlayerController({ input, map, onEvent, startTile: { x: 1, y: 1 } });

    input.set('down', true);
    player.update(STEP);

    expect(player.state).toEqual({ facing: 's', tileX: 1, tileY: 2 });
    expect(onEvent).not.toHaveBeenCalled();
  });
});
