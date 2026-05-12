import 'fake-indexeddb/auto';

import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SaveStore } from './store';
import type { SaveSlot, SaveV1 } from './types';

function makeSave(slot: SaveSlot, overrides: Partial<SaveV1> = {}): SaveV1 {
  return {
    v: 1,
    slot,
    createdAt: '2026-05-11T00:00:00.000Z',
    updatedAt: '2026-05-11T01:00:00.000Z',
    playtimeSec: 600,
    player: { x: 4, y: 5, mapId: 'town-01', facing: 'n' },
    party: [{ id: 'pete', level: 1, xp: 0, moves: ['blue-note-bend'] }],
    flags: { metMaestro: true },
    inventory: { etudeBook: 1 },
    settings: { musicVolume: 0.8, sfxVolume: 0.8 },
    ...overrides,
  };
}

let store: SaveStore;
let dbCounter = 0;

beforeEach(async () => {
  dbCounter += 1;
  store = new SaveStore({ factory: new IDBFactory(), dbName: `mom-saves-test-${dbCounter}` });
  await store.init();
});

afterEach(() => {
  store.close();
});

describe('SaveStore', () => {
  it('init is idempotent', async () => {
    await store.init();
    await store.init();
    expect(await store.list()).toEqual([]);
  });

  it('roundtrips a SaveV1 written to slot 0', async () => {
    const save = makeSave(0);

    await store.save(0, save);
    const loaded = await store.load(0);

    expect(loaded).toStrictEqual(save);
  });

  it('returns null when loading an empty slot', async () => {
    expect(await store.load(1)).toBeNull();
  });

  it('lists all written slots ordered by slot index', async () => {
    await store.save(0, makeSave(0, { updatedAt: '2026-05-11T01:00:00.000Z' }));
    await store.save(2, makeSave(2, { updatedAt: '2026-05-11T03:00:00.000Z' }));
    await store.save(1, makeSave(1, { updatedAt: '2026-05-11T02:00:00.000Z' }));

    const summaries = await store.list();

    expect(summaries).toEqual([
      { slot: 0, updatedAt: '2026-05-11T01:00:00.000Z' },
      { slot: 1, updatedAt: '2026-05-11T02:00:00.000Z' },
      { slot: 2, updatedAt: '2026-05-11T03:00:00.000Z' },
    ]);
  });

  it('clears a slot', async () => {
    await store.save(0, makeSave(0));
    await store.clear(0);

    expect(await store.load(0)).toBeNull();
    expect(await store.list()).toEqual([]);
  });

  it('overwrites an existing slot', async () => {
    await store.save(0, makeSave(0, { playtimeSec: 100 }));
    await store.save(0, makeSave(0, { playtimeSec: 200 }));

    const loaded = await store.load(0);
    expect(loaded?.playtimeSec).toBe(200);
  });

  it('rejects save when data slot mismatches target slot', async () => {
    await expect(store.save(0, makeSave(1))).rejects.toThrow(/does not match/);
  });

  it('rejects use before init', async () => {
    const fresh = new SaveStore({ factory: new IDBFactory(), dbName: 'never-init' });
    await expect(fresh.load(0)).rejects.toThrow(/init\(\)/);
  });

  it('throws when no IDBFactory available', () => {
    const original = globalThis.indexedDB;
    // Temporarily strip the global so the constructor's fallback fails.
    (globalThis as unknown as { indexedDB: IDBFactory | undefined }).indexedDB =
      undefined as unknown as IDBFactory;
    try {
      expect(() => new SaveStore({})).toThrow(/IDBFactory/);
    } finally {
      (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = original;
    }
  });

  it('throws on load if stored value is not a valid SaveV1', async () => {
    const db = (store as unknown as { db: IDBDatabase }).db;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('slots', 'readwrite');
      tx.objectStore('slots').put({ corrupt: true }, 0);
      tx.addEventListener('complete', () => {
        resolve();
      });
      tx.addEventListener('error', () => {
        reject(tx.error);
      });
    });

    await expect(store.load(0)).rejects.toThrow();
  });

  it('ignores malformed entries when listing', async () => {
    const db = (store as unknown as { db: IDBDatabase }).db;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('slots', 'readwrite');
      tx.objectStore('slots').put({ bogus: true }, 0);
      tx.addEventListener('complete', () => {
        resolve();
      });
      tx.addEventListener('error', () => {
        reject(tx.error);
      });
    });
    await store.save(1, makeSave(1));

    const summaries = await store.list();
    expect(summaries).toEqual([{ slot: 1, updatedAt: makeSave(1).updatedAt }]);
  });
});
