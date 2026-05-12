import {
  INPUT_ACTIONS,
  isDirectionAction,
  type InputAction,
  type InputBinding,
  type InputBindings,
} from './actions';
import {
  cloneBindings,
  getInputBindings,
  persistInputBindings,
  setInputBinding,
  type InputSettingsStorage,
} from './remap';

export type InputActionPhase = 'held' | 'pressed' | 'released';

export type InputActionEvent = {
  readonly action: InputAction;
  readonly phase: InputActionPhase;
  readonly source: 'gamepad' | 'keyboard';
  readonly timestamp: number;
};

export type InputActionCallback = (event: InputActionEvent) => void;

export type InputManagerOptions = {
  readonly gamepadProvider?: Pick<Navigator, 'getGamepads'>;
  readonly initialDelayMs?: number;
  readonly repeatRateMs?: number;
  readonly storage?: InputSettingsStorage;
  readonly target?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
};

const DEFAULT_INITIAL_DELAY_MS = 250;
const DEFAULT_REPEAT_RATE_MS = 60;

export class InputManager {
  private readonly callbacks = new Set<InputActionCallback>();
  private readonly gamepadProvider?: Pick<Navigator, 'getGamepads'>;
  private readonly initialDelayMs: number;
  private readonly keysDown = new Set<string>();
  private readonly repeatRateMs: number;
  private readonly storage?: InputSettingsStorage;
  private readonly target?: Pick<Window, 'addEventListener' | 'removeEventListener'>;

  private bindings: InputBindings;
  private readonly currentActions = new Set<InputAction>();
  private readonly gamepadButtonsDown = new Set<number>();
  private gamepadAxes: readonly number[] = [];
  private readonly justPressed = new Set<InputAction>();
  private readonly justReleased = new Set<InputAction>();
  private lastUpdateNow = 0;
  private readonly nextRepeatAt = new Map<InputAction, number>();
  private readonly previousActions = new Set<InputAction>();
  private readonly repeatedThisFrame = new Set<InputAction>();

  public constructor(options: InputManagerOptions = {}) {
    this.bindings = getInputBindings(options.storage);
    this.gamepadProvider = options.gamepadProvider ?? resolveGamepadProvider();
    this.initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
    this.repeatRateMs = options.repeatRateMs ?? DEFAULT_REPEAT_RATE_MS;
    this.storage = options.storage;
    this.target = options.target ?? globalThis.window;

    this.target?.addEventListener('keydown', this.handleKeyDown);
    this.target?.addEventListener('keyup', this.handleKeyUp);
    this.recomputeActions(0);
    this.previousActions.clear();
    for (const action of this.currentActions) {
      this.previousActions.add(action);
    }
  }

  public pressed(action: InputAction): boolean {
    return this.justPressed.has(action);
  }

  public held(action: InputAction): boolean {
    return this.currentActions.has(action);
  }

  public released(action: InputAction): boolean {
    return this.justReleased.has(action);
  }

  public onAction(callback: InputActionCallback): () => void {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  public setBinding(action: InputAction, binding: InputBinding): void {
    this.bindings = setInputBinding(this.bindings, action, binding);
    persistInputBindings(this.bindings, this.storage);
    this.recomputeActions(this.lastUpdateNow);
  }

  public getBindings(): InputBindings {
    return cloneBindings(this.bindings);
  }

  public update(now: number): void {
    this.lastUpdateNow = now;
    this.justPressed.clear();
    this.justReleased.clear();
    this.repeatedThisFrame.clear();
    this.pollGamepads();
    this.recomputeActions(now);
    this.emitRepeats(now);
  }

  public dispose(): void {
    this.target?.removeEventListener('keydown', this.handleKeyDown);
    this.target?.removeEventListener('keyup', this.handleKeyUp);
    this.callbacks.clear();
  }

  private readonly handleKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    this.keysDown.add(event.code);
    this.recomputeActions(this.lastUpdateNow, 'keyboard');
  };

  private readonly handleKeyUp = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    this.keysDown.delete(event.code);
    this.recomputeActions(this.lastUpdateNow, 'keyboard');
  };

  private pollGamepads(): void {
    this.gamepadButtonsDown.clear();

    const gamepads = this.gamepadProvider?.getGamepads() ?? [];
    const axes: number[] = [];

    for (const gamepad of gamepads) {
      if (gamepad === null) {
        continue;
      }

      gamepad.buttons.forEach((button, index) => {
        if (button.pressed) {
          this.gamepadButtonsDown.add(index);
        }
      });
      axes.push(...gamepad.axes);
    }

    this.gamepadAxes = axes;
  }

  private recomputeActions(now: number, source?: InputActionEvent['source']): void {
    const nextActions = new Set<InputAction>();

    for (const action of INPUT_ACTIONS) {
      if (this.bindings[action].some((binding) => this.bindingActive(binding))) {
        nextActions.add(action);
      }
    }

    for (const action of INPUT_ACTIONS) {
      const wasActive = this.previousActions.has(action);
      const isActive = nextActions.has(action);

      if (!wasActive && isActive) {
        this.justPressed.add(action);
        this.nextRepeatAt.set(action, now + this.initialDelayMs);
        this.emit({ action, phase: 'pressed', source: source ?? this.sourceForAction(action), timestamp: now });
      }

      if (wasActive && !isActive) {
        this.justReleased.add(action);
        this.nextRepeatAt.delete(action);
        this.emit({ action, phase: 'released', source: source ?? this.sourceForAction(action), timestamp: now });
      }
    }

    this.currentActions.clear();
    this.previousActions.clear();

    for (const action of nextActions) {
      this.currentActions.add(action);
      this.previousActions.add(action);
    }
  }

  private emitRepeats(now: number): void {
    for (const action of INPUT_ACTIONS) {
      if (!isDirectionAction(action) || !this.currentActions.has(action)) {
        continue;
      }

      const nextRepeatAt = this.nextRepeatAt.get(action) ?? now + this.initialDelayMs;
      if (now + 5 < nextRepeatAt) {
        continue;
      }

      this.repeatedThisFrame.add(action);
      this.emit({ action, phase: 'held', source: this.sourceForAction(action), timestamp: now });
      this.nextRepeatAt.set(action, nextRepeatAt + this.repeatRateMs);
    }
  }

  private bindingActive(binding: InputBinding): boolean {
    if (binding.kind === 'key') {
      return this.keysDown.has(binding.code);
    }

    if (binding.kind === 'gamepad-button') {
      return this.gamepadButtonsDown.has(binding.button);
    }

    const value = this.gamepadAxes[binding.axis] ?? 0;
    const threshold = binding.threshold ?? 0.5;

    return binding.direction === -1 ? value <= -threshold : value >= threshold;
  }

  private sourceForAction(action: InputAction): InputActionEvent['source'] {
    const activeBinding = this.bindings[action].find((binding) => this.bindingActive(binding));

    return activeBinding?.kind === 'key' ? 'keyboard' : 'gamepad';
  }

  private emit(event: InputActionEvent): void {
    for (const callback of this.callbacks) {
      callback(event);
    }
  }
}

function resolveGamepadProvider(): Pick<Navigator, 'getGamepads'> | undefined {
  const navigator = globalThis.navigator;

  return typeof navigator.getGamepads === 'function' ? navigator : undefined;
}
