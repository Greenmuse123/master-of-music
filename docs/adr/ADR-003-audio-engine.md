# ADR-003: Howler.js as audio engine for MVP

## Status

Accepted — 2026-05-12

## Context

`docs/03-TECHNICAL_ARCHITECTURE.md` §1 (Stack decision, Audio row) and `docs/08-AUDIO_DESIGN.md` §1 both pre-commit to Howler.js 2.x as the runtime audio engine and route every consumer through the `AudioManager` facade. `docs/03` §11 question 2 left a conditional escape hatch: spike a raw Web Audio + custom scheduler in Phase 2 "only if rhythm windows feel sloppy." That spike condition was never triggered. Phase 1–3.5 work on `MusicClock` and rhythm windows did not surface sub-frame timing artifacts; the drift-anchor pattern plus the injectable position-getter wired in spec 06 absorbs Howler's coarser seek granularity without leaking it to combat. This ADR locks the choice before Phase 4 audio integration begins.

## Decision

We use Howler.js 2.x as the runtime audio engine.

## Rationale

- Sample-accurate scheduling and sprite atlas support are sufficient for the dynamic stems system in `docs/08` §3 (parallel stems, 200–400ms crossfades, phase transitions).
- `MusicClock`'s drift-anchor pattern plus the injectable `positionGetter` (spec 06, `src/engine/audio/music-clock.ts`) decouples beat timing from Howler internals — combat reads only from `MusicClock`.
- Zero custom `WebAudioContext` lifecycle, mobile-unlock, or buffer-decode maintenance burden compared to a bespoke shim.

## Alternatives considered

| Option | Why considered | Why rejected |
|--------|----------------|--------------|
| Raw Web Audio API + custom scheduler | Sub-frame scheduling precision; full control over `AudioContext` and lookahead | No demonstrated need — Phase 1–3.5 rhythm windows met spec without it; build + maintenance cost is real, benefit is unproven |
| Tone.js | Rich music-DSL (transports, parts, signals); built on Web Audio | Heavyweight for a project that needs scheduling and mixing, not a DSL; weight inflates initial-load budget (`docs/03` §9) |
| Custom Web Audio shim | Maximum control; no third-party surface area | Build cost vs. unproven benefit; reinvents Howler's mobile-unlock, sprite, and fallback paths |

## Reversibility

The trigger to revisit matches `docs/08` §11: if dynamic-stems crossfade or boss phase-transition reveal sub-frame timing artifacts after Phase 4 audio integration, re-open this ADR. The `AudioManager` facade at `src/engine/audio/audio-manager.ts` is the swap boundary — only its internals would change, callers (combat, `MusicClock`, scenes) remain untouched.

## Consequences

- Positive: shortest path to playable audio in Phase 4; the facade and `MusicClock` are already wired, so Phase 4 work is content + integration, not engine selection.
- Negative: real-time generative music features (already out of scope per `docs/08` §8) would require swapping the engine internals of `AudioManager`.
