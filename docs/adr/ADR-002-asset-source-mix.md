# ADR-002: Asset source mix for MVP — hybrid (Path A + Path B + Path C)

**Status:** Accepted — 2026-05-11

## Context

Per [`docs/05-ASSET_PIPELINE.md`](../05-ASSET_PIPELINE.md) §2, every asset comes from one of three sources: AI-generated then pixel-art post-processed (Path A), procedural rule-based generation (Path B), or hand-art by a pixel artist (Path C). The MVP (Phase 3 in [`07-ROADMAP.md`](../07-ROADMAP.md)) requires character art for Sol, Brass, Vel, Pete, Etude, and Diminuendo; tilesets for Jazz City and the Bayou; UI; and combat particles. Codex writes the pipeline, not the pixels (docs/05 §1).

## Decision

Adopt the **hybrid A+B+C mix** recommended in docs/05 §2, with the breakdown below. MVP cost ballpark: **~$80–$200 for ~2,000 images via Path A** (docs/05 §2).

## Rationale

- Path A delivers velocity for non-hero slots (NPCs, icons, portraits, tileset first-passes) within Phase 3's session budget.
- Path B handles rule-based assets (particles, decals, pixel fonts, 9-slice UI) where procedural output beats generative.
- Path C reserves human pixel-artist effort for the six player-attachment sprites where cross-frame consistency is pillar-critical (Pillar 2, [`01-GAME_DESIGN_DOCUMENT.md`](../01-GAME_DESIGN_DOCUMENT.md) §2).
- The pipeline (docs/05 §3) treats `source` as a pluggable provider on the job spec, so any class can be flipped between paths later.

## Path-per-asset-class table

| Asset class | Path | Notes |
|---|---|---|
| World NPCs (Tier-2 art) | A | Reference-image conditioned for region consistency |
| Tilesets — first pass | A | Stability AI bulk batch; manual cleanup |
| Dialogue portraits | A | OpenAI Images with locked model sheets |
| Item icons | A | Batch generation, palette-quantized |
| Particle effects | B | Rule-based emitter outputs |
| Environmental decals | B | Procedural placement and palette mapping |
| Pixel fonts | B | Parametric letterforms |
| UI frames | B | 9-slice generation, palette-correct borders |
| Sol Reed, Brass, Vel, Pete, Etude | C | Hand-animated; consistency across frames is non-negotiable |
| Diminuendo (Act-I boss) | C | Cuphead-grade spectacle per Pillar 1 |

## Cost & vendor commitments

- **Path A default:** OpenAI Images (gpt-image-1) per docs/05 §7 — ~$0.02–$0.04/img.
- **Path A bulk tilesets:** Stability AI (SDXL) per docs/05 §7 — ~$0.01/img, more steerable.
- **Path C:** human pixel artist; hire decision deferred to Phase 4. Not blocking Phases 0–3, which use Path A placeholders for hero sprites.

## Reversibility

Each class can be flipped between paths because the pipeline (docs/05 §3) treats `source` and `provider` as pluggable job-spec fields; the runtime only consumes the manifest. Switching cost is regeneration, not architectural rework.

## Consequences

- **Positive:** Aggressive MVP velocity — Path A/B unblocks Phases 0–3 across ~90% of the asset surface.
- **Negative:** Path C creates a hire dependency. If no pixel artist is staffed by Phase 4, the six hero sprites either stay on Path A placeholders (Pillar 2 quality risk) or slip the schedule.
