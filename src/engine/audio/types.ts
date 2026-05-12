export type MusicClockEvent = 'bar' | 'beat' | 'phase';

export type MusicClockPositionGetter = (soundId: string) => number;

export type MusicClockListener<TPayload> = (payload: TPayload) => void;

export interface MusicClockEventPayload {
  beat: number;
  beatMs: number;
  bpm: number;
  phase: number;
  soundId: string;
  timeMs: number;
}

export interface MusicClockBarEventPayload extends MusicClockEventPayload {
  bar: number;
}

export interface MusicClockEventPayloads {
  bar: MusicClockBarEventPayload;
  beat: MusicClockEventPayload;
  phase: MusicClockEventPayload;
}

export interface MusicClockOptions {
  barBeats?: number;
  correctionIntervalMs?: number;
  now?: () => number;
}
