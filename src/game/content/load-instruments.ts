/**
 * Instrument (party member) JSON loader for Phase-2 content.
 *
 * The loader validates a raw JSON value against {@link InstrumentSchema} and
 * resolves the embedded move-id list to runtime {@link MoveAction} objects
 * via a caller-supplied lookup. The lookup is injected — not imported — so
 * `load-instruments.ts` and `load-moves.ts` stay independent: the caller is
 * responsible for assembling the move map (likely from `loadAllMoves`) and
 * passing the lookup in.
 *
 * An unresolved move id throws an `Error` rather than silently emitting an
 * incomplete party member; this is the boot-time fail-fast contract.
 */

import type { Genre } from '../combat/genres';
import type { MoveAction, PartyMember } from '../combat/types';
import { InstrumentSchema, type InstrumentJson } from './schemas';

export type MoveLookup = (id: string) => MoveAction | undefined;

/**
 * Parse and project a single instrument JSON record. The `lookupMove` callback
 * resolves each move id in the JSON to a runtime {@link MoveAction}.
 *
 * Throws on schema validation failure, on an empty resolution (`lookupMove`
 * returning undefined), and on a genre that does not exist at runtime.
 */
export function loadInstrument(json: unknown, lookupMove: MoveLookup): PartyMember {
  const parsed: InstrumentJson = InstrumentSchema.parse(json);

  const moves: MoveAction[] = [];
  for (const moveId of parsed.moves) {
    const move = lookupMove(moveId);
    if (move === undefined) {
      throw new Error(
        `loadInstrument: instrument "${parsed.id}" references unknown move id "${moveId}"`,
      );
    }
    moves.push(move);
  }

  return {
    id: parsed.id,
    name: parsed.name,
    hp: parsed.hp,
    maxHp: parsed.maxHp,
    atk: parsed.atk,
    def: parsed.def,
    focus: parsed.focus,
    genre: parsed.genre as Genre,
    moves,
  };
}
