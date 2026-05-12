/**
 * Enemy JSON loader for Phase-2 content.
 *
 * The loader validates a raw JSON value against {@link EnemySchema} and
 * returns the runtime combatant snapshot the battle scene consumes. The
 * `moves` field is intentionally left as id strings — enemy moveset wiring
 * (loading the resolved {@link MoveAction} objects, AI selection) is Phase-3
 * work. Phase-2 mooks use the built-in attack helper in `BattleScene`.
 */

import type { Genre } from '../combat/genres';
import type { Combatant } from '../combat/types';
import { EnemySchema, type EnemyJson } from './schemas';

/**
 * Runtime shape of an enemy combatant emitted by {@link loadEnemy}. Mirrors the
 * `EncounterSpec.enemy` field shape (`Combatant & { genre: Genre }`) and adds
 * the unresolved move-id list for Phase-3 wiring.
 */
export type LoadedEnemy = Combatant & {
  readonly genre: Genre;
  readonly moves: readonly string[];
};

/**
 * Parse a single enemy JSON record. Throws a `ZodError` on validation failure.
 */
export function loadEnemy(json: unknown): LoadedEnemy {
  const parsed: EnemyJson = EnemySchema.parse(json);

  return {
    id: parsed.id,
    name: parsed.name,
    hp: parsed.hp,
    maxHp: parsed.maxHp,
    atk: parsed.atk,
    def: parsed.def,
    focus: parsed.focus,
    genre: parsed.genre as Genre,
    moves: [...parsed.moves],
  };
}
