import { describe, expect, it } from 'vitest';

import { DialogueRunner } from './dialogue-runner';
import type { DialogueEvent, DialogueScript } from './dialogue-types';

function collectEvents(script: DialogueScript): {
  events: DialogueEvent[];
  runner: DialogueRunner;
} {
  const events: DialogueEvent[] = [];
  const runner = new DialogueRunner({
    script,
    onEvent: (event) => {
      events.push(event);
    },
  });

  return { events, runner };
}

describe('DialogueRunner', () => {
  it('advances a two-node linear script and finishes with the visited path', () => {
    const { events, runner } = collectEvents({
      id: 'linear',
      entry: 'A',
      nodes: {
        A: { id: 'A', speaker: 'Leader', portrait: 'leader.png', lines: ['A1', 'A2'], next: 'B' },
        B: { id: 'B', lines: ['B1'] },
      },
    });

    runner.start();
    runner.advance();
    runner.advance();
    runner.advance();

    expect(events).toEqual([
      { kind: 'line', nodeId: 'A', speaker: 'Leader', text: 'A1' },
      { kind: 'line', nodeId: 'A', speaker: 'Leader', text: 'A2' },
      { kind: 'line', nodeId: 'B', speaker: undefined, text: 'B1' },
      { kind: 'finished', path: ['A', 'B'], flags: [] },
    ]);
  });

  it('emits choices after lines and select advances to the chosen next node', () => {
    const { events, runner } = collectEvents({
      id: 'branch',
      entry: 'start',
      nodes: {
        start: {
          id: 'start',
          lines: ['Pick one'],
          choices: [
            { id: 'left-choice', label: 'Left', next: 'left' },
            { id: 'right-choice', label: 'Right', next: 'right' },
          ],
        },
        left: { id: 'left', lines: ['Left line'] },
        right: { id: 'right', lines: ['Right line'] },
      },
    });

    runner.start();
    runner.advance();
    runner.advance();
    runner.select(0);
    runner.advance();

    expect(events).toEqual([
      { kind: 'line', nodeId: 'start', speaker: undefined, text: 'Pick one' },
      {
        kind: 'choices',
        nodeId: 'start',
        options: [
          { id: 'left-choice', label: 'Left', next: 'left' },
          { id: 'right-choice', label: 'Right', next: 'right' },
        ],
      },
      { kind: 'line', nodeId: 'left', speaker: undefined, text: 'Left line' },
      { kind: 'finished', path: ['start', 'left-choice', 'left'], flags: [] },
    ]);
  });

  it('records a selected choice flag in the finished event', () => {
    const { events, runner } = collectEvents({
      id: 'flagged',
      entry: 'start',
      nodes: {
        start: {
          id: 'start',
          lines: [],
          choices: [{ id: 'help', label: 'Help', next: 'end', flag: 'agreed-to-help' }],
        },
        end: { id: 'end', lines: [] },
      },
    });

    runner.start();
    runner.select(0);

    expect(events.at(-1)).toEqual({
      kind: 'finished',
      path: ['start', 'help', 'end'],
      flags: ['agreed-to-help'],
    });
  });

  it('throws if select is called before a choices event', () => {
    const { runner } = collectEvents({
      id: 'bad-select',
      entry: 'start',
      nodes: {
        start: { id: 'start', lines: ['hello'] },
      },
    });

    runner.start();

    expect(() => runner.select(0)).toThrow(
      'DialogueRunner select() is only valid after a choices event.',
    );
  });

  it('throws if a selected choice index is out of range', () => {
    const { runner } = collectEvents({
      id: 'bad-index',
      entry: 'start',
      nodes: {
        start: {
          id: 'start',
          lines: [],
          choices: [{ id: 'only', label: 'Only', next: 'end' }],
        },
        end: { id: 'end', lines: [] },
      },
    });

    runner.start();

    expect(() => runner.select(1)).toThrow('DialogueRunner choice index 1 is out of range.');
  });

  it('throws at start for unknown node references', () => {
    const { runner } = collectEvents({
      id: 'unknown-next',
      entry: 'start',
      nodes: {
        start: { id: 'start', lines: [], next: 'missing' },
      },
    });

    expect(() => runner.start()).toThrow(
      'Dialogue script "unknown-next" references unknown node "missing".',
    );
  });

  it('throws at start for unknown choice node references', () => {
    const { runner } = collectEvents({
      id: 'unknown-choice-next',
      entry: 'start',
      nodes: {
        start: {
          id: 'start',
          lines: [],
          choices: [{ id: 'bad', label: 'Bad', next: 'missing' }],
        },
      },
    });

    expect(() => runner.start()).toThrow(
      'Dialogue script "unknown-choice-next" references unknown node "missing".',
    );
  });

  it('does not re-emit the first line when start is called twice', () => {
    const { events, runner } = collectEvents({
      id: 'idempotent',
      entry: 'start',
      nodes: {
        start: { id: 'start', lines: ['hello'] },
      },
    });

    runner.start();
    runner.start();

    expect(events).toEqual([{ kind: 'line', nodeId: 'start', speaker: undefined, text: 'hello' }]);
  });

  it('throws if advance is called before start and no-ops after finished', () => {
    const { events, runner } = collectEvents({
      id: 'lifecycle',
      entry: 'start',
      nodes: {
        start: { id: 'start', lines: [] },
      },
    });

    expect(() => runner.advance()).toThrow('DialogueRunner cannot advance before start().');

    runner.start();
    runner.advance();

    expect(events).toEqual([{ kind: 'finished', path: ['start'], flags: [] }]);
  });
});
