import { z } from 'zod';

import { REGION_IDS } from '../../game/overworld/types';
import type { SaveV1, SettingsV1 } from './types';

const facingSchema = z.union([z.literal('n'), z.literal('s'), z.literal('e'), z.literal('w')]);

const slotSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

const regionSchema = z.union([z.literal(REGION_IDS[0]), z.literal(REGION_IDS[1])]);

export const settingsV1Schema: z.ZodType<SettingsV1> = z.object({
  musicVolume: z.number().min(0).max(100),
  sfxVolume: z.number().min(0).max(100),
  relaxedRhythm: z.boolean(),
  highContrast: z.boolean(),
  audioOnlyCues: z.boolean(),
});

const partyMemberSchema = z.object({
  id: z.string().min(1),
  level: z.number().int().nonnegative(),
  xp: z.number().int().nonnegative(),
  moves: z.array(z.string()).readonly(),
});

const playerSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  mapId: z.string().min(1),
  facing: facingSchema,
});

export const saveV1Schema: z.ZodType<SaveV1> = z.object({
  v: z.literal(1),
  slot: slotSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  playtimeSec: z.number().nonnegative(),
  player: playerSchema,
  party: z.array(partyMemberSchema).readonly(),
  flags: z.record(z.string(), z.union([z.boolean(), z.number()])),
  inventory: z.record(z.string(), z.number()),
  settings: settingsV1Schema,
  region: regionSchema.optional(),
});

export function parseSaveV1(input: unknown): SaveV1 {
  return saveV1Schema.parse(input);
}

export function isValidSaveV1(input: unknown): input is SaveV1 {
  return saveV1Schema.safeParse(input).success;
}
