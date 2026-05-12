import { parseSaveV1 } from './schema';
import type { SaveSlot, SaveSummary, SaveV1 } from './types';

const DB_NAME = 'mom-saves';
const DB_VERSION = 1;
const STORE = 'slots';

function awaitRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => {
      resolve(request.result);
    });
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    });
  });
}

function awaitTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => {
      resolve();
    });
    transaction.addEventListener('error', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    });
    transaction.addEventListener('abort', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });
  });
}

export class SaveStore {
  private readonly dbName: string;
  private readonly factory: IDBFactory;
  private db: IDBDatabase | null = null;

  constructor(options: { factory?: IDBFactory; dbName?: string } = {}) {
    const factory = options.factory ?? globalThis.indexedDB;

    if (factory === undefined || factory === null) {
      throw new Error('SaveStore requires an IDBFactory (globalThis.indexedDB not available).');
    }

    this.factory = factory;
    this.dbName = options.dbName ?? DB_NAME;
  }

  async init(): Promise<void> {
    if (this.db !== null) {
      return;
    }

    this.db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.factory.open(this.dbName, DB_VERSION);

      request.addEventListener('upgradeneeded', () => {
        const upgradeDb = request.result;
        if (!upgradeDb.objectStoreNames.contains(STORE)) {
          upgradeDb.createObjectStore(STORE);
        }
      });
      request.addEventListener('success', () => {
        resolve(request.result);
      });
      request.addEventListener('error', () => {
        reject(request.error ?? new Error('IndexedDB open failed'));
      });
      request.addEventListener('blocked', () => {
        reject(new Error('IndexedDB open blocked'));
      });
    });
  }

  async save(slot: SaveSlot, data: SaveV1): Promise<void> {
    if (data.slot !== slot) {
      throw new Error(`Save data slot (${data.slot}) does not match target slot (${slot}).`);
    }

    const db = this.requireDb();
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);

    store.put(data, slot);

    await awaitTransaction(transaction);
  }

  async load(slot: SaveSlot): Promise<SaveV1 | null> {
    const db = this.requireDb();
    const transaction = db.transaction(STORE, 'readonly');
    const store = transaction.objectStore(STORE);
    const result: unknown = await awaitRequest(store.get(slot));

    if (result === undefined || result === null) {
      return null;
    }

    return parseSaveV1(result);
  }

  async list(): Promise<SaveSummary[]> {
    const db = this.requireDb();
    const transaction = db.transaction(STORE, 'readonly');
    const store = transaction.objectStore(STORE);
    const summaries: SaveSummary[] = [];

    await new Promise<void>((resolve, reject) => {
      const cursorRequest = store.openCursor();
      cursorRequest.addEventListener('success', () => {
        const cursor = cursorRequest.result;

        if (cursor === null) {
          resolve();
          return;
        }

        const value: unknown = cursor.value;

        if (isSummaryCandidate(value)) {
          summaries.push({ slot: value.slot, updatedAt: value.updatedAt });
        }

        cursor.continue();
      });
      cursorRequest.addEventListener('error', () => {
        reject(cursorRequest.error ?? new Error('IndexedDB cursor failed'));
      });
    });

    summaries.sort((a, b) => a.slot - b.slot);
    return summaries;
  }

  async clear(slot: SaveSlot): Promise<void> {
    const db = this.requireDb();
    const transaction = db.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);

    store.delete(slot);

    await awaitTransaction(transaction);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  private requireDb(): IDBDatabase {
    if (this.db === null) {
      throw new Error('SaveStore.init() must be awaited before use.');
    }
    return this.db;
  }
}

function isSummaryCandidate(value: unknown): value is { slot: SaveSlot; updatedAt: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const slot = record['slot'];
  const updatedAt = record['updatedAt'];
  return (slot === 0 || slot === 1 || slot === 2) && typeof updatedAt === 'string';
}
