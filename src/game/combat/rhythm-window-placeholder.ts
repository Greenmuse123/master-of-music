/**
 * Phase-1 placeholder for the rhythm-window evaluator.
 *
 * Replaced by spec 08 in Phase 2; signature is stable.
 *
 * Phase 1 ships a 3-band simplification of the docs/04 §3.3 table:
 *   - `perfect` when `|deltaMs| <= 80`
 *   - `good`    when `|deltaMs| <= 160`
 *   - `miss`    otherwise
 *
 * The FOCUS stat widens both windows additively up to +50% (focus=100 ->
 * +50% width). docs/04 §3.3 calls this out as the per-stat behavior, and
 * Phase-2 spec 08 will swap the body in without touching the signature,
 * the parameter order, the return shape, or the exported name.
 *
 * Returns a {@link RhythmResult} carrying both the qualitative band and
 * the numeric multipliers the resolver needs. Phase-1 multipliers are the
 * subset of the docs/04 §3.3 table that the three bands span.
 */

import type { RhythmResult } from './types';

const PERFECT_BASE_MS = 80;
const GOOD_BASE_MS = 160;
const FOCUS_MAX_WIDEN = 0.5;
const FOCUS_MAX = 100;

const PERFECT_DAMAGE_MUL = 1.5;
const PERFECT_RES = 4;
const GOOD_DAMAGE_MUL = 1.0;
const GOOD_RES = 2;
const MISS_DAMAGE_MUL = 0.2;
const MISS_RES = 0;

/**
 * Evaluate a single rhythm hit.
 *
 * @param nowMs    Time of the player's beat-press, in ms (project clock domain).
 * @param targetMs Target beat time, in ms (same domain as `nowMs`).
 * @param focus    Attacker FOCUS stat (0..100). Clamped if out of range.
 * @returns        {@link RhythmResult} with quality + multipliers + deltaMs.
 */
export function evaluateRhythmHit(nowMs: number, targetMs: number, focus: number): RhythmResult {
  const deltaMs = safeDelta(nowMs, targetMs);
  const absDelta = Math.abs(deltaMs);
  const widen = 1 + clampFocus(focus) * FOCUS_MAX_WIDEN;
  const perfectMs = PERFECT_BASE_MS * widen;
  const goodMs = GOOD_BASE_MS * widen;

  if (absDelta <= perfectMs) {
    return {
      quality: 'perfect',
      damageMul: PERFECT_DAMAGE_MUL,
      resReturn: PERFECT_RES,
      deltaMs,
    };
  }

  if (absDelta <= goodMs) {
    return {
      quality: 'good',
      damageMul: GOOD_DAMAGE_MUL,
      resReturn: GOOD_RES,
      deltaMs,
    };
  }

  return {
    quality: 'miss',
    damageMul: MISS_DAMAGE_MUL,
    resReturn: MISS_RES,
    deltaMs,
  };
}

function clampFocus(focus: number): number {
  if (!Number.isFinite(focus) || focus <= 0) {
    return 0;
  }

  if (focus >= FOCUS_MAX) {
    return 1;
  }

  return focus / FOCUS_MAX;
}

function safeDelta(nowMs: number, targetMs: number): number {
  if (!Number.isFinite(nowMs) || !Number.isFinite(targetMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return nowMs - targetMs;
}
