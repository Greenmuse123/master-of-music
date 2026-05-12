# Phase 1 Implementation Plan — Vertical Slice

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable, end-to-end vertical slice — title screen → save select → one tiny 3×3-tile room → one 1v1 rhythm-aware battle → game-over → return to title — entirely with placeholder art and one placeholder music loop. Coverage ≥70% on `engine/` and `game/combat/`. 60 fps target.

**Architecture:** Four bounded Codex specs ship the deterministic primitives (renderer core, input manager, music clock, textbox). Four subagents wire the cross-cutting scenes and glue (battle scene, overworld scene, audio integration, UI flow + save). The orchestrator owns scene routing, ADR-002 (audio engine choice — if needed), save schema integration, and the manual perf gate.

**Tech Stack inheritance from Phase 0:** TypeScript 5 strict + Vite 5 + Vitest 2 (jsdom) + Canvas 2D + ESLint 8. **New deps allowed for Phase 1:** Howler.js (audio facade — already in docs/03 §1 stack table; no new ADR needed). All other deps require an ADR.

---

## File Structure

Files this plan creates or modifies. Each `[CODEX]` row maps to a single spec; each `[AGENT]` row to one subagent.

| Source | Path | Responsibility |
|---|---|---|
| Orchestrator | `docs/plans/PHASE-1.md` | this file |
| Orchestrator | `docs/plans/PHASE-1-rubrics.md` | rubric anchor: scene contracts the subagents must honor |
| `[CODEX 04]` | `src/engine/render/{renderer,sprite,atlas,animation,camera,layers}.ts` + tests | Canvas2D pipeline (Phase 0 had bootstrap only — this is the full render core) |
| `[CODEX 05]` | `src/engine/input/{input-manager,remap,actions}.ts` + tests | Keyboard + gamepad action map |
| `[CODEX 06]` | `src/engine/audio/{music-clock,types}.ts` + test | BPM-anchored beat clock with drift correction |
| `[CODEX 07]` | `src/ui/{widget,textbox}.ts` + tests | Dialogue textbox widget with typing + word-wrap |
| `[AGENT-combat]` | `src/game/combat/{battle-scene,action-resolver,damage,ai,rhythm-window-placeholder}.ts` + tests | Battle scene skeleton; placeholder rhythm-window (replaced by spec 08 in Phase 2) |
| `[AGENT-overworld]` | `src/game/overworld/{overworld-scene,player-controller,tilemap}.ts` + tests | 3×3 tile grid scene; player movement; trigger on tile to start the battle |
| `[AGENT-audio]` | `src/engine/audio/{audio-manager,sfx-pool}.ts` + test; `src/assets/audio/placeholder-loop.{ogg,mp3}` | Howler facade wired to MusicClock; loads the placeholder music track |
| `[AGENT-ui]` | `src/scenes/{title-scene,save-select-scene,game-over-scene}.ts` + tests; `src/engine/save/{store,schema}.ts` + test | Title → save select → game-over flow; IndexedDB save store per docs/03 §4.1 |
| Orchestrator | `src/game.ts` (modify) | Wire the scene stack so title → save → overworld → battle → game-over → title works end-to-end |
| Orchestrator | `docs/adr/ADR-003-audio-engine.md` | Howler vs raw Web Audio — only if the placeholder-loop integration surfaces concrete sloppiness |
| Orchestrator | `docs/audits/wave-1-closure.md` | wave closure |

---

## Pre-flight

- [ ] `git status` clean on `main`; HEAD past `262359b`.
- [ ] `npm run verify:workflow && npm run lint && npm run typecheck && npm run test && npm run build` all exit 0.
- [ ] All Phase-1 specs dry-run clean: 04, 05, 06, 07.
- [ ] No live Codex job in flight.

---

## Task 1: Author scene-contract rubric

**Files:**
- Create: `docs/plans/PHASE-1-rubrics.md`

Single subagent (system-architect) writes one consolidated rubric doc. **This must land before any Codex spec runs**, because the spec authors and the wiring subagents both reference it.

- [ ] **Step 1: Dispatch system-architect**

  Single-agent dispatch. Brief: read docs/03 §3 (module layout), docs/03 §4 (save schema, input map), docs/04 §2 (combat loop), docs/06 Wave 1 deliverable, docs/07 Phase 1 gate. Output one doc covering:
  - Scene routing contract: how `Game` switches between scenes; lifecycle invariants.
  - Save schema (v1 from docs/03 §4.1) and migration discipline.
  - The placeholder-rhythm-window contract (called by battle scene; replaced by spec 08 in Phase 2 without API change).
  - Audio loading contract: how `AudioManager` and `MusicClock` cooperate; what "anchored" means in this codebase.
  - The 60-fps perf budget per docs/03 §9 and the F2 perf overlay sketch.
  - The end-to-end golden path: title → save → overworld → battle → game-over → title. Each transition's trigger.
  ≤900 words. The doc is a rubric — quote contracts, don't invent them.

