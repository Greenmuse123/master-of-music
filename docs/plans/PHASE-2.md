# Phase 2 Implementation Plan — Combat Depth & First Boss

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase-1 combat placeholder with the full rhythm system (5-band cues, type table, parry, dissonance, boss phases), wire one Cuphead-grade boss encounter (Diminuendo, Bayou/Blues), and ship the deterministic record-replay infrastructure so battles are reproducible.

**Architecture:** Five bounded Codex specs ship the deterministic combat primitives (08 rhythm-window upgrade, 09 type-table, 10 parry, 11 dissonance-meter, 12 boss-phase). The orchestrator rewrites `BattleScene` to wire them together against `MusicClock`-sourced BPM. A 3-agent parallel wave ships party data, the Diminuendo encounter script, and a record-replay harness. Audio + dialogue polish defers to Phase 3.

**Tech stack inheritance from Phase 1:** TS5 strict, Vite 5, Vitest 2 jsdom, Canvas2D, Howler, zod, IndexedDB. **No new deps in Phase 2.**

---

## File Structure

| Source | Path | Responsibility |
|---|---|---|
| Orchestrator | `docs/plans/PHASE-2.md` | this file |
| `[CODEX 08]` | `src/game/combat/rhythm-window.ts` + test, widens `src/game/combat/types.ts` `RhythmQuality` to 5 bands | Full rhythm windows |
| `[CODEX 09]` | `src/game/combat/type-table.ts` + test, `genres.ts` | Genre matchup table |
| `[CODEX 10]` | `src/game/combat/parry.ts` + test | Parry windows + steal-cue |
| `[CODEX 11]` | `src/game/combat/dissonance-meter.ts` + test | Stutter accumulation |
| `[CODEX 12]` | `src/game/combat/boss-phase.ts` + test, `boss-types.ts` | Phase script runner |
| Orchestrator | `src/game/combat/battle-scene.ts` (rewrite) + test | Battle scene using all 5 primitives + MusicClock BPM; supports normal and boss encounters via a `mode` flag |
| Orchestrator | `src/game/combat/types.ts` (touch) | Append types for `PartyMember`, `EncounterSpec`, `PartyState` |
| Orchestrator | Delete: `src/game/combat/rhythm-window-placeholder.ts` + test | Replaced by spec 08 |
| `[AGENT-content]` | `src/data/instruments/{sol,vel,pete}.json`, `src/data/moves/*.json`, `src/data/enemies/bayou-*.json`, runtime loaders in `src/game/content/` + tests | 3 party members, 6 moves total (2 each), 4 bayou enemy types (1 boss + 3 mooks) |
| `[AGENT-encounter]` | `src/game/encounters/{diminuendo,bayou-mook-encounter}.ts` + tests, `src/data/encounters/diminuendo.json` (boss script) | The Diminuendo BossScript + one trash encounter; orchestrator wires these via SceneRouter |
| `[AGENT-replay]` | `src/game/combat/replay.ts` + test, `src/game/combat/test/scripted-battle.test.ts` | Record-replay harness: log inputs + RNG seed → re-run produces identical BattleEvent stream |
| Orchestrator | `docs/audits/wave-2-closure.md` | Wave closure |

---

## Pre-flight

- [ ] `git status` clean on `main`; HEAD past `00e2071`.
- [ ] `npm run verify:workflow && npm run lint && npm run typecheck && npm run test && npm run build` all 0.
- [ ] All Phase-2 specs dry-run clean: 08, 09, 10, 11, 12.
- [ ] CI green on the latest `main` push.

---

## Task 1: Run codex specs 08, 09, 10, 11, 12 (sequential)

For each spec:

- [ ] **Step 1: Dry-run** the spec.
- [ ] **Step 2: Real run** with `MAX_COST_USD_PER_RUN=1.50` (these are all small pure-logic specs; expect $0.25-$0.75 each).
- [ ] **Step 3: Independent verify** (lint + typecheck + scoped test).
- [ ] **Step 4: Commit** with message `feat(phase-2): <short> (codex-spec NN)`.

Spec order is intentional:
1. **08** first — widens `RhythmQuality` in types.ts; everything else depends on the wider union.
2. **09** second — independent module, no dependencies on 08.
3. **10, 11, 12** then run in numeric order; 11 imports `RhythmQuality` from types so it requires 08 first; 12 stands alone.

