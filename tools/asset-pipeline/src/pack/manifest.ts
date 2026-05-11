export type ManifestAsset = {
  image: string;
  atlas: string;
  bytes: number;
  hash: `sha256:${string}`;
};

export type AssetManifest = {
  version: 1;
  builtAt: string;
  sprites: Record<string, ManifestAsset>;
  audio: Record<string, unknown>;
  tilesets: Record<string, unknown>;
};

export type ManifestSpriteInput = {
  id: string;
  image: string;
  atlas: string;
  bytes: number;
  hash: `sha256:${string}`;
};

export function buildAssetManifest(sprites: ManifestSpriteInput[], builtAt = new Date().toISOString()): AssetManifest {
  return {
    version: 1,
    builtAt,
    sprites: Object.fromEntries(
      sprites.map((sprite) => [
        sprite.id,
        {
          image: sprite.image,
          atlas: sprite.atlas,
          bytes: sprite.bytes,
          hash: sprite.hash
        }
      ])
    ),
    audio: {},
    tilesets: {}
  };
}
