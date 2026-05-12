import type {
  MusicClockEvent,
  MusicClockEventPayload,
  MusicClockEventPayloads,
  MusicClockListener,
  MusicClockOptions,
  MusicClockPositionGetter,
} from './types';

const DEFAULT_BAR_BEATS = 4;
const DEFAULT_CORRECTION_INTERVAL_MS = 250;

export class MusicClock {
  private readonly barBeats: number;
  private readonly correctionIntervalMs: number;
  private readonly listeners: {
    [TEvent in MusicClockEvent]: Set<MusicClockListener<MusicClockEventPayloads[TEvent]>>;
  } = {
    bar: new Set(),
    beat: new Set(),
    phase: new Set(),
  };
  private readonly now: () => number;
  private readonly positionGetter: MusicClockPositionGetter;
  private anchorSeekMs = 0;
  private anchorTimeMs = 0;
  private beatMs = 500;
  private bpm = 120;
  private lastBeat = 0;
  private lastCorrectionTimeMs = 0;
  private lastEmittedBeat = 0;
  private soundId = '';
  private spriteStartMs = 0;
  private started = false;
  private syncing = false;

  constructor(positionGetter: MusicClockPositionGetter = () => 0, options: MusicClockOptions = {}) {
    this.positionGetter = positionGetter;
    this.now = options.now ?? (() => performance.now());
    this.barBeats = this.requirePositiveInteger(options.barBeats ?? DEFAULT_BAR_BEATS, 'barBeats');
    this.correctionIntervalMs = this.requirePositiveNumber(
      options.correctionIntervalMs ?? DEFAULT_CORRECTION_INTERVAL_MS,
      'correctionIntervalMs',
    );
  }

  start(soundId: string, bpm: number, anchorMs = this.positionGetter(soundId)): void {
    this.requirePositiveNumber(bpm, 'bpm');
    this.requireFiniteNumber(anchorMs, 'anchorMs');

    const nowMs = this.now();
    this.anchorSeekMs = anchorMs;
    this.anchorTimeMs = nowMs;
    this.beatMs = this.msPerBeat(bpm);
    this.bpm = bpm;
    this.lastBeat = 0;
    this.lastCorrectionTimeMs = nowMs;
    this.lastEmittedBeat = 0;
    this.soundId = soundId;
    this.spriteStartMs = anchorMs;
    this.started = true;
  }

  beat(): number {
    return this.currentSnapshot().beat;
  }

  beatPhase(): number {
    return this.currentSnapshot().phase;
  }

  msUntilBeat(target: number): number {
    this.requireFiniteNumber(target, 'target');

    const snapshot = this.currentSnapshot();
    return Math.max(0, (target - snapshot.fractionalBeat) * this.beatMs);
  }

  on<TEvent extends MusicClockEvent>(
    event: TEvent,
    cb: MusicClockListener<MusicClockEventPayloads[TEvent]>,
  ): () => void {
    this.listeners[event].add(cb);

    return () => {
      this.listeners[event].delete(cb);
    };
  }

  reanchor(seekMs: number, bpm: number): void {
    this.requireFiniteNumber(seekMs, 'seekMs');
    this.requirePositiveNumber(bpm, 'bpm');

    if (!this.started) {
      return;
    }

    const nowMs = this.now();
    const nextBeatMs = this.msPerBeat(bpm);
    const currentBeat = this.snapshot(false).beat;
    const externalBeat = Math.floor((seekMs - this.spriteStartMs) / nextBeatMs);
    const clampedBeat = Math.max(currentBeat, externalBeat, 0);

    this.bpm = bpm;
    this.beatMs = nextBeatMs;
    this.anchorTimeMs = nowMs;
    this.anchorSeekMs =
      externalBeat >= currentBeat ? seekMs : this.spriteStartMs + clampedBeat * nextBeatMs;
    this.lastBeat = clampedBeat;
    this.lastCorrectionTimeMs = nowMs;
    this.emitFromSnapshot(this.snapshot(false));
  }

