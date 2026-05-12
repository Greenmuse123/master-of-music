import { describe, expect, it } from 'vitest';

import { Genre } from './genres';
import { evaluateRecruitmentAttempt, type RecruitmentAttempt } from './recruitment';
import type { Combatant } from './types';

const defender: Combatant = {
  id: 'enemy-001',
  name: 'Blue Note Rival',
  hp: 12,
  maxHp: 100,
  atk: 10,
  def: 8,
  focus: 6,
};

const baseAttempt: RecruitmentAttempt = {
  defender,
  defenderGenre: Genre.Blues,
  defenderPreferredGenre: Genre.Jazz,
  hpFraction: 0.24,
  signalGenre: Genre.Jazz,
  dialogueOk: true,
};

describe('evaluateRecruitmentAttempt', () => {
  it('recruits when hp, signal genre, and dialogue all pass', () => {
    expect(evaluateRecruitmentAttempt(baseAttempt)).toEqual({
      kind: 'recruited',
      combatantId: defender.id,
    });
  });

  it('rejects hp at exactly 0.25 because the threshold is strict', () => {
    expect(evaluateRecruitmentAttempt({ ...baseAttempt, hpFraction: 0.25 })).toEqual({
      kind: 'rejected',
      reason: 'hp-too-high',
    });
  });

  it('rejects a low-hp defender when the signal genre is not preferred', () => {
    expect(evaluateRecruitmentAttempt({ ...baseAttempt, signalGenre: Genre.Rock })).toEqual({
      kind: 'rejected',
      reason: 'wrong-genre',
    });
  });

  it('rejects when hp and genre pass but dialogue fails', () => {
    expect(evaluateRecruitmentAttempt({ ...baseAttempt, dialogueOk: false })).toEqual({
      kind: 'rejected',
      reason: 'dialogue-failed',
    });
  });

  it('returns the first failing reason in the documented order', () => {
    expect(
      evaluateRecruitmentAttempt({
        ...baseAttempt,
        hpFraction: 0.9,
        signalGenre: Genre.Rock,
        dialogueOk: false,
      }),
    ).toEqual({
      kind: 'rejected',
      reason: 'hp-too-high',
    });
  });
});
