# Phase 1 Rubric: Scenes, Save, Audio, Perf

**Project:** Master of Music
**Document version:** 1.0 (2026-05-11)
**Status:** Wave-1 verification contract. Quotes — does not invent — contracts from [`03-TECHNICAL_ARCHITECTURE.md`](../03-TECHNICAL_ARCHITECTURE.md), [`04-COMBAT_SYSTEM.md`](../04-COMBAT_SYSTEM.md), [`08-AUDIO_DESIGN.md`](../08-AUDIO_DESIGN.md).

---

## 1. Scope

This rubric is the verification contract Phase-1 subagents must honor when building the battle scene, overworld scene, audio manager, and title/save/game-over UI flow. It binds AGENT-combat, AGENT-overworld, AGENT-audio, AGENT-ui, and the orchestrator-led scene-router wiring (Task 7 of [`PHASE-1.md`](PHASE-1.md)) to a single set of contracts. Where a contract already exists in docs/03 or docs/04 or docs/08, this rubric quotes it; where Phase-1 introduces a placeholder (rhythm-window), it pins the surface area so Phase-2 spec 08 can drop in without breaking callers.

## 2. Scene routing contract

`Game` owns a `SceneRouter` (see [`PHASE-1.md`](PHASE-1.md) Task 7). Five scene IDs exist in Phase 1: `title`, `save-select`, `overworld`, `battle`, `game-over`. Five router events drive transitions: `confirm`, `cancel`, `encounter`, `victory`, `defeat`. Unknown `(scene, event)` pairs are no-ops. Each scene implements the `Scene` interface from docs/03 §2.1 (`enter`, `exit`, `update`, `render`, `handleInput`). Allocations happen in `enter`; `update` must not allocate during steady-state per docs/03 §2.1.

| currentScene | event       | nextScene    |
|--------------|-------------|--------------|
| title        | confirm     | save-select  |
| save-select  | confirm     | overworld    |
| save-select  | cancel      | title        |
| overworld    | encounter   | battle       |
| battle       | victory     | overworld    |
| battle       | defeat      | game-over    |
| game-over    | confirm     | title        |

Subagents that add a new transition must update this doc first.

## 3. Save schema contract

The Phase-1 save shape is `SaveV1` from docs/03 §4.1, quoted verbatim:

```ts
interface SaveV1 {
  v: 1;
  slot: 0 | 1 | 2;
  createdAt: string;     // ISO
  updatedAt: string;
  playtimeSec: number;
  player: { x: number; y: number; mapId: string; facing: 'n'|'s'|'e'|'w' };
  party: Array<{ id: string; level: number; xp: number; moves: string[] }>;
  flags: Record<string, boolean | number>;
  inventory: Record<string, number>;
  settings: SettingsV1;
}
```

Rules: (a) the schema is versioned via `v`; (b) every future bump ships a `migrations/N-to-N+1.ts` and the loader runs them top-to-bottom; (c) no migration-by-deletion — a migration that drops player data is rejected. `src/engine/save/store.ts` wraps IndexedDB (async, structured-clone-safe); `src/engine/save/schema.ts` exports the zod-validated `SaveV1`. AGENT-ui ships both files plus tests covering roundtrip on slot 0.

## 4. Placeholder rhythm-window contract

Phase 1 needs the battle scene to read a hit-quality without yet shipping the full 5-band rhythm system from docs/04 §3.3. AGENT-combat creates `src/game/combat/rhythm-window-placeholder.ts` exporting:

```ts
export type RhythmQuality = 'critical' | 'perfect' | 'good' | 'off' | 'miss';

export function evaluateRhythmHit(
  nowMs: number,
  targetMs: number,
  focus: number, // 0..100, FOCUS stat per docs/04 §3.1
): RhythmQuality;
```

Phase-1 placeholder behavior (simplified): `'perfect'` if `|nowMs - targetMs| <= 80`, `'good'` if `<= 160`, otherwise `'miss'`. Phase-2 codex-spec 08 replaces the body with the full table from docs/04 §3.3 (critical ±40ms, perfect ±80ms, good ±160ms, off ±300ms, else miss; focus widens windows up to +50%). **The exported signature, name, types, and parameter order do not change between placeholder and replacement.** Any caller that imports `evaluateRhythmHit` must keep working without modification.

## 5. Audio contract

Per docs/08 §1, `AudioManager` (under `src/engine/audio/audio-manager.ts`) is the **only** module that touches Howler. Everywhere else — battle scene, overworld ambience, UI confirm tones, scene transitions — uses the manager's API (`play`, `stop`, `setBusVolume`, `loadManifest`). `MusicClock` (per docs/08 §2 and codex-spec 06) is fed a **position-getter** function: in production the getter returns `Howler.seek` on the active music sprite; in tests, the getter is a stub function returning a controllable number. This is what "anchored" means in this codebase — the clock has no direct Howler dependency; the manager wires them up.

Per docs/08 §1 inviolable rule: combat code reads beat position from `MusicClock.beat()` and `MusicClock.beatPhase()` — **never from `performance.now()`**. AGENT-combat must enforce this in `battle-scene.ts`. AGENT-audio re-anchors `MusicClock` to Howler every 250ms per docs/03 §2.2.

## 6. Perf budget

Per docs/03 §9: logic ≤8ms/frame, render ≤8ms/frame, memory ≤150MB resident in steady-state, ≤300MB peak with audio decoded, initial load ≤8MB compressed for title scene. The F2 perf-overlay sketch for Phase 1: pressing F2 toggles a fixed-position `<div>` (or canvas-overlay rect) showing frame time (ms), logic ms, render ms, draw-call count. Overlay is gated by `config/flags.ts` and disabled in prod. The Phase-1 manual gate is **logic + render ≤16ms median**, measured by walking one overworld room and completing one battle on the dev box (per [`PHASE-1.md`](PHASE-1.md) Task 8 Step 3).

## 7. Golden path

The six transitions a Phase-1 player walks end-to-end:

1. Title screen visible → press `confirm` → save-select.
2. Save-select shows 1 slot "new game" → press `confirm` → overworld.
3. Overworld 3×3 tile grid, player at start tile → step onto encounter tile → battle.
4. Battle shows enemy + party HP + 1 move "Brass Burst" → press `confirm` to attack → rhythm cue lands.
5. Win → return to overworld. (Repeated encounters allowed.)
6. Force defeat (e.g., walk into enemy at 0HP after several losses) → game-over scene → press `confirm` → back to title.

Subagents demonstrating their slice must show evidence — a test, a screenshot stub, or a unit-test scene-traversal — that their portion of the golden path works.

## 8. Determinism rule

Per docs/03 §4.4, all game RNG goes through the seeded PRNG (`mulberry32` in `src/engine/util/rng.ts` — to be created by AGENT-combat or AGENT-overworld, whichever lands first). No `Math.random()` in `src/game/` (lint rule will enforce in Phase 2; Phase 1 enforces by review). No `Date.now()` for game timing — use `MusicClock` for beat-based timing and `dt` from the rAF loop for everything else.

## 9. Out-of-scope reminders

- No multiplayer.
- No real sprite art (placeholder colored rects).
- No real music (one placeholder loop; if no audio file is included, the audio manager runs in mute-tests mode).
- No level-up / XP system yet (Phase-2).
- No ECS (per docs/03 §5).

## 10. Changelog

| Date | Change |
|------|--------|
| 2026-05-11 | Initial Phase-1 rubric. |
