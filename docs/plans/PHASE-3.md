# Phase 3 Implementation Plan — Bayou Region + Recruitment + Dialogue

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Diminuendo reachable in `npm run dev` by shipping a minimal Bayou region the overworld can travel to, plus the recruitment evaluator and the dialogue runner that the boss-defeat and NPC interactions need. Specs 14 (atlas-tilemap) and 15 (settings-menu) are authored but DEFERRED to Phase 3.5 — they aren't gating for a Diminuendo encounter walk-through.

**Architecture:** Two Codex specs ship this wave's primitives (13 recruitment evaluator + 16 dialogue-runner). A 3-agent parallel wave produces the Bayou tilemap data + first-NPC dialogue + region-transition glue. The orchestrator wires region transitions through the existing `SceneRouter` (no new events needed — `'encounter'` is reused) and adds a `region` config to `OverworldScene.makeBayou`.

**Tech stack inheritance from Phase 2:** TS5 strict, Vite, Vitest jsdom, Canvas2D, Howler, zod, fake-indexeddb. **No new deps in Phase 3.**

**Scope trim vs docs/06 Wave 3:** Full Wave 3 calls for two regions (Jazz City + Bayou) with 4+ hours of content. This plan ships a minimal Bayou region with the Diminuendo encounter + one trash encounter + one NPC. Jazz City content expansion and the settings menu UI are explicit Phase 3.5 carries.

---

## File Structure

| Source | Path | Responsibility |
|---|---|---|
| Orchestrator | `docs/plans/PHASE-3.md` | this file |
| Orchestrator | `docs/04-COMBAT_SYSTEM.md` (patched) | I-1, I-2, I-3 clarifications from Wave-2 closure — already shipped in this wave's first commit |
| `[CODEX 13]` | `src/game/combat/recruitment.ts` + test | Pure recruitment evaluator |
| `[CODEX 16]` | `src/game/dialogue/{dialogue-runner,parser,dialogue-types}.ts` + tests | Dialogue tree runner + zod-validated parser |
| `[AGENT-region]` | `src/game/overworld/regions/{jazz-city,bayou}.ts` + tests, `src/data/maps/{jazz-city,bayou}.json` | Region tilemap data + factory functions returning OverworldScene instances; bayou has the Diminuendo trigger tile |
| `[AGENT-dialogue-content]` | `src/data/dialogue/{intro,diminuendo-defeat,bayou-npc}.json` + a small loader | First-NPC dialogue, intro cinematic, post-boss recruitment branch |
| `[AGENT-recruitment-wiring]` | `src/game/combat/recruitment-flow.ts` + test, modifies `battle-scene.ts` to call recruitment evaluator on a confirm action when enemy hp < 25% | Recruitment integration into BattleScene (calls spec 13 + dialogue runner) |
| Orchestrator | `src/game.ts` — region-aware scene factory; tracks current region + queued encounter | Wires region transitions; reads encounter type from overworld event |
| Orchestrator | `docs/audits/wave-3-closure.md` | Wave closure |

**Deferred (specs authored but not run this wave):**
- `14-tilemap-renderer.json` — atlas-based tiles. Phase 3.5 / Phase 4 when atlases land.
- `15-settings-menu.json` — settings UI. Phase 3.5.

---

## Pre-flight

- [ ] `git status` clean on `main`; HEAD past `29143ab`.
- [ ] Full pipeline green: `verify:workflow && lint && typecheck && test && build`.
- [ ] Specs 13, 14, 15, 16 dry-run clean.

---

## Task 1: Doc patches (Wave-2 carry I-1/I-2/I-3) — already done

Subagent at the top of this wave patched `docs/04-COMBAT_SYSTEM.md` with:
- §3.2 reading-the-table clarification (Discord prose vs letters)
- §3.4.1 dissonance routing rules
- §5.4 BossPhaseRunner phase-clock priming note

- [ ] **Commit** `docs(phase-3): patch docs/04 — type-table reading, dissonance routing, boss-phase priming (Wave-2 carries I-1/I-2/I-3)` after the closure ships.

---

## Task 2: Run codex-spec 13 (recruitment)

- [ ] **Step 1: Dry-run.**
- [ ] **Step 2: Real run** with `MAX_COST_USD_PER_RUN=1.00` (pure-logic spec; expect ~$0.25).
- [ ] **Step 3: Verify** (lint + typecheck + scoped test).
- [ ] **Step 4: Commit** `feat(phase-3): recruitment evaluator (codex-spec 13)`.

---

## Task 3: Run codex-spec 16 (dialogue-runner)

- [ ] **Step 1: Dry-run.**
- [ ] **Step 2: Real run** with `MAX_COST_USD_PER_RUN=1.50` (moderate complexity).
- [ ] **Step 3: Verify** (lint + typecheck + scoped test).
- [ ] **Step 4: Commit** `feat(phase-3): dialogue tree runner + parser (codex-spec 16)`.

---

## Task 4: Parallel subagent wave (3 concurrent — cap respected)

