import { describe, expect, it } from 'vitest';
import { assetJobSchema } from './config.schema';

const validJob = {
  id: 'sol-reed-idle',
  kind: 'character-animation',
  owner: 'sol-reed',
  source: 'ai-generate',
  provider: 'openai-image',
  promptTemplate: 'characters/sol-reed-idle.prompt.md',
  refImage: 'refs/sol-reed-model-sheet.png',
  frames: 4,
  size: { w: 32, h: 48 },
  palette: 'jazz',
  fps: 12,
  outline: { enable: true, color: '#0a0a0a' },
  dither: 'fs',
  out: 'src/assets/sprites/characters/sol-reed-idle.{png,atlas.json}',
  acceptance: [
    'palette subset jazz palette',
    'transparency present, anti-aliased pixels = 0',
    'animation has 4 frames in 32x48'
  ]
};

describe('assetJobSchema', () => {
  it('accepts the documented job shape', () => {
    expect(assetJobSchema.safeParse(validJob).success).toBe(true);
  });

  it('rejects invalid job values', () => {
    const invalidJob = {
      ...validJob,
      frames: 0,
      outline: { enable: true, color: 'black' }
    };

    expect(assetJobSchema.safeParse(invalidJob).success).toBe(false);
  });
});
