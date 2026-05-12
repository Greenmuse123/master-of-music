import type { BossEvent, BossPhase, BossScript } from './boss-types';

type BossPhaseRunnerOptions = {
  script: BossScript;
  onEvent: (event: BossEvent) => void;
};

/**
 * Deterministic boss phase script runner for docs/04-COMBAT_SYSTEM.md section 5.
 *
 * The battle scene owns clocks, HP, rendering, and audio. This runner only maps
 * pushed beat indices and HP fractions into phase, cue, vulnerable, and defeat
 * events for bespoke boss encounters.
 */
export class BossPhaseRunner {
  private readonly script: BossScript;
  private readonly onEvent: (event: BossEvent) => void;
  private phaseIndex = 0;
  private started = false;
  private finished = false;
  private phaseStartBeat: number | null = null;
  private readonly emittedCueKeys = new Set<string>();
  private readonly emittedVulnerableKeys = new Set<string>();
  private stutterAdvanceRequested = false;
  private defeatStartBeat: number | null = null;

  public constructor({ script, onEvent }: BossPhaseRunnerOptions) {
    this.script = script;
    this.onEvent = onEvent;
  }

  public start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    const phase = this.currentPhase();
    if (phase === undefined) {
      this.finish();
      return;
    }

    this.onEvent({ kind: 'phase-enter', phaseId: phase.id });
  }

  public tick(beat: number, bossHpFraction: number): void {
    if (!this.started || this.finished) {
      return;
    }

    if (this.defeatStartBeat !== null) {
      this.finishDefeatIfReady(beat);
      return;
    }

    const phase = this.currentPhase()!;

    if (this.phaseStartBeat === null) {
      this.phaseStartBeat = beat;
    }

    this.emitPatternCues(phase, beat);
    this.emitVulnerableEvents(phase, beat);

    if (this.shouldCompletePhase(phase, bossHpFraction)) {
      this.completePhase(beat);
      return;
    }

    if (this.isLastPhase() && bossHpFraction <= 0) {
      this.completePhase(beat);
    }
  }

  public triggerStutterAdvance(): void {
    if (!this.started || this.finished) {
      return;
    }

    this.stutterAdvanceRequested = true;
  }

  public currentPhaseId(): string {
    return this.currentPhase()?.id ?? '';
  }

  public isFinished(): boolean {
    return this.finished;
  }

  private currentPhase(): BossPhase | undefined {
    return this.script.phases[this.phaseIndex];
  }

  private emitPatternCues(phase: BossPhase, beat: number): void {
    const phaseBeat = this.phaseBeat(beat);

    for (const patternBeat of phase.patternBeats) {
      if (phaseBeat !== phase.patternIntroBeats + patternBeat) {
        continue;
      }

      const key = `${this.phaseIndex}:cue:${patternBeat}`;
      if (this.emittedCueKeys.has(key)) {
        continue;
      }

      this.emittedCueKeys.add(key);
      this.onEvent({ kind: 'cue', beatIndex: patternBeat });
    }
  }

  private emitVulnerableEvents(phase: BossPhase, beat: number): void {
    if (phase.vulnerableBeats <= 0) {
      return;
    }

    const phaseBeat = this.phaseBeat(beat);
    const firstVulnerableBeat = phase.patternIntroBeats + this.patternDuration(phase);
    const vulnerableElapsed = phaseBeat - firstVulnerableBeat;

    if (vulnerableElapsed < 0 || vulnerableElapsed >= phase.vulnerableBeats) {
      return;
    }

    const remainingBeats = phase.vulnerableBeats - vulnerableElapsed;
    const key = `${this.phaseIndex}:vulnerable:${remainingBeats}`;
    if (this.emittedVulnerableKeys.has(key)) {
      return;
    }

    this.emittedVulnerableKeys.add(key);
    this.onEvent({ kind: 'vulnerable', remainingBeats });
  }

  private shouldCompletePhase(phase: BossPhase, bossHpFraction: number): boolean {
    if (this.stutterAdvanceRequested) {
      return true;
    }

    if (phase.hpThreshold === undefined) {
      return false;
    }

    return bossHpFraction < phase.hpThreshold;
  }

  private completePhase(beat: number): void {
    const phase = this.currentPhase()!;

    this.onEvent({ kind: 'phase-exit', phaseId: phase.id });
    this.stutterAdvanceRequested = false;

    if (this.isLastPhase()) {
      this.startDefeatOrFinish(beat);
      return;
    }

    this.phaseIndex += 1;
    this.phaseStartBeat = beat;
    const nextPhase = this.currentPhase()!;

    this.onEvent({ kind: 'phase-enter', phaseId: nextPhase.id });
  }

  private startDefeatOrFinish(beat: number): void {
    if (this.script.finalDefeatBeats <= 0) {
      this.finish();
      return;
    }

    this.defeatStartBeat = beat;
  }

  private finishDefeatIfReady(beat: number): void {
    if (beat - this.defeatStartBeat! >= this.script.finalDefeatBeats) {
      this.finish();
    }
  }

  private finish(): void {
    this.finished = true;
    this.onEvent({ kind: 'defeated' });
  }

  private isLastPhase(): boolean {
    return this.phaseIndex === this.script.phases.length - 1;
  }

  private patternDuration(phase: BossPhase): number {
    return phase.patternBeats.length === 0 ? 0 : Math.max(...phase.patternBeats) + 1;
  }

  private phaseBeat(beat: number): number {
    return beat - this.phaseStartBeat!;
  }
}
