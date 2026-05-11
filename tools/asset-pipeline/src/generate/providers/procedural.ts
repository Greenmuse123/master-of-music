import sharp from 'sharp';
import type { AssetProvider, GenerateRequest, GeneratedAsset } from '../client';

export function createProceduralProvider(): AssetProvider {
  return {
    name: 'procedural',
    async generate(request: GenerateRequest): Promise<GeneratedAsset> {
      const buffer = await generateSolidColorPng(request);
      return { buffer, mimeType: 'image/png' };
    }
  };
}

export async function generateSolidColorPng(request: GenerateRequest): Promise<Buffer> {
  const background = request.color ?? '#000000';

  return sharp({
    create: {
      width: request.width,
      height: request.height,
      channels: 4,
      background
    }
  })
    .png()
    .toBuffer();
}
