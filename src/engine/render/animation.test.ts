import { describe, expect, it, vi } from 'vitest';

import { AnimationPlayer, type AnimationClip } from './animation';

const loopClip: AnimationClip = {
  frames: [
    { duration: 0.1, frame: 'a' },
    { duration: 0.1, frame: 'b' },
    { duration: 0.1, frame: 'c' },
  ],
  mode: 'loop',
};

describe('AnimationPlayer', () => {
  it('loops frames based on elapsed seconds', () => {
    const player = new AnimationPlayer(loopClip);

    expect(player.currentFrame).toBe('a');
    expect(player.tick(0.1)).toBe('b');
    expect(player.tick(0.25)).toBe('a');
    expect(player.frameIndex).toBe(0);
  });

  it('plays once and emits complete once', () => {
    const complete = vi.fn();
    const player = new AnimationPlayer(
      {
        ...loopClip,
        mode: 'once',
      },
      { onComplete: complete },
    );

    expect(player.tick(0.3)).toBe('c');
    expect(player.complete).toBe(false);
    expect(player.tick(0.1)).toBe('c');
    expect(player.complete).toBe(true);
    expect(player.tick(1)).toBe('c');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('ping-pongs over one and a half cycles', () => {
    const player = new AnimationPlayer({
      ...loopClip,
      mode: 'ping-pong',
    });
    const sequence = ['a'];

    for (let i = 0; i < 6; i += 1) {
      sequence.push(player.tick(0.1));
    }

    expect(sequence).toEqual(['a', 'b', 'c', 'b', 'a', 'b', 'c']);
  });

  it('resets playback state', () => {
    const player = new AnimationPlayer(loopClip);

    player.tick(0.2);
    player.reset();

    expect(player.complete).toBe(false);
    expect(player.currentFrame).toBe('a');
    expect(player.frameIndex).toBe(0);
  });

  it('validates clip and tick input', () => {
    expect(() => new AnimationPlayer({ frames: [], mode: 'loop' })).toThrow(
      'Animation clip must contain at least one frame.',
    );
    expect(
      () => new AnimationPlayer({ frames: [{ duration: 0, frame: 'bad' }], mode: 'loop' }),
    ).toThrow('Animation frame duration must be positive.');
    expect(() => new AnimationPlayer(loopClip).tick(-0.1)).toThrow(
      'Animation tick seconds must be non-negative.',
    );
  });

  it('completes a single-frame ping-pong clip', () => {
    const complete = vi.fn();
    const player = new AnimationPlayer(
      {
        frames: [{ duration: 0.1, frame: 'only' }],
        mode: 'ping-pong',
      },
      { onComplete: complete },
    );

    expect(player.tick(0)).toBe('only');
    expect(player.tick(0.1)).toBe('only');
    expect(player.complete).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
