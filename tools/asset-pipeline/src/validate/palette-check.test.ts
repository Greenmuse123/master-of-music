import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { checkPngPalette } from './palette-check';

describe('checkPngPalette', () => {
  it('accepts a one-color sample when every pixel is in the palette', async () => {
    const buffer = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 4,
        background: '#112233'
      }
    })
      .png()
      .toBuffer();

    await expect(checkPngPalette(buffer, { name: 'sample', colors: ['#112233'] })).resolves.toEqual({ ok: true });
  });
});