| Agent | `subagent_type` | Files | Acceptance |
|---|---|---|---|
| AGENT-region | `sparc-coder` | `src/game/overworld/regions/{jazz-city,bayou}.ts` + tests, `src/data/maps/{jazz-city,bayou}.json` (5×5 grids minimum) | Each region is an `OverworldScene` factory; bayou has the Diminuendo trigger tile + one bayou-mook trigger tile; both also have a "leave to neighbor" tile that emits a `region-change` overworld event |
| AGENT-dialogue-content | `coder` | `src/data/dialogue/{intro,diminuendo-defeat,bayou-npc-1}.json`, `src/game/content/load-dialogue.ts` + test | 3 dialogue scripts; loader uses spec-16 `parseDialogueScript`; intro = "Sol leaves Jazz City" (3 lines); diminuendo-defeat = post-boss recruitment branch with a choice that may set `recruited-diminuendo` flag; bayou-npc-1 = a 2-line atmospheric NPC near the Bayou entrance |
| AGENT-recruitment-wiring | `sparc-coder` | `src/game/combat/recruitment-flow.ts` + test, modifies `src/game/combat/battle-scene.ts` to surface a recruit-attempt API and call `evaluateRecruitmentAttempt` when invoked | BattleScene exposes `attemptRecruit(signalGenre, dialogueOk): RecruitmentResult`; flow-level test scripts a battle to <25% HP, attempts recruit with correct genre + ok dialogue → `recruited`; `'recruited'` outcome surfaces through `onComplete` as a third option |

Cap: 3 agents concurrent. Each gets the rubric paths, spec outputs, and explicit files[] scope.

---

## Task 5: Wire Bayou region into Game (orchestrator)

- [ ] **Step 1:** Modify `src/game.ts` to:
  - Track `currentRegion: 'jazz-city' | 'bayou'` (defaults to jazz-city; first encounter is bayou-mook).
  - `OverworldScene` is constructed via the new factory per region.
  - When the overworld emits a `region-change` event, swap regions WITHOUT going through battle.
  - When the overworld emits an `encounter` event with an enemyId, pass it through to the BattleScene factory so the right encounter (bayou-mook OR Diminuendo) loads.
- [ ] **Step 2:** Add `'region-change'` to `RouterEvent` if a separate router transition is needed; otherwise handle the swap inside the overworld→game callback without router involvement (simpler).
- [ ] **Step 3:** Write a `game.region-swap.test.ts` covering the happy-path swap.
- [ ] **Step 4:** Commit `feat(phase-3): region-aware scene factory; Diminuendo reachable in dev`.

---

## Task 6: Manual smoke (deferred to user)

- [ ] User runs `npm run dev`, walks title → save → jazz-city → bayou (via leave tile) → bayou-mook battle → win → bayou again → Diminuendo trigger tile → boss battle → win → recruitment prompt → recruit or skip → bayou. Document any visual bugs in the closure.

(Orchestrator boots the dev server briefly to confirm no startup errors before closure.)

---

## Task 7: Closure + tag

- [ ] **Step 1:** Write `docs/audits/wave-3-closure.md` with the 7 standard sections.
- [ ] **Step 2:** Full exit-gate run.
- [ ] **Step 3:** Tag + push.

```bash
git tag -a wave-3-complete -m "Wave 3 complete: Bayou region + recruitment + dialogue. See docs/audits/wave-3-closure.md."
git push origin main
git push origin wave-3-complete
```

- [ ] **Step 4:** Confirm CI green.

---

## Task 8: Stop and report (Phase 3.5 / Phase 4 green light)

Compose a status message. Update memory entry.

---

## Exit gate (must all be true)

- [ ] `docs/plans/PHASE-3.md` committed.
- [ ] Codex specs 13 + 16 complete with green verifications.
- [ ] 3 subagent slices committed (region, dialogue-content, recruitment-wiring).
- [ ] Bayou region reachable from Jazz City in `npm run dev` (dev server boots clean).
- [ ] Diminuendo encounter reachable on the Bayou region (overworld event triggers BattleScene with boss-mode EncounterSpec).
- [ ] Recruitment evaluator integrated into BattleScene; attempt below 25% HP triggers the flow.
- [ ] Full exit-gate (verify:workflow + lint + typecheck + test + build) 0.
- [ ] Coverage gates from `tests/STRATEGY.md` still met.
- [ ] `docs/audits/wave-3-closure.md` committed.
- [ ] Tag `wave-3-complete` pushed; CI green.

---

## Open questions (route at closure)

1. **Settings menu carry.** Spec 15 is authored. Phase 3.5 should run it. Until then, accessibility toggles are not exposed in `npm run dev`.
2. **Atlas-based tiles carry.** Spec 14 is authored. Phase 4 should run it once real atlases land (after the asset-pipeline ADR-002 implementation work).
3. **Jazz City expansion.** Phase 3 ships a minimal 5×5 Jazz City. docs/07 Phase 3 calls for "a full overworld region"; that's Phase 3.5 / Phase 4 narrative-focused work.
4. **Bayou audio (theme + dynamic transitions).** Real audio assets deferred until ADR-003 (Howler vs Web Audio) is authored alongside Phase 3.5 audio work. AudioManager facade is in place; the missing piece is real OGG files.
5. **Save expansion.** SaveV1 includes a `flags` map. Recruitment success should set a flag; Phase 3 wires the flag-set path but doesn't yet write or restore the cross-region save state per docs/03 §4.1. Defer roundtrip across regions to Phase 3.5.

---

## Anti-patterns to avoid

- Running specs 14 and 15 this wave — they're explicitly deferred. The plan does not have a tested seat for them yet.
- Adding new dependencies. Howler, zod, fake-indexeddb, js-yaml — that's the complete devDep set.
- Letting `OverworldScene.makeBayou()` diverge from the `makeDefault()` API surface. Same constructor shape, same Scene contract.
- Adding settings-menu-driven accessibility shortcuts in Phase 3 — `audioOnlyCues`, `relaxedRhythm`, and friends are spec-15 surface area.
- Spawning >3 subagents in Task 4.
