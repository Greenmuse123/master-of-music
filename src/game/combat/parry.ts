const FOCUS_MAX = 100;
const FOCUS_WINDOW_DIVISOR = 200;

type ParryQuality = 'critical' | 'perfect' | 'good' | 'miss';

export interface ParryResult {
  readonly quality: ParryQuality;
  readonly incomingDamageMul: number;
  readonly stoleCue: boolean;
  readonly deltaMs: number;
}

const BANDS: readonly {
  readonly quality: Exclude<ParryQuality, 'miss'>;
  readonly baseMs: number;
  readonly incomingDamageMul: number;
  readonly stoleCue: boolean;
}[] = [
  { quality: 'critical', baseMs: 30, incomingDamageMul: 0, stoleCue: true },
  { quality: 'perfect', baseMs: 80, incomingDamageMul: 0.3, stoleCue: false },
  { quality: 'good', baseMs: 160, incomingDamageMul: 0.6, stoleCue: false },
];

const MISS_RESULT = {
  quality: 'miss',
  incomingDamageMul: 1,
  stoleCue: false,
} as const;

/**
 * Evaluate a defensive parry cue using docs/04-COMBAT_SYSTEM.md section 3.6.
 *
 * @param nowMs       Time of the defender's parry input, in ms.
 * @param attackCueMs Incoming attack cue time, in ms (same domain as `nowMs`).
 * @param focus       Defender FOCUS stat. Values above 100 are capped for widening.
 * @returns           {@link ParryResult} with quality, mitigation, cue steal, and deltaMs.
 */
export function evaluateParry(nowMs: number, attackCueMs: number, focus: number): ParryResult {
  const deltaMs = safeDelta(nowMs, attackCueMs);
  const absDelta = Math.abs(deltaMs);
  const widen = 1 + Math.min(clampFocus(focus), FOCUS_MAX) / FOCUS_WINDOW_DIVISOR;

  for (const band of BANDS) {
    if (absDelta <= band.baseMs * widen) {
      return {
        quality: band.quality,
        incomingDamageMul: band.incomingDamageMul,
        stoleCue: band.stoleCue,
        deltaMs,
      };
    }
  }

  return {
    ...MISS_RESULT,
    deltaMs,
  };
}

function clampFocus(focus: number): number {
  if (!Number.isFinite(focus) || focus <= 0) {
    return 0;
  }

  return focus;
}

function safeDelta(nowMs: number, attackCueMs: number): number {
  if (!Number.isFinite(nowMs) || !Number.isFinite(attackCueMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return nowMs - attackCueMs;
}
