import { describe, expect, it, vi } from 'vitest';

import { RENDER_H, RENDER_W } from '../config/constants';
import type { InputAction } from '../engine/input/actions';
import type { InputManager } from '../engine/input/input-manager';
import type { Renderer } from '../engine/render/renderer';
import type { FrameStep } from '../engine/scene/scene';
import { TitleScene } from './title-scene';

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

function fakeInput(pressedActions: Set<InputAction> = new Set()): Pick<InputManager, 'pressed'> {
  return {
    pressed: (action: InputAction) => pressedActions.has(action),
  };
}

function step(now = 0): FrameStep {
  return { dt: 0.016, now, beat: null, beatPhase: 0 };
}

describe('TitleScene', () => {
  it('marks entered on enter, clears on exit', () => {
    const scene = new TitleScene();
    expect(scene.entered).toBe(false);
    scene.enter();
    expect(scene.entered).toBe(true);
    scene.exit();
    expect(scene.entered).toBe(false);
  });

  it('renders title and prompt text centered', () => {
    const ctx = stubCtx();
    const scene = new TitleScene();

    scene.render(ctx);

    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, RENDER_W, RENDER_H);
    const drawnStrings = ctx.fillText.mock.calls.map((c) => c[0] as string);
    expect(drawnStrings).toContain('MASTER OF MUSIC');
    expect(drawnStrings).toContain('Press Confirm to start');
    const centerX = Math.trunc(RENDER_W / 2);
    for (const call of ctx.fillText.mock.calls) {
      expect(call[1]).toBe(centerX);
      expect(Number.isInteger(call[2])).toBe(true);
    }
  });

  it('emits confirm event when confirm pressed', () => {
    const onEvent = vi.fn();
    const pressed = new Set<InputAction>(['confirm']);
    const scene = new TitleScene({ input: fakeInput(pressed), onEvent });

    scene.enter();
    scene.update(step());

    expect(onEvent).toHaveBeenCalledWith('confirm');
  });

  it('does not emit confirm before entering', () => {
    const onEvent = vi.fn();
    const scene = new TitleScene({ input: fakeInput(new Set(['confirm'])), onEvent });

    scene.update(step());

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('does not emit confirm when no confirm press', () => {
    const onEvent = vi.fn();
    const scene = new TitleScene({ input: fakeInput(), onEvent });

    scene.enter();
    scene.update(step());

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('handleInput is a no-op', () => {
    const scene = new TitleScene();
    expect(() => {
      scene.handleInput(new Event('keydown'));
    }).not.toThrow();
  });

  it('update is a no-op without input wired', () => {
    const scene = new TitleScene();
    scene.enter();
    expect(() => {
      scene.update(step());
    }).not.toThrow();
  });

  it('exposes the renderer when provided', () => {
    const renderer = { dummy: true } as unknown as Renderer;
    const scene = new TitleScene({ renderer });
    expect(scene.renderer).toBe(renderer);
  });
});
