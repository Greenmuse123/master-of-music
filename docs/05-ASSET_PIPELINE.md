# 05 — Asset Pipeline

**Project:** Master of Music
**Document version:** 1.0 (2026-05-11)

> This document specifies how art and audio are produced, processed, validated, and packaged into the game. It is the single most important document for the fresh session, because **the misconception "Codex generates the pixel art directly" is wrong and must be addressed upfront**.

---

## 1. The honest framing

**Codex (the ADR-003 CLI worker) writes code. It does not draw pixels.** It is a deterministic worker lane for bounded code tasks. It cannot run a paintbrush, produce PNG bytes from a text prompt, or design a sprite from scratch.

**What Codex *can* do — and what we use it for here — is write the pipeline that produces the art:**

1. The **client code** that calls an image-generation API (OpenAI DALL-E 3, Stability AI, Replicate Flux, Midjourney via gateway, etc.).
2. The **post-processing scripts** (downscale, palette quantization, dithering, transparency cleanup, outline enforcement, frame slicing).
3. The **sprite-sheet packer** that turns frames into atlases.
4. The **validators** that fail loudly on malformed sprites, missing animations, wrong color depth.
5. The **build orchestration** that runs the pipeline reproducibly in CI.

The actual pixels come from **one (or a mix) of three sources**. The fresh session must pick one for the MVP and document the decision as an ADR.

---

## 2. The three asset-source paths

### Path A — AI-generated, pixel-art post-processed

> **Recommended for MVP** if budget/quality permits. Highest velocity, acceptable quality with the right pipeline.

```
text prompt ─▶ image-gen API (1024×1024)
            ─▶ outline + flatten pass (PIL/sharp)
            ─▶ downscale to target (480×270 region, e.g. 32×48 char)
            ─▶ palette quantize to genre-palette (e.g. 24 colors)
            ─▶ Floyd-Steinberg or pattern dither
            ─▶ transparency cut (alpha threshold)
            ─▶ human spot-check approve
            ─▶ atlas pack ─▶ asset/sprites/
```

**Pros:** Fast. One-shot iteration on prompt → result is minutes, not hours.
**Cons:** Inconsistent character identity across frames. Animations are hard (each frame is a separate API call; consistency across frames is non-trivial). Solved partially by:
- Reference-image conditioning (IPAdapter, ControlNet).
- Same-seed batches with frame-instruction prompts.
- A **single character "model sheet"** hand-locked early and referenced for every later frame.

**MVP cost:** ~$0.04/image × ~2,000 images for MVP = ~$80–$200. Acceptable.

### Path B — Procedural

> Use for tilesets, environmental flourishes, fonts, effects. Not character art.

Procedural generation works for things with rules:
- **Tilesets** with palette and tile-blend rules.
- **Particle effects** (sparks, music-note bursts, dust motes).
- **Pixel fonts** (parametric letterforms).
- **UI frames** (9-slice generation, palette-correct borders).

Path B *does not* work for expressive character faces, bosses, or cutscene art. Don't try.

### Path C — Hand-art, pipeline-assisted

> Use selectively for hero sprites and boss artwork, *if* a pixel-artist is on the team.

Path C means: human pixel-artist produces the sprite; pipeline only validates, packs, and atlasses. No generative AI in the loop.

**Pros:** Highest quality. Consistency guaranteed. Resellable as a marketing/community asset.
**Cons:** Time and money — a single boss might be 40+ hand-animated frames at 1–4 hours per frame.

### Recommended hybrid for MVP

- **Path A** for: world NPCs (Tier-2 art), tilesets *first pass*, dialogue portraits, item icons.
- **Path B** for: particle effects, environmental decals, pixel fonts, UI frames.
- **Path C** for: Sol Reed, Brass, Vel, Pete, Etude, and the Act-I boss (Diminuendo). These are the player-attachment characters. Worth the money.

