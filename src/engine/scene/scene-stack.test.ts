import { describe, expect, it, vi } from 'vitest';

import type { Scene } from './scene';
import { SceneStack } from './scene-stack';

type SceneFixture = {
  readonly scene: Scene;
  readonly enter: ReturnType<typeof vi.fn>;
  readonly exit: ReturnType<typeof vi.fn>;
};

function createScene(): SceneFixture {
  const enter = vi.fn();
  const exit = vi.fn();

  return {
    scene: {
      enter,
      exit,
      update: vi.fn(),
      render: vi.fn(),
      handleInput: vi.fn(),
    },
    enter,
    exit,
  };
}

describe('SceneStack', () => {
  it('pushes and pops scenes while calling lifecycle hooks', () => {
    const stack = new SceneStack();
    const first = createScene();
    const second = createScene();

    stack.push(first.scene);
    stack.push(second.scene);
    const removed = stack.pop();

    expect(stack.size).toBe(1);
    expect(stack.current()).toBe(first.scene);
    expect(removed).toBe(second.scene);
    expect(first.enter).toHaveBeenCalledWith(undefined);
    expect(second.enter).toHaveBeenCalledWith(first.scene);
    expect(second.exit).toHaveBeenCalledWith(first.scene);
  });
});
