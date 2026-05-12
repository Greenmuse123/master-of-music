import { describe, expect, it } from 'vitest';

import { BossPhaseRunner } from './boss-phase';
import type { BossEvent, BossScript } from './boss-types';

const THREE_PHASE_SCRIPT: BossScript = {
  id: 'quartet-test',
  finalDefeatBeats: 0,
  phases: [
    {
      id: 'intro',
      patternIntroBeats: 2,
      patternBeats: [0, 2],
      vulnerableBeats: 2,
      hpThreshold: 0.66,
    },
    {
      id: 'solo',
      patternIntroBeats: 1,
      patternBeats: [1],
      vulnerableBeats: 1,
      hpThreshold: 0.33,
    },
    {
      id: 'finale',
      patternIntroBeats: 0,
      patternBeats: [0],
      vulnerableBeats: 1,
    },
  ],
};

const collectEvents = (script: BossScript = THREE_PHASE_SCRIPT) => {
  const events: BossEvent[] = [];
  const runner = new BossPhaseRunner({
    script,
    onEvent: (event) => events.push(event),
  });

  return { events, runner };
};

describe('BossPhaseRunner', () => {
  it('advances a 3-phase script through hp thresholds and defeat', () => {
    const { events, runner } = collectEvents();

    runner.start();
    runner.tick(0, 1);
    runner.tick(1, 0.66);
    runner.tick(2, 0.65);
    runner.tick(3, 0.5);
    runner.tick(4, 0.32);
    runner.tick(5, 0.1);
    runner.tick(6, 0);

    expect(events).toEqual([
      { kind: 'phase-enter', phaseId: 'intro' },
      { kind: 'cue', beatIndex: 0 },
      { kind: 'phase-exit', phaseId: 'intro' },
      { kind: 'phase-enter', phaseId: 'solo' },
      { kind: 'cue', beatIndex: 1 },
      { kind: 'phase-exit', phaseId: 'solo' },
      { kind: 'phase-enter', phaseId: 'finale' },
      { kind: 'vulnerable', remainingBeats: 1 },
      { kind: 'phase-exit', phaseId: 'finale' },
      { kind: 'defeated' },
    ]);
    expect(runner.currentPhaseId()).toBe('finale');
    expect(runner.isFinished()).toBe(true);
  });

  it('emits pattern cue events at phase-relative beat indices once', () => {
    const { events, runner } = collectEvents();

    runner.start();
    runner.tick(10, 1);
    runner.tick(11, 1);
    runner.tick(12, 1);
    runner.tick(12, 1);
    runner.tick(13, 1);
    runner.tick(14, 1);

    expect(events).toEqual([
      { kind: 'phase-enter', phaseId: 'intro' },
      { kind: 'cue', beatIndex: 0 },
      { kind: 'cue', beatIndex: 2 },
    ]);
  });

  it('triggerStutterAdvance forces the next phase without an hp drop', () => {
    const { events, runner } = collectEvents();

    runner.start();
    runner.tick(0, 1);
    runner.triggerStutterAdvance();
    runner.tick(1, 1);
    runner.triggerStutterAdvance();
    runner.tick(2, 1);

    expect(events).toEqual([
      { kind: 'phase-enter', phaseId: 'intro' },
      { kind: 'phase-exit', phaseId: 'intro' },
      { kind: 'phase-enter', phaseId: 'solo' },
      { kind: 'phase-exit', phaseId: 'solo' },
      { kind: 'phase-enter', phaseId: 'finale' },
    ]);
    expect(runner.currentPhaseId()).toBe('finale');
    expect(runner.isFinished()).toBe(false);
  });

  it('emits vulnerable events with remaining beats counting down', () => {
    const { events, runner } = collectEvents({
      id: 'vulnerable-test',
      finalDefeatBeats: 0,
      phases: [
        {
          id: 'phase-a',
          patternIntroBeats: 1,
          patternBeats: [0, 1],
          vulnerableBeats: 3,
        },
      ],
    });

    runner.start();
    runner.tick(0, 1);
    runner.tick(1, 1);
    runner.tick(2, 1);
    runner.tick(3, 1);
    runner.tick(4, 1);
    runner.tick(4, 1);
    runner.tick(5, 1);

    expect(events).toEqual([
      { kind: 'phase-enter', phaseId: 'phase-a' },
      { kind: 'cue', beatIndex: 0 },
      { kind: 'cue', beatIndex: 1 },
      { kind: 'vulnerable', remainingBeats: 3 },
      { kind: 'vulnerable', remainingBeats: 2 },
      { kind: 'vulnerable', remainingBeats: 1 },
    ]);
  });

  it('does not re-emit phase-enter when start is called twice', () => {
    const { events, runner } = collectEvents();

    runner.start();
    runner.start();

    expect(events).toEqual([{ kind: 'phase-enter', phaseId: 'intro' }]);
  });

  it('handles empty scripts and delayed final defeat deterministically', () => {
    const empty = collectEvents({ id: 'empty', phases: [], finalDefeatBeats: 0 });
    empty.runner.start();
    empty.runner.tick(0, 0);
    empty.runner.triggerStutterAdvance();

    expect(empty.events).toEqual([{ kind: 'defeated' }]);
    expect(empty.runner.currentPhaseId()).toBe('');
    expect(empty.runner.isFinished()).toBe(true);

    const delayed = collectEvents({
      id: 'delayed',
      finalDefeatBeats: 2,
      phases: [
        {
          id: 'only',
          patternIntroBeats: 0,
          patternBeats: [],
          vulnerableBeats: 0,
        },
      ],
    });
    delayed.runner.start();
    delayed.runner.tick(20, 0);
    delayed.runner.tick(21, 0);
    delayed.runner.tick(22, 0);
    delayed.runner.tick(23, 0);

    expect(delayed.events).toEqual([
      { kind: 'phase-enter', phaseId: 'only' },
      { kind: 'phase-exit', phaseId: 'only' },
      { kind: 'defeated' },
    ]);
    expect(delayed.runner.isFinished()).toBe(true);

    const emptyPattern = collectEvents({
      id: 'empty-pattern',
      finalDefeatBeats: 0,
      phases: [
        {
          id: 'rest',
          patternIntroBeats: 1,
          patternBeats: [],
          vulnerableBeats: 1,
        },
      ],
    });
    emptyPattern.runner.start();
    emptyPattern.runner.tick(30, 1);
    emptyPattern.runner.tick(31, 1);

    expect(emptyPattern.events).toEqual([
      { kind: 'phase-enter', phaseId: 'rest' },
      { kind: 'vulnerable', remainingBeats: 1 },
    ]);
  });
});
