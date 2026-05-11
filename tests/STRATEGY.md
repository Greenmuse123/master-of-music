# Test Strategy

## Scope of this doc

This is the verification rubric Phase 0 holds Codex spec 01 against, and the policy later phases inherit. It is updated as new test surfaces appear; new policies require an entry in the changelog at the bottom.

## Stack

- Vitest with V8 coverage provider.
- `jsdom` environment for all unit tests.
- Stubbed `CanvasRenderingContext2D` per the factory in section 5 — no real canvas, no real WebGL.
- No external HTTP, no network, no real filesystem inside tests.
- Deterministic clocks and seeds only. Real time, real RNG, and real I/O are forbidden in test code.

## Coverage gates per layer

Mirrors `docs/03-TECHNICAL_ARCHITECTURE.md` section 8.

| Layer | Tool | Coverage target |
|---|---|---|
| Pure logic (damage, type-table, rhythm-window) | Vitest | 90% |
| Engine modules (input mapper, animation player, music-clock) | Vitest | 70% |
| Scenes (battle, overworld) | Vitest + headless canvas mock | 50% |
| Menus / save / settings | Playwright (later phase) | golden-path only |
| Performance | Vitest perf benchmarks | asserts <=16ms per frame |

The Phase-0 ceiling-of-test-surface is the 3 tests listed in section 6 below. The gates above bind from Phase 1 onward, when those layers exist in code. Phase 0 has no coverage threshold; it has a count threshold (>=3 passing tests) and a shape threshold (the named files in spec 01).

## The stubbed CanvasRenderingContext2D pattern

The factory is a test helper, not runtime code. It returns a partial `CanvasRenderingContext2D` that records every call against a shared `calls` array. Tests assert against `calls` shape, never against pixel output.

```ts
type RecordedCall = { op: string; args: unknown[] };

export function createStubCtx(): {
  ctx: CanvasRenderingContext2D;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const record =
    (op: string) =>
    (...args: unknown[]) => {
      calls.push({ op, args });
    };

  const stub = {
    canvas: { width: 480, height: 270 } as HTMLCanvasElement,
    imageSmoothingEnabled: false,
    fillRect: record('fillRect'),
    drawImage: record('drawImage'),
    clearRect: record('clearRect'),
    save: record('save'),
    restore: record('restore'),
    setTransform: record('setTransform'),
  } as unknown as CanvasRenderingContext2D;

  return { ctx: stub, calls };
}
```

Tests that exercise additional ctx methods extend the factory in the same file; the canonical helper stays minimal until a real need exists.

## The 3 tests Phase 0 must ship

Mapped to spec 01 acceptance line "at least 3 passing tests":

1. `src/engine/render/renderer.test.ts` — renderer instantiates against the stub ctx; `clear()` invokes `clearRect` exactly once with the full canvas rect (0, 0, 480, 270).
2. `src/engine/scene/scene-stack.test.ts` — `push`, `pop`, `peek`, `size` behave correctly across an empty stack and a 2-deep stack; `enter` is called on push and `exit` on pop, in that lifecycle order.
3. `src/scenes/title-scene.test.ts` (or, if spec 01 folds this in elsewhere, an inline `enter` test inside the renderer file) — `TitleScene.enter()` runs without throwing against the stub ctx.

If spec 01 ships only the 2 named test files and folds the title-scene check into the renderer test, that is acceptable so long as the count >=3 passes.

Q-for-spec-author: confirm whether `title-scene.test.ts` is its own file or an inline case. Spec 01's `files[]` does not list it; current reading is the title-scene check rides inside one of the two listed test files. Either layout is acceptable here.

## What we do NOT test in Phase 0

- Visual output: pixel-correctness is deferred to manual smoke. No image-diff in CI.
- Howler audio: no audio code exists yet; no AudioContext mocking required.
- Input devices: no `InputManager` exists yet; no keyboard or gamepad simulation.
- Real CI workflow execution: spec 03 ships `.github/workflows/ci.yml`. Validation here is YAML-parse only — the real run is observed on first PR.

## Deterministic-only rule

Tests may not call `Math.random()`, `Date.now()`, real timers, or `performance.now()` without first calling `vi.useFakeTimers()` and providing a fixed `now`. PRNG seeds must be hard-coded literals — never derived from the clock. Timing-sensitive tests advance a simulated `now` via the fake timer, not by reading the wall clock. Any test that fails intermittently is treated as a bug in the test, not flakiness to be retried.

## CI gate

Spec 03's CI workflow runs `npm run lint && npm run typecheck && npm run test && npm run build`. A red gate blocks merge.

## Changelog

- 2026-05-11 — Initial strategy (Phase 0).
