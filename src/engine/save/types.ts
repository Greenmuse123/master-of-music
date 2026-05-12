export type SaveSlot = 0 | 1 | 2;

export type Facing = 'n' | 's' | 'e' | 'w';

export interface SettingsV1 {
  readonly musicVolume: number;
  readonly sfxVolume: number;
}

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
}

export interface SaveSummary {
  readonly slot: SaveSlot;
  readonly updatedAt: string;
}
