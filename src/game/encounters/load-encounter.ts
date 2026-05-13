/**
 * Encounter JSON loader.
 *
 * Validates encounter scripts authored as plain JSON (see
 * `src/data/encounters/*.json`) and converts them into the {@link EncounterSpec}
 * shape consumed by `BattleScene`. Enemy stat blocks are NOT embedded inside
 * the encounter JSON — they live in `src/data/enemies/` and are looked up by
 * `enemyId` through the injected `lookupEnemy` callback supplied by the
 * orchestrator (sourced from AGENT-content's loader). This keeps encounter
 * scripts data-only and lets the content layer be substituted in tests with a
 * stub.
 */

import { z } from 'zod';

import type { BossScript } from '../combat/boss-types';
import type { Genre } from '../combat/genres';
import type { Combatant, EncounterSpec } from '../combat/types';

const BossPhaseSchema = z
  .object({
    id: z.string().min(1),
    patternIntroBeats: z.number().int().nonnegative(),
    patternBeats: z.array(z.number().int().nonnegative()),
    vulnerableBeats: z.number().int().nonnegative(),
    hpThreshold: z.number().gt(0).lte(1).optional(),
  })
  .strict();

const BossScriptSchema = z
  .object({
    id: z.string().min(1),
    phases: z.array(BossPhaseSchema).min(1),
    finalDefeatBeats: z.number().int().nonnegative(),
  })
  .strict();

export const BossEncounterSchema = z
  .object({
    mode: z.literal('boss'),
    enemyId: z.string().min(1),
    bpm: z.number().positive(),
    soundId: z.string().min(1),
    bossScript: BossScriptSchema,
    recruitDialogueId: z.string().min(1).optional(),
  })
  .strict();

export const NormalEncounterSchema = z
  .object({
    mode: z.literal('normal'),
    enemyId: z.string().min(1),
    bpm: z.number().positive(),
    soundId: z.string().min(1),
    recruitDialogueId: z.string().min(1).optional(),
  })
  .strict();

export const EncounterSchema = z.discriminatedUnion('mode', [
  BossEncounterSchema,
  NormalEncounterSchema,
]);

export type BossEncounterJson = z.infer<typeof BossEncounterSchema>;
export type NormalEncounterJson = z.infer<typeof NormalEncounterSchema>;
export type EncounterJson = z.infer<typeof EncounterSchema>;

export type EnemyLookup = (id: string) => Combatant & { readonly genre: Genre };

export interface LoadEncounterOptions {
  readonly lookupEnemy: EnemyLookup;
}

/**
 * Parses and validates an encounter JSON value, resolves its enemy via the
 * injected lookup, and returns an {@link EncounterSpec} ready for BattleScene.
 *
 * Throws on schema-validation failure or on a missing enemy id.
 */
export function loadEncounter(json: unknown, opts: LoadEncounterOptions): EncounterSpec {
  const parsed = EncounterSchema.parse(json);
  const enemy = opts.lookupEnemy(parsed.enemyId);

  if (parsed.mode === 'boss') {
    const bossScript: BossScript = {
      id: parsed.bossScript.id,
      finalDefeatBeats: parsed.bossScript.finalDefeatBeats,
      phases: parsed.bossScript.phases.map((phase) => ({
        id: phase.id,
        patternIntroBeats: phase.patternIntroBeats,
        patternBeats: [...phase.patternBeats],
        vulnerableBeats: phase.vulnerableBeats,
        ...(phase.hpThreshold !== undefined ? { hpThreshold: phase.hpThreshold } : {}),
      })),
    };

    return {
      mode: 'boss',
      bpm: parsed.bpm,
      soundId: parsed.soundId,
      enemy,
      bossScript,
      ...(parsed.recruitDialogueId !== undefined
        ? { recruitDialogueId: parsed.recruitDialogueId }
        : {}),
    };
  }

  return {
    mode: 'normal',
    bpm: parsed.bpm,
    soundId: parsed.soundId,
    enemy,
    ...(parsed.recruitDialogueId !== undefined
      ? { recruitDialogueId: parsed.recruitDialogueId }
      : {}),
  };
}
