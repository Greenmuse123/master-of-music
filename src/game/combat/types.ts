/**
 * Shared combat types for Phase-1 battle scene.
 *
 * Stable surface area between AGENT-combat (Phase 1) and the Phase-2 rhythm
 * upgrade in codex-spec 08. Names and shapes here are referenced by
 * `rhythm-window-placeholder.ts`, `damage.ts`, `action-resolver.ts`, and
 * `battle-scene.ts`. Keep additions append-only.
 */

export type RhythmQuality = 'perfect' | 'good' | 'miss';

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
