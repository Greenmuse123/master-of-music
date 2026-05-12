import { describe, expect, it, vi } from 'vitest';

import { RENDER_H, RENDER_W } from '../config/constants';
import type { InputAction } from '../engine/input/actions';
import type { InputManager } from '../engine/input/input-manager';
import type { Renderer } from '../engine/render/renderer';
import type { FrameStep } from '../engine/scene/scene';
import { GameOverScene } from './game-over-scene';

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

function fakeInput(actions: Set<InputAction> = new Set()): Pick<InputManager, 'pressed'> {
  return { pressed: (a) => actions.has(a) };
}

const renderer = {} as Renderer;
const step: FrameStep = { dt: 0.016, now: 0, beat: null, beatPhase: 0 };

describe('GameOverScene', () => {
  it('renders title and prompt centered', () => {
    const ctx = stubCtx();
    const scene = new GameOverScene({ renderer, input: fakeInput(), onEvent: vi.fn() });

    scene.render(ctx);

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, RENDER_W, RENDER_H);
    const drawn = ctx.fillText.mock.calls.map((c) => c[0] as string);
    expect(drawn).toContain('GAME OVER');
    expect(drawn).toContain('Press Confirm to return to title');
    const centerX = Math.trunc(RENDER_W / 2);
    for (const call of ctx.fillText.mock.calls) {
      expect(call[1]).toBe(centerX);
      expect(Number.isInteger(call[2])).toBe(true);
    }
  });

  it('emits confirm when confirm pressed after enter', () => {
    const onEvent = vi.fn();
    const scene = new GameOverScene({
      renderer,
      input: fakeInput(new Set(['confirm'])),
      onEvent,
    });

    scene.enter();
    scene.update(step);

    expect(onEvent).toHaveBeenCalledWith('confirm');
  });

  it('does not emit confirm before enter', () => {
    const onEvent = vi.fn();
    const scene = new GameOverScene({
      renderer,
      input: fakeInput(new Set(['confirm'])),
      onEvent,
    });

    scene.update(step);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('does not emit when no confirm press', () => {
    const onEvent = vi.fn();
    const scene = new GameOverScene({
      renderer,
      input: fakeInput(),
      onEvent,
    });

    scene.enter();
    scene.update(step);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('does not emit after exit', () => {
    const onEvent = vi.fn();
    const scene = new GameOverScene({
      renderer,
      input: fakeInput(new Set(['confirm'])),
      onEvent,
    });

    scene.enter();
    scene.exit();
    scene.update(step);

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('handleInput is a no-op', () => {
    const scene = new GameOverScene({ renderer, input: fakeInput(), onEvent: vi.fn() });

    expect(() => {
      scene.handleInput(new Event('keydown'));
    }).not.toThrow();
  });

  it('exposes the renderer', () => {
    const scene = new GameOverScene({ renderer, input: fakeInput(), onEvent: vi.fn() });
    expect(scene.renderer).toBe(renderer);
  });
});
