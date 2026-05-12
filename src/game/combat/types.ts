/**
 * Shared combat types for Phase-1 battle scene.
 *
 * Stable surface area between AGENT-combat (Phase 1) and the Phase-2 rhythm
 * upgrade in codex-spec 08. Names and shapes here are referenced by
 * `rhythm-window-placeholder.ts`, `damage.ts`, `action-resolver.ts`, and
 * `battle-scene.ts`. Keep additions append-only.
 */

export type RhythmQuality = 'critical' | 'perfect' | 'good' | 'off' | 'miss';

/**
 * Result of a single rhythm-window evaluation. The placeholder returns the
 * Phase-1 subset of qualities; Phase-2 widens the union but preserves the
 * shape of this record (acceptance #1 of the AGENT-combat brief).
 */
export interface RhythmResult {
  readonly quality: RhythmQuality;
  /** Multiplier applied to base damage on a successful hit (>= 0). */
  readonly damageMul: number;
  /** Resonance returned to the attacker on this cue (>= 0). */
  readonly resReturn: number;
  /** Signed offset from the target beat: `nowMs - targetMs`. */
  readonly deltaMs: number;
}

/**
 * Minimal combatant snapshot consumed by pure combat helpers. The battle
 * scene owns the mutable state; helpers receive immutable views.
 */
export interface Combatant {
  readonly id: string;
  readonly name: string;
  hp: number;
  readonly maxHp: number;
  readonly atk: number;
  readonly def: number;
  readonly focus: number;
}

/**
 * Action a combatant chooses on their turn. Phase 1 only ships `attack`.
 * Phase 2 will add `defend` / `item` / `improvise` / `flee` per docs/04 §2.
 */
export interface MoveAction {
  readonly kind: 'attack';
  readonly moveId: string;
  readonly name: string;
  /** Base power of the move (>= 0). */
  readonly power: number;
}

/**
 * Battle event emitted by the action resolver. The battle scene reads these
 * to update HP and the textbox; tests assert on the sequence directly.
 */
export type BattleEvent =
  | {
      readonly kind: 'damage';
      readonly attackerId: string;
      readonly defenderId: string;
      readonly amount: number;
      readonly quality: RhythmQuality;
    }
  | {
      readonly kind: 'message';
      readonly text: string;
    }
  | {
      readonly kind: 'ko';
      readonly combatantId: string;
    };

/** Battle outcome surfaced to the scene router. */
export type BattleOutcome = 'victory' | 'defeat';

/* ---------------------------------------------------------------------------
 * Phase-2 additions (append-only).
 *
 * Imports are local in the modules that consume `PartyMember` / `EncounterSpec`;
 * `Genre` and `BossScript` are referenced via the imports below so this file
 * stays the single source of the combat type vocabulary.
 * --------------------------------------------------------------------------*/

import type { Genre } from './genres';
import type { BossScript } from './boss-types';

/**
 * A controllable combatant in the active party. Extends the minimal Combatant
 * snapshot with a {@link Genre} for type-table lookup and a fixed list of
 * available attack moves. Phase 2 ships 1-3 members; only the first is the
 * active attacker (Phase 3 expands to multi-member turn order per docs/04 §2).
 */
export interface PartyMember extends Combatant {
  readonly genre: Genre;
  readonly moves: readonly MoveAction[];
}

/** Whether the encounter uses the scripted boss runner or a plain mook fight. */
export type BattleMode = 'normal' | 'boss';

/**
 * The full encounter declaration consumed by `BattleScene`. `bossScript` MUST
 * be set iff `mode === 'boss'`; the scene asserts the invariant on `enter()`.
 */
export interface EncounterSpec {
  readonly mode: BattleMode;
  /** BPM fed into `MusicClock.start()` on scene enter. Must be > 0. */
  readonly bpm: number;
  /** Identifier passed to `MusicClock.start()`. Placeholder is acceptable in Phase 2. */
  readonly soundId: string;
  /** The enemy combatant + their genre for type-table lookup. */
  readonly enemy: Combatant & { readonly genre: Genre };
  /** Bespoke phase script for boss encounters. Required iff `mode === 'boss'`. */
  readonly bossScript?: BossScript;
}
