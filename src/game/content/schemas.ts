/**
 * Zod schemas for Phase-2 static content files.
 *
 * Three families:
 *
 *   - {@link InstrumentSchema} — a party member's stats + their attack moveset
 *     declared as MOVE IDs (resolved at load time via an injected lookup).
 *   - {@link MoveSchema}       — a single attack move definition. Phase 2 omits
 *     the authored rhythm-cue field (docs/03 §6) because cue windows are
 *     evaluated live in `evaluateRhythmHit`.
 *   - {@link EnemySchema}      — an enemy combatant snapshot. The `moves` field
 *     stays as ID strings; enemy moveset wiring is Phase-3 work.
 *
 * The schemas are intentionally kept in one file so the loaders stay shallow
 * and the runtime contract is easy to read in a single screen. JSON content
 * lives under `src/data/instruments`, `src/data/moves`, `src/data/enemies`.
 */

import { z } from 'zod';

import { GENRES } from '../combat/genres';

/**
 * The enum of valid genre strings, derived from the runtime `Genre` enum so
 * that adding a genre in one place propagates to every loader automatically.
 */
const genreLiterals = GENRES as readonly [(typeof GENRES)[number], ...(typeof GENRES)[number][]];
const GenreSchema = z.enum(genreLiterals);

/**
 * Schema for an instrument (party member) JSON record.
 *
 * `moves` is an array of move IDs (strings). The loader resolves them to
 * {@link MoveAction} objects via an injected lookup; this decoupling avoids a
 * hard import edge between the instrument and move loaders.
 */
export const InstrumentSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    genre: GenreSchema,
    hp: z.number().int().nonnegative(),
    maxHp: z.number().int().nonnegative(),
    atk: z.number().int().nonnegative(),
    def: z.number().int().nonnegative(),
    focus: z.number().int().min(0).max(100),
    moves: z.array(z.string().min(1)),
  })
  .strict();

export type InstrumentJson = z.infer<typeof InstrumentSchema>;

/**
 * Schema for a single attack move JSON record.
 *
 * Mirrors the canonical shape in docs/03 §6 minus the authored `rhythm`
 * field (Phase-2 evaluates rhythm windows from the MusicClock, not from
 * authored cue tables). `cost`, `effect`, `vfx`, and `sfx` will be added in
 * later phases via append-only schema extensions.
 */
export const MoveSchema = z
  .object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    genre: GenreSchema,
    ownerType: z.literal('instrument'),
    ownerIds: z.array(z.string().min(1)).min(1),
    power: z.number().int().nonnegative(),
    narrativeText: z.string().min(1),
  })
  .strict();

export type MoveJson = z.infer<typeof MoveSchema>;

/**
 * Schema for an enemy combatant JSON record.
 *
 * Same numeric stat envelope as {@link InstrumentSchema}; differs only in that
 * enemies do not yet carry a resolved moveset (Phase-3 work). `moves` is an
 * array of move IDs that may be empty for mooks whose AI relies on the
 * built-in attack helper rather than authored moves.
 */
export const EnemySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    genre: GenreSchema,
    hp: z.number().int().nonnegative(),
    maxHp: z.number().int().nonnegative(),
    atk: z.number().int().nonnegative(),
    def: z.number().int().nonnegative(),
    focus: z.number().int().min(0).max(100),
    moves: z.array(z.string().min(1)),
  })
  .strict();

export type EnemyJson = z.infer<typeof EnemySchema>;
