/**
 * Phase-1 BattleScene.
 *
 * Implements the `Scene` contract from `src/engine/scene/scene.ts`. Runs a
 * 1v1 jam: HP bars, a textbox prompt, a beat-aligned rhythm cue, a single
 * "Brass Burst" attack. On `confirm`, the scene reads the music clock to
 * decide rhythm quality, resolves an action, applies damage, and emits a
 * `victory` event via `onComplete` once the defender drops to 0 HP.
 *
 * All randomness routes through the injected `rng` (per docs/03 §4.4 and the
 * Phase-1 rubric §8 determinism rule). All beat timing routes through the
 * injected `musicClock` (docs/08 §1: never `performance.now()` in combat).
 *
 * Phase-2 spec 08 will replace the rhythm-window placeholder body, expand
 * the cue table from 3 bands to 5, and add defense/improvise paths; this
 * scene's input surface and render surface are designed to absorb that.
 */

import { RENDER_H, RENDER_W } from '../../config/constants';
import type { MusicClock } from '../../engine/audio/music-clock';
import type { InputManager } from '../../engine/input/input-manager';
import type { Renderer } from '../../engine/render/renderer';
import type { FrameStep, Scene } from '../../engine/scene/scene';
import type { Textbox } from '../../ui/textbox';
import { resolveAction } from './action-resolver';
import { evaluateRhythmHit } from './rhythm-window-placeholder';
import type { BattleEvent, BattleOutcome, Combatant, MoveAction } from './types';

const HP_BAR_W = 120;
const HP_BAR_H = 8;
const HP_BAR_PADDING = 8;
const RHYTHM_CUE_RADIUS = 6;
const RHYTHM_CUE_Y = 96;
const RHYTHM_CUE_TRAVEL_PX = 200;
const RHYTHM_DEFAULT_LATENCY_MS = 0;

const DEFAULT_MOVE: MoveAction = {
  kind: 'attack',
  moveId: 'brass-burst',
  name: 'Brass Burst',
  power: 30,
};

export type BattleSceneRng = () => number;
export type BattleSceneComplete = (outcome: BattleOutcome) => void;

export interface BattleSceneOptions {
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly musicClock: MusicClock;
  readonly textbox: Textbox;
  readonly attacker: Combatant;
  readonly defender: Combatant;
  readonly rng: BattleSceneRng;
  readonly onComplete: BattleSceneComplete;
  /** Optional override of the default move (Phase-2 plugs movesets here). */
  readonly move?: MoveAction;
}

export class BattleScene implements Scene {
  readonly #renderer: Renderer;
  readonly #input: InputManager;
  readonly #musicClock: MusicClock;
  readonly #textbox: Textbox;
  readonly #attacker: Combatant;
  readonly #defender: Combatant;
  readonly #rng: BattleSceneRng;
  readonly #onComplete: BattleSceneComplete;
  readonly #move: MoveAction;

  #attackerHp: number;
  #defenderHp: number;
  #lastEvents: BattleEvent[] = [];
  #outcome: BattleOutcome | null = null;
  #entered = false;

  constructor(options: BattleSceneOptions) {
    this.#renderer = options.renderer;
    this.#input = options.input;
    this.#musicClock = options.musicClock;
    this.#textbox = options.textbox;
    this.#attacker = options.attacker;
    this.#defender = options.defender;
    this.#rng = options.rng;
    this.#onComplete = options.onComplete;
    this.#move = options.move ?? DEFAULT_MOVE;

    this.#attackerHp = options.attacker.hp;
    this.#defenderHp = options.defender.hp;
  }

  enter(_prev?: Scene): void {
    this.#entered = true;
    this.#attackerHp = this.#attacker.hp;
    this.#defenderHp = this.#defender.hp;
    this.#lastEvents = [];
    this.#outcome = null;
  }

  exit(_next?: Scene): void {
    this.#entered = false;
  }

  update(_step: FrameStep): void {
    if (!this.#entered || this.#outcome !== null) {
      return;
    }

    if (this.#input.pressed('confirm')) {
      this.#triggerAttack();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1a1430';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);

    this.#drawHpBar(ctx, this.#attacker.name, this.#attackerHp, this.#attacker.maxHp, HP_BAR_PADDING, RENDER_H - HP_BAR_PADDING - HP_BAR_H - 96);
    this.#drawHpBar(
      ctx,
      this.#defender.name,
      this.#defenderHp,
      this.#defender.maxHp,
      RENDER_W - HP_BAR_PADDING - HP_BAR_W,
      HP_BAR_PADDING,
    );

    this.#drawRhythmCue(ctx);
    this.#textbox.render(ctx);
  }

