# Asset Pipeline Contract

## Context

`tools/asset-pipeline/` is the build-time toolchain that produces every sprite, tileset, and audio atlas the runtime consumes. The runtime never calls an image-gen API and never reads from anywhere except `src/assets/manifest.json`; the pipeline is the only producer. Codex spec [`codex-specs/02-asset-pipeline-scaffold.json`](../codex-specs/02-asset-pipeline-scaffold.json) scaffolds the directory, package, CLI entry point, and stub modules with passing tests. Real provider integrations, processors, packers, validators, manifest builder, and audio modules land in later specs (04–09) per [`docs/05-ASSET_PIPELINE.md`](05-ASSET_PIPELINE.md) §11. This document is the rubric the orchestrator uses to verify spec 02's output.

## Required directory layout

```
tools/asset-pipeline/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── cli.ts
│   ├── config.schema.ts
│   ├── config.schema.test.ts
│   ├── generate/
│   │   ├── client.ts
│   │   └── providers/
│   │       ├── procedural.ts
│   │       └── procedural.test.ts
│   ├── process/
│   │   └── index.ts
│   ├── pack/
│   │   ├── manifest.ts
│   │   └── manifest.test.ts
│   └── validate/
│       ├── palette-check.ts
│       └── palette-check.test.ts
└── jobs/
    └── _palettes/
        └── jazz.json
```

Every path in this tree is required. No extra files in Phase 0.

## Required CLI surface

Invoked as `npm run assets -- <subcommand>` from the repo root. All 5 are stubs in Phase 0; real implementations land in later specs.

- `gen` — run an asset-generation job against a provider.
- `process` — apply post-processing passes (outline, downscale, quantize, dither, alpha-cut, frame-slice) to raw frames.
- `pack` — pack approved frames into a sprite atlas + companion JSON.
- `validate` — run validators (palette, size, transparency, animation completeness) against a job or palette file.
- `manifest` — emit/refresh `src/assets/manifest.json`.

`npm run assets -- --help` must list these five and nothing else.

## Allowed dependencies

- `zod` — schema validation for job specs and palette files.
- `sharp` — image I/O and pixel-level processing.
- `commander` — CLI argument parsing.

Any addition (including dev-deps that touch image/audio bytes) requires a new ADR under `docs/adr/`.

## Schema requirement

`src/config.schema.ts` must export a zod schema that accepts the canonical job shape from [`docs/05-ASSET_PIPELINE.md`](05-ASSET_PIPELINE.md) §3:

```json
{
  "id": "sol-reed-idle",
  "kind": "character-animation",
  "owner": "sol-reed",
  "source": "ai-generate",
  "provider": "openai-image",
  "promptTemplate": "characters/sol-reed-idle.prompt.md",
  "refImage": "refs/sol-reed-model-sheet.png",
  "frames": 4,
  "size": { "w": 32, "h": 48 },
  "palette": "jazz",
  "fps": 12,
  "outline": { "enable": true, "color": "#0a0a0a" },
  "dither": "fs",
  "out": "src/assets/sprites/characters/sol-reed-idle.{png,atlas.json}",
  "acceptance": [
    "palette is subset of jazz palette",
    "transparency present, anti-aliased pixels = 0",
    "animation has 4 frames in 32x48"
  ]
}
```

The schema's accept and reject paths must both be unit-tested.

## Phase-0 acceptance checks

The orchestrator runs these after spec 02 reports success:

- `npm install` at repo root succeeds and provisions the workspace.
- `npm run assets -- --help` lists exactly the 5 subcommands above.
- `npm run assets -- validate jobs/_palettes/jazz.json` exits 0 with an `ok` result.
- Unit tests cover: schema accept and reject, procedural provider returns a buffer with a valid PNG header, palette-check accepts a one-color sample, and manifest builder emits the JSON shape documented in [`docs/05-ASSET_PIPELINE.md`](05-ASSET_PIPELINE.md) §4.
- Root `npm run test` is green.

## Out of scope for Phase 0

- Real image-gen provider integrations (OpenAI, Stability, Replicate) — deferred to later specs.
- The Path A / B / C asset-source mix decision — deferred to `docs/adr/ADR-002-asset-source-mix.md` in Phase 2.
- Audio pipeline modules (`audio/normalize.ts`, `loop-edit.ts`, `atlas-pack.ts`) — deferred.
- License / provenance enforcement code (`src/assets/_provenance/` writer + validator) — deferred.
- Real processors, packer, validators beyond `palette-check`, and the full manifest builder — deferred to specs 04–08.

## Boundary statement

The pipeline writes outputs; the runtime reads `src/assets/manifest.json` only. No `fetch` calls outside the loader.
