# Master of Music Asset Pipeline

This workspace package is the scaffold for producing, processing, validating, and packaging game assets. It does not integrate with external image providers yet; those providers arrive in the next asset-pipeline spec.

The pipeline is organized around declarative job JSON files. A job describes the asset identity, source path, provider, frame count, output size, palette, processing choices, output path, and acceptance checks. The schema in `src/config.schema.ts` validates that contract before any pipeline step runs.

## Commands

Run the CLI from the repository root:

```bash
npm run assets -- --help
npm run assets -- validate jobs/_palettes/jazz.json
```

The scaffold exposes five subcommands:

- `gen`: placeholder for asset generation.
- `process`: placeholder for outline, flatten, downscale, quantize, dither, alpha cut, and frame slicing.
- `pack`: placeholder for atlas packing.
- `validate`: validates the input file shape currently supported by the scaffold.
- `manifest`: placeholder for emitting `src/assets/manifest.json`.

## Current Modules

- `generate/client.ts` defines the provider interface.
- `generate/providers/procedural.ts` returns a solid-color PNG buffer as a deterministic placeholder.
- `process/index.ts` exports the processing entrypoint stub.
- `pack/manifest.ts` builds the documented manifest JSON shape.
- `validate/palette-check.ts` loads palette JSON and checks PNG pixels against it.

## Palette Files

Palettes live under `jobs/_palettes`. The current `jazz.json` file is intentionally small and exists to prove the CLI and validator wiring before the complete palette set is added.