  handleInput(_event: Event): void {
    // Input is polled via InputManager during update; no per-event handling.
  }

  /** Read-only view for tests. */
  get attackerHp(): number {
    return this.#attackerHp;
  }

  /** Read-only view for tests. */
  get defenderHp(): number {
    return this.#defenderHp;
  }

  /** Read-only view of the events emitted by the most recent attack. */
  get lastEvents(): readonly BattleEvent[] {
    return this.#lastEvents;
  }

  /** Outcome of the battle, or null while in progress. */
  get outcome(): BattleOutcome | null {
    return this.#outcome;
  }

  #triggerAttack(): void {
    const beatMs = beatToMs(this.#musicClock);
    const targetMs = nearestBeatMs(beatMs);
    // Use the injected rng to model a tiny perceptual latency around each beat.
    const jitter = (this.#rng() - 0.5) * RHYTHM_DEFAULT_LATENCY_MS;
    const rhythm = evaluateRhythmHit(beatMs + jitter, targetMs, this.#attacker.focus);

    const events = resolveAction(
      this.#move,
      { ...this.#attacker, hp: this.#attackerHp },
      { ...this.#defender, hp: this.#defenderHp },
      rhythm,
    );

    for (const event of events) {
      this.#applyEvent(event);
    }

    this.#lastEvents = events;

    if (this.#defenderHp <= 0 && this.#outcome === null) {
      this.#outcome = 'victory';
      this.#onComplete('victory');
    } else if (this.#attackerHp <= 0 && this.#outcome === null) {
      this.#outcome = 'defeat';
      this.#onComplete('defeat');
    }
  }

  #applyEvent(event: BattleEvent): void {
    if (event.kind !== 'damage') {
      return;
    }

    if (event.defenderId === this.#defender.id) {
      this.#defenderHp = Math.max(0, this.#defenderHp - event.amount);
    } else if (event.defenderId === this.#attacker.id) {
      this.#attackerHp = Math.max(0, this.#attackerHp - event.amount);
    }
  }

  #drawHpBar(
    ctx: CanvasRenderingContext2D,
    label: string,
    hp: number,
    maxHp: number,
    x: number,
    y: number,
  ): void {
    const snappedX = Math.round(x);
    const snappedY = Math.round(y);
    const ratio = maxHp <= 0 ? 0 : Math.max(0, Math.min(1, hp / maxHp));
    const fillW = Math.round(HP_BAR_W * ratio);

    ctx.fillStyle = '#000';
    ctx.fillRect(snappedX, snappedY, HP_BAR_W, HP_BAR_H);
    ctx.fillStyle = '#3aa856';
    ctx.fillRect(snappedX, snappedY, fillW, HP_BAR_H);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${label} ${Math.round(hp)}/${maxHp}`, snappedX, snappedY - 10);
    // Renderer's queued drawing isn't used here — the scene paints directly
    // onto the supplied ctx so the test stub captures every call.
    // Touching the renderer reference keeps the dependency live for Phase 2.
    void this.#renderer;
  }

  #drawRhythmCue(ctx: CanvasRenderingContext2D): void {
    const phase = clamp01(this.#musicClock.beatPhase());
    const cueX = Math.round((RENDER_W - RHYTHM_CUE_TRAVEL_PX) / 2 + phase * RHYTHM_CUE_TRAVEL_PX);
    const cueY = Math.round(RHYTHM_CUE_Y);

    ctx.fillStyle = '#f7d65a';
    ctx.fillRect(cueX - RHYTHM_CUE_RADIUS, cueY - RHYTHM_CUE_RADIUS, RHYTHM_CUE_RADIUS * 2, RHYTHM_CUE_RADIUS * 2);
  }
}

function beatToMs(clock: MusicClock): number {
  // Use the clock's own beat-phase composition so combat never reads wall time.
  // beat() is the integer beat index; beatPhase() is the [0,1) position inside
  // the current beat. We treat the integer beat as the local time origin and
  // the phase as a ms offset scaled by a nominal 500ms-per-beat budget — the
  // Phase-1 placeholder rhythm window only cares about relative deltas, not
  // absolute wall time, so this is consistent with itself.
  const beat = Math.max(0, clock.beat());
  const phase = clamp01(clock.beatPhase());
  const beatMs = 500;
  return beat * beatMs + phase * beatMs;
}

function nearestBeatMs(beatMs: number): number {
  const beatLength = 500;
  return Math.round(beatMs / beatLength) * beatLength;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}
