import { beforeEach, describe, expect, it } from 'vitest';

import { AudioManager } from './audio-manager';
import type { HowlFactory, HowlInterface, HowlOptions } from './audio-manager';
import { SfxPool } from './sfx-pool';

class FakeHowl implements HowlInterface {
  public nextSoundId = 1;
  public playCalls = 0;
  public stopCalls: number[] = [];
  public volumeCalls: Array<{ volume: number; soundId: number | undefined }> = [];

  constructor(public readonly options: HowlOptions) {}

  play(): number {
    const id = this.nextSoundId;
    this.nextSoundId += 1;
    this.playCalls += 1;
    return id;
  }

  stop(soundId?: number): void {
    this.stopCalls.push(soundId ?? -1);
  }

  volume(volume: number, soundId?: number): void {
    this.volumeCalls.push({ volume, soundId });
  }

  seek(): number {
    return 0;
  }

  unload(): void {
    /* no-op */
  }

  state(): 'unloaded' | 'loading' | 'loaded' {
    return 'loaded';
  }
}

const factory: HowlFactory = (opts: HowlOptions): HowlInterface => new FakeHowl(opts);

async function createPool(maxConcurrent?: number): Promise<{
  manager: AudioManager;
  pool: SfxPool;
}> {
  const manager = new AudioManager({ howlFactory: factory });
  await manager.load('hit', { src: ['hit.ogg'] });
  await manager.load('miss', { src: ['miss.ogg'] });
  const pool = new SfxPool({
    manager,
    ids: ['hit', 'miss'],
    maxConcurrent,
  });
  return { manager, pool };
}

describe('SfxPool', () => {
  let manager: AudioManager;
  let pool: SfxPool;

  beforeEach(async () => {
    const created = await createPool();
    manager = created.manager;
    pool = created.pool;
  });

  it('queues plays up to capacity', () => {
    const a = pool.playOneShot('hit');
    const b = pool.playOneShot('hit');
    const c = pool.playOneShot('miss');
    const d = pool.playOneShot('hit');

    expect(typeof a).toBe('number');
    expect(typeof b).toBe('number');
    expect(typeof c).toBe('number');
    expect(typeof d).toBe('number');
    expect(pool.activeCount).toBe(4);
    expect(pool.capacity).toBe(4);
  });

  it('evicts the oldest handle when capacity is exceeded', () => {
    const oldest = pool.playOneShot('hit');
    pool.playOneShot('hit');
    pool.playOneShot('hit');
    pool.playOneShot('hit');

    // exceed cap — `oldest` should be stopped, new handle takes its slot
    const newHandle = pool.playOneShot('hit');

    expect(newHandle).not.toBe(oldest);
    expect(pool.activeCount).toBe(4);
  });

  it('exceeding maxConcurrent does not throw across a heavy burst', () => {
    expect(() => {
      for (let i = 0; i < 50; i += 1) {
        pool.playOneShot('hit');
      }
    }).not.toThrow();
    expect(pool.activeCount).toBe(4);
  });

  it('stop frees a slot', () => {
    const handle = pool.playOneShot('hit');
    pool.playOneShot('hit');
    expect(pool.activeCount).toBe(2);

    pool.stop(handle);
    expect(pool.activeCount).toBe(1);

    // Filling back up should remain capped.
    pool.playOneShot('hit');
    pool.playOneShot('hit');
    pool.playOneShot('hit');
    expect(pool.activeCount).toBe(4);
  });

  it('stop of an unknown handle is a silent no-op', () => {
    pool.playOneShot('hit');
    expect(() => pool.stop(9_999)).not.toThrow();
    expect(pool.activeCount).toBe(1);
  });

  it('rejects ids not declared in the constructor', () => {
    expect(() => pool.playOneShot('not-in-pool')).toThrow('not in this pool');
  });

  it('honors a custom maxConcurrent and capacity getter', async () => {
    const { pool: smallPool } = await createPool(2);

    smallPool.playOneShot('hit');
    smallPool.playOneShot('hit');
    smallPool.playOneShot('hit');

    expect(smallPool.capacity).toBe(2);
    expect(smallPool.activeCount).toBe(2);
  });

  it('routes to a non-default bus when supplied', () => {
    const handle = pool.playOneShot('miss', 'sfx-defense');
    expect(typeof handle).toBe('number');
    // Bus volume should match docs/08 §5 default (0.9) via AudioManager.
    expect(manager.getBusVolume('sfx-defense')).toBeCloseTo(0.9);
  });

  it('validates constructor inputs', () => {
    expect(
      () =>
        new SfxPool({
          manager: undefined as unknown as AudioManager,
          ids: ['hit'],
        }),
    ).toThrow('manager is required');

    expect(() => new SfxPool({ manager, ids: [] })).toThrow('non-empty array');

    expect(
      () =>
        new SfxPool({
          manager,
          ids: ['hit'],
          maxConcurrent: 0,
        }),
    ).toThrow('positive integer');

    expect(
      () =>
        new SfxPool({
          manager,
          ids: ['hit'],
          maxConcurrent: 1.5,
        }),
    ).toThrow('positive integer');
  });
});