---

## Task 2: Rewrite BattleScene (orchestrator-led)

**Files:**
- Modify: `src/game/combat/battle-scene.ts` (full rewrite — current placeholder logic is replaced)
- Modify: `src/game/combat/battle-scene.test.ts` (update tests to cover the new surface)
- Append: `src/game/combat/types.ts` (`PartyMember`, `EncounterSpec`, `BattleMode` types)
- Delete: `src/game/combat/rhythm-window-placeholder.ts` + `.test.ts` (replaced by spec 08)
- Modify: `src/game.ts` (the battle scene factory now takes an `EncounterSpec`)

Required behavior (must remain backward-compatible with the Phase-1 SceneRouter contract):

- Constructor takes `{ renderer, input, musicClock, textbox, party, encounter, rng, onComplete }`. `party: PartyMember[]` (1-3 members). `encounter: EncounterSpec` declares: enemy combatant(s), BPM, optional `bossScript: BossScript`, type matchup.
- On `enter()`: call `musicClock.start(soundId, encounter.bpm)`; alloc HP bars, cue pool, parry-cue pool, dissonance meters per side.
- On `update(step)`:
  - If `bossScript` present, drive `BossPhaseRunner.tick(beat, hpFraction)`; consume `BossEvent`s to spawn cues / vulnerable windows / phase transitions.
  - Read input; on `beat-press`, evaluate cue quality via spec 08 `evaluateRhythmHit`. On `confirm` during enemy attack window, evaluate `evaluateParry` from spec 10.
  - Accumulate dissonance via spec 11 per quality. On stutter, the OPPONENT enters a vulnerable window per spec 12.
  - Apply type-table multiplier from spec 09 to damage.
- On victory/defeat: `onComplete('victory' | 'defeat')`.

Determinism contract: `rng` is the only randomness source; `MusicClock.beat()` is the only timing source. Replay test in Task 3 depends on this.

Steps:

- [ ] **Step 1: Migrate types.** Append `PartyMember`, `EncounterSpec`, `BattleMode` to `src/game/combat/types.ts`. Run typecheck — confirm nothing breaks (the Phase-1 placeholder still typechecks because `RhythmQuality` widened in 08 is a superset).
- [ ] **Step 2: Write the failing test** that asserts the rewritten BattleScene can run a scripted 4-turn battle and emit a deterministic `BattleEvent` stream.
- [ ] **Step 3: Implement the new BattleScene.** Replace the placeholder body.
- [ ] **Step 4: Delete the placeholder.** `git rm src/game/combat/rhythm-window-placeholder*`.
- [ ] **Step 5: Update `src/game.ts`** factory to pass an `EncounterSpec` (placeholder bayou-mook fight by default; boss when overworld triggers a boss tile).
- [ ] **Step 6: Verify.** `npm run lint && npm run typecheck && npm run test`. Bump coverage on `battle-scene.ts` to ≥85%.
- [ ] **Step 7: Commit** `feat(phase-2): BattleScene v2 — wires 08/09/10/11/12 + MusicClock BPM`.

---

## Task 3: Parallel subagent wave (3 concurrent)

Dispatched in a single message. Subagent cap respected (3 of 5).

| Agent | `subagent_type` | Files | Acceptance summary |
|---|---|---|---|
| AGENT-content | `coder` | `src/data/instruments/*.json`, `src/data/moves/*.json`, `src/data/enemies/*.json`, `src/game/content/{load-instruments,load-moves,load-enemies}.ts` + tests | 3 party members JSON + 6 moves + 4 enemies (3 mooks + 1 boss-instance); runtime loaders parse + zod-validate; 100% loader coverage |
| AGENT-encounter | `sparc-coder` | `src/game/encounters/{diminuendo,bayou-mook}.ts` + tests, `src/data/encounters/diminuendo.json` | Diminuendo BossScript (3 phases per docs/04 §5.2: pattern intro → execution → vulnerable → transition; hp thresholds 0.66/0.33), bayou-mook simple encounter; both produce `EncounterSpec` consumable by BattleScene |
| AGENT-replay | `tester` | `src/game/combat/replay.ts` + test, `src/game/combat/test/scripted-battle.test.ts` | Recorder logs `{frame, beatPress, confirm, rngSeed}` per turn; replayer feeds those back into a fresh BattleScene; scripted test verifies the `BattleEvent` stream is byte-identical on re-run |

