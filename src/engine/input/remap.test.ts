import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_INPUT_BINDINGS } from './actions';
import {
  cloneBindings,
  createDefaultBindings,
  getInputBindings,
  persistInputBindings,
  setInputBinding,
  type InputSettingsStorage,
} from './remap';

function createStorage(seed?: Record<string, string>): InputSettingsStorage & { values: Map<string, string> } {
  const values = new Map(Object.entries(seed ?? {}));

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
    values,
  };
}

describe('input remapping', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates isolated default binding copies', () => {
    const first = createDefaultBindings();
    const second = createDefaultBindings();

    first.confirm = [{ code: 'KeyL', kind: 'key' }];

    expect(second.confirm).toEqual(DEFAULT_INPUT_BINDINGS.confirm);
  });

  it('clones binding maps without preserving nested references', () => {
    const bindings = createDefaultBindings();
    const clone = cloneBindings(bindings);

    clone.up = [{ code: 'ArrowUp', kind: 'key' }];

    expect(bindings.up).toEqual(DEFAULT_INPUT_BINDINGS.up);
    expect(clone.up).toEqual([{ code: 'ArrowUp', kind: 'key' }]);
  });

  it('loads defaults when storage is unavailable or empty', () => {
    expect(getInputBindings(createStorage())).toEqual(DEFAULT_INPUT_BINDINGS);
  });

  it('does nothing when persisting without storage', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(getInputBindings()).toEqual(DEFAULT_INPUT_BINDINGS);
    expect(() => persistInputBindings(createDefaultBindings())).not.toThrow();
  });

  it('loads defaults when persisted data is not an object', () => {
    const storage = createStorage({
      'master-of-music.input.bindings.v1': JSON.stringify(null),
    });

    expect(getInputBindings(storage)).toEqual(DEFAULT_INPUT_BINDINGS);
  });

  it('merges valid persisted bindings over defaults', () => {
    const storage = createStorage();
    const bindings = setInputBinding(createDefaultBindings(), 'confirm', {
      code: 'KeyL',
      kind: 'key',
    });

    persistInputBindings(bindings, storage);

    expect(getInputBindings(storage).confirm).toEqual([{ code: 'KeyL', kind: 'key' }]);
    expect(getInputBindings(storage).cancel).toEqual(DEFAULT_INPUT_BINDINGS.cancel);
  });

  it('ignores invalid persisted actions and bindings', () => {
    const storage = createStorage({
      'master-of-music.input.bindings.v1': JSON.stringify({
        cancel: 'KeyK',
        confirm: [{ code: '', kind: 'key' }],
        down: [null, { button: -1, kind: 'gamepad-button' }],
        left: [{ axis: -1, direction: -1, kind: 'gamepad-axis' }],
        menu: [{ kind: 'unknown' }],
        nope: [{ code: 'KeyL', kind: 'key' }],
        right: [{ axis: 0, direction: 0, kind: 'gamepad-axis' }],
        up: [{ code: 'ArrowUp', kind: 'key' }],
      }),
    });

    const bindings = getInputBindings(storage);

    expect(bindings.confirm).toEqual(DEFAULT_INPUT_BINDINGS.confirm);
    expect(bindings.down).toEqual(DEFAULT_INPUT_BINDINGS.down);
    expect(bindings.left).toEqual(DEFAULT_INPUT_BINDINGS.left);
    expect(bindings.menu).toEqual(DEFAULT_INPUT_BINDINGS.menu);
    expect(bindings.right).toEqual(DEFAULT_INPUT_BINDINGS.right);
    expect(bindings.up).toEqual([{ code: 'ArrowUp', kind: 'key' }]);
  });

  it('loads valid gamepad button and axis bindings', () => {
    const storage = createStorage({
      'master-of-music.input.bindings.v1': JSON.stringify({
        down: [{ axis: 1, direction: 1, kind: 'gamepad-axis', threshold: 0.25 }],
        up: [{ button: 12, kind: 'gamepad-button' }],
      }),
    });

    const bindings = getInputBindings(storage);

    expect(bindings.down).toEqual([{ axis: 1, direction: 1, kind: 'gamepad-axis', threshold: 0.25 }]);
    expect(bindings.up).toEqual([{ button: 12, kind: 'gamepad-button' }]);
  });

  it('removes corrupt persisted JSON and falls back to defaults', () => {
    const storage = createStorage({ 'master-of-music.input.bindings.v1': '{bad' });

    expect(getInputBindings(storage)).toEqual(DEFAULT_INPUT_BINDINGS);
    expect(storage.values.has('master-of-music.input.bindings.v1')).toBe(false);
  });

  it('sets one binding for an action while preserving other actions', () => {
    const bindings = setInputBinding(createDefaultBindings(), 'beat-press', {
      button: 2,
      kind: 'gamepad-button',
    });

    expect(bindings['beat-press']).toEqual([{ button: 2, kind: 'gamepad-button' }]);
    expect(bindings.confirm).toEqual(DEFAULT_INPUT_BINDINGS.confirm);
  });
});
