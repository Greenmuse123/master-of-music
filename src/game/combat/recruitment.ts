import type { Combatant } from './types';
import type { Genre } from './genres';

export type RecruitmentAttempt = {
  readonly defender: Combatant;
  readonly defenderGenre: Genre;
  readonly defenderPreferredGenre: Genre;
  readonly hpFraction: number;
  readonly signalGenre: Genre;
  readonly dialogueOk: boolean;
};

export type RecruitmentResult =
  | { readonly kind: 'recruited'; readonly combatantId: string }
  | {
      readonly kind: 'rejected';
      readonly reason: 'hp-too-high' | 'wrong-genre' | 'dialogue-failed';
    };

/**
 * Evaluates the recruit check from docs/04-COMBAT_SYSTEM.md section 6.
 *
 * Rejected enemies retreat instead of dying, but that state transition belongs
 * to the BattleScene caller; this pure helper only computes the outcome.
 */
export function evaluateRecruitmentAttempt(opts: RecruitmentAttempt): RecruitmentResult {
  if (opts.hpFraction >= 0.25) {
    return { kind: 'rejected', reason: 'hp-too-high' };
  }

  if (opts.signalGenre !== opts.defenderPreferredGenre) {
    return { kind: 'rejected', reason: 'wrong-genre' };
  }

  if (!opts.dialogueOk) {
    return { kind: 'rejected', reason: 'dialogue-failed' };
  }

  return { kind: 'recruited', combatantId: opts.defender.id };
}