- [ ] **Step 2: Verify + commit**

```bash
test -f docs/plans/PHASE-1-rubrics.md && wc -w docs/plans/PHASE-1-rubrics.md
git add docs/plans/PHASE-1-rubrics.md
git commit -m "docs(phase-1): scene + save + audio + perf rubric"
```

---

## Task 2: Run codex-spec 04 (renderer-core)

**Files:** see `codex-specs/04-renderer-core.json` files[].

- [ ] **Step 1: Dry-run** (confirms post-rewrite spec is still valid).

```bash
node ../../.claude/helpers/codex-delegate.cjs codex-specs/04-renderer-core.json --dry-run
```

- [ ] **Step 2: Real run** with bumped cost cap (the renderer core is large; expect $1-2).

```bash
MAX_COST_USD_PER_RUN=2.50 node ../../.claude/helpers/codex-delegate.cjs codex-specs/04-renderer-core.json
```

- [ ] **Step 3: Independent verify**

```bash
npm run lint --silent
npm run typecheck --silent
npm run test --silent -- src/engine/render
```

If any fails: read failure → rewrite spec (not retry).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(phase-1): renderer core — sprite, atlas, animation, camera, layers (codex-spec 04)"
```

---

## Task 3: Run codex-spec 05 (input-manager)

Same pattern as Task 2 with the path scoped to `src/engine/input`.

- [ ] **Step 1: Dry-run.**
- [ ] **Step 2: Real run** with `MAX_COST_USD_PER_RUN=2.00`.
- [ ] **Step 3: Independent verify** (lint + typecheck + `vitest run src/engine/input`).
- [ ] **Step 4: Commit** `feat(phase-1): input manager — keyboard + gamepad + remap (codex-spec 05)`.

---

## Task 4: Run codex-spec 06 (music-clock)

Same pattern; scoped to `src/engine/audio`.

- [ ] **Step 1: Dry-run.**
- [ ] **Step 2: Real run** with `MAX_COST_USD_PER_RUN=1.50` (pure logic, cheaper).
- [ ] **Step 3: Independent verify.**
- [ ] **Step 4: Commit** `feat(phase-1): music-clock — BPM + drift correction (codex-spec 06)`.

---

## Task 5: Run codex-spec 07 (textbox-widget)

Same pattern; scoped to `src/ui`.

- [ ] **Step 1: Dry-run.**
- [ ] **Step 2: Real run** with `MAX_COST_USD_PER_RUN=1.50`.
- [ ] **Step 3: Independent verify.**
- [ ] **Step 4: Commit** `feat(phase-1): textbox widget (codex-spec 07)`.

---

## Task 6: Parallel subagent wave (≤4 concurrent — hard cap respected)

Dispatched in a single message with four `Agent` calls. Each gets the rubric doc path + the path of the spec(s) it depends on.

| Agent | `subagent_type` | Files (new) | Depends on |
|---|---|---|---|
| AGENT-combat | `sparc-coder` | `src/game/combat/battle-scene.ts` + test, `action-resolver.ts` + test, `damage.ts` + test, `rhythm-window-placeholder.ts` (later replaced by spec 08) | spec 04 (renderer) + 05 (input) + 06 (clock) + 07 (textbox) |
| AGENT-overworld | `sparc-coder` | `src/game/overworld/overworld-scene.ts` + test, `player-controller.ts` + test, `engine/render/tilemap.ts` + test (added under spec-04 owned dir but justified by overworld scope; if scope-snapshot complains, move to `src/game/overworld/tilemap.ts`) | spec 04 + 05 |
| AGENT-audio | `coder` | `src/engine/audio/audio-manager.ts` + test, `sfx-pool.ts` + test, `src/assets/audio/placeholder-loop.{ogg,mp3}` (placeholder binary, OR a 1-second silent loop generator script if Howler can be tested headless without an actual file) | spec 06 |
| AGENT-ui | `coder` | `src/scenes/title-scene.ts` (modify Phase-0 stub), `save-select-scene.ts` + test, `game-over-scene.ts` + test, `src/engine/save/store.ts` + test, `schema.ts` + test | spec 05 + 07 |

- [ ] **Step 1: Dispatch all four agents in one message** so they run concurrently. Each agent prompt includes:
  - Pointer to docs/plans/PHASE-1-rubrics.md.
  - Their exact files[] (so they stay in-scope).
  - The lint/typecheck/test commands they must run before reporting done.
  - A 5-bullet acceptance list specific to their slice.
  - "If anything is ambiguous, stop and return a question rather than guessing."

- [ ] **Step 2: Wait** for all four. Read each summary. Spot-check files.

- [ ] **Step 3: Per-agent commit.** Four commits, one per agent slice, with clear scope.

---

## Task 7: Wire the scene flow (orchestrator-led)

Cross-cutting wiring. ≥4 files. Orchestrator does this directly per docs/06 §6.

**Files:**
- Modify: `src/game.ts` (push the title-scene; pump the scene stack from the rAF loop)
- Modify: `src/main.ts` if needed
- Create: `src/scenes/scene-router.ts` (small helper that owns the title→save→overworld→battle→gameover→title transitions)
- Create: `src/scenes/scene-router.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/scenes/scene-router.test.ts
import { describe, it, expect } from 'vitest';
import { SceneRouter } from './scene-router';

