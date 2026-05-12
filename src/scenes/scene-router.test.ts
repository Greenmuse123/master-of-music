import { describe, expect, it } from 'vitest';

import { SceneRouter } from './scene-router';

describe('SceneRouter', () => {
  it('starts on the title scene', () => {
    const router = new SceneRouter();
    expect(router.current()).toBe('title');
  });

  it('routes title -> save-select -> overworld -> battle -> game-over -> title', () => {
    const router = new SceneRouter();
    expect(router.current()).toBe('title');
    router.transition('confirm');
    expect(router.current()).toBe('save-select');
    router.transition('confirm');
    expect(router.current()).toBe('overworld');
    router.transition('encounter');
    expect(router.current()).toBe('battle');
    router.transition('defeat');
    expect(router.current()).toBe('game-over');
    router.transition('confirm');
    expect(router.current()).toBe('title');
  });

  it('routes battle -> overworld on victory', () => {
    const router = new SceneRouter();
    router.transition('confirm');
    router.transition('confirm');
    router.transition('encounter');
    expect(router.current()).toBe('battle');
    router.transition('victory');
    expect(router.current()).toBe('overworld');
  });

  it('routes save-select -> title on cancel', () => {
    const router = new SceneRouter();
    router.transition('confirm');
    expect(router.current()).toBe('save-select');
    router.transition('cancel');
    expect(router.current()).toBe('title');
  });

  it('ignores unknown (scene, event) pairs (no-op)', () => {
    const router = new SceneRouter();
    router.transition('victory'); // invalid from title
    expect(router.current()).toBe('title');
    router.transition('encounter'); // invalid from title
    expect(router.current()).toBe('title');
  });

  it('notifies a subscriber on every transition', () => {
    const router = new SceneRouter();
    const events: Array<{ from: string; to: string; event: string }> = [];
    router.onChange((from, to, event) => {
      events.push({ from, to, event });
    });
    router.transition('confirm');
    router.transition('confirm');
    expect(events).toEqual([
      { from: 'title', to: 'save-select', event: 'confirm' },
      { from: 'save-select', to: 'overworld', event: 'confirm' },
    ]);
  });

  it('does not notify on a no-op transition', () => {
    const router = new SceneRouter();
    let calls = 0;
    router.onChange(() => {
      calls += 1;
    });
    router.transition('victory'); // invalid
    expect(calls).toBe(0);
  });
});
