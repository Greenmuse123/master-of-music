import type { RhythmResult, RhythmQuality } from './types';

const FOCUS_MAX = 100;
const FOCUS_WINDOW_DIVISOR = 200;

const BANDS: readonly {
  readonly quality: RhythmQuality;
  readonly baseMs: number;
  readonly damageMul: number;
  readonly resReturn: number;
}[] = [
  { quality: 'critical', baseMs: 40, damageMul: 2.0, resReturn: 6 },
  { quality: 'perfect', baseMs: 80, damageMul: 1.5, resReturn: 4 },
  { quality: 'good', baseMs: 160, damageMul: 1.0, resReturn: 2 },
  { quality: 'off', baseMs: 300, damageMul: 0.6, resReturn: 0 },
];

const MISS_RESULT = {
  quality: 'miss',
  damageMul: 0.2,
  resReturn: 0,
} as const;

/**
 * Evaluate a single rhythm hit using the full docs/04-COMBAT_SYSTEM.md §3.3
 * rhythm-window table.
 *
 * @param nowMs    Time of the player's beat-press, in ms (project clock domain).
 * @param targetMs Target beat time, in ms (same domain as `nowMs`).
 * @param focus    Attacker FOCUS stat. Values above 100 are capped for widening.
 * @returns        {@link RhythmResult} with quality + multipliers + deltaMs.
 */
export function evaluateRhythmHit(nowMs: number, targetMs: number, focus: number): RhythmResult {
  const deltaMs = safeDelta(nowMs, targetMs);
  const absDelta = Math.abs(deltaMs);
  const widen = 1 + Math.min(clampFocus(focus), FOCUS_MAX) / FOCUS_WINDOW_DIVISOR;

  for (const band of BANDS) {
    if (absDelta <= band.baseMs * widen) {
      return {
        quality: band.quality,
        damageMul: band.damageMul,
        resReturn: band.resReturn,
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

function safeDelta(nowMs: number, targetMs: number): number {
  if (!Number.isFinite(nowMs) || !Number.isFinite(targetMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return nowMs - targetMs;
}
