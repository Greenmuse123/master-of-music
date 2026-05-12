/**
 * SfxPool — bounded one-shot SFX dispatcher on top of {@link AudioManager}.
 *
 * Combat code can spam `playOneShot('hit')` without blowing Web Audio's
 * voice count. When the active set hits `maxConcurrent`, the oldest
 * playing handle is stopped and replaced (LRU eviction).
 *
 * Per docs/08-AUDIO_DESIGN.md §5, the attack/defense buses tolerate
 * heavy retriggering during combat; the pool keeps that bounded.
 */

import type { AudioManager, Bus } from './audio-manager';

export interface SfxPoolOptions {
  manager: AudioManager;
  /** Sound ids the pool is allowed to play. Must be pre-loaded on the manager. */
  ids: string[];
  /** Default 4 — enough for a dense attack loop without starving voice/UI. */
  maxConcurrent?: number;
  /** Default bus for one-shots; per docs/08 §5 SFX defaults to sfx-attack. */
  defaultBus?: Bus;
}

interface ActiveHandle {
  soundId: number;
  id: string;
}

export class SfxPool {
  private readonly manager: AudioManager;
  private readonly allowedIds: ReadonlySet<string>;
  private readonly maxConcurrent: number;
  private readonly defaultBus: Bus;
  /** FIFO queue of active handles; head is the oldest playing voice. */
  private readonly active: ActiveHandle[] = [];

  constructor(options: SfxPoolOptions) {
    if (!options.manager) {
      throw new Error('SfxPool: manager is required.');
    }
    if (!Array.isArray(options.ids) || options.ids.length === 0) {
      throw new Error('SfxPool: ids must be a non-empty array.');
    }
    const max = options.maxConcurrent ?? 4;
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error('SfxPool: maxConcurrent must be a positive integer.');
    }

    this.manager = options.manager;
    this.allowedIds = new Set(options.ids);
    this.maxConcurrent = max;
    this.defaultBus = options.defaultBus ?? 'sfx-attack';
  }

  /**
   * Play a one-shot. If the pool is full, evict the oldest active handle
   * (LRU). The returned handle matches `AudioManager.play`'s return value
   * so callers can pass it to `stop()` directly.
   *
   * @throws if `id` was not declared in the constructor's `ids` list.
   */
  playOneShot(id: string, bus: Bus = this.defaultBus): number {
    if (!this.allowedIds.has(id)) {
      throw new Error(`SfxPool.playOneShot: "${id}" is not in this pool.`);
    }

    if (this.active.length >= this.maxConcurrent) {
      const oldest = this.active.shift();
      if (oldest) {
        this.manager.stop(oldest.soundId);
      }
    }

    const soundId = this.manager.play(id, bus);
    this.active.push({ soundId, id });
    return soundId;
  }

  /**
   * Explicitly stop a handle and free its slot in the pool. Calling
   * with an unknown handle is a no-op so callers can stop the same
   * handle from multiple places without bookkeeping.
   */
  stop(soundId: number): void {
    const index = this.active.findIndex((h) => h.soundId === soundId);
    if (index === -1) {
      return;
    }
    this.active.splice(index, 1);
    this.manager.stop(soundId);
  }

  /** Current count of active voices — exposed for tests and metrics. */
  get activeCount(): number {
    return this.active.length;
  }

  /** Configured concurrency cap — exposed for tests and HUD overlays. */
  get capacity(): number {
    return this.maxConcurrent;
  }
}
