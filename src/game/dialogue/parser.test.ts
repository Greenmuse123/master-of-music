import { describe, expect, it } from 'vitest';

import { parseDialogueScript } from './parser';

describe('parseDialogueScript', () => {
  it('accepts a valid DialogueScript JSON', () => {
    expect(
      parseDialogueScript({
        id: 'valid',
        entry: 'start',
        nodes: {
          start: {
            id: 'start',
            speaker: 'Host',
            portrait: 'host.png',
            lines: ['Welcome'],
            choices: [{ id: 'continue', label: 'Continue', next: 'end', flag: 'met-host' }],
          },
          end: { id: 'end', lines: [], next: undefined },
        },
      }),
    ).toEqual({
      id: 'valid',
      entry: 'start',
      nodes: {
        start: {
          id: 'start',
          speaker: 'Host',
          portrait: 'host.png',
          lines: ['Welcome'],
          choices: [{ id: 'continue', label: 'Continue', next: 'end', flag: 'met-host' }],
        },
        end: { id: 'end', lines: [], next: undefined },
      },
    });
  });

  it('rejects malformed JSON', () => {
    expect(() => parseDialogueScript({ id: 'bad' })).toThrow();
  });

  it('rejects a script with an unknown entry node', () => {
    expect(() =>
      parseDialogueScript({
        id: 'unknown-entry',
        entry: 'missing',
        nodes: {
          start: { id: 'start', lines: [] },
        },
      }),
    ).toThrow('Dialogue script "unknown-entry" entry references unknown node "missing".');
  });

  it('rejects a node with next pointing at an unknown id', () => {
    expect(() =>
      parseDialogueScript({
        id: 'unknown-next',
        entry: 'start',
        nodes: {
          start: { id: 'start', lines: [], next: 'missing' },
        },
      }),
    ).toThrow('Dialogue node "start" next references unknown node "missing".');
  });

  it('rejects a choice with next pointing at an unknown id', () => {
    expect(() =>
      parseDialogueScript({
        id: 'unknown-choice',
        entry: 'start',
        nodes: {
          start: {
            id: 'start',
            lines: [],
            choices: [{ id: 'bad-choice', label: 'Bad', next: 'missing' }],
          },
        },
      }),
    ).toThrow('Dialogue choice "bad-choice" in node "start" references unknown node "missing".');
  });
});