  stop(): void {
    this.started = false;
  }

  private currentSnapshot(): InternalSnapshot {
    this.correctFromPositionGetter();
    const snapshot = this.snapshot(true);
    this.emitFromSnapshot(snapshot);
    return snapshot;
  }

  private correctFromPositionGetter(): void {
    if (!this.started || this.syncing) {
      return;
    }

    const nowMs = this.now();
    if (nowMs - this.lastCorrectionTimeMs < this.correctionIntervalMs) {
      return;
    }

    this.syncing = true;
    this.reanchor(this.positionGetter(this.soundId), this.bpm);
    this.syncing = false;
  }

  private snapshot(clampToLastBeat: boolean): InternalSnapshot {
    if (!this.started) {
      return {
        beat: this.lastBeat,
        beatMs: this.beatMs,
        bpm: this.bpm,
        fractionalBeat: this.lastBeat,
        phase: 0,
        soundId: this.soundId,
        timeMs: this.now(),
      };
    }

    const nowMs = this.now();
    const projectedSeekMs = this.anchorSeekMs + Math.max(0, nowMs - this.anchorTimeMs);
    const rawFractionalBeat = Math.max(0, (projectedSeekMs - this.spriteStartMs) / this.beatMs);
    const rawBeat = Math.floor(rawFractionalBeat);
    const beat = clampToLastBeat ? Math.max(this.lastBeat, rawBeat) : rawBeat;
    const fractionalBeat = Math.max(beat, rawFractionalBeat);
    const phase = fractionalBeat - Math.floor(fractionalBeat);

    if (clampToLastBeat) {
      this.lastBeat = beat;
    }

    return {
      beat,
      beatMs: this.beatMs,
      bpm: this.bpm,
      fractionalBeat,
      phase,
      soundId: this.soundId,
      timeMs: nowMs,
    };
  }

  private emitFromSnapshot(snapshot: InternalSnapshot): void {
    this.emit('phase', this.toPayload(snapshot));

    for (let beat = this.lastEmittedBeat + 1; beat <= snapshot.beat; beat += 1) {
      const payload = this.toPayload({ ...snapshot, beat, phase: 0 });
      this.emit('beat', payload);

      if (beat % this.barBeats === 0) {
        this.emit('bar', { ...payload, bar: beat / this.barBeats });
      }
    }

    this.lastEmittedBeat = Math.max(this.lastEmittedBeat, snapshot.beat);
  }

  private emit<TEvent extends MusicClockEvent>(
    event: TEvent,
    payload: MusicClockEventPayloads[TEvent],
  ): void {
    for (const listener of this.listeners[event]) {
      listener(payload);
    }
  }

  private msPerBeat(bpm: number): number {
    return 60_000 / bpm;
  }

  private requireFiniteNumber(value: number, name: string): void {
    if (!Number.isFinite(value)) {
      throw new Error(`MusicClock ${name} must be finite.`);
    }
  }

  private requirePositiveNumber(value: number, name: string): number {
    this.requireFiniteNumber(value, name);

    if (value <= 0) {
      throw new Error(`MusicClock ${name} must be positive.`);
    }

    return value;
  }

  private requirePositiveInteger(value: number, name: string): number {
    this.requirePositiveNumber(value, name);

    if (!Number.isInteger(value)) {
      throw new Error(`MusicClock ${name} must be an integer.`);
    }

    return value;
  }

  private toPayload(snapshot: InternalSnapshot): MusicClockEventPayload {
    return {
      beat: snapshot.beat,
      beatMs: snapshot.beatMs,
      bpm: snapshot.bpm,
      phase: snapshot.phase,
      soundId: snapshot.soundId,
      timeMs: snapshot.timeMs,
    };
  }
}

interface InternalSnapshot extends MusicClockEventPayload {
  fractionalBeat: number;
}
