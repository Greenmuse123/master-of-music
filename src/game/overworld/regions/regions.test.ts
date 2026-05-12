import { describe, expect, it } from 'vitest';

import type { InputAction } from '../../../engine/input/actions';
import type { Renderer } from '../../../engine/render/renderer';
import type { OverworldEvent } from '../types';
import { BAYOU_MAP, BAYOU_START, makeBayouScene } from './bayou';
import { JAZZ_CITY_MAP, JAZZ_CITY_START, makeJazzCityScene } from './jazz-city';

function makeRenderer(): Renderer {
  return {
    ctx: {} as CanvasRenderingContext2D,
    dispose: () => {
      return;
    },
    mount: () => {
      return;
    },
  } as unknown as Renderer;
}

function makeInput(queue: Map<InputAction, boolean[]>): {
  pressed(action: InputAction): boolean;
} {
  return {
    pressed(action: InputAction): boolean {
      const queued = queue.get(action);
      if (queued === undefined || queued.length === 0) {
        return false;
      }
      return queued.shift() ?? false;
    },
  };
}

function tileAt(map: typeof JAZZ_CITY_MAP, x: number, y: number): string {
  return map.tiles[y * map.width + x] ?? 'wall';
}

describe('JazzCity region', () => {
  it('exposes a 5x5 map with a bayou portal on the east edge at y=2', () => {
    expect(JAZZ_CITY_MAP.width).toBe(5);
    expect(JAZZ_CITY_MAP.height).toBe(5);
    expect(tileAt(JAZZ_CITY_MAP, 4, 2)).toBe('region-portal-bayou');
  });

  it('places the encounter tile at (3, 2) and the start tile at (1, 2) on grass', () => {
    expect(tileAt(JAZZ_CITY_MAP, 3, 2)).toBe('encounter');
    expect(tileAt(JAZZ_CITY_MAP, JAZZ_CITY_START.x, JAZZ_CITY_START.y)).toBe('grass');
  });

  it('walls the perimeter except for the portal', () => {
    for (let x = 0; x < JAZZ_CITY_MAP.width; x += 1) {
      expect(tileAt(JAZZ_CITY_MAP, x, 0)).toBe('wall');
      expect(tileAt(JAZZ_CITY_MAP, x, 4)).toBe('wall');
    }
    expect(tileAt(JAZZ_CITY_MAP, 0, 2)).toBe('wall');
  });

  it('steps east twice from spawn → encounter event fires', () => {
    const events: OverworldEvent[] = [];
    const queue = new Map<InputAction, boolean[]>([['right', [true, true]]]);
    const scene = makeJazzCityScene(makeRenderer(), makeInput(queue), (event) => {
      events.push(event);
    });

    scene.update({ beat: null, beatPhase: 0, dt: 0.016, now: 0 });
    scene.update({ beat: null, beatPhase: 0, dt: 0.016, now: 16 });

    expect(events).toEqual([{ kind: 'encounter', tileX: 3, tileY: 2 }]);
  });
});

describe('Bayou region', () => {
  it('exposes a 5x5 map with a jazz-city portal on the west edge at y=2', () => {
    expect(BAYOU_MAP.width).toBe(5);
    expect(BAYOU_MAP.height).toBe(5);
    expect(tileAt(BAYOU_MAP, 0, 2)).toBe('region-portal-jazz-city');
  });

  it('places the Diminuendo boss-encounter tile at (4, 4)', () => {
    expect(tileAt(BAYOU_MAP, 4, 4)).toBe('boss-encounter');
  });

  it('places the mook encounter at (3, 2) and the start at (1, 2) on grass', () => {
    expect(tileAt(BAYOU_MAP, 3, 2)).toBe('encounter');
    expect(tileAt(BAYOU_MAP, BAYOU_START.x, BAYOU_START.y)).toBe('grass');
  });

  it('steps west from spawn → region-change to jazz-city fires', () => {
    const events: OverworldEvent[] = [];
    const queue = new Map<InputAction, boolean[]>([['left', [true]]]);
    const scene = makeBayouScene(makeRenderer(), makeInput(queue), (event) => {
      events.push(event);
    });

    scene.update({ beat: null, beatPhase: 0, dt: 0.016, now: 0 });

    expect(events).toEqual([{ kind: 'region-change', targetRegion: 'jazz-city' }]);
  });
});
