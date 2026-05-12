import { describe, expect, it } from 'vitest';

import { AudioManager } from './audio-manager';
import type { HowlFactory, HowlInterface, HowlOptions } from './audio-manager';

interface FakeHowlRecord {
  options: HowlOptions;
  howl: FakeHowl;
}

class FakeHowl implements HowlInterface {
  public readonly options: HowlOptions;
  public unloaded = false;
  public nextSoundId = 1;
  public playCalls: number[] = [];
  public stopCalls: number[] = [];
  public volumeCalls: Array<{ volume: number; soundId: number | undefined }> = [];
  public seekStub = 1.25;
  private currentState: 'unloaded' | 'loading' | 'loaded';
  private loadListener: (() => void) | null = null;
  private errorListener: ((id: number, error: unknown) => void) | null = null;

  constructor(options: HowlOptions, initialState: 'unloaded' | 'loading' | 'loaded' = 'loaded') {
    this.options = options;
    this.currentState = initialState;
  }

  play(): number {
    const id = this.nextSoundId;
    this.nextSoundId += 1;
    this.playCalls.push(id);
    return id;
  }

  stop(soundId?: number): void {
    this.stopCalls.push(soundId ?? -1);
  }

  volume(volume: number, soundId?: number): void {
    this.volumeCalls.push({ volume, soundId });
  }

  seek(_soundId?: number): number {
    return this.seekStub;
  }

  unload(): void {
    this.unloaded = true;
  }

  state(): 'unloaded' | 'loading' | 'loaded' {
    return this.currentState;
  }

  once(event: 'load' | 'loaderror', cb: ((id: number, error: unknown) => void) | (() => void)): void {
    if (event === 'load') {
      this.loadListener = cb as () => void;
    } else {
      this.errorListener = cb as (id: number, error: unknown) => void;
    }
  }

  fireLoad(): void {
    this.currentState = 'loaded';
    this.loadListener?.();
  }

  fireLoadError(error: unknown): void {
    this.errorListener?.(0, error);
  }
}

function createFakeFactory(initialState: 'unloaded' | 'loading' | 'loaded' = 'loaded'): {
  factory: HowlFactory;
  created: FakeHowlRecord[];
} {
  const created: FakeHowlRecord[] = [];
  const factory: HowlFactory = (options: HowlOptions): HowlInterface => {
    const howl = new FakeHowl(options, initialState);
    created.push({ options, howl });
    return howl;
  };
  return { factory, created };
}

