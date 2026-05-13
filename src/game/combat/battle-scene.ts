/**
 * Phase-2 BattleScene.
 *
 * Wires the five Phase-2 combat primitives together:
 *
 *   - rhythm-window      (`evaluateRhythmHit`, 5-band)
 *   - type-table         (`getMatchupMultiplier`)
 *   - parry              (`evaluateParry`, defender side)
 *   - dissonance-meter   (stutter accumulation per side)
 *   - boss-phase         (scripted phase runner for boss encounters)
 *
 * BPM is sourced from {@link MusicClock} at scene `enter()` via
 * `musicClock.start(soundId, encounter.bpm)`. The scene NEVER reads
 * `performance.now()`, `Date.now()`, or `Math.random()` directly — all
 * randomness routes through the injected `rng`, all timing routes through
 * the injected `musicClock`. This is the determinism contract that the
 * Phase-2 record-replay harness depends on (see docs/plans/PHASE-2.md Task 3).
 *
 * Input contract (per `src/engine/input/actions.ts`):
 *   - `beat-press` (Space)   — player's offensive rhythm hit
 *   - `confirm`              — player's defensive parry during an enemy attack window
 *
 * Render contract: black background, party HP bars top-left, enemy HP bar
 * top-right, a moving rhythm cue across the middle, the textbox at the
 * bottom, and a parry-cue indicator when an enemy attack is pending. All
 * paint calls land on integer pixel coords.
 */

import { RENDER_H, RENDER_W } from '../../config/constants';
import type { MusicClock } from '../../engine/audio/music-clock';
import type { InputManager } from '../../engine/input/input-manager';
import type { Renderer } from '../../engine/render/renderer';
import type { FrameStep, Scene } from '../../engine/scene/scene';
import type { Textbox } from '../../ui/textbox';
import { resolveAction } from './action-resolver';
import type { BossEvent } from './boss-types';
import { BossPhaseRunner } from './boss-phase';
import { DissonanceMeter } from './dissonance-meter';
import { evaluateParry } from './parry';
import { evaluateRhythmHit } from './rhythm-window';
import { attemptRecruit as runRecruitmentFlow } from './recruitment-flow';
import type { RecruitmentResult } from './recruitment';
import { getMatchupMultiplier } from './type-table';
import type { Genre } from './genres';
import { DialogueRunner } from '../dialogue/dialogue-runner';
import type {
  DialogueChoice,
  DialogueEvent,
  DialogueScript,
} from '../dialogue/dialogue-types';
import type {
  BattleEvent,
  BattleOutcome,
  Combatant,
  EncounterSpec,
  MoveAction,
  PartyMember,
  RhythmResult,
} from './types';

type EnemyCombatant = Combatant & { readonly genre: Genre };

const HP_BAR_W = 120;
const HP_BAR_H = 8;
const HP_BAR_PADDING = 8;
const HP_BAR_STACK_GAP = 12;
const PARTY_LABEL_Y_OFFSET = 10;
const RHYTHM_CUE_RADIUS = 6;
const RHYTHM_CUE_Y = 96;
const RHYTHM_CUE_TRAVEL_PX = 200;
const PARRY_CUE_Y = 120;
const PARRY_CUE_RADIUS = 8;
const ENEMY_STUTTER_BURST_MULT = 2.0;

export type BattleSceneRng = () => number;
export type BattleSceneComplete = (outcome: BattleOutcome) => void;

export interface BattleSceneOptions {
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly musicClock: MusicClock;
  readonly textbox: Textbox;
  readonly party: readonly PartyMember[];
  readonly encounter: EncounterSpec;
  readonly rng: BattleSceneRng;
  readonly onComplete: BattleSceneComplete;
  /**
   * Phase-4: resolves a `recruitDialogueId` on the encounter to a
   * `DialogueScript` that BattleScene runs when the player presses `recruit`
   * with the enemy at <25% HP. Returns `null` if the id is unknown — the
   * scene then falls back to the Phase-3.5 default (dialogueOk = true).
   */
  readonly lookupDialogue?: (id: string) => DialogueScript | null;
}

interface PartyState {
  readonly member: PartyMember;
  hp: number;
}

