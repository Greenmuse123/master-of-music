# ADR-001: Canvas 2D as renderer for MVP (over WebGL/PixiJS)

**Status:** Accepted — 2026-05-11

## Context

The stack table in `docs/03-TECHNICAL_ARCHITECTURE.md §1` (Renderer row) provisionally locks HTML5 Canvas 2D but flags the choice as deferred to this ADR. `docs/03-TECHNICAL_ARCHITECTURE.md §11` open question 1 asks: Canvas 2D vs. PixiJS WebGL — profile a worst-case battle and switch if budget unmet. The renderer must draw a 480×270 logical framebuffer (`docs/01-GAME_DESIGN_DOCUMENT.md §7`) of pixel-perfect indexed-color sprites with no anti-aliasing or sub-pixel positioning (`docs/01-GAME_DESIGN_DOCUMENT.md §8`), with ≤30 active entities, within the 8ms render budget from `docs/03-TECHNICAL_ARCHITECTURE.md §9`.

## Decision

We use HTML5 Canvas 2D as the renderer for the MVP. No WebGL, no third-party renderer.

## Rationale

- Canvas 2D with `imageSmoothingEnabled = false` is sufficient for 480×270 pixel art at ≤30 entities and trivially honors the no-AA, no-sub-pixel constraint.
- Zero dependencies, zero fallback complexity, zero shader toolchain. Vite serves it directly; debugging is plain DevTools.
- Renderer is encapsulated behind `src/engine/render/renderer.ts` per `docs/03-TECHNICAL_ARCHITECTURE.md §3`, preserving the option to swap to WebGL/PixiJS later without touching scenes, sprites, or game logic.

## Alternatives considered

| Library | Pros | Why deferred |
|---|---|---|
| PixiJS (WebGL) | Batched draw calls, shader-based VFX, mature pixel-art pipeline. | Adds a dependency and a render abstraction we don't yet need; revisit if Phase 1 profiling fails the 8ms gate. |
| Phaser | Batteries-included engine: scenes, input, physics, audio. | Conflicts with the hand-rolled engine layout in `docs/03 §3`; locks us into Phaser idioms; ADR-required heavy dep. |
| Raw WebGL | Maximum control, lowest overhead at high entity counts. | Build cost is high (shaders, batching, text rendering) and unjustified at MVP entity counts. |

## Reversibility

Trigger to revisit: if a worst-case Phase 1 battle exceeds the 8ms render budget on a 2020-era integrated GPU (the `docs/07-ROADMAP.md` Phase 1 gate), profile first, then switch. Because all draw calls go through `src/engine/render/renderer.ts`, swapping the implementation is a localized change behind one interface; scene, sprite, animation, and tilemap modules do not change. A switch decision will be recorded as a follow-up ADR.

## Consequences

- Positive: fastest path to a playable Phase 1 vertical slice; no toolchain or shader debt; HMR-friendly iteration in Vite.
- Negative: no shader-based VFX in MVP; sub-pixel effects (smooth glow, displacement) are harder or impossible until a renderer swap.
