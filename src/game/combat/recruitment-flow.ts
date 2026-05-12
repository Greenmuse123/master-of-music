/**
 * Phase-3 recruitment-flow glue.
 *
 * Thin orchestration shim between {@link BattleScene} and the pure
 * recruitment evaluator (`evaluateRecruitmentAttempt`). The evaluator
 * (`recruitment.ts`) owns the rule (docs/04 §6); this module is the seam
 * that fills in the `defenderPreferredGenre` default and keeps BattleScene
 * from having to know the evaluator's argument shape.
 *
 * The function is intentionally pure: no scene reads, no clock reads. The
 * caller (BattleScene) supplies the current `enemyHpFraction` and signal
 * genre, this module computes the preferred-genre default and forwards.
 *
 * Recruitment success/failure does NOT mutate the defender here — caller
 * decides what to do with the result (BattleScene calls `onComplete` with
 * `'recruited'` on success; rejection leaves the battle running).
 */
import type { Genre } from './genres';
import { evaluateRecruitmentAttempt, type RecruitmentResult } from './recruitment';
import type { Combatant } from './types';

/**
 * Combatant snapshot the flow needs: id/hp/etc. plus the defender's own
 * genre (which the type-table already requires on `EncounterSpec.enemy`).
 */
export type RecruitmentFlowDefender = Combatant & { readonly genre: Genre };

export interface RecruitmentFlowOptions {
  /** The enemy combatant being targeted by the recruit attempt. */
  readonly defender: RecruitmentFlowDefender;
  /** Current enemy HP as a fraction of max (0..1). Caller computes. */
  readonly enemyHpFraction: number;
  /** The genre played at the defender (the "signal" — docs/04 §6 step 2). */
  readonly signalGenre: Genre;
  /** Did the dialogue prompt succeed (docs/04 §6 step 3)? */
  readonly dialogueOk: boolean;
  /**
   * Overrides the genre the defender is receptive to. When omitted, defaults
   * to the defender's own genre — the conservative behavior for non-bespoke
   * encounters where the data file did not specify a preferred genre.
   */
  readonly defenderPreferredGenre?: Genre;
}

/**
 * Run the docs/04 §6 recruitment check. Returns the evaluator result
 * unchanged so callers can pattern-match on `kind` / `reason`.
 *
 * @see evaluateRecruitmentAttempt for the underlying rule.
 */
export function attemptRecruit(opts: RecruitmentFlowOptions): RecruitmentResult {
  const preferred = opts.defenderPreferredGenre ?? opts.defender.genre;
  return evaluateRecruitmentAttempt({
    defender: opts.defender,
    defenderGenre: opts.defender.genre,
    defenderPreferredGenre: preferred,
    hpFraction: opts.enemyHpFraction,
    signalGenre: opts.signalGenre,
    dialogueOk: opts.dialogueOk,
  });
}
