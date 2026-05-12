/**
 * Pure resolver from (action + rhythm result) -> ordered BattleEvent list.
 *
 * Deterministic, no side effects, no clock reads, no rng. The battle scene
 * applies the events to its mutable combatant snapshots; tests assert on the
 * event list directly. This is the seam Phase-2 spec 08 will extend when
 * defense/improvise/status events land — the function stays append-only.
 */

import { computeDamage } from './damage';
import type { BattleEvent, Combatant, MoveAction, RhythmResult } from './types';

/**
 * Build the sequence of events for `attacker` performing `action` against
 * `defender`, with rhythm hit-quality `rhythm`. The list always starts with
 * a `message` describing the attempt; a `damage` event always follows; a
 * `ko` event is appended iff the defender's HP would drop to 0 or below.
 *
 * The function does NOT mutate the inputs. Callers apply the damage to a
 * mutable HP value after they read the event list (or after they emit each
 * event in order).
 */
export function resolveAction(
  action: MoveAction,
  attacker: Combatant,
  defender: Combatant,
  rhythm: RhythmResult,
): BattleEvent[] {
  const events: BattleEvent[] = [];

  events.push({
    kind: 'message',
    text: `${attacker.name} uses ${action.name}!`,
  });

  if (rhythm.quality === 'miss') {
    events.push({
      kind: 'message',
      text: 'Off-beat!',
    });
  } else if (rhythm.quality === 'perfect') {
    events.push({
      kind: 'message',
      text: 'Perfect!',
    });
  }

  const amount = computeDamage({
    attackerAtk: attacker.atk,
    defenderDef: defender.def,
    power: action.power,
    damageMul: rhythm.damageMul,
  });

  events.push({
    kind: 'damage',
    attackerId: attacker.id,
    defenderId: defender.id,
    amount,
    quality: rhythm.quality,
  });

  if (defender.hp - amount <= 0) {
    events.push({
      kind: 'ko',
      combatantId: defender.id,
    });
  }

  return events;
}
