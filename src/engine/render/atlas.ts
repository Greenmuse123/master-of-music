import { SpriteSheet, type SpriteFrame, type SpriteImage } from './sprite';

export interface AtlasFrame extends SpriteFrame {
  readonly duration?: number;
}

export interface AtlasData {
  readonly image: string;
  readonly frames: Record<string, AtlasFrame>;
}

export interface ParsedAtlas {
  readonly data: AtlasData;
  readonly durations: ReadonlyMap<string, number>;
  readonly sheet: SpriteSheet;
}

interface RawAtlasFrame {
  readonly duration?: unknown;
  readonly h?: unknown;
  readonly w?: unknown;
  readonly x?: unknown;
  readonly y?: unknown;
}

interface RawAtlas {
  readonly frames?: unknown;
  readonly image?: unknown;
}

export function parseAtlas(data: unknown, image: SpriteImage): ParsedAtlas {
  const raw = assertAtlas(data);
  const frames: Record<string, AtlasFrame> = {};
  const durations = new Map<string, number>();

  for (const [name, frame] of Object.entries(raw.frames)) {
    const parsedFrame = parseFrame(name, frame);
    frames[name] = parsedFrame;

    if (parsedFrame.duration !== undefined) {
      durations.set(name, parsedFrame.duration);
    }
  }

  return {
    data: {
      frames,
      image: raw.image,
    },
    durations,
    sheet: new SpriteSheet(image, frames),
  };
}

function assertAtlas(data: unknown): { frames: Record<string, RawAtlasFrame>; image: string } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Atlas data must be an object.');
  }

  const raw = data as RawAtlas;

  if (typeof raw.image !== 'string' || raw.image.length === 0) {
    throw new Error('Atlas image must be a non-empty string.');
  }

  if (typeof raw.frames !== 'object' || raw.frames === null || Array.isArray(raw.frames)) {
    throw new Error('Atlas frames must be an object.');
  }

  return {
    frames: raw.frames as Record<string, RawAtlasFrame>,
    image: raw.image,
  };
}

function parseFrame(name: string, frame: RawAtlasFrame): AtlasFrame {
  const x = readNumber(frame.x, `${name}.x`);
  const y = readNumber(frame.y, `${name}.y`);
  const w = readNumber(frame.w, `${name}.w`);
  const h = readNumber(frame.h, `${name}.h`);

  if (w <= 0 || h <= 0) {
    throw new Error(`Atlas frame ${name} must have positive dimensions.`);
  }

  if (frame.duration === undefined) {
    return { h, w, x, y };
  }

  const duration = readNumber(frame.duration, `${name}.duration`);

  if (duration <= 0) {
    throw new Error(`Atlas frame ${name} duration must be positive.`);
  }

  return { duration, h, w, x, y };
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Atlas frame ${field} must be a finite number.`);
  }

  return value;
}
