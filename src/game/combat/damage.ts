/**
 * Pure damage calculation.
 *
 * Phase-1 formula (from docs/04 §3.1 stat list): `floor((atk * power / def) * damageMul)`,
 * clamped to a non-negative integer. No status / type-chart yet — those land
 * in Phase-2 along with the full rhythm table. Tests pin the boundaries.
 */

export interface DamageInput {
  /** Attacker ATTACK stat per docs/04 §3.1 (>= 0). */
  readonly attackerAtk: number;
  /** Defender DEFEND stat per docs/04 §3.1 (> 0). */
  readonly defenderDef: number;
  /** Base move power (>= 0). */
  readonly power: number;
  /** Rhythm-quality multiplier (>= 0). */
  readonly damageMul: number;
}

/**
 * Compute final integer damage. Always returns `>= 0`. Non-finite inputs and
 * non-positive `defenderDef` are clamped so the formula stays total — combat
 * code never has to gate on NaN.
 */
export function computeDamage(input: DamageInput): number {
  if (
    !Number.isFinite(input.attackerAtk) ||
    !Number.isFinite(input.defenderDef) ||
    !Number.isFinite(input.power) ||
    !Number.isFinite(input.damageMul)
  ) {
    return 0;
  }

  const atk = clampNonNegative(input.attackerAtk);
  const power = clampNonNegative(input.power);
  const mul = clampNonNegative(input.damageMul);
  const def = clampDefense(input.defenderDef);

  const raw = (atk * power * mul) / def;

  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor(raw));
}

function clampNonNegative(value: number): number {
  if (value <= 0) {
    return 0;
  }

  return value;
}

function clampDefense(value: number): number {
  if (value <= 0) {
    return 1;
  }

  return value;
}
