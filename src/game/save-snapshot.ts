/**
 * Pure builder for SaveV1 snapshots. Used by Game on Settings.apply and on
 * overworld region transitions to persist a best-effort SaveV1 to slot 0.
 *
 * Phase-4: only `settings` and `region` are meaningfully driven by the live
 * game state today; the rest of SaveV1 falls back to either the previous
 * snapshot (preserving createdAt + playtimeSec across sessions) or a sane
 * default. Phase 4.5+ wires player position, party progression, flags,
 * and inventory into the snapshot builder.
 */

import type { RegionId } from '../game/overworld/types';
import type { Facing, SaveSlot, SaveV1, SettingsV1 } from '../engine/save/types';

export interface SaveSnapshotInput {
  readonly slot: SaveSlot;
  readonly settings: SettingsV1;
  readonly region: RegionId;
  /** Injected for tests; defaults to `Date.now()` via the caller. */
  readonly nowIso: string;
  /** Previous snapshot for the same slot, if any — preserves createdAt + playtimeSec. */
  readonly existing?: SaveV1;
}

const DEFAULT_PLAYER: SaveV1['player'] = Object.freeze({
  facing: 's' as Facing,
  mapId: 'jazz-city',
  x: 1,
  y: 2,
});

const DEFAULT_PARTY: SaveV1['party'] = Object.freeze([
  Object.freeze({
    id: 'sol',
    level: 1,
    moves: Object.freeze(['brass-burst', 'syncopation']),
    xp: 0,
  }),
]);

const DEFAULT_FLAGS: SaveV1['flags'] = Object.freeze({});
const DEFAULT_INVENTORY: SaveV1['inventory'] = Object.freeze({});

export function buildSaveSnapshot(input: SaveSnapshotInput): SaveV1 {
  const existing = input.existing;
  const createdAt = existing?.createdAt ?? input.nowIso;
  const playtimeSec = existing?.playtimeSec ?? 0;
  const player = existing?.player ?? DEFAULT_PLAYER;
  const party = existing?.party ?? DEFAULT_PARTY;
  const flags = existing?.flags ?? DEFAULT_FLAGS;
  const inventory = existing?.inventory ?? DEFAULT_INVENTORY;

  return {
    createdAt,
    flags,
    inventory,
    party,
    player,
    playtimeSec,
    region: input.region,
    settings: input.settings,
    slot: input.slot,
    updatedAt: input.nowIso,
    v: 1,
  };
}
