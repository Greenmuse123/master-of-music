/**
 * Bayou mook — trash encounter for the Blues Bayou act.
 *
 * Plain normal-mode encounter: no scripted boss phases, BPM and sound id come
 * from `bayou-mook.json`, and the enemy combatant is resolved via the
 * injected lookup callback (sourced from AGENT-content's enemy data loader).
 */

import bayouMookData from '../../data/encounters/bayou-mook.json';
import type { EncounterSpec } from '../combat/types';
import { loadEncounter, type EnemyLookup } from './load-encounter';

export interface MakeBayouMookEncounterOptions {
  readonly lookupEnemy: EnemyLookup;
}

export function makeBayouMookEncounter(opts: MakeBayouMookEncounterOptions): EncounterSpec {
  return loadEncounter(bayouMookData, { lookupEnemy: opts.lookupEnemy });
}