describe('SceneRouter', () => {
  it('routes title -> save -> overworld -> battle -> gameover -> title', () => {
    const router = new SceneRouter();
    expect(router.current().id).toBe('title');
    router.transition('confirm');     expect(router.current().id).toBe('save-select');
    router.transition('confirm');     expect(router.current().id).toBe('overworld');
    router.transition('encounter');   expect(router.current().id).toBe('battle');
    router.transition('defeat');      expect(router.current().id).toBe('game-over');
    router.transition('confirm');     expect(router.current().id).toBe('title');
  });

  it('routes battle -> overworld on victory', () => {
    const router = new SceneRouter();
    router.transition('confirm');
    router.transition('confirm');
    router.transition('encounter');
    router.transition('victory');
    expect(router.current().id).toBe('overworld');
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails.**

```bash
npm run test --silent -- src/scenes/scene-router
```

Expected: file not found / import error.

- [ ] **Step 3: Implement minimally.**

```ts
// src/scenes/scene-router.ts
export type SceneId = 'title' | 'save-select' | 'overworld' | 'battle' | 'game-over';
export type RouterEvent = 'confirm' | 'cancel' | 'encounter' | 'victory' | 'defeat';

const TRANSITIONS: Record<SceneId, Partial<Record<RouterEvent, SceneId>>> = {
  'title':       { 'confirm': 'save-select' },
  'save-select': { 'confirm': 'overworld', 'cancel': 'title' },
  'overworld':   { 'encounter': 'battle' },
  'battle':      { 'victory': 'overworld', 'defeat': 'game-over' },
  'game-over':   { 'confirm': 'title' },
};

export class SceneRouter {
  private id: SceneId = 'title';
  current(): { id: SceneId } { return { id: this.id }; }
  transition(event: RouterEvent): void {
    const next = TRANSITIONS[this.id][event];
    if (next) this.id = next;
  }
}
```

- [ ] **Step 4: Run the test, confirm it passes.**
- [ ] **Step 5: Wire `Game` to the router.** Modify `src/game.ts` to instantiate `SceneRouter`, mount the active scene's `render()`, pump `update(dt)` per rAF tick.
- [ ] **Step 6: Commit.**

```bash
git add -A
git commit -m "feat(phase-1): scene router + Game wiring for end-to-end flow"
```

---

## Task 8: Manual smoke test — golden path

- [ ] **Step 1: Boot the dev server.**

```bash
npm run dev
```

Expected: 480×270 canvas, title scene visible. (Headless verify: `timeout 8 npm run dev || true`.)

- [ ] **Step 2: Walk the golden path manually** (user action):
  - Confirm at title → save select
  - Confirm at save select → overworld
  - Move to encounter tile → battle starts
  - Tap an attack → rhythm cue lands
  - Win → return to overworld
  - Game-over path: lose intentionally → game-over scene → confirm → title

  Record any visual bugs in `docs/audits/wave-1-closure.md`. **Do not delegate this step to a subagent — manual play is the gate.**

- [ ] **Step 3: Manual perf check.** F2 toggles the perf overlay (added in Task 7 or by the orchestrator inline). Walk one room cycle + one battle. Read frame time. Pass if logic + render together ≤16ms median on this dev box.

---

## Task 9: Coverage gate

- [ ] **Step 1: Run coverage report.**

```bash
npm run test -- --coverage
```

- [ ] **Step 2: Verify per-layer thresholds** from `tests/STRATEGY.md`:
  - `src/engine/**` ≥70%
  - `src/game/combat/**` ≥70% (placeholder rhythm-window counts; Phase-2 spec 08 will tighten to 90%)
  - Pure-logic modules at 90% (rhythm-window-placeholder, damage, type-table-stub if introduced)

If any threshold misses, add tests (orchestrator decides whether to write inline or delegate to `tester` subagent).

- [ ] **Step 3: Commit any new tests.** `test(phase-1): close coverage on <module>`.

---

## Task 10: Closure + tag

- [ ] **Step 1: Write `docs/audits/wave-1-closure.md`** with the 7 sections used in wave-0-closure (what shipped, verification evidence, issues encountered, time spent, carries into Phase 2, exit gate per criterion, Codex telemetry summary).
- [ ] **Step 2: Final exit-gate run.**

```bash
npm run verify:workflow
npm run lint --silent
npm run typecheck --silent
npm run test --silent
npm run build --silent
```

All 0.

- [ ] **Step 3: Commit closure + tag.**

```bash
git add docs/audits/wave-1-closure.md
git commit -m "docs(phase-1): wave-1 closure"
git tag -a wave-1-complete -m "Wave 1 complete: vertical slice (title -> battle -> game-over) playable. See docs/audits/wave-1-closure.md."
git push origin main
git push origin wave-1-complete
```

- [ ] **Step 4: Confirm CI green** on the new tag run.

---

## Task 11: Report to user

**STOP HERE. Do not start Phase 2.**

Compose one status message to Elias with:
1. One-sentence summary.
2. The full text of `docs/audits/wave-1-closure.md`.
3. CI URL and tag URL.
4. Phase 2 preview (3-bullet) + entry criteria.
5. Explicit ask: "Green light to start Phase 2?"

Update the memory entry `project_master_of_music.md` from `[WAVE-0-COMPLETE]` to `[WAVE-1-COMPLETE]` with the new tag SHA.

---

## Exit gate (must all be true)

- [ ] `docs/plans/PHASE-1.md` committed.
- [ ] `docs/plans/PHASE-1-rubrics.md` committed.
- [ ] Codex specs 04, 05, 06, 07 all completed with green verifications.
- [ ] 4 subagent slices committed (combat, overworld, audio, ui+save).
- [ ] Scene router test passes; end-to-end golden path walkable in `npm run dev`.
- [ ] Coverage: ≥70% on `engine/` and `game/combat/` (Vitest summary).
- [ ] Full exit-gate: `verify:workflow + lint + typecheck + test + build` all 0.
- [ ] Manual 60-fps gate met (logic + render ≤16ms median).
- [ ] `docs/audits/wave-1-closure.md` committed with all 7 sections.
- [ ] Tag `wave-1-complete` exists on the closure commit.
- [ ] CI green on `main` after push.

---

## Open questions (route at closure)

1. **Audio file format on Windows tests.** Howler in jsdom is awkward without a real `AudioContext`. AGENT-audio decides: mock at the audio-manager API boundary, or include a tiny real OGG and stub Howler globally in tests. The choice is documented in the audio agent's closure note.
2. **Battle scene without spec 08.** Phase-1 placeholder rhythm-window is intentionally simpler than spec 08 will be. Document the placeholder's behavior in the rubric doc; AGENT-combat ships it with a TODO referencing spec 08 for Phase 2 replacement. **API must not change** between placeholder and the spec-08 implementation.
3. **Save-select UI scope.** Three slots? Empty / new-game / loaded states? Minimum: one slot, "press confirm" => "new game". AGENT-ui decides; ADR-able if it grows.
4. **ADR-003 (Howler vs Web Audio).** Only authored if Phase-1 audio integration surfaces sub-frame timing issues. Default: skip the ADR; Howler stays.

---

## Anti-patterns to avoid

- Spawning all 4 subagents and 4 codex specs concurrently — would breach the 5-agent cap and risk node_modules races. Codex specs serialize; subagents fan out once in one batch.
- Adding dependencies beyond Howler without an ADR.
- Letting AGENT-combat invent rhythm-window behavior that contradicts docs/04 §3.3.
- Skipping the manual smoke test. "Battle runs" is a visible-gameplay gate, not just a test-pass gate.
- Inventing a new scene transition not in the `TRANSITIONS` table without updating the rubric doc first.