This hybrid is the documented MVP plan. The fresh session should write `docs/adr/ADR-002-asset-source-mix.md` confirming or revising it.

---

## 3. The pipeline architecture (what Codex actually builds)

```
┌─────────────────────────────────────────────────────────────┐
│ tools/asset-pipeline/                                        │
│                                                              │
│   src/                                                       │
│   ├── generate/                                              │
│   │   ├── client.ts            <- pluggable provider (A)    │
│   │   ├── providers/                                         │
│   │   │   ├── openai-image.ts                                │
│   │   │   ├── stability.ts                                   │
│   │   │   └── procedural.ts    <- (Path B)                   │
│   │   └── batch.ts             <- prompt batches, retry,    │
│   │                              concurrency, rate limit    │
│   ├── process/                                               │
│   │   ├── outline.ts                                         │
│   │   ├── flatten.ts                                         │
│   │   ├── downscale.ts                                       │
│   │   ├── quantize.ts          <- median-cut + locked palette│
│   │   ├── dither.ts                                          │
│   │   ├── alpha-cut.ts                                       │
│   │   └── frame-slice.ts                                     │
│   ├── pack/                                                  │
│   │   ├── pack-atlas.ts        <- frames -> atlas + json    │
│   │   └── manifest.ts          <- build asset manifest      │
│   ├── validate/                                              │
│   │   ├── palette-check.ts                                   │
│   │   ├── size-check.ts                                      │
│   │   ├── animation-completeness.ts                          │
│   │   └── transparency-check.ts                              │
│   ├── cli.ts                   <- `npm run assets <step>`    │
│   └── config.schema.ts         <- zod-validated job spec    │
│                                                              │
│   jobs/                        <- declarative asset requests │
│   ├── _palettes/                                             │
│   │   ├── jazz.json                                          │
│   │   ├── blues.json                                         │
│   │   ├── ... (8 palettes)                                   │
│   ├── characters/                                            │
│   │   ├── sol-reed.job.json                                  │
│   │   └── brass.job.json                                     │
│   ├── npcs/                                                  │
│   ├── enemies/                                               │
│   ├── tilesets/                                              │
│   └── ui/                                                    │
│                                                              │
│   tests/                       <- vitest, runs pipeline on   │
│                                  golden inputs               │
└─────────────────────────────────────────────────────────────┘
```

Codex builds this. The fresh Claude session orchestrates Codex via the specs in [`../codex-specs/`](../codex-specs/).

