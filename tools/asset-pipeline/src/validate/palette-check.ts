import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { z } from 'zod';

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const paletteSchema = z.object({
  name: z.string().min(1),
  colors: z.array(hexColorSchema).min(1)
});

export type Palette = z.infer<typeof paletteSchema>;

export type PaletteCheckResult =
  | { ok: true }
  | { ok: false; invalidColors: string[] };

export async function loadPalette(path: string): Promise<Palette> {
  const raw = await readFile(path, 'utf8');
  return paletteSchema.parse(JSON.parse(raw));
}

export async function checkPngPalette(buffer: Buffer, palette: Palette): Promise<PaletteCheckResult> {
  const allowed = new Set(palette.colors.map(normalizeHexColor));
  const { data } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const invalidColors = new Set<string>();

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }

    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const color = rgbToHex(red, green, blue);

    if (!allowed.has(color)) {
      invalidColors.add(color);
    }
  }

  return invalidColors.size === 0
    ? { ok: true }
    : { ok: false, invalidColors: [...invalidColors].sort() };
}

export async function validatePaletteFile(path: string): Promise<{ ok: true; palette: Palette }> {
  const palette = await loadPalette(path);
  return { ok: true, palette };
}

function normalizeHexColor(color: string): string {
  return color.toLowerCase();
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${toHexByte(red)}${toHexByte(green)}${toHexByte(blue)}`;
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}
