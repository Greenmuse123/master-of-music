import { describe, expect, it } from 'vitest';

import bayouNpc1 from '../../data/dialogue/bayou-npc-1.json';
import diminuendoDefeat from '../../data/dialogue/diminuendo-defeat.json';
import intro from '../../data/dialogue/intro.json';
import { DialogueRunner } from '../dialogue/dialogue-runner';
import type { DialogueEvent } from '../dialogue/dialogue-types';
import { loadAllDialogues, loadDialogue } from './load-dialogue';

describe('loadDialogue', () => {
  it('parses the intro script (3-line linear; entry=open)', () => {
    const script = loadDialogue(intro);
    expect(script.id).toBe('intro');
    expect(script.entry).toBe('open');
    const open = script.nodes['open'];
    expect(open).toBeDefined();
    expect(open?.lines).toHaveLength(3);
    expect(open?.choices).toBeUndefined();
    expect(open?.next).toBeUndefined();
  });

  it('parses the diminuendo-defeat branching script', () => {
    const script = loadDialogue(diminuendoDefeat);
    expect(script.id).toBe('diminuendo-defeat');
    const entry = script.nodes[script.entry];
    expect(entry?.lines).toHaveLength(3);
    expect(entry?.choices).toEqual([
      {
        id: 'sing-back',
        label: 'Offer a song.',
        next: 'recruit-attempt',
        flag: 'recruit-diminuendo',
      },
      { id: 'walk-away', label: 'Walk away in silence.', next: 'silence' },
    ]);
    expect(script.nodes['recruit-attempt']?.lines).toHaveLength(2);
    expect(script.nodes['silence']?.lines).toHaveLength(1);
  });

  it('parses the bayou-npc-1 two-line atmospheric script', () => {
    const script = loadDialogue(bayouNpc1);
    expect(script.id).toBe('bayou-npc-1');
    const greet = script.nodes[script.entry];
    expect(greet?.lines).toHaveLength(2);
    expect(greet?.lines[0]).toBe("This here's the bayou, son. Mind the spirits.");
  });
});

describe('loadAllDialogues', () => {
  it('keys every shipped script by its id', () => {
    const scripts = loadAllDialogues([intro, diminuendoDefeat, bayouNpc1]);
    expect([...scripts.keys()].sort()).toEqual(
      ['bayou-npc-1', 'diminuendo-defeat', 'intro'].sort(),
    );
    expect(scripts.get('intro')?.entry).toBe('open');
  });

  it('returns an empty map when passed no scripts', () => {
    expect(loadAllDialogues([]).size).toBe(0);
  });

  it('rejects duplicate script ids', () => {
    expect(() => loadAllDialogues([intro, intro])).toThrow('Duplicate dialogue script id "intro".');
  });
});

describe('diminuendo-defeat integration with DialogueRunner', () => {
  it("emits a finished event with flags: ['recruit-diminuendo'] when 'sing-back' is chosen", () => {
    const script = loadDialogue(diminuendoDefeat);
    const events: DialogueEvent[] = [];
    const runner = new DialogueRunner({
      script,
      onEvent: (event) => {
        events.push(event);
      },
    });

    runner.start();
    // 3 lament lines → choices
    runner.advance();
    runner.advance();
    runner.advance();
    // Pick "Offer a song." (sing-back, index 0)
    runner.select(0);
    // 2 recruit-attempt lines → finished
    runner.advance();
    runner.advance();

    const finished = events.at(-1);
    expect(finished).toEqual({
      kind: 'finished',
      path: ['lament', 'sing-back', 'recruit-attempt'],
      flags: ['recruit-diminuendo'],
    });
  });

  it("emits a finished event with empty flags when 'walk-away' is chosen", () => {
    const script = loadDialogue(diminuendoDefeat);
    const events: DialogueEvent[] = [];
    const runner = new DialogueRunner({
      script,
      onEvent: (event) => {
        events.push(event);
      },
    });

    runner.start();
    runner.advance();
    runner.advance();
    runner.advance();
    runner.select(1);
    runner.advance();

    expect(events.at(-1)).toEqual({
      kind: 'finished',
      path: ['lament', 'walk-away', 'silence'],
      flags: [],
    });
  });
});
