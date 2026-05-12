/**
 * Diminuendo — Quartet boss of the Blues Bayou (Act 2). See
 * `docs/02-STORY_BIBLE.md` §3.4 and `docs/04-COMBAT_SYSTEM.md` §5.
 *
 * Three-phase deterministic Cuphead-grade encounter:
 *   1. lullaby  — full HP. Sparse cues; long vulnerable window.
 *   2. dirge    — ≤66% HP. Denser cues; mid-length vulnerable window.
 *   3. silence  — ≤33% HP. Dense cues; short, punishing vulnerable window.
 *
 * The encounter is data-driven via `diminuendo.json`; this factory only wraps
 * the parsed JSON in an `EncounterSpec` with the enemy combatant resolved by
 * the injected lookup callback.
 */

import diminuendoData from '../../data/encounters/diminuendo.json';
import type { EncounterSpec } from '../combat/types';
import { loadEncounter, type EnemyLookup } from './load-encounter';

export interface MakeDiminuendoEncounterOptions {
  readonly lookupEnemy: EnemyLookup;
}

export function makeDiminuendoEncounter(opts: MakeDiminuendoEncounterOptions): EncounterSpec {
  return loadEncounter(diminuendoData, { lookupEnemy: opts.lookupEnemy });
}
