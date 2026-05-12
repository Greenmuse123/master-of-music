import { describe, expect, it, vi } from 'vitest';

import { RENDER_H, RENDER_W } from '../config/constants';
import type { InputAction } from '../engine/input/actions';
import type { InputManager } from '../engine/input/input-manager';
import type { Renderer } from '../engine/render/renderer';
import type { SaveStore } from '../engine/save/store';
import type { SaveSummary } from '../engine/save/types';
import type { FrameStep } from '../engine/scene/scene';
import { SaveSelectScene } from './save-select-scene';

function stubCtx(): CanvasRenderingContext2D & {
  fillRect: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
} {
  return {
    fillRect: vi.fn(),
    fillStyle: '',
    fillText: vi.fn(),
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D & {
    fillRect: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
  };
}

function makeInput(): {
  input: Pick<InputManager, 'pressed'>;
  set: (actions: readonly InputAction[]) => void;
} {
  let pressedActions = new Set<InputAction>();
  return {
    input: { pressed: (action: InputAction) => pressedActions.has(action) },
    set: (actions) => {
      pressedActions = new Set(actions);
    },
  };
}

function makeStore(summaries: readonly SaveSummary[] = []): Pick<SaveStore, 'list'> {
  return { list: vi.fn().mockResolvedValue(summaries) };
}

const renderer = {} as Renderer;
const step: FrameStep = { dt: 0.016, now: 0, beat: null, beatPhase: 0 };

describe('SaveSelectScene', () => {
  it('initial selection is slot 0 after enter', async () => {
    const onEvent = vi.fn();
    const { input } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    scene.enter();
    await scene.refresh();

    expect(scene.selected).toBe(0);
  });

  it('navigates down past slot 0, 1, 2 and clamps at 2', () => {
    const onEvent = vi.fn();
    const { input, set } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    scene.enter();
    set(['down']);
    scene.update(step);
    expect(scene.selected).toBe(1);
    scene.update(step);
    expect(scene.selected).toBe(2);
    scene.update(step);
    expect(scene.selected).toBe(2);
  });

  it('navigates up and clamps at 0', () => {
    const onEvent = vi.fn();
    const { input, set } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    scene.enter();
    set(['down']);
    scene.update(step);
    scene.update(step);
    set(['up']);
    scene.update(step);
    expect(scene.selected).toBe(1);
    scene.update(step);
    expect(scene.selected).toBe(0);
    scene.update(step);
    expect(scene.selected).toBe(0);
  });

  it('emits confirm with selected slot index', () => {
    const onEvent = vi.fn();
    const { input, set } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    scene.enter();
    set(['down']);
    scene.update(step);
    set(['confirm']);
    scene.update(step);

    expect(onEvent).toHaveBeenCalledWith('confirm', 1);
  });

  it('emits cancel event', () => {
    const onEvent = vi.fn();
    const { input, set } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    scene.enter();
    set(['cancel']);
    scene.update(step);

    expect(onEvent).toHaveBeenCalledWith('cancel');
  });

  it('does not respond to input before entering', () => {
    const onEvent = vi.fn();
    const { input, set } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    set(['confirm', 'down']);
    scene.update(step);

    expect(onEvent).not.toHaveBeenCalled();
    expect(scene.selected).toBe(0);
  });

  it('does not respond after exit', () => {
    const onEvent = vi.fn();
    const { input, set } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    scene.enter();
    scene.exit();
    set(['confirm']);
    scene.update(step);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('renders header and three slots, defaults to NEW GAME labels when empty', async () => {
    const ctx = stubCtx();
    const onEvent = vi.fn();
    const { input } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    scene.enter();
    await scene.refresh();
    scene.render(ctx);

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, RENDER_W, RENDER_H);
    const drawn = ctx.fillText.mock.calls.map((c) => c[0] as string);
    expect(drawn).toContain('SELECT SAVE');
    expect(drawn.filter((s) => s.endsWith('NEW GAME')).length).toBe(3);
    expect(drawn.filter((s) => s === '>').length).toBe(1);
  });

  it('renders loaded summaries when present', async () => {
    const ctx = stubCtx();
    const onEvent = vi.fn();
    const { input } = makeInput();
    const store = makeStore([{ slot: 0, updatedAt: '2026-05-11T01:00:00.000Z' }]);
    const scene = new SaveSelectScene({ renderer, input, onEvent, store });

    scene.enter();
    await scene.refresh();
    scene.render(ctx);

    const drawn = ctx.fillText.mock.calls.map((c) => c[0] as string);
    expect(drawn.some((s) => s.includes('2026-05-11T01:00:00.000Z'))).toBe(true);
    expect(drawn.filter((s) => s.endsWith('NEW GAME')).length).toBe(2);
  });

  it('renders LOADING state when not yet refreshed', () => {
    const ctx = stubCtx();
    const onEvent = vi.fn();
    const { input } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    scene.render(ctx);

    const drawn = ctx.fillText.mock.calls.map((c) => c[0] as string);
    expect(drawn.filter((s) => s.endsWith('LOADING')).length).toBe(3);
  });

  it('handleInput is a no-op', () => {
    const onEvent = vi.fn();
    const { input } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    expect(() => {
      scene.handleInput(new Event('keydown'));
    }).not.toThrow();
  });

  it('exposes the renderer', () => {
    const onEvent = vi.fn();
    const { input } = makeInput();
    const scene = new SaveSelectScene({ renderer, input, onEvent, store: makeStore() });

    expect(scene.renderer).toBe(renderer);
  });
});
