import { createProceduralProvider } from './providers/procedural';

export type GeneratedAsset = {
  buffer: Buffer;
  mimeType: 'image/png';
};

export type GenerateRequest = {
  width: number;
  height: number;
  color?: string;
};

export type AssetProvider = {
  name: string;
  generate(request: GenerateRequest): Promise<GeneratedAsset>;
};

export function createAssetProvider(_provider: 'procedural'): AssetProvider {
  return createProceduralProvider();
}
