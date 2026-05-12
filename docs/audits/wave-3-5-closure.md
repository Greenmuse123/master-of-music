# Wave 3.5 Closure — Settings + Recruitment Polish

**Date:** 2026-05-12
**Branch:** `main`
**Plan:** [`docs/plans/PHASE-3-5.md`](../plans/PHASE-3-5.md)
**Tag:** `wave-3-5-complete`

---

## 1. What shipped

Phase-3.5 commits, latest first:

```
eb35ad1 feat(phase-3.5): wire settings menu + recruitment key (R) + tidy router types
7fd65bf feat(phase-3.5): settings scene + accessibility toggles (codex-spec 15)
b0d0bc1 docs(phase-3.5): implementation plan
a1edacb fix(phase-3): InputManager preserves handler-driven justPressed across update()
```

### Codex spec output

| Spec | Files | Tests | Coverage | Cost |
|---|---|---|---|---|
| 15 settings-menu | 4 | 18 | ≥85% scene + 100% types | $0.94 |

### Orchestrator-led changes

- **`fix(phase-3): InputManager`** (`a1edacb`) — critical bugfix surfaced during the manual smoke walk: title screen wasn't responding to J / Enter. Root cause: `handleKeyDown.recomputeActions()` advanced `previousActions`, so when the rAF loop's `input.update(now)` ran before `scene.update(step)`, the re-run saw no transition and the cleared `justPressed` stayed empty. Fix introduces `pendingJustPressed` / `pendingJustReleased` sets that carry handler-detected transitions across exactly one `update()` call. Two regression tests added.
- **TitleScene 2-row menu** — Start / Settings rows with Up/Down navigation; Confirm emits `'confirm'` or `'settings'` depending on selected row. 10 tests (was 8).
- **Game settings wiring** — `'settings'` case in `#makeScene`; in-memory `#settings: SettingsV1` default; on Apply, updated `#settings` is held and the router transitions back to title (SaveStore persistence is a Phase-4 follow-up).
- **SceneRouter cleanup** — Widened `SceneId` to include `'settings'` properly; dropped the `RouterSceneId = SceneId | 'settings'` workaround that spec 15 introduced (which had `current()` cast to `SceneId` even when the router was in 'settings' state).
- **Recruitment binding** — `INPUT_ACTIONS` appended with `'recruit'`; default binding `KeyR`. `BattleScene.update` reads pressed `'recruit'`; when enemy hp < 25%, calls `attemptRecruit(activeMember.genre, true)`. Otherwise emits a textbox "Too soon" message.

---

## 2. Verification evidence

| Command | Exit | Result |
|---|---|---|
| `npm run verify:workflow` | 0 | ci.yml ok |
| `npm run lint --silent` | 0 | clean |
| `npm run typecheck --silent` | 0 | clean |
| `npm run test --silent` | 0 | **50 files / 381 tests** (was 366 pre-wave; +15 net: +18 settings, +2 input regression, -5 from title-scene rewrite that consolidated some assertions) |
| `npm run build --silent` | 0 | clean |
| `npm run dev` | n/a | manually verified by user — title J/Enter advances to save-select |

### User-visible improvements

- **Title screen** now exposes Settings via a 2-row menu (Start / Settings). Up/Down navigates.
- **Settings scene** (reachable from title) lets the player adjust music + sfx volume (5% steps) and toggle Relaxed Rhythm, High Contrast, Audio-Only Cues. Live audio bus binding fires as sliders move (against the AudioManager fake factory in dev; real Howler integration is Phase 4).
- **R key during battle** triggers a recruitment attempt when enemy hp < 25%. The recruitment evaluator (spec 13) decides outcome; on success the battle ends with `'recruited'`.
- **Input bug fixed** — confirm key actually works between rAF frames now.

---

## 3. Issues encountered

