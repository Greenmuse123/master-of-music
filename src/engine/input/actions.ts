export const INPUT_ACTIONS = [
  'up',
  'down',
  'left',
  'right',
  'confirm',
  'cancel',
  'menu',
  'act-1',
  'act-2',
  'act-3',
  'act-4',
  'beat-press',
  'recruit',
] as const;

export type InputAction = (typeof INPUT_ACTIONS)[number];

export type InputBinding =
  | {
      readonly code: string;
      readonly kind: 'key';
    }
  | {
      readonly button: number;
      readonly kind: 'gamepad-button';
    }
  | {
      readonly axis: number;
      readonly direction: -1 | 1;
      readonly kind: 'gamepad-axis';
      readonly threshold?: number;
    };

export type InputBindings = Record<InputAction, readonly InputBinding[]>;

export const DIRECTION_ACTIONS = ['up', 'down', 'left', 'right'] as const satisfies readonly InputAction[];

export const DEFAULT_INPUT_BINDINGS: InputBindings = {
  'act-1': [{ code: 'KeyU', kind: 'key' }],
  'act-2': [
    { code: 'KeyI', kind: 'key' },
    { button: 3, kind: 'gamepad-button' },
  ],
  'act-3': [
    { code: 'KeyO', kind: 'key' },
    { button: 4, kind: 'gamepad-button' },
  ],
  'act-4': [
    { code: 'KeyP', kind: 'key' },
    { button: 5, kind: 'gamepad-button' },
  ],
  'beat-press': [
    { code: 'Space', kind: 'key' },
    { button: 2, kind: 'gamepad-button' },
  ],
  cancel: [
    { code: 'KeyK', kind: 'key' },
    { button: 1, kind: 'gamepad-button' },
  ],
  confirm: [
    { code: 'KeyJ', kind: 'key' },
    { code: 'Enter', kind: 'key' },
    { button: 0, kind: 'gamepad-button' },
  ],
  down: [
    { code: 'KeyS', kind: 'key' },
    { button: 13, kind: 'gamepad-button' },
    { axis: 1, direction: 1, kind: 'gamepad-axis' },
  ],
  left: [
    { code: 'KeyA', kind: 'key' },
    { button: 14, kind: 'gamepad-button' },
    { axis: 0, direction: -1, kind: 'gamepad-axis' },
  ],
  menu: [
    { code: 'Escape', kind: 'key' },
    { button: 9, kind: 'gamepad-button' },
  ],
  recruit: [{ code: 'KeyR', kind: 'key' }],
  right: [
    { code: 'KeyD', kind: 'key' },
    { button: 15, kind: 'gamepad-button' },
    { axis: 0, direction: 1, kind: 'gamepad-axis' },
  ],
  up: [
    { code: 'KeyW', kind: 'key' },
    { button: 12, kind: 'gamepad-button' },
    { axis: 1, direction: -1, kind: 'gamepad-axis' },
  ],
};

export function isInputAction(value: string): value is InputAction {
  return (INPUT_ACTIONS as readonly string[]).includes(value);
}

export function isDirectionAction(action: InputAction): boolean {
  return (DIRECTION_ACTIONS as readonly InputAction[]).includes(action);
}
