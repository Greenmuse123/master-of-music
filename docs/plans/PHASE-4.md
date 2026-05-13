# Phase 4 Implementation Plan — Save Persistence + Atlas Tilemap + Recruitment Dialogue + ADR-003

> Scoped wave. Picks up four bounded carries from `docs/audits/wave-3-5-closure.md` §5; defers the deep ADR-002 asset-pipeline implementation + real OGG audio integration to Phase 4.5.

**Goal:** Ship the runtime plumbing that future audio + asset work plugs into, without yet wiring real media. Closes 4 of 5 Wave-3.5 carries.

**Architecture:** One Codex spec (14 atlas-tilemap), one subagent (ADR-003 author), and three orchestrator-led wiring passes (save persistence; recruitment-dialogue prompt; closure). No new deps.

---

## File Structure

| Source | Path | Responsibility |
|---|---|---|
| Subagent (system-architect) | `docs/adr/ADR-003-audio-engine.md` | Confirms Howler.js for MVP |
| `[CODEX 14]` | `src/engine/render/atlas-tilemap.ts` + test | Atlas-based tile rendering using Sprite+Atlas |
| Orchestrator | `src/game.ts` (modify) | SaveStore persistence on Settings Apply + region change; load on SaveSelect confirm |
| Orchestrator | `src/engine/save/types.ts` (modify, append-only) | Add `region?: RegionId` to SaveV1 |
| Orchestrator | `src/engine/save/schema.ts` (modify) | Extend zod schema to accept the new field |
| Orchestrator | `src/game/combat/types.ts` (modify, append-only) | Add `recruitDialogueId?: string` to EncounterSpec |
| Orchestrator | `src/game/combat/battle-scene.ts` (modify) | Recruitment R-press now runs the DialogueRunner before evaluating attempt; choice with `recruit-*` flag sets dialogueOk |
| Orchestrator | `docs/plans/PHASE-4.md` | this file |
| Orchestrator | `docs/audits/wave-4-closure.md` | Wave closure |

---

## Pre-flight

- [ ] `git status` clean; HEAD past `000b137`.
- [ ] Full pipeline green.
- [ ] Spec 14 dry-runs clean.

---

## Task 1: ADR-003 (subagent)

- [ ] Dispatch system-architect with the brief inlined above. Output: ≤350-word ADR.

---

## Task 2: Run codex-spec 14 (atlas-tilemap)

- [ ] Dry-run → real run with `MAX_COST_USD_PER_RUN=1.50`.
- [ ] Verify (scoped test).
- [ ] Commit `feat(phase-4): atlas-based tile renderer (codex-spec 14)`.

---

## Task 3: SaveStore persistence (orchestrator-led)

- [ ] Widen `SaveV1` (in `src/engine/save/types.ts`) APPEND-ONLY with optional `region?: RegionId`.
- [ ] Update `src/engine/save/schema.ts` zod schema to accept the new field as optional.
- [ ] Game now:
  - On SettingsScene apply: write a `SaveV1`-shaped snapshot to slot 0 (best-effort, async, fire-and-forget). Slot 0 is the "current session" until we add a save-slot picker in Phase 4.5.
  - On region change (overworld→overworld): same — fire-and-forget write.
  - On SaveSelect confirm with a non-empty slot: load `SaveV1`, restore `#settings` + `#currentRegion` from it before transitioning to overworld.
- [ ] Add a small test for the Game-side snapshot builder (pure function: `buildSaveSnapshot(game-state): SaveV1`).
- [ ] Commit `feat(phase-4): SaveStore persists settings + region; loads on save-select`.

---

## Task 4: Recruitment DialogueRunner prompt (orchestrator-led)

- [ ] Widen `EncounterSpec` APPEND-ONLY with `recruitDialogueId?: string`.
- [ ] `makeDiminuendoEncounter` and `makeBayouMookEncounter` populate the field with the script id from `src/data/dialogue/` (Diminuendo → `diminuendo-defeat`; bayou-mook → none for now).
- [ ] In `BattleScene`, the R-press path:
  - When `recruitDialogueId` is set and hp < 25%, push a `DialogueRunner` onto an internal "dialogue stack" (scene-local; not a full Scene swap).
  - While the runner is active, the scene's update reads only `confirm` (advance / select) and renders the Textbox + choices.
  - On `finished`, set `dialogueOk = flags.includes('recruit-' + enemy.id)` and call `evaluateRecruitmentAttempt` via the existing flow.
  - When `recruitDialogueId` is unset, fall through to the Phase-3.5 behavior (dialogueOk=true default).
- [ ] Tests: scripted battle drives the player to <25% hp, presses R, advances through the diminuendo-defeat script picking the `sing-back` branch, asserts the outcome was `'recruited'`.
- [ ] Commit `feat(phase-4): recruitment R-press routes through DialogueRunner when encounter has a script`.

---

## Task 5: Closure + tag + push

- [ ] Write `docs/audits/wave-4-closure.md` (7 sections).
- [ ] Full pipeline.
- [ ] Tag `wave-4-complete` + push + watch CI.

---

## Exit gate

- [ ] ADR-003 committed.
- [ ] Spec 14 complete with green verification.
- [ ] Save state persists settings + region across reloads (manually verifiable via `npm run dev`).
- [ ] Recruitment R-press in battle runs the dialogue runner when the encounter has a `recruitDialogueId`.
- [ ] Full pipeline green.
- [ ] Closure committed; tag pushed; CI green.

---

## Deferred to Phase 4.5

1. **ADR-002 implementation (deep asset pipeline).** Real image-gen API client, palette quantizer, atlas packer. Multiple sessions.
2. **Real OGG audio file + AudioManager default factory.** Wires audio actually playing.
3. **Save-slot picker UI.** Currently slot 0 is the implicit current-session slot.
4. **Narrative expansion of Jazz City + Bayou.** More NPCs, side-quests, intro cinematic playthrough.

---

## Anti-patterns

- Don't ship real media (audio files, atlas PNGs) — that's Phase 4.5.
- Don't widen SaveV1's `flags` semantics — settings and region are first-class fields per docs/03 §4.1.
- Don't change the SceneRouter contract — the recruitment dialogue is scene-local, not a SceneId.
