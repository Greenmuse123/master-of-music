import type { RegionId } from '../../game/overworld/types';
import type { SettingsV1 } from './settings-types';

export type SaveSlot = 0 | 1 | 2;

export type Facing = 'n' | 's' | 'e' | 'w';

// Canonical SettingsV1 lives in settings-types.ts so the settings scene
// and the save layer share one type. Re-export here so existing
// `import { SettingsV1 } from './types'` call sites still work.
export type { SettingsV1 };

export interface SaveV1 {
  readonly v: 1;
  readonly slot: SaveSlot;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly playtimeSec: number;
  readonly player: {
    readonly x: number;
    readonly y: number;
    readonly mapId: string;
    readonly facing: Facing;
  };
  readonly party: ReadonlyArray<{
    readonly id: string;
    readonly level: number;
    readonly xp: number;
    readonly moves: readonly string[];
  }>;
  readonly flags: Readonly<Record<string, boolean | number>>;
  readonly inventory: Readonly<Record<string, number>>;
  readonly settings: SettingsV1;
  /** Phase-4: the region the player was last exploring. Optional for forward compat. */
  readonly region?: RegionId;
}

export interface SaveSummary {
  readonly slot: SaveSlot;
  readonly updatedAt: string;
}
