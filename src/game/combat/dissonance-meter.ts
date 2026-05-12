import type { RhythmQuality } from './types';

export interface DissonanceMeterOptions {
  readonly max?: number;
  readonly stutterDurationRounds?: number;
}

const DEFAULT_MAX = 100;
const DEFAULT_STUTTER_DURATION_ROUNDS = 1;

const DISSONANCE_BY_QUALITY: Readonly<Record<RhythmQuality, number>> = {
  critical: -10,
  perfect: -5,
  good: 0,
  off: 10,
  miss: 20,
};

/**
 * Stateful dissonance meter per docs/04-COMBAT_SYSTEM.md section 3.4.
 *
 * Max dissonance marks the holder as stuttered/out-of-key for a fixed number
 * of rounds, allowing the opponent to enter its vulnerable phase.
 */
export class DissonanceMeter {
  readonly #max: number;
  readonly #stutterDurationRounds: number;
  #current = 0;
  #stutterRoundsRemaining = 0;

  constructor(options: DissonanceMeterOptions = {}) {
    this.#max = options.max ?? DEFAULT_MAX;
    this.#stutterDurationRounds =
      options.stutterDurationRounds ?? DEFAULT_STUTTER_DURATION_ROUNDS;
  }

  addFromQuality(quality: RhythmQuality): void {
    if (this.isStuttered()) {
      return;
    }

    this.#current = Math.min(
      this.#max,
      Math.max(0, this.#current + DISSONANCE_BY_QUALITY[quality]),
    );

    if (this.#current >= this.#max) {
      this.#stutterRoundsRemaining = this.#stutterDurationRounds;
    }
  }

  current(): number {
    return this.#current;
  }

  normalized(): number {
    return this.#current / this.#max;
  }

  isStuttered(): boolean {
    return this.#stutterRoundsRemaining > 0;
  }

  tickRound(): void {
    if (!this.isStuttered()) {
      return;
    }

    this.#stutterRoundsRemaining -= 1;

    if (this.#stutterRoundsRemaining <= 0) {
      this.reset();
      return;
    }

    this.#current = Math.max(
      0,
      this.#current - this.#max / this.#stutterDurationRounds,
    );
  }

  reset(): void {
    this.#current = 0;
    this.#stutterRoundsRemaining = 0;
  }
}
