# Phase 3.5 Implementation Plan — Settings + Recruitment Polish

> Short wave between Phase 3 (Bayou + recruitment scaffold) and Phase 4 (asset pipeline + audio). Picks up two deferred carries from `docs/audits/wave-3-closure.md` §5.

**Goal:** Make recruitment playable (keyboard binding + dialogue prompt) and ship the settings menu UI (spec 15) so accessibility toggles are reachable. Bundle a small Game-side polish pass while we're here.

**Scope trim vs full Phase 3.5 ambition:** Real audio integration (ADR-003 + placeholder OGG), narrative content expansion (NPCs / side-quests), and save-state cross-region roundtrip all defer to Phase 4. This wave is mechanical UI + input wiring only.

---

## File Structure

| Source | Path | Responsibility |
|---|---|---|
| Orchestrator | `docs/plans/PHASE-3-5.md` | this file |
| `[CODEX 15]` | `src/scenes/settings-scene.ts` + test, `src/engine/save/settings-types.ts`, `src/scenes/scene-router.ts` (widened) | Settings UI with sliders + accessibility toggles |
| Orchestrator | `src/scenes/title-scene.ts` (modify) | Up/Down menu — Confirm to start vs Confirm to open Settings |
| Orchestrator | `src/game.ts` (modify) | wire `'settings'` router event; pass settings from SaveStore to SettingsScene; persist on apply |
| Orchestrator | `src/game/combat/battle-scene.ts` (modify) | listen for the new `recruit` input action; when enemy hp < 25%, call `attemptRecruit(party.genre, true)` — dialogue prompt is a Textbox-rendered yes/no for now |
| Orchestrator | `src/engine/input/actions.ts` (modify, append-only) | add `'recruit'` action, default binding KeyR |
| Orchestrator | `docs/audits/wave-3-5-closure.md` | closure |

---

## Pre-flight

- [ ] `git status` clean; HEAD past `a1edacb` (the InputManager fix).
- [ ] Full pipeline green.
- [ ] Spec 15 dry-runs clean (already validated in PHASE-3 prep).

---

## Task 1: Run codex-spec 15 (settings menu)

- [ ] Dry-run, then real run with `MAX_COST_USD_PER_RUN=1.50`. Verify scoped tests.
- [ ] Independent full-suite verify: `lint + typecheck + test + build`.
- [ ] Commit `feat(phase-3.5): settings menu scene + accessibility toggles (codex-spec 15)`.

---

## Task 2: Wire settings scene into Game

After spec 15 widens `RouterEvent` with `'settings'`:

- [ ] TitleScene gets a two-row menu: "Start" and "Settings". Up/Down selects; Confirm fires onEvent('confirm') or onEvent('settings').
- [ ] Game's TitleScene factory now handles both events.
- [ ] Game holds a `#settings: SettingsV1` field defaulted from a constant; on SettingsScene's 'apply', updates `#settings` and writes to SaveStore (best-effort — failures don't crash the game).
- [ ] SettingsScene constructor receives `{settings: this.#settings}` so it shows the current values.
- [ ] Commit `feat(phase-3.5): settings reachable from title menu, persisted via SaveStore`.

---

## Task 3: Wire recruitment keyboard binding

- [ ] Append `'recruit'` to `INPUT_ACTIONS` and DEFAULT_INPUT_BINDINGS (default `KeyR`).
- [ ] BattleScene listens for `recruit` action when enemy hp < 25%. On press, calls `attemptRecruit(activeParty.genre, true)`. Per the rubric, dialogue prompt is the Textbox showing "Recruit attempt!" → result message. Phase-4 wires the full DialogueRunner UX.
- [ ] Existing battle-scene tests still pass (new behavior is gated on hp < 25% so default-spec tests are unaffected).
- [ ] Add one new test: scripted battle to <25% hp, press recruit, assert recruited outcome.
- [ ] Commit `feat(phase-3.5): recruit key (R) triggers attemptRecruit when enemy hp < 25%`.

---

## Task 4: Closure + tag

- [ ] Write `docs/audits/wave-3-5-closure.md` with the 7 sections.
- [ ] Full pipeline.
- [ ] Tag `wave-3-5-complete`, push, watch CI.

---

## Exit gate

- [ ] Spec 15 complete with green verification.
- [ ] Settings reachable from title in `npm run dev`; sliders + toggles work; Apply persists via SaveStore.
- [ ] R-key triggers recruitment in battle when enemy hp < 25%.
- [ ] Full pipeline green.
- [ ] Closure committed.
- [ ] Tag pushed; CI green.

---

## Anti-patterns

- Don't add real Howler audio file loading — Phase 4 with ADR-003.
- Don't expand the dialogue runtime UX beyond a single Textbox message — Phase 4.
- Don't widen SaveV1.flags semantics here — settings live in `settings: SettingsV1` per docs/03 §4.1.