describe('AudioManager', () => {
  it('loads a sound that reports state=loaded synchronously', async () => {
    const { factory, created } = createFakeFactory('loaded');
    const manager = new AudioManager({ howlFactory: factory });

    await manager.load('loop', { src: ['loop.ogg'] });

    expect(created).toHaveLength(1);
    expect(created[0]?.options.src).toEqual(['loop.ogg']);
  });

  it('waits for the load event when the howl starts unloaded', async () => {
    const { factory, created } = createFakeFactory('unloaded');
    const manager = new AudioManager({ howlFactory: factory });

    const promise = manager.load('loop', { src: ['loop.ogg'] });
    created[0]?.howl.fireLoad();
    await promise;

    expect(created[0]?.howl.state()).toBe('loaded');
  });

  it('rejects with a meaningful error on loaderror', async () => {
    const { factory, created } = createFakeFactory('unloaded');
    const manager = new AudioManager({ howlFactory: factory });

    const promise = manager.load('loop', { src: ['loop.ogg'] });
    created[0]?.howl.fireLoadError('decode failed');

    await expect(promise).rejects.toThrow('decode failed');
  });

  it('rejects an empty id', async () => {
    const { factory } = createFakeFactory();
    const manager = new AudioManager({ howlFactory: factory });

    await expect(manager.load('', { src: ['x.ogg'] })).rejects.toThrow('id is required');
  });

  it('is idempotent on repeat load of the same id', async () => {
    const { factory, created } = createFakeFactory('loaded');
    const manager = new AudioManager({ howlFactory: factory });

    await manager.load('loop', { src: ['loop.ogg'] });
    await manager.load('loop', { src: ['loop.ogg'] });

    expect(created).toHaveLength(1);
  });

  it('play returns a numeric handle and applies the bus default volume', async () => {
    const { factory, created } = createFakeFactory('loaded');
    const manager = new AudioManager({ howlFactory: factory });

    await manager.load('cursor', { src: ['cursor.ogg'] });
    const handle = manager.play('cursor', 'ui');

    expect(typeof handle).toBe('number');
    const howl = created[0]?.howl;
    expect(howl?.playCalls).toEqual([handle]);
    expect(howl?.volumeCalls).toEqual([{ volume: 0.8, soundId: handle }]);
  });

  it('defaults play to the music bus when bus omitted', async () => {
    const { factory, created } = createFakeFactory('loaded');
    const manager = new AudioManager({ howlFactory: factory });

    await manager.load('theme', { src: ['theme.ogg'] });
    manager.play('theme');

    expect(created[0]?.howl.volumeCalls[0]?.volume).toBeCloseTo(0.7);
  });

  it('throws when playing an unloaded id', () => {
    const { factory } = createFakeFactory();
    const manager = new AudioManager({ howlFactory: factory });

    expect(() => manager.play('missing')).toThrow('"missing" is not loaded');
  });

  it('setBusVolume clamps below 0 and above 1', () => {
    const { factory } = createFakeFactory();
    const manager = new AudioManager({ howlFactory: factory });

    manager.setBusVolume('music', -5);
    expect(manager.getBusVolume('music')).toBe(0);

    manager.setBusVolume('music', 3);
    expect(manager.getBusVolume('music')).toBe(1);

    manager.setBusVolume('music', 0.42);
    expect(manager.getBusVolume('music')).toBeCloseTo(0.42);
  });

  it('setBusVolume rejects NaN', () => {
    const { factory } = createFakeFactory();
    const manager = new AudioManager({ howlFactory: factory });

    expect(() => manager.setBusVolume('music', Number.NaN)).toThrow('must be finite');
  });

  it('setBusVolume retunes active sounds on the same bus only', async () => {
    const { factory, created } = createFakeFactory('loaded');
    const manager = new AudioManager({ howlFactory: factory });

    await manager.load('music', { src: ['m.ogg'] });
    await manager.load('cursor', { src: ['c.ogg'] });

    const musicHandle = manager.play('music', 'music');
    const uiHandle = manager.play('cursor', 'ui');

    manager.setBusVolume('music', 0.25);

    const musicHowl = created[0]?.howl;
    const cursorHowl = created[1]?.howl;
    const retunedMusic = musicHowl?.volumeCalls.find(
      (call) => call.soundId === musicHandle && call.volume === 0.25,
    );
    const retunedCursor = cursorHowl?.volumeCalls.find(
      (call) => call.soundId === uiHandle && call.volume === 0.25,
    );

    expect(retunedMusic).toBeDefined();
    expect(retunedCursor).toBeUndefined();
  });

  it('stop routes by sound handle and is idempotent for unknown handles', async () => {
    const { factory, created } = createFakeFactory('loaded');
    const manager = new AudioManager({ howlFactory: factory });

    await manager.load('hit', { src: ['hit.ogg'] });
    const handle = manager.play('hit', 'sfx-attack');

    manager.stop(handle);
    manager.stop(handle); // second stop must not throw
    manager.stop(9999); // unknown handle must not throw

    expect(created[0]?.howl.stopCalls).toEqual([handle]);
  });

  it('unloadAll clears state and resets bus volumes', async () => {
    const { factory, created } = createFakeFactory('loaded');
    const manager = new AudioManager({ howlFactory: factory });

    await manager.load('one', { src: ['1.ogg'] });
    await manager.load('two', { src: ['2.ogg'] });
    manager.setBusVolume('music', 0.1);

    manager.unloadAll();

    expect(created[0]?.howl.unloaded).toBe(true);
    expect(created[1]?.howl.unloaded).toBe(true);
    expect(manager.getBusVolume('music')).toBeCloseTo(0.7);
    expect(() => manager.play('one')).toThrow('not loaded');
  });

  it('default factory throws if used (no real Howler in tests)', async () => {
    const manager = new AudioManager();
    await expect(manager.load('boom', { src: ['boom.ogg'] })).rejects.toThrow(
      'no howlFactory provided',
    );
  });

  it('makeMusicClockGetter returns seek position in ms while active', async () => {
    const { factory, created } = createFakeFactory('loaded');
    const manager = new AudioManager({ howlFactory: factory });

    await manager.load('theme', { src: ['theme.ogg'] });
    const handle = manager.play('theme', 'music');

    const howl = created[0]?.howl;
    if (howl) {
      howl.seekStub = 2.5; // seconds
    }

    const getter = manager.makeMusicClockGetter(handle);
    expect(getter()).toBe(2_500);

    manager.stop(handle);
    expect(getter()).toBe(0);
  });

  it('makeMusicClockGetter coerces non-finite seek values to 0', async () => {
    const { factory, created } = createFakeFactory('loaded');
    const manager = new AudioManager({ howlFactory: factory });

    await manager.load('theme', { src: ['theme.ogg'] });
    const handle = manager.play('theme', 'music');

    const howl = created[0]?.howl;
    if (howl) {
      howl.seekStub = Number.NaN;
    }

    expect(manager.makeMusicClockGetter(handle)()).toBe(0);
  });

  it('returns 0 from getter for an unknown handle', () => {
    const { factory } = createFakeFactory();
    const manager = new AudioManager({ howlFactory: factory });

    expect(manager.makeMusicClockGetter(42)()).toBe(0);
  });

  it('reports the docs/08 §5 default bus volumes', () => {
    const { factory } = createFakeFactory();
    const manager = new AudioManager({ howlFactory: factory });

    expect(manager.getBusVolume('music')).toBeCloseTo(0.7);
    expect(manager.getBusVolume('sfx-attack')).toBeCloseTo(1.0);
    expect(manager.getBusVolume('sfx-defense')).toBeCloseTo(0.9);
    expect(manager.getBusVolume('sfx-world')).toBeCloseTo(0.7);
    expect(manager.getBusVolume('ui')).toBeCloseTo(0.8);
    expect(manager.getBusVolume('voice')).toBeCloseTo(0.9);
  });
});
