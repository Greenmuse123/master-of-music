import { afterEach, describe, expect, it, vi } from 'vitest';

import { InputManager, type InputActionEvent } from './input-manager';
import type { InputSettingsStorage } from './remap';

function createStorage(): InputSettingsStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

function createGamepadProvider(buttons: boolean[]) {
  return {
    getGamepads: () =>
      [
        {
          axes: [0, 0],
          buttons: buttons.map((pressed) => ({ pressed, touched: pressed, value: pressed ? 1 : 0 })),
          connected: true,
          id: 'test-pad',
          index: 0,
          mapping: 'standard',
          timestamp: 0,
        },
      ] as unknown as Gamepad[],
  };
}

function dispatchKeyboard(type: 'keydown' | 'keyup', code: string): void {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
}

describe('InputManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits action pressed on key-down and action released on key-up', () => {
    const manager = new InputManager({ storage: createStorage(), target: window });
    const events: InputActionEvent[] = [];
    manager.onAction((event) => events.push(event));

    dispatchKeyboard('keydown', 'KeyJ');
    dispatchKeyboard('keyup', 'KeyJ');

    expect(events.map(({ action, phase }) => ({ action, phase }))).toEqual([
      { action: 'confirm', phase: 'pressed' },
      { action: 'confirm', phase: 'released' },
    ]);
    expect(manager.pressed('confirm')).toBe(true);
    expect(manager.released('confirm')).toBe(true);

    manager.dispose();
  });

  it('emits direction held events at the configured repeat cadence', () => {
    const manager = new InputManager({
      initialDelayMs: 250,
      repeatRateMs: 60,
      storage: createStorage(),
      target: window,
    });
    const events: InputActionEvent[] = [];
    manager.onAction((event) => events.push(event));

    manager.update(0);
    dispatchKeyboard('keydown', 'KeyW');
    manager.update(244);
    manager.update(245);
    manager.update(305);
    manager.update(365);

    const heldEvents = events.filter((event) => event.action === 'up' && event.phase === 'held');

    expect(heldEvents.map((event) => event.timestamp)).toEqual([245, 305, 365]);
    expect(Math.abs(heldEvents[0]!.timestamp - 250)).toBeLessThanOrEqual(5);
    expect(Math.abs(heldEvents[1]!.timestamp - heldEvents[0]!.timestamp - 60)).toBeLessThanOrEqual(5);
    expect(Math.abs(heldEvents[2]!.timestamp - heldEvents[1]!.timestamp - 60)).toBeLessThanOrEqual(5);
    expect(manager.held('up')).toBe(true);

    manager.dispose();
  });

  it('polls standard gamepad A button as confirm', () => {
    const manager = new InputManager({
      gamepadProvider: createGamepadProvider([true]),
      storage: createStorage(),
      target: window,
    });
    const events: InputActionEvent[] = [];
    manager.onAction((event) => events.push(event));

    manager.update(16);

    expect(manager.pressed('confirm')).toBe(true);
    expect(events).toContainEqual({
      action: 'confirm',
      phase: 'pressed',
      source: 'gamepad',
      timestamp: 16,
    });

    manager.dispose();
  });

  it('reflects a remapped binding in pressed state immediately', () => {
    const manager = new InputManager({ storage: createStorage(), target: window });

    dispatchKeyboard('keydown', 'KeyL');
    manager.setBinding('confirm', { code: 'KeyL', kind: 'key' });

    expect(manager.pressed('confirm')).toBe(true);
    expect(manager.getBindings().confirm).toEqual([{ code: 'KeyL', kind: 'key' }]);

    manager.dispose();
  });

  it('does not repeat press-only actions', () => {
    const manager = new InputManager({ storage: createStorage(), target: window });
    const events: InputActionEvent[] = [];
    manager.onAction((event) => events.push(event));

    dispatchKeyboard('keydown', 'KeyJ');
    manager.update(1_000);

    expect(events.filter((event) => event.action === 'confirm' && event.phase === 'held')).toEqual([]);

    manager.dispose();
  });

  it('survives a keydown that fires between rAF ticks — pressed() is true on the FIRST update after the press', () => {
    // Regression for the bug Elias hit walking the Phase-3 golden path:
    // handleKeyDown advanced `previousActions`, so when input.update(now) ran
    // BEFORE scene.update(step) in Game.#tick, recomputeActions saw no
    // transition and the cleared justPressed stayed empty. The fix carries
    // handler-detected transitions across the next update() via pending sets.
    const manager = new InputManager({ storage: createStorage(), target: window });

    // 1. User presses J between rAF ticks (no update() between the two).
    dispatchKeyboard('keydown', 'KeyJ');

    // 2. Game.#tick fires. input.update(now) runs FIRST.
    manager.update(16);

    // 3. scene.update(step) runs SECOND and reads pressed(). Must see true.
    expect(manager.pressed('confirm')).toBe(true);

    // 4. Next frame. Key still held. pressed() must be false (only fires once).
    manager.update(32);
    expect(manager.pressed('confirm')).toBe(false);
    expect(manager.held('confirm')).toBe(true);

    manager.dispose();
  });

  it('survives a keyup between rAF ticks — released() is true on the FIRST update after the release', () => {
    const manager = new InputManager({ storage: createStorage(), target: window });

    dispatchKeyboard('keydown', 'KeyJ');
    manager.update(16);
    // Consume the initial pressed event so we are testing the release path.
    manager.pressed('confirm');

    dispatchKeyboard('keyup', 'KeyJ');
    manager.update(32);

    expect(manager.released('confirm')).toBe(true);
    expect(manager.held('confirm')).toBe(false);

    manager.update(48);
    expect(manager.released('confirm')).toBe(false);

    manager.dispose();
  });
});
