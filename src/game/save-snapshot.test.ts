import { describe, expect, it } from 'vitest';

import type { SaveV1, SettingsV1 } from '../engine/save/types';
import { buildSaveSnapshot } from './save-snapshot';

const DEFAULT_SETTINGS: SettingsV1 = {
  audioOnlyCues: false,
  highContrast: false,
  musicVolume: 70,
  relaxedRhythm: false,
  sfxVolume: 80,
};

describe('buildSaveSnapshot', () => {
  it('builds a valid SaveV1 with fresh defaults when no existing save is provided', () => {
    const save = buildSaveSnapshot({
      nowIso: '2026-05-12T00:00:00.000Z',
      region: 'jazz-city',
      settings: DEFAULT_SETTINGS,
      slot: 0,
    });

    expect(save.v).toBe(1);
    expect(save.slot).toBe(0);
    expect(save.region).toBe('jazz-city');
    expect(save.settings).toStrictEqual(DEFAULT_SETTINGS);
    expect(save.createdAt).toBe('2026-05-12T00:00:00.000Z');
    expect(save.updatedAt).toBe('2026-05-12T00:00:00.000Z');
    expect(save.playtimeSec).toBe(0);
    expect(save.party).toHaveLength(1);
    expect(save.party[0]?.id).toBe('sol');
  });

  it('preserves createdAt, playtimeSec, player, party from an existing save', () => {
    const existing: SaveV1 = {
      createdAt: '2026-04-01T00:00:00.000Z',
      flags: { metMaestro: true },
      inventory: { etudeBook: 1 },
      party: [{ id: 'pete', level: 5, moves: ['walking-bass'], xp: 100 }],
      player: { facing: 'n', mapId: 'bayou', x: 3, y: 2 },
      playtimeSec: 3600,
      region: 'bayou',
      settings: { ...DEFAULT_SETTINGS, musicVolume: 50 },
      slot: 0,
      updatedAt: '2026-05-11T00:00:00.000Z',
      v: 1,
    };

    const save = buildSaveSnapshot({
      existing,
      nowIso: '2026-05-12T00:00:00.000Z',
      region: 'jazz-city',
      settings: DEFAULT_SETTINGS,
      slot: 0,
    });

    expect(save.createdAt).toBe('2026-04-01T00:00:00.000Z');
    expect(save.updatedAt).toBe('2026-05-12T00:00:00.000Z');
    expect(save.playtimeSec).toBe(3600);
    expect(save.party).toStrictEqual(existing.party);
    expect(save.flags).toStrictEqual(existing.flags);
    expect(save.inventory).toStrictEqual(existing.inventory);
    expect(save.player).toStrictEqual(existing.player);
    // Region + settings come from the LIVE inputs, not the existing snapshot.
    expect(save.region).toBe('jazz-city');
    expect(save.settings).toStrictEqual(DEFAULT_SETTINGS);
  });

  it('roundtrips through the SaveV1 schema (no validation failures)', async () => {
    const { saveV1Schema } = await import('../engine/save/schema');
    const save = buildSaveSnapshot({
      nowIso: '2026-05-12T00:00:00.000Z',
      region: 'bayou',
      settings: DEFAULT_SETTINGS,
      slot: 1,
    });
    expect(saveV1Schema.safeParse(save).success).toBe(true);
  });
});