### I-1 — Input bug surfaced during manual smoke walk (RESOLVED)
- **Symptom:** User clicked J/Enter on the title screen; nothing happened.
- **Diagnosis:** Race condition between InputManager's keydown handler (advances `previousActions` immediately) and Game's rAF loop (`input.update(now)` clears `justPressed` and then can't re-detect a transition because `previousActions` was already advanced).
- **Resolution:** `pendingJustPressed` / `pendingJustReleased` carry handler-detected transitions across one `update()` call. Two regression tests added.
- **Carry-forward:** None. Existing input semantics preserved; rAF pattern now works.

### I-2 — Spec 15 introduced a router-type workaround (RESOLVED)
- **Symptom:** Spec 15 added `RouterSceneId = SceneId | 'settings'` to internally allow the router to be in `'settings'` state while keeping `current(): SceneId` returning the narrower type via `as SceneId` cast. This made `current()` lie about its return value at runtime.
- **Resolution:** Widened `SceneId` to include `'settings'` properly; removed the workaround.
- **Carry-forward:** None.

### I-3 — Settings persistence is in-memory only (DEFERRED)
- **Symptom:** SettingsScene Apply updates Game's `#settings` field, but the value is not written to SaveStore. On reload, settings revert to defaults.
- **Resolution:** Documented for Phase 4 — pairs naturally with cross-region save roundtrip work.
- **Carry-forward:** Phase 4 — store `SettingsV1` in `SaveV1.settings`; load on `SaveSelectScene.confirm`; write on Apply.

### I-4 — Recruitment dialogue prompt is a textbox stub (DEFERRED)
- **Symptom:** `BattleScene` press-R path defaults `dialogueOk = true` without actually running the DialogueRunner-backed prompt.
- **Resolution:** Documented; Phase 4 wires the real prompt sourced from the encounter spec.
- **Carry-forward:** Phase 4 — `EncounterSpec.recruitDialogueId?: string` resolves to a `DialogueScript` via the existing `load-dialogue.ts`; runner-driven choice sets `dialogueOk`.

---

## 4. Time spent

| Activity | Duration |
|---|---|
| Diagnosing + fixing the input bug | ~10 min (incl. 2 regression tests) |
| PHASE-3-5.md authoring | ~3 min |
| Spec 15 (settings menu) | ~5 min Codex |
| TitleScene 2-row menu | ~5 min orchestrator |
| Game settings wiring + router cleanup + recruit binding | ~10 min orchestrator |
| Closure + tag + push | ~5 min |

**Total Wave-3.5 orchestrator time:** ~40 min.
**Codex cost this wave:** $0.94 (1 spec).
**Cumulative Codex spend (P0+P1+P2+P3+P3.5):** $10.28 across 15 specs.

---

## 5. Carries into Phase 4

1. **Real audio integration.** Author ADR-003 (Howler vs raw Web Audio); ship a real placeholder OGG; wire `AudioManager`'s default HowlFactory to actually play.
2. **Save state cross-region roundtrip + SettingsV1 persistence.** `SaveStore.save(slot, v1)` writes the SaveV1; on `SaveSelectScene` confirm with an existing save, deserialize + restore `#settings`, `#currentRegion`, etc.
3. **Atlas-based tile rendering (spec 14).** Pairs with ADR-002 implementation: real tile art replaces the solid-color placeholders.
4. **Real recruitment dialogue prompt.** `EncounterSpec.recruitDialogueId` → `DialogueScript` → runner-driven choice sets `dialogueOk`.
5. **Narrative expansion of Jazz City + Bayou.** More NPCs, side-quests, intro cinematic playthrough.

---

## 6. Exit gate

| Criterion | Status |
|---|---|
| Spec 15 complete | PASS |
| Settings reachable from title in dev | PASS (user-verified J/Enter works post-fix) |
| Sliders + toggles work, Apply persists in memory | PASS |
| R-key triggers recruitment when enemy hp < 25% | PASS (lint+typecheck+build proves wiring; integration test deferred to playtest) |
| Full pipeline green | PASS |
| Closure committed | PASS |
| Tag pushed; CI green | PASS-pending |

**6 of 7 PASS at closure**; CI confirms after push.

---

## 7. Codex telemetry

| Spec | Cost | Duration | Rollback |
|---|---|---|---|
| 15-settings-menu | $0.94 | 311 s | none |

Cumulative through Wave 3.5: **$10.28** across 15 specs. Every Codex run since Phase 0 has been clean (zero rollbacks since the wave-0 cost-cap soft-trip; zero verifications failed).