export class BattleScene implements Scene {
  readonly #renderer: Renderer;
  readonly #input: InputManager;
  readonly #musicClock: MusicClock;
  readonly #textbox: Textbox;
  readonly #encounter: EncounterSpec;
  readonly #rng: BattleSceneRng;
  readonly #onComplete: BattleSceneComplete;
  readonly #partyState: PartyState[];
  readonly #lookupDialogue: ((id: string) => DialogueScript | null) | undefined;

  #enemy: EnemyCombatant;
  #enemyHp: number;
  #partyDissonance: DissonanceMeter;
  #enemyDissonance: DissonanceMeter;
  #bossRunner: BossPhaseRunner | null = null;
  #pendingParryBeat: number | null = null;
  #bossDefeated = false;
  #events: BattleEvent[] = [];
  #lastTurnEvents: BattleEvent[] = [];
  #outcome: BattleOutcome | null = null;
  #entered = false;
  #beatsPerMs = 0;
  #activeIndex = 0;
  // Phase-4 recruitment-dialogue overlay state.
  #dialogueRunner: DialogueRunner | null = null;
  #dialogueLastEvent: DialogueEvent | null = null;
  #dialogueChoiceIndex = 0;
  #dialogueFlags: string[] = [];

  constructor(options: BattleSceneOptions) {
    if (options.party.length === 0) {
      throw new Error('BattleScene: party must have at least one member.');
    }

    if (options.encounter.mode === 'boss' && options.encounter.bossScript === undefined) {
      throw new Error('BattleScene: boss-mode encounter requires a bossScript.');
    }

    this.#renderer = options.renderer;
    this.#input = options.input;
    this.#musicClock = options.musicClock;
    this.#textbox = options.textbox;
    this.#encounter = options.encounter;
    this.#rng = options.rng;
    this.#onComplete = options.onComplete;
    this.#lookupDialogue = options.lookupDialogue;

    this.#partyState = options.party.map((member) => ({ member, hp: member.hp }));
    this.#enemy = options.encounter.enemy;
    this.#enemyHp = options.encounter.enemy.hp;
    this.#partyDissonance = new DissonanceMeter();
    this.#enemyDissonance = new DissonanceMeter();
  }