Each agent prompt includes:
- The 6 docs+code paths it must read (rubric, docs/04, spec outputs, battle-scene.ts post-rewrite, types.ts, tests/STRATEGY.md).
- Files[] scope (no expansion).
- Verification: `npm run lint && npm run typecheck && npm run test`.
- "If anything is ambiguous, STOP and return the question."

Commit per agent slice (3 commits).

---

## Task 4: Wire the boss encounter into the overworld

- [ ] **Step 1:** Add a second encounter tile to `OverworldScene.makeDefault()` (or add a separate "bayou" overworld) that triggers the Diminuendo encounter instead of the bayou-mook. For Phase 2, a single override flag on the encounter tile is enough — full overworld region work is Phase 3.
- [ ] **Step 2:** Update `SceneRouter` to support an `encounter-boss` event variant if needed; otherwise reuse `encounter` and let `Game.#makeScene('battle')` pick the encounter from a queue.
- [ ] **Step 3:** Tests + commit.

---

## Task 5: Exit gate

- [ ] **Step 1:** Full pipeline: `npm run verify:workflow && lint && typecheck && test && build`. All 0.
- [ ] **Step 2:** Coverage gate per `tests/STRATEGY.md`:
  - `src/game/combat/**` ≥90% (pure logic) — this includes rhythm-window, parry, dissonance, type-table, boss-phase, damage, action-resolver
  - `src/game/encounters/**` ≥80%
  - `src/game/content/**` ≥85% (loaders)
- [ ] **Step 3:** Replay test passes deterministically across two runs.
- [ ] **Step 4:** Manual smoke (deferred to user; orchestrator boots dev server to verify no startup errors).

---

## Task 6: Closure + tag

- [ ] **Step 1:** Write `docs/audits/wave-2-closure.md` with the 7 standard sections.
- [ ] **Step 2:** Tag.

```bash
git tag -a wave-2-complete -m "Wave 2 complete: combat depth + Diminuendo boss. See docs/audits/wave-2-closure.md."
git push origin main
git push origin wave-2-complete
```

- [ ] **Step 3:** Watch CI; confirm green.

---

## Task 7: Stop and report (Phase 3 green light)

**STOP. Compose status message for the user.** Update memory entry.

---

## Exit gate (must all be true)

- [ ] `docs/plans/PHASE-2.md` committed.
- [ ] Codex specs 08, 09, 10, 11, 12 complete with green verifications.
- [ ] BattleScene v2 wires all 5 primitives + MusicClock BPM; placeholder deleted.
- [ ] 3 subagent slices committed (content, encounter, replay).
- [ ] Replay test is deterministic across re-runs.
- [ ] Coverage: ≥90% on combat pure logic, ≥80% on encounters, ≥85% on content loaders.
- [ ] Full exit-gate (verify:workflow + lint + typecheck + test + build) 0.
- [ ] `docs/audits/wave-2-closure.md` committed.
- [ ] Tag `wave-2-complete` pushed.
- [ ] CI green on main.

---

## Open questions (route at closure)

1. **Audio assets in Phase 2.** No real OGGs ship — `AudioManager`'s default factory throws by design. Phase 3 (or a tiny Phase-2.5) wires real placeholder music + SFX. Track it.
2. **Recruitment mechanic.** docs/04 §6 specifies recruit-by-dialogue; Phase 2 ships the dissonance/parry primitives, but recruitment dialogue is Phase-3 work alongside the Bayou region.
3. **8 enemy types vs 4.** docs/06 Wave 2 says 8 types and 24 moves; this plan ships 4 enemies and 6 moves to keep the wave size proportional to a single boss encounter. The remainder land alongside the Bayou region in Phase 3.
4. **Combat-jazz dynamic stems.** Per docs/08, stems are toggled by combat state. Phase 2 stubs at the AudioManager API boundary; real stems Phase 3 with audio assets.

---

## Anti-patterns to avoid

- Running all 5 specs concurrently — npm install / dist race risk. Serialize.
- Spawning a 4th subagent (cap is 5 concurrent; 3 keeps headroom for the orchestrator's own tools).
- Letting BattleScene drift away from the SceneRouter contract — the Phase-1 transition table is fixed.
- Introducing real Howler audio file loading in Phase 2 — that's Phase 3 scope.
- Shipping recruitment UI before the Bayou region exists.
