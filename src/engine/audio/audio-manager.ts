/**
 * AudioManager — the only module in the codebase that touches Howler.
 *
 * Per docs/08-AUDIO_DESIGN.md §1, every other consumer (battle scene,
 * overworld ambience, UI, MusicClock) must go through this facade.
 *
 * MusicClock is wired up via {@link AudioManager.makeMusicClockGetter},
 * which returns a position-getter the clock can poll without ever holding
 * a direct reference to Howler.
 */

export type Bus = 'music' | 'sfx-attack' | 'sfx-defense' | 'sfx-world' | 'ui' | 'voice';

export interface HowlOptions {
  src: string[];
  volume?: number;
  loop?: boolean;
  preload?: boolean;
  onload?: () => void;
  onloaderror?: (id: number, error: unknown) => void;
}

/**
 * Narrow subset of Howler's `Howl` surface we depend on. Implementations
 * in tests provide a fake; production wraps the real Howler.
 */
export interface HowlInterface {
  play(): number;
  stop(soundId?: number): void;
  volume(volume: number, soundId?: number): void;
  seek(soundId?: number): number;
  unload(): void;
  state(): 'unloaded' | 'loading' | 'loaded';
  /** Optional listener registration; only used to await load. */
  once?(event: 'load', cb: () => void): void;
  once?(event: 'loaderror', cb: (id: number, error: unknown) => void): void;
}

export type HowlFactory = (opts: HowlOptions) => HowlInterface;

export interface AudioManagerOptions {
  howlFactory?: HowlFactory;
}

/**
 * Per-bus default volumes from docs/08-AUDIO_DESIGN.md §5 (table).
 *
 * `music: 70%`, `ui: 80%`, `sfx-attack: 100%`, `sfx-defense: 90%`,
 * `sfx-world: 70%`, `voice: 90%`.
 */
const DEFAULT_BUS_VOLUMES: Readonly<Record<Bus, number>> = Object.freeze({
  music: 0.7,
  'sfx-attack': 1.0,
  'sfx-defense': 0.9,
  'sfx-world': 0.7,
  ui: 0.8,
  voice: 0.9,
});

interface LoadedSound {
  howl: HowlInterface;
  /** Last bus the sound was played on, used by makeMusicClockGetter. */
  lastBus: Bus;
  /** Map of soundIds (returned by play) → bus, for stop()/seek() routing. */
  activeIds: Map<number, Bus>;
}

const ALL_BUSES: readonly Bus[] = [
  'music',
  'sfx-attack',
  'sfx-defense',
  'sfx-world',
  'ui',
  'voice',
];

function defaultHowlFactory(opts: HowlOptions): HowlInterface {
  // Lazy-loaded so tests that always inject a fake never touch real Howler.
  // The dynamic import keeps this side-effect-free at module load.
  throw new Error(
    'AudioManager: no howlFactory provided. ' +
      'Pass one explicitly or call setRealHowlerFactory() from production bootstrap. ' +
      `(load attempted with src=${JSON.stringify(opts.src)})`,
  );
}

export class AudioManager {
  private readonly howlFactory: HowlFactory;
  private readonly sounds = new Map<string, LoadedSound>();
  private readonly busVolumes: Record<Bus, number>;

  constructor(options: AudioManagerOptions = {}) {
    this.howlFactory = options.howlFactory ?? defaultHowlFactory;
    this.busVolumes = { ...DEFAULT_BUS_VOLUMES };
  }

  /**
   * Load a sound by id. Resolves once Howler reports `load`; rejects on
   * `loaderror`. If the factory's `Howl` does not expose `once`, we
   * resolve eagerly (test fakes typically do this).
   */
  async load(id: string, opts: { src: string[] }): Promise<void> {
    if (!id) {
      throw new Error('AudioManager.load: id is required.');
    }
    if (this.sounds.has(id)) {
      return;
    }

    const howl = this.howlFactory({ src: opts.src, preload: true });
    const loaded: LoadedSound = {
      howl,
      lastBus: 'music',
      activeIds: new Map(),
    };
    this.sounds.set(id, loaded);

    if (typeof howl.once !== 'function' || howl.state() === 'loaded') {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const subscribe = howl.once?.bind(howl);
      if (!subscribe) {
        resolve();
        return;
      }
      subscribe('load', () => {
        resolve();
      });
      subscribe('loaderror', (_soundId: number, error: unknown) => {
        this.sounds.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  /**
   * Play a previously loaded sound on the given bus (default `music`).
   * Returns Howler's per-sound numeric handle, suitable for `stop()`.
   */
  play(id: string, bus: Bus = 'music'): number {
    const loaded = this.requireSound(id, 'play');
    const soundId = loaded.howl.play();
    loaded.howl.volume(this.busVolumes[bus], soundId);
    loaded.lastBus = bus;
    loaded.activeIds.set(soundId, bus);
    return soundId;
  }

  /**
   * Stop a single playing sound by its Howler handle. Silently no-ops if
   * the handle is unknown — callers may stop the same handle twice.
   */
  stop(soundId: number): void {
    for (const loaded of this.sounds.values()) {
      if (loaded.activeIds.has(soundId)) {
        loaded.howl.stop(soundId);
        loaded.activeIds.delete(soundId);
        return;
      }
    }
  }

  /**
   * Set a bus's volume in [0, 1]. Out-of-range values are clamped, not
   * rejected — bind targets (UI sliders) frequently overshoot.
   *
   * Also re-applies the new bus volume to every currently active sound on
   * the bus, so a slider drag updates audio in real time.
   */
  setBusVolume(bus: Bus, v01: number): void {
    if (!Number.isFinite(v01)) {
      throw new Error(`AudioManager.setBusVolume: ${bus} volume must be finite.`);
    }
    const clamped = Math.min(1, Math.max(0, v01));
    this.busVolumes[bus] = clamped;

    for (const loaded of this.sounds.values()) {
      for (const [soundId, soundBus] of loaded.activeIds) {
        if (soundBus === bus) {
          loaded.howl.volume(clamped, soundId);
        }
      }
    }
  }

  getBusVolume(bus: Bus): number {
    return this.busVolumes[bus];
  }

  /**
   * Unload every loaded sound and reset bus volumes to defaults. Use on
   * scene transitions that should drop their audio working-set.
   */
  unloadAll(): void {
    for (const loaded of this.sounds.values()) {
      loaded.howl.unload();
    }
    this.sounds.clear();
    for (const bus of ALL_BUSES) {
      this.busVolumes[bus] = DEFAULT_BUS_VOLUMES[bus];
    }
  }

  /**
   * Return a position-getter MusicClock can poll. Per docs/08 §1 and
   * PHASE-1-rubrics.md §5, this is the only wiring point between
   * MusicClock and Howler. Returns the current seek position in
   * milliseconds; falls back to 0 if the sound is missing or unloaded.
   */
  makeMusicClockGetter(soundId: number): () => number {
    return (): number => {
      for (const loaded of this.sounds.values()) {
        if (loaded.activeIds.has(soundId)) {
          const seekSec = loaded.howl.seek(soundId);
          return Number.isFinite(seekSec) ? seekSec * 1000 : 0;
        }
      }
      return 0;
    };
  }

  private requireSound(id: string, op: string): LoadedSound {
    const loaded = this.sounds.get(id);
    if (!loaded) {
      throw new Error(`AudioManager.${op}: sound "${id}" is not loaded.`);
    }
    return loaded;
  }
}