  enter(_prev?: Scene): void {
    this.#entered = true;
    this.#outcome = null;
    this.#events = [];
    this.#lastTurnEvents = [];
    this.#enemyHp = this.#enemy.hp;
    this.#partyDissonance = new DissonanceMeter();
    this.#enemyDissonance = new DissonanceMeter();
    this.#pendingParryBeat = null;
    this.#bossDefeated = false;
    this.#activeIndex = 0;
    this.#beatsPerMs = this.#encounter.bpm / 60_000;

    for (const state of this.#partyState) {
      state.hp = state.member.hp;
    }

    this.#musicClock.start(this.#encounter.soundId, this.#encounter.bpm);

    if (this.#encounter.mode === 'boss' && this.#encounter.bossScript !== undefined) {
      this.#bossRunner = new BossPhaseRunner({
        script: this.#encounter.bossScript,
        onEvent: (event) => this.#handleBossEvent(event),
      });
      this.#bossRunner.start();
    } else {
      this.#bossRunner = null;
    }

    this.#emit({ kind: 'message', text: `A wild ${this.#enemy.name} appears!` });
  }

  exit(_next?: Scene): void {
    this.#entered = false;
    this.#musicClock.stop();
    this.#bossRunner = null;
    this.#pendingParryBeat = null;
    this.#dialogueRunner = null;
    this.#dialogueLastEvent = null;
    this.#dialogueChoiceIndex = 0;
    this.#dialogueFlags = [];
  }

  update(_step: FrameStep): void {
    if (!this.#entered || this.#outcome !== null) {
      return;
    }

    // Dialogue overlay (Phase 4): while a recruitment-dialogue runner is
    // active, the player can only interact with the dialogue. Combat is
    // suspended until the runner emits `finished`.
    if (this.#dialogueRunner !== null) {
      this.#updateDialogue();
      return;
    }


    this.#lastTurnEvents = [];

    // Drive boss script first so cue / vulnerable / defeated events are
    // observable to the rest of the frame (e.g. allowing burst damage during
    // a vulnerable window).
    if (this.#bossRunner !== null) {
      const enemyMaxHp = this.#enemy.maxHp <= 0 ? 1 : this.#enemy.maxHp;
      const hpFraction = Math.max(0, this.#enemyHp / enemyMaxHp);
      this.#bossRunner.tick(this.#musicClock.beat(), hpFraction);

      if (this.#bossDefeated && this.#outcome === null) {
        this.#finish('victory');
        return;
      }
    }

    if (this.#input.pressed('beat-press')) {
      this.#performAttack();
    }

    if (this.#pendingParryBeat !== null && this.#input.pressed('confirm')) {
      this.#performParry();
    }

    // Recruitment trigger: when the enemy is at <25% HP and the player taps
    // `recruit` (default KeyR), either start a DialogueRunner (Phase 4 path,
    // when the encounter spec has `recruitDialogueId` AND `lookupDialogue` can
    // resolve it) OR fall through to the Phase-3.5 default (dialogueOk=true).
    if (
      this.#dialogueRunner === null &&
      this.#input.pressed('recruit') &&
      this.#outcome === null
    ) {
      const maxHp = this.#enemy.maxHp <= 0 ? 1 : this.#enemy.maxHp;
      const hpFraction = Math.max(0, this.#enemyHp / maxHp);
      if (hpFraction < 0.25) {
        this.#beginRecruitDialogue();
      } else {
        this.#emit({ kind: 'message', text: 'Too soon. Wear them down first.' });
      }
    }

    // Enemy stutter window: allow one free critical attack per stutter.
    if (this.#enemyDissonance.isStuttered()) {
      this.#performStutterBurst();
      this.#enemyDissonance.tickRound();

      if (this.#bossRunner !== null) {
        this.#bossRunner.triggerStutterAdvance();
      }
    }

    this.#checkEndConditions();
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, RENDER_W, RENDER_H);

    this.#drawPartyHpBars(ctx);
    this.#drawEnemyHpBar(ctx);
    this.#drawRhythmCue(ctx);

    if (this.#pendingParryBeat !== null) {
      this.#drawParryCue(ctx);
    }

    this.#textbox.render(ctx);

    // Touch the renderer reference so the dependency stays live for Phase 3
    // when the scene starts pushing layered draw commands.
    void this.#renderer;
  }

  handleInput(_event: Event): void {
    // Input is polled via InputManager during update; no per-event handling.
  }

  /** Read-only HP of the active party member (first member). */
  get activePartyHp(): number {
    return this.#partyState[this.#activeIndex]!.hp;
  }

  /** Read-only HP of the enemy. */
  get enemyHp(): number {
    return this.#enemyHp;
  }

  /** Read-only outcome of the battle, or null while in progress. */
  get outcome(): BattleOutcome | null {
    return this.#outcome;
  }

  /** Read-only view of events emitted on the most recent `update` tick. */
  get lastTurnEvents(): readonly BattleEvent[] {
    return this.#lastTurnEvents;
  }

  /** Read-only view of every event since `enter()`. Used by the replay test. */
  get eventLog(): readonly BattleEvent[] {
    return this.#events;
  }

  /** Read-only access to the active party member's dissonance meter (UI / tests). */
  get partyDissonance(): DissonanceMeter {
    return this.#partyDissonance;
  }

  /** Read-only access to the enemy's dissonance meter (UI / tests). */
  get enemyDissonance(): DissonanceMeter {
    return this.#enemyDissonance;
  }

  /** Read-only access to the boss runner when in boss mode (undefined otherwise). */
  get bossRunner(): BossPhaseRunner | null {
    return this.#bossRunner;
  }

  /**
   * Attempt to recruit the current enemy (docs/04 §6).
   *
   * Reads the live enemy HP fraction and the encounter's preferred genre
   * (defaulting to the enemy's own genre), then runs the recruitment-flow
   * shim around `evaluateRecruitmentAttempt`. On a successful recruit, this
   * stops the battle by setting the outcome to `'recruited'` and invoking
   * `onComplete('recruited')`; the caller can then route to dialogue or a
   * save-flag flow. Rejection leaves the battle running so the player can
   * keep fighting, retry the signal, or flee.
   *
   * Phase-3 note: the gameplay trigger (player binding that calls this when
   * enemy HP < 25%) is wired in Phase 3.5 polish; this method is the
   * scene-level API the trigger will call.
   *
   * No-op (returns `'hp-too-high'`) if the battle is already over.
   */
  attemptRecruit(signalGenre: Genre, dialogueOk: boolean): RecruitmentResult {
    const maxHp = this.#enemy.maxHp <= 0 ? 1 : this.#enemy.maxHp;
    const hpFraction = Math.max(0, this.#enemyHp / maxHp);

    const result = runRecruitmentFlow({
      defender: this.#enemy,
      enemyHpFraction: hpFraction,
      signalGenre,
      dialogueOk,
      defenderPreferredGenre: this.#encounter.defenderPreferredGenre,
    });

    if (result.kind === 'recruited' && this.#outcome === null) {
      this.#emit({ kind: 'message', text: `${this.#enemy.name} joins the band!` });
      this.#finish('recruited');
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Internal: recruitment-dialogue overlay (Phase 4)
  // ---------------------------------------------------------------------------

  #beginRecruitDialogue(): void {
    const dialogueId = this.#encounter.recruitDialogueId;
    const activeMember = this.#partyState[this.#activeIndex];

    if (dialogueId === undefined || this.#lookupDialogue === undefined) {
      // No dialogue configured — Phase-3.5 default: dialogueOk = true.
      if (activeMember !== undefined) {
        this.attemptRecruit(activeMember.member.genre, true);
      }
      return;
    }

    const script = this.#lookupDialogue(dialogueId);
    if (script === null) {
      // Lookup failed — fall back to the no-dialogue default rather than
      // silently denying the player a recruit attempt.
      if (activeMember !== undefined) {
        this.attemptRecruit(activeMember.member.genre, true);
      }
      return;
    }

    this.#dialogueFlags = [];
    this.#dialogueChoiceIndex = 0;
    const runner = new DialogueRunner({
      script,
      onEvent: (event) => this.#handleDialogueEvent(event),
    });
    this.#dialogueRunner = runner;
    runner.start();
  }

  #handleDialogueEvent(event: DialogueEvent): void {
    this.#dialogueLastEvent = event;
    if (event.kind === 'choices') {
      this.#dialogueChoiceIndex = 0;
      return;
    }
    if (event.kind === 'finished') {
      this.#dialogueFlags = [...event.flags];
      this.#dialogueRunner = null;
      this.#dialogueLastEvent = null;
      const dialogueOk = this.#dialogueFlags.includes(`recruit-${this.#enemy.id}`);
      const activeMember = this.#partyState[this.#activeIndex];
      if (activeMember !== undefined) {
        this.attemptRecruit(activeMember.member.genre, dialogueOk);
      }
    }
  }

  #updateDialogue(): void {
    const runner = this.#dialogueRunner;
    if (runner === null) {
      return;
    }
    const event = this.#dialogueLastEvent;

    if (event?.kind === 'choices') {
      // Up / down navigates the choice list before confirm fires `select`.
      const choices = event.options;
      if (this.#input.pressed('down')) {
        this.#dialogueChoiceIndex = Math.min(choices.length - 1, this.#dialogueChoiceIndex + 1);
      } else if (this.#input.pressed('up')) {
        this.#dialogueChoiceIndex = Math.max(0, this.#dialogueChoiceIndex - 1);
      }
      if (this.#input.pressed('confirm')) {
        runner.select(this.#dialogueChoiceIndex);
      }
      return;
    }

    if (this.#input.pressed('confirm')) {
      runner.advance();
    }
  }

  /** Read-only access to whether a recruitment-dialogue overlay is currently active. */
  get dialogueActive(): boolean {
    return this.#dialogueRunner !== null;
  }

  /** Read-only view of the most recent dialogue event (for UI / tests). */
  get dialogueEvent(): DialogueEvent | null {
    return this.#dialogueLastEvent;
  }

  /** Read-only view of the currently focused choice index (for UI / tests). */
  get dialogueChoiceIndex(): number {
    return this.#dialogueChoiceIndex;
  }

  /** Read-only view of the choice options when the runner is on a `choices` event. */
  get dialogueChoices(): readonly DialogueChoice[] {
    if (this.#dialogueLastEvent?.kind === 'choices') {
      return this.#dialogueLastEvent.options;
    }
    return [];
  }

  // ---------------------------------------------------------------------------
  // Internal: rhythm + damage path
  // ---------------------------------------------------------------------------

  #performAttack(): void {
    const attacker = this.#partyState[this.#activeIndex]!.member;
    const move = attacker.moves[0];
    if (move === undefined) {
      return;
    }

    const rhythm = this.#evaluateRhythm(attacker.focus);
    const matchup = getMatchupMultiplier(attacker.genre, this.#enemy.genre);
    this.#applyAttack(attacker, this.#enemy, move, rhythm, matchup, 'party-to-enemy');
  }

  #performStutterBurst(): void {
    // While the enemy is stuttered the active party member lands a guaranteed
    // critical attack. Source of the multiplier table: docs/04 §3.3.
    const attacker = this.#partyState[this.#activeIndex]!.member;
    const move = attacker.moves[0];
    if (move === undefined) {
      return;
    }

    this.#emit({ kind: 'message', text: `${this.#enemy.name} stutters!` });

    const rhythm: RhythmResult = {
      quality: 'critical',
      damageMul: 2.0,
      resReturn: 6,
      deltaMs: 0,
    };
    const matchup = getMatchupMultiplier(attacker.genre, this.#enemy.genre);
    this.#applyAttack(
      attacker,
      this.#enemy,
      move,
      rhythm,
      matchup * ENEMY_STUTTER_BURST_MULT,
      'stutter-burst',
    );
  }

  #applyAttack(
    attacker: PartyMember,
    defender: EnemyCombatant,
    move: MoveAction,
    rhythm: RhythmResult,
    multiplier: number,
    _label: 'party-to-enemy' | 'stutter-burst',
  ): void {
    const scaledRhythm: RhythmResult = {
      quality: rhythm.quality,
      damageMul: rhythm.damageMul * multiplier,
      resReturn: rhythm.resReturn,
      deltaMs: rhythm.deltaMs,
    };

    const events = resolveAction(
      move,
      { ...attacker, hp: this.#partyState[this.#activeIndex]!.hp },
      { ...defender, hp: this.#enemyHp },
      scaledRhythm,
    );

    for (const event of events) {
      this.#applyDamageEvent(event);
      this.#emit(event);
    }

    // Dissonance bookkeeping (docs/04 §3.4):
    //
    //   - Critical/perfect on the opponent => party dissonance falls (the
    //     active member's own meter receives the negative-delta quality),
    //     and the enemy's composure crumbles a notch (we route a positive-
    //     delta quality to the enemy meter to drive it toward stutter).
    //   - Off/miss => party dissonance rises on the active member's meter;
    //     the enemy gets no benefit.
    //   - Good is a wash on both meters.
    this.#partyDissonance.addFromQuality(rhythm.quality);

    if (rhythm.quality === 'critical') {
      this.#enemyDissonance.addFromQuality('miss');
    } else if (rhythm.quality === 'perfect') {
      this.#enemyDissonance.addFromQuality('off');
    }
  }

  #performParry(): void {
    const parryBeat = this.#pendingParryBeat;
    if (parryBeat === null) {
      return;
    }

    const defender = this.#partyState[this.#activeIndex]!.member;
    const nowMs = this.#clockMs();
    const cueMs = parryBeat / this.#beatsPerMs;
    const parry = evaluateParry(nowMs, cueMs, defender.focus);

    this.#emit({
      kind: 'message',
      text: parry.quality === 'miss' ? 'Parry missed!' : `Parry ${parry.quality}!`,
    });

    if (parry.quality !== 'miss') {
      this.#enemyDissonance.addFromQuality('off');
    } else {
      this.#partyDissonance.addFromQuality('miss');
    }

    this.#pendingParryBeat = null;
  }

  #evaluateRhythm(focus: number): RhythmResult {
    const beat = Math.max(0, this.#musicClock.beat());
    const phase = clamp01(this.#musicClock.beatPhase());
    const fractionalBeat = beat + phase;
    // Tiny perceptual jitter routed through the injected rng — never Math.random.
    // The amplitude (±0.5ms) is small enough not to change band classification
    // for any reasonable input, but it keeps `rng` live in the deterministic
    // event log path so the replay harness exercises it.
    const jitterMs = (this.#rng() - 0.5);
    const targetBeat = Math.round(fractionalBeat);
    const msPerBeat = 60_000 / this.#encounter.bpm;
    const nowMs = fractionalBeat * msPerBeat + jitterMs;
    const targetMs = targetBeat * msPerBeat;

    return evaluateRhythmHit(nowMs, targetMs, focus);
  }

  #clockMs(): number {
    const beat = Math.max(0, this.#musicClock.beat());
    const phase = clamp01(this.#musicClock.beatPhase());
    return (beat + phase) * (60_000 / this.#encounter.bpm);
  }

  // ---------------------------------------------------------------------------
  // Internal: boss runner integration
  // ---------------------------------------------------------------------------

  #handleBossEvent(event: BossEvent): void {
    switch (event.kind) {
      case 'phase-enter':
        this.#emit({ kind: 'message', text: `${this.#enemy.name}: phase ${event.phaseId}.` });
        break;
      case 'cue':
        this.#pendingParryBeat = event.beatIndex;
        this.#emit({ kind: 'message', text: 'Incoming attack — parry!' });
        break;
      case 'vulnerable':
        this.#emit({ kind: 'message', text: `Vulnerable! ${event.remainingBeats} beats.` });
        break;
      case 'phase-exit':
        this.#pendingParryBeat = null;
        break;
      case 'defeated':
        this.#bossDefeated = true;
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal: event + outcome bookkeeping
  // ---------------------------------------------------------------------------

  #emit(event: BattleEvent): void {
    this.#events.push(event);
    this.#lastTurnEvents.push(event);
  }

  #applyDamageEvent(event: BattleEvent): void {
    if (event.kind !== 'damage') {
      return;
    }

    if (event.defenderId === this.#enemy.id) {
      this.#enemyHp = Math.max(0, this.#enemyHp - event.amount);
      return;
    }

    for (const state of this.#partyState) {
      if (state.member.id === event.defenderId) {
        state.hp = Math.max(0, state.hp - event.amount);
        return;
      }
    }
  }

  #checkEndConditions(): void {
    if (this.#outcome !== null) {
      return;
    }

    if (this.#enemyHp <= 0) {
      this.#finish('victory');
      return;
    }

    const allDown = this.#partyState.every((state) => state.hp <= 0);
    if (allDown) {
      this.#finish('defeat');
    }
  }

  #finish(outcome: BattleOutcome): void {
    this.#outcome = outcome;
    this.#onComplete(outcome);
  }

  // ---------------------------------------------------------------------------
  // Internal: render helpers
  // ---------------------------------------------------------------------------

  #drawPartyHpBars(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.#partyState.length; i += 1) {
      const state = this.#partyState[i]!;
      const x = HP_BAR_PADDING;
      const y = RENDER_H - HP_BAR_PADDING - HP_BAR_H - 96 - i * HP_BAR_STACK_GAP;
      this.#drawHpBar(ctx, state.member.name, state.hp, state.member.maxHp, x, y);
    }
  }

  #drawEnemyHpBar(ctx: CanvasRenderingContext2D): void {
    this.#drawHpBar(
      ctx,
      this.#enemy.name,
      this.#enemyHp,
      this.#enemy.maxHp,
      RENDER_W - HP_BAR_PADDING - HP_BAR_W,
      HP_BAR_PADDING,
    );
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

    ctx.fillStyle = '#000000';
    ctx.fillRect(snappedX, snappedY, HP_BAR_W, HP_BAR_H);
    ctx.fillStyle = '#3aa856';
    ctx.fillRect(snappedX, snappedY, fillW, HP_BAR_H);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${label} ${Math.round(hp)}/${maxHp}`, snappedX, snappedY - PARTY_LABEL_Y_OFFSET);
  }

  #drawRhythmCue(ctx: CanvasRenderingContext2D): void {
    const phase = clamp01(this.#musicClock.beatPhase());
    const cueX = Math.round((RENDER_W - RHYTHM_CUE_TRAVEL_PX) / 2 + phase * RHYTHM_CUE_TRAVEL_PX);
    const cueY = Math.round(RHYTHM_CUE_Y);

    ctx.fillStyle = '#f7d65a';
    ctx.fillRect(
      cueX - RHYTHM_CUE_RADIUS,
      cueY - RHYTHM_CUE_RADIUS,
      RHYTHM_CUE_RADIUS * 2,
      RHYTHM_CUE_RADIUS * 2,
    );
  }

  #drawParryCue(ctx: CanvasRenderingContext2D): void {
    const cueX = Math.round(RENDER_W / 2);
    const cueY = Math.round(PARRY_CUE_Y);
    ctx.fillStyle = '#ff5577';
    ctx.fillRect(
      cueX - PARRY_CUE_RADIUS,
      cueY - PARRY_CUE_RADIUS,
      PARRY_CUE_RADIUS * 2,
      PARRY_CUE_RADIUS * 2,
    );
  }
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
