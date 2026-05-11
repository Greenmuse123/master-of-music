import { z } from 'zod';

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const assetJobSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  owner: z.string().min(1),
  source: z.enum(['ai-generate', 'procedural', 'hand-art']),
  provider: z.string().min(1),
  promptTemplate: z.string().min(1).optional(),
  refImage: z.string().min(1).optional(),
  frames: z.number().int().positive(),
  size: z.object({
    w: z.number().int().positive(),
    h: z.number().int().positive()
  }),
  palette: z.string().min(1),
  fps: z.number().int().positive(),
  outline: z.object({
    enable: z.boolean(),
    color: hexColorSchema
  }),
  dither: z.enum(['none', 'fs', 'pattern']),
  out: z.string().min(1),
  acceptance: z.array(z.string().min(1)).min(1)
});

export type AssetJob = z.infer<typeof assetJobSchema>;

export function parseAssetJob(input: unknown): AssetJob {
  return assetJobSchema.parse(input);
}
