import { describe, expect, it } from 'vitest';

import { isValidSaveV1, parseSaveV1, saveV1Schema, settingsV1Schema } from './schema';
import type { SaveV1 } from './types';

function makeValidSave(): SaveV1 {
  return {
    v: 1,
    slot: 0,
    createdAt: '2026-05-11T00:00:00.000Z',
    updatedAt: '2026-05-11T01:00:00.000Z',
    playtimeSec: 600,
    player: { x: 4, y: 5, mapId: 'town-01', facing: 'n' },
    party: [{ id: 'pete', level: 1, xp: 0, moves: ['blue-note-bend'] }],
    flags: { metMaestro: true, recruits: 1 },
    inventory: { etudeBook: 1 },
    settings: {
      musicVolume: 70,
      sfxVolume: 80,
      relaxedRhythm: false,
      highContrast: false,
      audioOnlyCues: false,
    },
  };
}

describe('saveV1Schema', () => {
  it('accepts a fully-populated valid SaveV1', () => {
    const valid = makeValidSave();

    const parsed = parseSaveV1(valid);

    expect(parsed).toStrictEqual(valid);
    expect(isValidSaveV1(valid)).toBe(true);
  });

  it('accepts each legal slot value 0, 1, 2', () => {
    for (const slot of [0, 1, 2] as const) {
      const save: SaveV1 = { ...makeValidSave(), slot };
      expect(isValidSaveV1(save)).toBe(true);
    }
  });

  it('rejects missing v field', () => {
    const valid = makeValidSave();
    const rest: Record<string, unknown> = { ...valid };
    delete rest['v'];

    expect(isValidSaveV1(rest)).toBe(false);
  });

  it('rejects wrong v literal', () => {
    const invalid = { ...makeValidSave(), v: 2 };

    expect(isValidSaveV1(invalid)).toBe(false);
  });

  it('rejects out-of-range slot value', () => {
    const invalid = { ...makeValidSave(), slot: 3 };

    expect(isValidSaveV1(invalid)).toBe(false);
  });

  it('rejects negative slot', () => {
    const invalid = { ...makeValidSave(), slot: -1 };

    expect(isValidSaveV1(invalid)).toBe(false);
  });

  it('rejects missing player.mapId', () => {
    const valid = makeValidSave();
    const invalid = {
      ...valid,
      player: { x: valid.player.x, y: valid.player.y, facing: valid.player.facing },
    };

    expect(isValidSaveV1(invalid)).toBe(false);
  });

  it('rejects illegal facing value', () => {
    const valid = makeValidSave();
    const invalid = { ...valid, player: { ...valid.player, facing: 'up' } };

    expect(isValidSaveV1(invalid)).toBe(false);
  });

  it('rejects negative playtimeSec', () => {
    const invalid = { ...makeValidSave(), playtimeSec: -1 };

    expect(isValidSaveV1(invalid)).toBe(false);
  });

  it('rejects empty mapId', () => {
    const valid = makeValidSave();
    const invalid = { ...valid, player: { ...valid.player, mapId: '' } };

    expect(isValidSaveV1(invalid)).toBe(false);
  });

  it('rejects party member with wrong types', () => {
    const valid = makeValidSave();
    const invalid = {
      ...valid,
      party: [{ id: 'pete', level: '1', xp: 0, moves: [] }],
    };

    expect(isValidSaveV1(invalid)).toBe(false);
  });

  it('rejects null input', () => {
    expect(isValidSaveV1(null)).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(isValidSaveV1('not a save')).toBe(false);
    expect(isValidSaveV1(42)).toBe(false);
  });

  it('parseSaveV1 throws on invalid input', () => {
    expect(() => parseSaveV1({})).toThrow();
  });

  it('exports a schema instance with safeParse', () => {
    expect(saveV1Schema.safeParse(makeValidSave()).success).toBe(true);
  });

  it('settings schema validates volume bounds (0-100) and requires all toggle fields', () => {
    const valid = {
      musicVolume: 70,
      sfxVolume: 100,
      relaxedRhythm: false,
      highContrast: true,
      audioOnlyCues: false,
    };
    expect(settingsV1Schema.safeParse(valid).success).toBe(true);
    expect(settingsV1Schema.safeParse({ ...valid, musicVolume: 101 }).success).toBe(false);
    expect(settingsV1Schema.safeParse({ ...valid, musicVolume: -1 }).success).toBe(false);
    // Missing a toggle is invalid.
    const withoutToggle: Record<string, unknown> = { ...valid };
    delete withoutToggle['relaxedRhythm'];
    expect(settingsV1Schema.safeParse(withoutToggle).success).toBe(false);
  });
});
