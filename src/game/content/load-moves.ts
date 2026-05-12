/**
 * Move JSON loader for Phase-2 content.
 *
 * The loader validates a raw JSON value against {@link MoveSchema} and projects
 * it into the runtime {@link MoveAction} shape that the battle scene consumes.
 * Validation throws a `ZodError` on any mismatch (missing field, wrong type,
 * unknown genre) — the project surfaces these in dev mode at boot, per
 * docs/03 §6.
 */

import type { MoveAction } from '../combat/types';
import { MoveSchema, type MoveJson } from './schemas';

/**
 * Parse a single move JSON record. Throws a `ZodError` on validation failure.
 */
export function loadMove(json: unknown): MoveAction {
  const parsed: MoveJson = MoveSchema.parse(json);
  return {
    kind: 'attack',
    moveId: parsed.id,
    name: parsed.displayName,
    power: parsed.power,
  };
}

/**
 * Parse an array of move JSON records and return a lookup map keyed by move
 * id. Duplicate ids throw an `Error` because the runtime contract assumes
 * unique move ids per battle.
 */
export function loadAllMoves(jsons: readonly unknown[]): Map<string, MoveAction> {
  const map = new Map<string, MoveAction>();
  for (const json of jsons) {
    const move = loadMove(json);
    if (map.has(move.moveId)) {
      throw new Error(`loadAllMoves: duplicate move id "${move.moveId}"`);
    }
    map.set(move.moveId, move);
  }
  return map;
}
