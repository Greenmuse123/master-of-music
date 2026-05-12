import {
  DEFAULT_INPUT_BINDINGS,
  INPUT_ACTIONS,
  isInputAction,
  type InputAction,
  type InputBinding,
  type InputBindings,
} from './actions';

export type InputSettingsStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

const STORAGE_KEY = 'master-of-music.input.bindings.v1';

export function cloneBindings(bindings: InputBindings): InputBindings {
  const clone = {} as Record<InputAction, InputBinding[]>;

  for (const action of INPUT_ACTIONS) {
    clone[action] = bindings[action].map((binding) => ({ ...binding }));
  }

  return clone;
}

export function createDefaultBindings(): InputBindings {
  return cloneBindings(DEFAULT_INPUT_BINDINGS);
}

export function getInputBindings(storage = resolveStorage()): InputBindings {
  const defaults = createDefaultBindings();

  if (storage === undefined) {
    return defaults;
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) {
    return defaults;
  }

  try {
    return mergeBindings(defaults, JSON.parse(raw));
  } catch {
    storage.removeItem(STORAGE_KEY);
    return defaults;
  }
}

export function persistInputBindings(bindings: InputBindings, storage = resolveStorage()): void {
  if (storage === undefined) {
    return;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

export function setInputBinding(
  bindings: InputBindings,
  action: InputAction,
  binding: InputBinding,
): InputBindings {
  return {
    ...cloneBindings(bindings),
    [action]: [{ ...binding }],
  };
}

function mergeBindings(defaults: InputBindings, saved: unknown): InputBindings {
  if (!isRecord(saved)) {
    return defaults;
  }

  const merged = cloneBindings(defaults);

  for (const [action, bindings] of Object.entries(saved)) {
    if (!isInputAction(action) || !Array.isArray(bindings)) {
      continue;
    }

    const validBindings = bindings.filter(isInputBinding);
    if (validBindings.length > 0) {
      merged[action] = validBindings.map((binding) => ({ ...binding }));
    }
  }

  return merged;
}

function isInputBinding(value: unknown): value is InputBinding {
  if (!isRecord(value) || typeof value['kind'] !== 'string') {
    return false;
  }

  if (value['kind'] === 'key') {
    return typeof value['code'] === 'string' && value['code'].length > 0;
  }

  if (value['kind'] === 'gamepad-button') {
    const button = value['button'];

    return Number.isInteger(button) && typeof button === 'number' && button >= 0;
  }

  if (value['kind'] === 'gamepad-axis') {
    const axis = value['axis'];
    const threshold = value['threshold'];

    return (
      Number.isInteger(axis) &&
      typeof axis === 'number' &&
      axis >= 0 &&
      (value['direction'] === -1 || value['direction'] === 1) &&
      (threshold === undefined || (typeof threshold === 'number' && threshold > 0 && threshold <= 1))
    );
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolveStorage(): InputSettingsStorage | undefined {
  return globalThis.localStorage;
}