### Pipeline contract (a job)

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
    "palette ⊆ jazz palette",
    "transparency present, anti-aliased pixels = 0",
    "animation has 4 frames in 32x48"
  ]
}
```

Job specs are git-tracked. **Re-running the pipeline on a clean machine reproduces every asset**, modulo provider non-determinism (which we mitigate with fixed seeds where supported and human approval gates).

---

## 4. Asset manifest & loader

After the pipeline runs, it emits `src/assets/manifest.json`:

```json
{
  "version": 1,
  "builtAt": "ISO timestamp",
  "sprites": {
    "sol-reed-idle": {
      "image": "/sprites/characters/sol-reed-idle.png",
      "atlas": "/sprites/characters/sol-reed-idle.atlas.json",
      "bytes": 4321,
      "hash": "sha256:..."
    }
  },
  "audio": { ... },
  "tilesets": { ... }
}
```

The runtime loader (`src/engine/render/atlas.ts`) reads the manifest and streams assets by priority. **No `fetch` outside the loader; no asset path strings hand-coded in gameplay modules.**

---

## 5. Validators (pipeline must fail before merging)

Every pipeline run executes:

| Validator | Fails on |
|-----------|----------|
| Palette | Any pixel outside the assigned palette (after dither) |
| Size | Frame dimensions ≠ declared `size` |
| Transparency | Anti-aliased edges (more than 2 alpha values per row) |
| Animation completeness | Missing frame indices, mismatched frame count |
| Atlas correctness | Frame rectangles outside atlas bounds, overlap, padding violation |
| Audio loudness | OGG peak > -3dBFS (auto-normalize) |
| Audio length | Music tracks < 30s or > 5min flagged |
| Manifest integrity | Any sprite referenced in code but missing from manifest |

Validators run in CI. **PRs that break asset validation are blocked.**

---

## 6. Iteration loop

```
1. Designer writes / edits job.json
2. `npm run assets:gen -- jobs/characters/sol-reed-idle.job.json`
3. Pipeline produces draft to /tmp/asset-review/
4. Approver reviews; can re-roll (same seed, different prompt, or different ref)
5. On approval, pipeline writes to src/assets/ and updates manifest
6. Commit
```

The MVP requires **5 batches of approvals max** to ship the protagonist + first boss + first town tileset. Anything more = team velocity problem, escalate.

---

## 7. Cost & vendor strategy

| Provider | Use | Cost ballpark | Trade-off |
|----------|-----|---------------|-----------|
| OpenAI Images (gpt-image-1) | NPCs, portraits, items | $0.02–$0.04/img | Fast, decent quality, reproducible w/ refs |
| Stability AI (SDXL) | Tilesets, env. art | $0.01/img | Cheaper, more steerable, requires more local processing |
| Replicate / Flux | Special cases | $0.02–$0.05/img | Strong style adherence |
| Local SD via ComfyUI | Long batch runs | $0 (GPU time) | Slowest, full control |
| Human pixel artist | Hero sprites | $$$ | Highest quality, slowest |

Default provider for MVP: **OpenAI Images** for speed; **Stability** for bulk tilesets. The fresh session picks per ADR-002.

---

## 8. Audio assets

Music tracks come from one of:
1. **Custom-composed** (commission, royalty-free music marketplace, or in-house if a composer is on the team).
2. **AI-generated** (Suno, Udio, MusicGen) → reviewed, post-processed.
3. **Stock genre packs** (placeholder only — replace before launch).

Pipeline equivalents:
- `tools/asset-pipeline/audio/normalize.ts` — peak/loudness normalization.
- `tools/asset-pipeline/audio/loop-edit.ts` — seamless loop markers.
- `tools/asset-pipeline/audio/atlas-pack.ts` — Howler sprite atlas builder.

**MVP music targets:**
- Jazz City theme (looping, 2–3 min)
- Bayou theme (looping)
- Combat-jazz theme (4 dynamic stems: bass, drums, keys, sax)
- Boss theme — Diminuendo (3 stems)
- 12 SFX (UI, attack, hit, parry, level-up, etc.)

---

## 9. License hygiene

- Every generated asset's prompt + provider + seed + timestamp is logged in `src/assets/_provenance/`.
- Every human-made asset has a signed license file from the artist.
- Every audio asset has a signed license or composer agreement.
- Pipeline validator refuses to ship an asset without a provenance entry.

This is non-negotiable. The license trail must exist before any public release.

---

## 10. Build outputs

- **Dev mode:** assets served from `public/sprites/...` via Vite.
- **Prod build:** assets bundled into `dist/assets/`, content-hashed, manifest content-hashed too.
- **Asset cache invalidation:** controlled by content hash; loader checks hash on boot.

---

## 11. The Codex specs that build this pipeline

The pipeline is built incrementally. The Codex specs in [`../codex-specs/`](../codex-specs/) introduce it module by module. Approximate order:

1. `02-asset-pipeline-scaffold.json` — directory, package, `npm run assets` entry.
2. `04-palette-quantizer.json` — quantizer + tests.
3. `05-atlas-packer.json` — packer + tests.
4. `06-image-provider-openai.json` — OpenAI provider + retry + tests.
5. `07-validators.json` — palette, size, transparency, animation.
6. `08-manifest-builder.json` — final step in pipeline.
7. `09-audio-normalizer.json` — Howler sprite output.

Each spec is bounded and verifiable.
